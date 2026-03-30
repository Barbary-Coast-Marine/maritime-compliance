"use client";

import { useEffect, useState } from "react";
import { fetchRules, updateRule } from "@/lib/admin-api";

interface Rule {
  rule_id: string;
  title: string;
  citation: string;
  subchapter?: string;
  frequency?: string;
  required_action?: string;
  status?: string;
  is_active: boolean;
  warning_days_override: number | null;
  critical_days_override: number | null;
  db_id: string | null;
}

export default function RulesConfigPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [changes, setChanges] = useState<
    Record<string, { is_active?: boolean; warning_days?: number; critical_days?: number }>
  >({});

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await fetchRules();
      setRules(data.rules);
      setTotalCount(data.count);
      setActiveCount(data.active_count);
      // Auto-expand groups that have rules
      const groups: Record<string, boolean> = {};
      for (const r of data.rules) {
        const group = r.subchapter || "Other";
        if (!(group in groups)) groups[group] = true;
      }
      setExpandedGroups(groups);
    } catch {
      setRules([]);
    }
    setLoading(false);
  };

  const showToast = (msg: string, duration = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(""), duration);
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const handleToggleActive = (ruleId: string, currentActive: boolean) => {
    setChanges((prev) => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], is_active: !currentActive },
    }));
  };

  const handleThresholdChange = (
    ruleId: string,
    field: "warning_days" | "critical_days",
    value: string,
  ) => {
    setChanges((prev) => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], [field]: value ? Number(value) : undefined },
    }));
  };

  const getEffectiveActive = (rule: Rule) => {
    if (changes[rule.rule_id]?.is_active !== undefined) {
      return changes[rule.rule_id].is_active!;
    }
    return rule.is_active;
  };

  const handleApplyChanges = async () => {
    const changedRuleIds = Object.keys(changes);
    if (changedRuleIds.length === 0) {
      showToast("No changes to apply");
      return;
    }

    setSaving(true);
    try {
      for (const ruleId of changedRuleIds) {
        const change = changes[ruleId];
        await updateRule(ruleId, change);
      }
      showToast(`${changedRuleIds.length} rule(s) updated`);
      setChanges({});
      await loadRules();
    } catch (err) {
      showToast(`Error: ${(err as Error).message}`, 5000);
    }
    setSaving(false);
  };

  // Group rules by subchapter
  const grouped: Record<string, Rule[]> = {};
  for (const rule of rules) {
    const group = rule.subchapter || "Other";
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(rule);
  }

  const changedCount = Object.keys(changes).length;
  const effectiveActiveCount =
    activeCount +
    Object.entries(changes).reduce((acc, [ruleId, change]) => {
      if (change.is_active === undefined) return acc;
      const rule = rules.find((r) => r.rule_id === ruleId);
      if (!rule) return acc;
      if (change.is_active && !rule.is_active) return acc + 1;
      if (!change.is_active && rule.is_active) return acc - 1;
      return acc;
    }, 0);

  const frequencyBadge = (freq: string | undefined) => {
    const styles: Record<string, string> = {
      "pre-departure": "bg-status-blue/20 text-status-blue",
      daily: "bg-status-blue/20 text-status-blue",
      weekly: "bg-status-amber/20 text-status-amber",
      monthly: "bg-status-green/20 text-status-green",
      quarterly: "bg-status-green/20 text-status-green",
      annual: "bg-slate-muted/20 text-slate-muted",
    };
    return styles[freq || ""] || "bg-slate-muted/20 text-slate-muted";
  };

  const statusPill = (status: string | undefined) => {
    const styles: Record<string, string> = {
      verified: "bg-status-green/20 text-status-green",
      draft: "bg-status-amber/20 text-status-amber",
      deprecated: "bg-slate-muted/20 text-slate-muted",
    };
    return styles[status || "verified"] || styles.verified;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-slate-muted/30 border-t-slate-muted rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-text">Rule Configuration</h1>
      </div>

      {/* Summary */}
      <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
        <div className="text-sm text-slate-text">
          <span className="text-status-blue font-bold">{effectiveActiveCount}</span>{" "}
          <span className="text-slate-muted">of</span>{" "}
          <span className="font-bold">{totalCount}</span>{" "}
          <span className="text-slate-muted">rules active</span>
        </div>
        {changedCount > 0 && (
          <div className="text-xs text-status-amber mt-1">
            {changedCount} unsaved change{changedCount > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Grouped Accordion */}
      {Object.entries(grouped).map(([group, groupRules]) => (
        <div key={group} className="bg-navy-surface border border-navy-border rounded-xl overflow-hidden">
          {/* Group Header */}
          <button
            onClick={() => toggleGroup(group)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`text-slate-muted transition-transform ${expandedGroups[group] ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <h2 className="text-sm font-semibold text-slate-text">{group}</h2>
              <span className="text-xs text-slate-muted">({groupRules.length} rules)</span>
            </div>
            <span className="text-xs text-slate-muted">
              {groupRules.filter((r) => getEffectiveActive(r)).length} active
            </span>
          </button>

          {/* Rules List */}
          {expandedGroups[group] && (
            <div className="border-t border-navy-border">
              {groupRules.map((rule) => {
                const isActive = getEffectiveActive(rule);
                const isExpanded = expandedRule === rule.rule_id;
                const hasChange = changes[rule.rule_id] !== undefined;

                return (
                  <div
                    key={rule.rule_id}
                    className={`border-b border-navy-border last:border-b-0 ${hasChange ? "bg-status-blue/5" : ""}`}
                  >
                    {/* Rule Row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggleActive(rule.rule_id, isActive)}
                        className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                          isActive ? "bg-status-blue" : "bg-navy-border"
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                            isActive ? "translate-x-5" : ""
                          }`}
                        />
                      </button>

                      {/* Rule Info */}
                      <button
                        onClick={() => setExpandedRule(isExpanded ? null : rule.rule_id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="text-sm font-medium text-slate-text truncate">
                          {rule.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-slate-muted">{rule.citation}</span>
                          {rule.frequency && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${frequencyBadge(rule.frequency)}`}
                            >
                              {rule.frequency}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusPill(rule.status)}`}
                          >
                            {rule.status || "verified"}
                          </span>
                        </div>
                      </button>

                      {/* Chevron */}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`text-slate-muted transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 ml-12 space-y-3">
                        {rule.required_action && (
                          <div>
                            <span className="text-xs text-slate-muted">Required Action</span>
                            <p className="text-sm text-slate-text mt-1">
                              {rule.required_action}
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-muted mb-1">
                              Warning (days before due)
                            </label>
                            <input
                              type="number"
                              className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text min-h-[40px]"
                              value={
                                changes[rule.rule_id]?.warning_days ??
                                rule.warning_days_override ??
                                ""
                              }
                              onChange={(e) =>
                                handleThresholdChange(
                                  rule.rule_id,
                                  "warning_days",
                                  e.target.value,
                                )
                              }
                              placeholder="e.g. 30"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-muted mb-1">
                              Critical (days before due)
                            </label>
                            <input
                              type="number"
                              className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text min-h-[40px]"
                              value={
                                changes[rule.rule_id]?.critical_days ??
                                rule.critical_days_override ??
                                ""
                              }
                              onChange={(e) =>
                                handleThresholdChange(
                                  rule.rule_id,
                                  "critical_days",
                                  e.target.value,
                                )
                              }
                              placeholder="e.g. 7"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Apply Changes Button */}
      {changedCount > 0 && (
        <div className="sticky bottom-20 z-10">
          <button
            onClick={handleApplyChanges}
            disabled={saving}
            className="w-full bg-status-blue hover:bg-status-blue/80 text-white rounded-lg px-6 py-3 min-h-[48px] font-medium disabled:opacity-50 transition-colors"
          >
            {saving
              ? "Applying..."
              : `Apply Changes (${changedCount} rule${changedCount > 1 ? "s" : ""})`}
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-navy-surface border border-navy-border rounded-lg px-4 py-2 text-sm text-slate-text shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
