---
description: "Automated incident response combining multiple agents and Zen debugging/audit tools."
argument-hint: "[system/feature/incident]"
allowed-tools: incident-responder, risk-manager, error-detective, zen:debug, zen:analyze, zen:consensus, supabase:debug
---

1. Use incident-responder to triage incident: $ARGUMENTS.
2. Risk-manager to assess business/system impact.
3. error-detective and zen:debug for forensic analysis and log mining.
4. zen:consensus to facilitate hypothesis generation and solution validation with multi-model/agent input.
5. supabase:debug to inspect relevant database activity.
6. Present: (a) root cause, (b) suggested remediation, (c) preventive actions, (d) a postmortem summary for team knowledge base.
