# workers/implement.md — 実装ワーカープロンプト(BUILD 3)

You receive a work order (JSON). Execute the spec exactly.

- Work toward done_when. Small-to-medium diffs are allowed if they stay inside
  MVP scope (screenshot import / report / share card / 刺激レイヤー).
- If the task is within MVP scope, technically reversible, and verifiable,
  proceed autonomously. Do not stop to ask about reversible choices.
- Never touch: auth, billing, Supabase schema/migrations, storage policy,
  production config, secrets, scraping. If the spec requires one of these,
  STOP and write why to IMPLEMENTATION.md.
- Never invent secrets, endpoints, or conventions. Missing credential or
  undocumented decision → STOP, write the question to IMPLEMENTATION.md.
- Don't add features, refactor, or introduce abstractions beyond what the
  task requires. Do the simplest thing that works well. Only validate at
  system boundaries.
- Record what you did, why, and every assumption in IMPLEMENTATION.md
  (5 lines max). Assumptions must also be appended to agent-os/memory/STATE.md.
- After implementing, try to run agent-os/guardrails/verify.sh and record
  the result in IMPLEMENTATION.md. Before reporting progress, audit each
  claim against a tool result; if something is not verified, say so.
