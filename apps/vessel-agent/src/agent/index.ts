import OpenAI from "openai";
import { tavily } from "@tavily/core";
import type { Database } from "@maritime/db";
import { vessels, logbookEntries } from "@maritime/db";
import { desc, eq } from "drizzle-orm";
import { loadRules } from "@maritime/regulations";
import { evaluateCompliance, buildLastCompleted } from "../rule-engine.js";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_DIR = path.resolve(__dirname, "../../../../packages/regulations/rules");

// ── Nebius client (OpenAI-compatible) ────────────────────
export function createNebiusClient() {
  const baseURL = process.env.NEBIUS_API_URL ?? "https://api.studio.nebius.ai/v1/";
  const apiKey = baseURL.includes("groq.com")
    ? (process.env.GROQ_API_KEY ?? process.env.NEBIUS_API_KEY ?? "")
    : (process.env.NEBIUS_API_KEY ?? "");
  return new OpenAI({ baseURL, apiKey });
}

const MODEL = process.env.NEBIUS_MODEL ?? "meta-llama/Meta-Llama-3.1-70B-Instruct-fast";

// ── Tavily client ────────────────────────────────────────
function createTavilyClient() {
  return tavily({ apiKey: process.env.TAVILY_API_KEY ?? "" });
}

// ── Tool definitions ─────────────────────────────────────

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_logbook_entry",
      description:
        "Create a structured logbook entry from natural language. Use this when the user describes a completed activity like a drill, inspection, fuel dip, or maintenance task.",
      parameters: {
        type: "object",
        properties: {
          entry_type: {
            type: "string",
            enum: ["drill", "inspection", "fuel_dip", "maintenance", "general"],
            description: "The type of logbook entry",
          },
          title: {
            type: "string",
            description:
              "Short, structured title matching USCG logbook convention (e.g. 'Fire Drill', 'Lifesaving Equipment Weekly Inspection', 'Steering Gear Test')",
          },
          body: {
            type: "string",
            description:
              "Full description of what occurred, who participated, results, and any observations. Written in nautical log style.",
          },
        },
        required: ["entry_type", "title", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_compliance_status",
      description:
        "Get the current compliance status of the vessel — which rules are passing, warning, or in violation. Use this when the user asks about compliance, outstanding items, or what needs attention.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_regulation",
      description:
        "Search for maritime regulation text, USCG guidance, safety alerts, or Port State Control intelligence. Use this when the user asks what a specific CFR section requires, asks about inspection focus areas, or asks about safety bulletins.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query. Be specific: include CFR citation if known (e.g. '46 CFR 78.37 fire drill requirements passenger vessel'), or describe the topic (e.g. 'USCG marine safety bulletin liferaft 2025')",
          },
        },
        required: ["query"],
      },
    },
  },
];

// ── Tool implementations ──────────────────────────────────

async function toolCreateLogbookEntry(
  db: Database,
  author: string,
  args: { entry_type: string; title: string; body: string }
): Promise<{ success: boolean; entry_id?: string; created_at?: string; error?: string }> {
  const [vessel] = await db.select({ id: vessels.id }).from(vessels).limit(1);
  if (!vessel) return { success: false, error: "No vessel configured" };

  const [entry] = await db
    .insert(logbookEntries)
    .values({
      vesselId: vessel.id,
      entryType: args.entry_type as any,
      title: args.title,
      body: args.body,
      author,
    })
    .returning();

  return { success: true, entry_id: entry.id, created_at: entry.timestamp.toISOString() };
}

async function toolGetComplianceStatus(db: Database): Promise<string> {
  const [vessel] = await db.select().from(vessels).limit(1);
  if (!vessel) return "No vessel configured.";

  const recent = await db
    .select()
    .from(logbookEntries)
    .orderBy(desc(logbookEntries.timestamp))
    .limit(100);

  const { rules } = loadRules(RULES_DIR);
  const state = {
    last_completed: buildLastCompleted(recent),
    vessel_type: vessel.vesselType,
    flag_state: vessel.flagState,
    gross_tonnage: Number(vessel.grossTonnage) || 0,
    coi_expiry: vessel.coiExpiry ? new Date(vessel.coiExpiry) : undefined,
  };

  const evals = evaluateCompliance(rules, state);
  const violations = evals.filter((e) => e.verdict === "violation");
  const warnings = evals.filter((e) => e.verdict === "warning");
  const passing = evals.filter((e) => e.verdict === "pass");

  const lines = [
    `Vessel: ${vessel.name}`,
    `Overall: ${violations.length > 0 ? "VIOLATION" : warnings.length > 0 ? "WARNING" : "COMPLIANT"}`,
    `Passing: ${passing.length} | Warnings: ${warnings.length} | Violations: ${violations.length}`,
  ];

  if (violations.length > 0) {
    lines.push("\nVIOLATIONS:");
    for (const v of violations) {
      lines.push(`  • ${v.title} (${v.citation}) — ${v.required_action.slice(0, 100)}`);
    }
  }
  if (warnings.length > 0) {
    lines.push("\nWARNINGS:");
    for (const w of warnings) {
      lines.push(`  • ${w.title} — due ${w.next_due?.toLocaleDateString() ?? "soon"}`);
    }
  }

  return lines.join("\n");
}

async function toolSearchRegulation(query: string): Promise<string> {
  const client = createTavilyClient();
  const result = await client.search(query, {
    searchDepth: "advanced",
    maxResults: 4,
    includeDomains: [
      "ecfr.gov",
      "uscg.mil",
      "dco.uscg.mil",
      "ntsb.gov",
      "imo.org",
      "parismou.org",
      "uscgboating.org",
    ],
  });

  if (!result.results.length) return "No relevant regulation text found.";

  return result.results
    .slice(0, 3)
    .map((r) => `[${r.title}](${r.url})\n${r.content?.slice(0, 400)}`)
    .join("\n\n---\n\n");
}

// ── Main agent entry point ────────────────────────────────

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentResult {
  reply: string;
  actions: AgentAction[];
}

export interface AgentAction {
  type: "logbook_entry_created" | "compliance_checked" | "regulation_searched";
  data: Record<string, unknown>;
}

export async function runAgent(
  db: Database,
  userMessage: string,
  author: string,
  history: AgentMessage[] = []
): Promise<AgentResult> {
  const nebius = createNebiusClient();

  // Build vessel context for system prompt
  const [vessel] = await db.select({ name: vessels.name, vesselType: vessels.vesselType }).from(vessels).limit(1);
  const vesselDesc = vessel
    ? `${vessel.name} (${vessel.vesselType} vessel)`
    : "an unregistered vessel";

  const systemPrompt = `You are the compliance officer AI aboard ${vesselDesc}. You help crew manage USCG maritime compliance requirements.

Your job:
- Parse natural language descriptions of completed activities (drills, inspections, maintenance) into structured logbook entries
- Answer questions about compliance status and what needs attention
- Look up regulation requirements and safety alerts

When crew reports a completed activity, always use create_logbook_entry to log it. Use USCG-standard titles (e.g. "Fire Drill", "Abandon Ship Drill", "Lifesaving Equipment Weekly Inspection").
When asked about compliance, use get_compliance_status for current vessel data.
When asked about a regulation or safety bulletin, use search_regulation.

Be concise and nautical. Confirm actions clearly.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const actions: AgentAction[] = [];

  // Agentic loop — run until no more tool calls
  for (let i = 0; i < 5; i++) {
    const response = await nebius.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    messages.push(choice.message);

    if (!choice.message.tool_calls?.length) {
      return { reply: choice.message.content ?? "", actions };
    }

    // Process each tool call (filter to standard function tool calls)
    for (const toolCall of choice.message.tool_calls) {
      if (!("function" in toolCall)) continue;
      let result: string;

      try {
        const args = JSON.parse(toolCall.function.arguments);

        if (toolCall.function.name === "create_logbook_entry") {
          const outcome = await toolCreateLogbookEntry(db, author, args);
          result = outcome.success
            ? `Entry created: ${args.title} (ID: ${outcome.entry_id})`
            : `Failed: ${outcome.error}`;
          actions.push({ type: "logbook_entry_created", data: { ...args, ...outcome } });

        } else if (toolCall.function.name === "get_compliance_status") {
          result = await toolGetComplianceStatus(db);
          actions.push({ type: "compliance_checked", data: {} });

        } else if (toolCall.function.name === "search_regulation") {
          result = await toolSearchRegulation(args.query);
          actions.push({ type: "regulation_searched", data: { query: args.query } });

        } else {
          result = "Unknown tool";
        }
      } catch (toolErr) {
        result = `Tool error: ${(toolErr as Error).message}`;
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  return { reply: "Agent loop limit reached.", actions };
}
