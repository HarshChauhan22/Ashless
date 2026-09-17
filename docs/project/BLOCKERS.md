# Blockers

Nothing is currently blocking forward progress on Phase 1 (mocked-payment vertical slice).

Known future blockers to revisit before their respective phases (not blocking now):

- **Phase 6 (production payment integration)**: requires a real PA vendor conversation and sign-off on the "redirect cigarette spend into your own savings" use case (PRD §L.13, §VIII risk table — PAs may flag or reject a novel same-person-adjacent flow), plus legal review confirming the collect-then-immediately-payout pattern doesn't itself constitute a PPI/e-money activity. Do not start Phase 6 without both.
- **Phase 6**: exact settlement-to-payout timing (T+0/T+1) and beneficiary KYC requirements depend on the chosen PA — not yet selected/confirmed (PRD §L.13).
- **Phase 3 (AI Coach)**: the specific helpline number(s) referenced in the crisis-escalation guardrail must be verified as current and correct before launch (PRD §IX.3) — not a blocker for building the feature against placeholder/test values, but a hard blocker for shipping it.

This file should stay empty of *current* blockers under normal operation — if something is actually blocking today's work, it belongs here with enough detail for the next session to pick up immediately.
