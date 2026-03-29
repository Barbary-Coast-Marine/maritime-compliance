/**
 * eCFR Regulation Fetcher for USCG Title 46
 *
 * Fetches regulation structure and full XML text from the eCFR API,
 * parses sections, and outputs JSON files per subchapter.
 *
 * Usage: pnpm fetch:ecfr
 *        pnpm fetch:ecfr -- --subchapter T --date 2026-03-26
 *
 * API docs: https://www.ecfr.gov/api/versioner/v1/
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StructureNode {
  identifier: string;
  label: string;
  label_level: string;
  type: string;
  children?: StructureNode[];
  reserved?: boolean;
}

interface ParsedSection {
  section_number: string;
  heading: string;
  text: string;
  citation: string;
  part: string;
  subpart: string;
}

interface SubchapterOutput {
  metadata: {
    title: number;
    chapter: string;
    subchapter: string;
    fetch_date: string;
    ecfr_current_as_of: string;
    source_urls: string[];
    section_count: number;
    parts: string[];
  };
  sections: ParsedSection[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data", "uscg");

const ECFR_BASE = "https://www.ecfr.gov/api/versioner/v1";

const SUBCHAPTER_PARTS: Record<string, number[]> = {
  T: [175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185],
  H: [70, 71, 72, 73, 74, 75, 76, 77, 78],
  I: [90, 91, 92, 93, 94, 95, 96, 97, 98, 105, 106, 107, 108],
};

const RATE_LIMIT_MS = 1000; // Be polite to eCFR API

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { subchapter: string; date: string } {
  const args = process.argv.slice(2);
  let subchapter = "T";
  let date = new Date().toISOString().split("T")[0];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--subchapter" && args[i + 1]) {
      subchapter = args[i + 1].toUpperCase();
      i++;
    } else if (args[i] === "--date" && args[i + 1]) {
      date = args[i + 1];
      i++;
    }
  }

  if (!SUBCHAPTER_PARTS[subchapter]) {
    console.error(
      `Unknown subchapter: ${subchapter}. Supported: ${Object.keys(SUBCHAPTER_PARTS).join(", ")}`
    );
    process.exit(1);
  }

  return { subchapter, date };
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { Accept: "application/xml" },
  });
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  }
  return res.text();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Structure fetch
// ---------------------------------------------------------------------------

async function fetchStructure(
  date: string,
  subchapter: string
): Promise<StructureNode> {
  const url = `${ECFR_BASE}/structure/${date}/title-46.json?chapter=I&subchapter=${subchapter}`;
  console.log(`Fetching structure: ${url}`);
  return fetchJson<StructureNode>(url);
}

function extractPartNumbers(node: StructureNode): string[] {
  const parts: string[] = [];

  function walk(n: StructureNode) {
    if (n.type === "part" && !n.reserved) {
      parts.push(n.identifier);
    }
    if (n.children) {
      for (const child of n.children) {
        walk(child);
      }
    }
  }

  walk(node);
  return parts;
}

// ---------------------------------------------------------------------------
// XML parsing
// ---------------------------------------------------------------------------

/**
 * Parse eCFR XML into structured sections.
 *
 * The XML uses DIV tags with TYPE attributes:
 *   DIV5 TYPE="PART"    → Part container
 *   DIV6 TYPE="SUBPART" → Subpart container
 *   DIV8 TYPE="SECTION" → Individual regulation section
 *
 * Each DIV8 has an N attribute with the section number (e.g. "176.600")
 * and contains HEAD (title) and P (paragraph) children.
 */
function parseEcfrXml(xml: string, partNumber: string): ParsedSection[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    isArray: (name) => ["DIV5", "DIV6", "DIV7", "DIV8", "P", "FP"].includes(name),
    trimValues: true,
    processEntities: true,
  });

  const parsed = parser.parse(xml);
  const sections: ParsedSection[] = [];

  // Navigate to the content — structure varies but we recursively find DIV8 nodes
  findSections(parsed, sections, partNumber, "");

  return sections;
}

function findSections(
  node: Record<string, unknown>,
  sections: ParsedSection[],
  partNumber: string,
  currentSubpart: string
): void {
  if (node === null || typeof node !== "object") return;

  // Track current subpart name from DIV6
  let subpart = currentSubpart;
  if (Array.isArray(node)) {
    for (const item of node) {
      if (item && typeof item === "object") {
        findSections(
          item as Record<string, unknown>,
          sections,
          partNumber,
          subpart
        );
      }
    }
    return;
  }

  // Check if this is a subpart DIV6
  const type = (node["@_TYPE"] as string) || "";
  if (type === "SUBPART" || type === "Subpart") {
    const head = extractHeadText(node["HEAD"]);
    if (head) subpart = head;
  }

  // Check if this is a section DIV8
  if (type === "SECTION") {
    const sectionNum = (node["@_N"] as string) || "";
    const heading = extractHeadText(node["HEAD"]);
    const text = extractAllText(node);

    if (sectionNum) {
      sections.push({
        section_number: sectionNum,
        heading: heading || "",
        text: text.trim(),
        citation: `46 CFR ${sectionNum}`,
        part: partNumber,
        subpart,
      });
    }
    return; // Don't recurse into section children for more sections
  }

  // Recurse into child elements
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("@_") || key === "#text") continue;
    if (value && typeof value === "object") {
      findSections(
        value as Record<string, unknown>,
        sections,
        partNumber,
        subpart
      );
    }
  }
}

function extractHeadText(head: unknown): string {
  if (!head) return "";
  if (typeof head === "string") return head;
  if (typeof head === "object" && head !== null) {
    const h = head as Record<string, unknown>;
    if (h["#text"]) return String(h["#text"]);
    // Array of HEAD elements — take first
    if (Array.isArray(head)) {
      return extractHeadText(head[0]);
    }
  }
  return String(head);
}

function extractAllText(node: unknown): string {
  if (!node || typeof node !== "object") {
    return node ? String(node) : "";
  }

  if (Array.isArray(node)) {
    return node.map(extractAllText).join("\n");
  }

  const parts: string[] = [];
  const obj = node as Record<string, unknown>;

  if (obj["#text"]) {
    parts.push(String(obj["#text"]));
  }

  // Extract text from P (paragraph), FP (flush paragraph), and other text containers
  for (const key of ["P", "FP", "EXTRACT", "GPOTABLE", "NOTE"]) {
    if (obj[key]) {
      parts.push(extractAllText(obj[key]));
    }
  }

  // Recurse into DIV-like children but skip HEAD (already captured)
  for (const [key, value] of Object.entries(obj)) {
    if (
      key.startsWith("@_") ||
      key === "#text" ||
      key === "HEAD" ||
      ["P", "FP", "EXTRACT", "GPOTABLE", "NOTE"].includes(key)
    ) {
      continue;
    }
    if (value && typeof value === "object") {
      const childText = extractAllText(value);
      if (childText) parts.push(childText);
    }
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Main fetch pipeline
// ---------------------------------------------------------------------------

async function fetchSubchapter(
  subchapter: string,
  date: string
): Promise<void> {
  console.log(
    `\n=== Fetching Subchapter ${subchapter} (as of ${date}) ===\n`
  );

  // 1. Get structure to discover parts
  const structure = await fetchStructure(date, subchapter);
  const discoveredParts = extractPartNumbers(structure);
  const knownParts = SUBCHAPTER_PARTS[subchapter]?.map(String) || [];
  const parts =
    discoveredParts.length > 0 ? discoveredParts : knownParts;

  console.log(`Parts found: ${parts.join(", ")}`);

  // 2. Fetch XML for each part
  const allSections: ParsedSection[] = [];
  const sourceUrls: string[] = [];

  for (const part of parts) {
    const url = `${ECFR_BASE}/full/${date}/title-46.xml?chapter=I&subchapter=${subchapter}&part=${part}`;
    sourceUrls.push(url);

    console.log(`Fetching Part ${part}...`);
    try {
      const xml = await fetchXml(url);
      const sections = parseEcfrXml(xml, part);
      console.log(`  → ${sections.length} sections parsed`);
      allSections.push(...sections);
    } catch (err) {
      console.error(
        `  ✗ Failed to fetch Part ${part}: ${err instanceof Error ? err.message : err}`
      );
    }

    await sleep(RATE_LIMIT_MS);
  }

  // 3. Build output
  const output: SubchapterOutput = {
    metadata: {
      title: 46,
      chapter: "I",
      subchapter,
      fetch_date: new Date().toISOString(),
      ecfr_current_as_of: date,
      source_urls: sourceUrls,
      section_count: allSections.length,
      parts,
    },
    sections: allSections,
  };

  // 4. Write to disk
  await mkdir(DATA_DIR, { recursive: true });
  const outPath = join(DATA_DIR, `subchapter-${subchapter.toLowerCase()}.json`);
  await writeFile(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\nWrote ${allSections.length} sections to ${outPath}`);

  // 5. Write structure file too
  const structPath = join(
    DATA_DIR,
    `subchapter-${subchapter.toLowerCase()}-structure.json`
  );
  await writeFile(structPath, JSON.stringify(structure, null, 2), "utf-8");
  console.log(`Wrote structure to ${structPath}`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const { subchapter, date } = parseArgs();
  await fetchSubchapter(subchapter, date);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
