import { OpenAIToolSet } from "composio-core";
import type { RuleEvaluation } from "../rule-engine.js";

/**
 * Send a violation alert email via Composio.
 * Requires COMPOSIO_API_KEY and ALERT_EMAIL env vars.
 * Non-fatal — caller should .catch() and log.
 */
export async function sendViolationAlert(
  vesselId: string,
  vesselName: string,
  violations: RuleEvaluation[]
): Promise<void> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const alertEmail = process.env.ALERT_EMAIL;
  if (!apiKey || !alertEmail) return;

  const toolset = new OpenAIToolSet({ apiKey });

  const violationList = violations
    .map((v) => `• ${v.title} (${v.citation})\n  Action required: ${v.required_action}`)
    .join("\n\n");

  const subject = `[BCM Alert] ${violations.length} compliance violation${violations.length > 1 ? "s" : ""} — ${vesselName}`;
  const body = `Barbary Coast Marine Compliance Alert\n\nVessel: ${vesselName}\nViolations detected: ${violations.length}\n\n${violationList}\n\nLog in to your compliance dashboard to review and resolve these items.\n\n— BCM Compliance Agent`;

  await toolset.executeAction({
    action: "GMAIL_SEND_EMAIL",
    params: {
      recipient_email: alertEmail,
      subject,
      body,
    },
    entityId: "default",
  });
}
