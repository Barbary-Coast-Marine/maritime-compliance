# Compliance Rule YAML Schema

## Lifecycle

```
draft → verified → deprecated
```

- **draft**: Rule written but not yet reviewed by a qualified human
- **verified**: Human has confirmed citation accuracy and trigger logic — rule can generate live alerts
- **deprecated**: Regulation superseded or no longer applicable

## Schema

```yaml
rule_id: string          # Unique ID: USCG-{subchapter}-{part}-{section}
status: draft|verified|deprecated
verified_by: string|null
verified_date: string|null  # ISO date
legal_review: boolean

citation: string         # e.g. "46 CFR 78.37"
title: string            # Human-readable name
subchapter: string       # H, T, I, etc.
category: string         # drills, inspections, certificates, pre_departure, maintenance

applies_to:
  vessel_types: string[] # small_passenger, passenger, cargo, towing, etc.
  flag_states: string[]  # US, etc.
  gross_tonnage_min: number|null
  gross_tonnage_max: number|null

trigger:
  type: calendar|threshold|event
  # calendar: interval_days + warning_days + critical_days
  # threshold: metric + operator + value
  # event: fires on specific vessel events (departure, arrival)
  interval_days: number|null
  warning_days: number|null
  critical_days: number|null
  metric: string|null
  operator: string|null  # lt, gt, eq, lte, gte
  value: number|null
  frequency_text: string # Human-readable: "Weekly", "Monthly", "Every 5 years"

required_action: string
deadline_calc: string
fine_range_usd: [number, number]|null
uscg_reference_url: string
notes: string|null
```

## Adding New Regulatory Bodies

Create a new directory under `rules/`:
- `rules/abs/` — American Bureau of Shipping
- `rules/imo/` — IMO conventions (SOLAS, MARPOL, STCW)
- `rules/psc/` — Port State Control

Same YAML schema applies. Change `rule_id` prefix accordingly (e.g. `ABS-HULL-001`).

## Trigger Types

- **calendar**: Time-based. "Last completed date + interval_days = next due date." Warns at warning_days before due, critical at critical_days.
- **threshold**: Sensor/value-based. "If fuel_level < 20%, trigger warning." Phase 2.
- **event**: Fires on vessel lifecycle events. "Before every departure, verify X." Checked during pre-departure flow.
