/** Vessel type classifications */
export type VesselType =
  | "small_passenger"
  | "passenger"
  | "cargo"
  | "tanker"
  | "towing"
  | "offshore_supply"
  | "fishing"
  | "other";

/** Flag state codes (ISO 3166-1 alpha-2) */
export type FlagState = "US" | "PA" | "LR" | "MH" | "HK" | "SG" | "BS" | "MT" | "GB" | "NO";

/** Compliance status for a vessel or rule */
export type ComplianceStatus = "compliant" | "warning" | "violation" | "unknown";

/** Compliance event verdict */
export type Verdict = "pass" | "warning" | "violation" | "info";

/** User roles in the system */
export type UserRole = "captain" | "engineer" | "crew" | "fleet_manager";

/** Logbook entry types */
export type LogbookEntryType = "drill" | "inspection" | "fuel_dip" | "maintenance" | "general";

/** Sensor data quality flag */
export type QualityFlag = "good" | "suspect" | "bad" | "missing";

/** Rule trigger types */
export type TriggerType = "calendar" | "threshold" | "event";

/** Maintenance priority levels */
export type Priority = "low" | "medium" | "high" | "critical";

/** Audit log event types */
export type AuditEventType =
  | "compliance_check"
  | "logbook_entry"
  | "document_upload"
  | "user_login"
  | "config_change"
  | "rule_update"
  | "alert_acknowledged"
  | "alert_resolved";
