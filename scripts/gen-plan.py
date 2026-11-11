# File: scripts/gen-plan.py
# [VERIFIED] deterministic generator: PLAN.md = docs/plan/00-plan-head.md + 20-phases.md (with one creation/verify task per
# hand-written file injected at {{FILES:Pn}}) + 50-decision-trees.md + 80-plan-tail.md. Requires docs/arch/filemap.json
# (written by scripts/gen-architecture.py). Run from terra-firma/: python3 scripts/gen-plan.py
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPTH = ("web/app/api/stream", "web/app/api/qn-jar", "web/app/board", "web/app/jar/report", "web/app/friends")
P0 = ("contracts/", "web/lib/config.ts", "web/lib/rpc.ts", "web/lib/rounds.ts", "web/lib/registry.ts", "web/lib/quote.ts",
      "web/lib/hindsight.ts", "web/app/api/hindsight", "web/app/api/quote", "web/app/api/geo", "web/app/api/health",
      "scripts/export-abis.mjs", "scripts/gen-architecture.py", "scripts/gen-plan.py", "web/package.json", "web/tsconfig.json",
      "web/next.config.ts", "web/postcss.config.mjs")

def phase_of(f):
    if f.startswith(DEPTH): return "P5"
    if f.startswith(P0): return "P0"
    if f.startswith(("scripts/", ".github/", "package.json", "tsconfig.json")): return "P1"
    return "P2"

def check_cmd(f):
    if f.startswith("contracts/test/"): return "cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test --match-path " + f[len("contracts/"):]
    if f.startswith("contracts/"): return "cd contracts && forge build"
    if f.startswith("web/"): return "cd web && npx tsc --noEmit"
    if f.endswith(".py"): return "python3 " + f
    if f.endswith(".yml"): return "python3 -c \"import yaml,sys;yaml.safe_load(open('" + f + "'))\""
    if f.endswith((".ts", ".mjs")) or f in ("package.json", "tsconfig.json"): return "npx tsc --noEmit -p tsconfig.json"
    return "test -s " + f

def expected(f):
    if f.startswith("contracts/test/"): return "all tests in the file PASS"
    if f.startswith("contracts/"): return "Compiler run successful"
    if f.endswith(".py"): return "prints the generated line count, exit 0"
    if f.endswith(".yml"): return "no exception"
    return "no type errors (exit 0)"

def area(f):
    return {"contracts": "contracts", "web": "web", "scripts": "scripts", ".github": "ci"}.get(f.split("/")[0], "repo")

def main():
    fm = json.load(open(os.path.join(ROOT, "docs/arch/filemap.json")))
    tasks = {"P0": [], "P1": [], "P2": [], "P5": []}
    for n, f in enumerate(sorted(fm), start=1):
        sec = fm[f]
        tasks[phase_of(f)].append(
            f"#### Task F{n:03d}: create `{f}`\n- Architecture: Section {sec['section']} ({sec['name']}), File: {f}\n"
            f"- Action: create the file with exactly the code block under `#### File: {f}` (forge pre-built files: confirm parity — "
            f"`python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)\n"
            f"- Command: `{check_cmd(f)}`\n- Expected: {expected(f)}\n- Commit: `feat({area(f)}): add {os.path.basename(f)}`\n")
    body = open(os.path.join(ROOT, "docs/plan/20-phases.md")).read()
    for ph, ts in tasks.items():
        body = body.replace("{{FILES:" + ph + "}}", "\n".join(ts) if ts else "_(no file tasks in this phase)_")
    assert "{{FILES:" not in body
    parts = [open(os.path.join(ROOT, "docs/plan/00-plan-head.md")).read(), body,
             open(os.path.join(ROOT, "docs/plan/50-decision-trees.md")).read(), open(os.path.join(ROOT, "docs/plan/80-plan-tail.md")).read()]
    open(os.path.join(ROOT, "PLAN.md"), "w").write("\n".join(parts))
    print("PLAN.md:", sum(1 for _ in open(os.path.join(ROOT, "PLAN.md"))), "lines;", sum(len(v) for v in tasks.values()), "file tasks;",
          {k: len(v) for k, v in tasks.items()})

if __name__ == "__main__":
    main()
