import type { RuleEvaluation } from "../rule-engine.js";

/**
 * Send a violation alert email via Composio (v3 REST API).
 * Requires COMPOSIO_API_KEY and ALERT_EMAIL env vars, plus a Gmail
 * connected account authorized for user_id "default".
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

  const violationList = violations
    .map((v) => `• ${v.title} (${v.citation})\n  Action required: ${v.required_action}`)
    .join("\n\n");

  const subject = `[BCM Alert] ${violations.length} compliance violation${violations.length > 1 ? "s" : ""} — ${vesselName}`;
  const body = `Barbary Coast Marine Compliance Alert\n\nVessel: ${vesselName}\nViolations detected: ${violations.length}\n\n${violationList}\n\nLog in to your compliance dashboard to review and resolve these items.\n\n— BCM Compliance Agent`;

  const res = await fetch("https://backend.composio.dev/api/v3/tools/execute/GMAIL_SEND_EMAIL", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: "default",
      arguments: {
        recipient_email: alertEmail,
        subject,
        body,
      },
    }),
  });

  const result = (await res.json()) as { successful?: boolean; error?: string | null };
  if (!res.ok || result.successful === false) {
    throw new Error(`Composio GMAIL_SEND_EMAIL failed: ${result.error ?? res.statusText}`);
  }
}
