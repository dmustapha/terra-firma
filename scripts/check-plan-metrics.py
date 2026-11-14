# File: scripts/check-plan-metrics.py
# [VERIFIED] arithmetic Phase 3.5 plan metrics (forge reference/quality-gates.md); exit 1 on any FAIL.
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = open(os.path.join(ROOT, "docs/pipeline/PLAN.md")).read()
A = open(os.path.join(ROOT, "ARCHITECTURE.md")).read()
PRD = open(os.path.join(ROOT, "docs/pipeline/PRD.md")).read()
tree = re.search(r"### File Structure.*?```\nterra-firma/\n(.*?)\n```", A, re.S).group(1).split("\n")
tree = {t.strip() for t in tree if t.strip()}
created = set(re.findall(r"^#### Task F\d+: create `([^`]+)`", P, re.M))
tasks = re.split(r"^#### Task ", P, flags=re.M)[1:]
tasks = [t.split("\n## ")[0].split("\n### ")[0] for t in tasks]
with_ref = [t for t in tasks if re.search(r"^- Architecture: ", t, re.M)]
with_commit = [t for t in tasks if re.search(r"^- Commit: `", t, re.M)]
risks = re.findall(r"^\| R\d+ \| [^|]+ \| (CRITICAL|HIGH) \|", PRD, re.M)
dts = re.findall(r"^#### DT-\d+:", P, re.M)
phases = re.findall(r"^## Phase (P\d):", P, re.M)
gates = re.findall(r"^### Phase (P\d) Gate", P, re.M)
vague = []
for t in tasks:
    for line in t.split("\n"):
        if re.search(r"\b(set up|configure|implement)\b", line, re.I) and "`" not in line:
            vague.append(line.strip()[:90])
m = re.search(r"Sum ([0-9.]+)h ≤ ([0-9.]+)h", P)
res = {
    "M1 File Creation Coverage": (len(tree), len(created & tree), tree <= created),
    "M2 Section References": (len(tasks), len(with_ref), len(tasks) == len(with_ref)),
    "M3 Decision Tree Coverage": (len(risks), len(dts), len(dts) >= len(risks)),
    "M4 Phase Gates": (len(phases), len(set(gates)), set(phases) == set(gates)),
    "M5 Commit Messages": (len(tasks), len(with_commit), len(tasks) == len(with_commit)),
    "M6 Vague Instructions": (len(vague), 0, not vague),
    "M7 Time Feasibility": (float(m.group(1)), float(m.group(2)), float(m.group(1)) <= float(m.group(2))),
}
fail = False
for k, (a, b, ok) in res.items():
    print(f"{k}: A={a} B={b} {'PASS' if ok else 'FAIL'}")
    fail |= not ok
for v in vague: print("  vague:", v)
print("tasks without commit:", [t.split("\n")[0] for t in tasks if t not in with_commit][:5])
sys.exit(1 if fail else 0)
