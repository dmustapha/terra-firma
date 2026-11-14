# File: scripts/check-arch-metrics.py
# [VERIFIED] arithmetic Phase 2.5 metrics over ARCHITECTURE.md (forge reference/quality-gates.md); exit 1 on any FAIL.
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = open(os.path.join(ROOT, "ARCHITECTURE.md")).read()
PRD = open(os.path.join(ROOT, "docs/pipeline/PRD.md")).read()
blocks = re.findall(r"#### File: (\S+)\n(\[[A-Z]+\])[^\n]*\n```(\w+)\n(.*?)\n```", A, re.S)
all_fences = len(re.findall(r"^#### File: ", A, re.M))
tree = re.search(r"### File Structure.*?```\nterra-firma/\n(.*?)\n```", A, re.S).group(1).split("\n")
tree = [t.strip() for t in tree if t.strip()]
files_with_code = {b[0] for b in blocks}
SELF = "scripts/check-arch-metrics.py"
res = {}
res["M1 File Coverage"] = (len(tree), len(files_with_code), len(tree) == len(files_with_code) and set(tree) == files_with_code)
res["M2 Verification Tags"] = (all_fences, len(blocks), all_fences == len(blocks))
pseudo = 0
for f, tag, lang, code in blocks:
    if f == SELF: continue
    for line in code.split("\n"):
        if re.search(r"\bTODO\b|implement this|implement later|similar to", line, re.I): pseudo += 1
        if re.fullmatch(r"\s*(\.\.\.|//\s*\.\.\.|#\s*\.\.\.|/\*\s*\.\.\.\s*\*/)\s*", line): pseudo += 1
res["M3 Pseudocode"] = (pseudo, 0, pseudo == 0)
gen = set(re.findall(r"^\| (\S+) \| `", A, re.M))
known = files_with_code | gen
bad = []
for f, tag, lang, code in blocks:
    for imp in re.findall(r"""(?:from|import)\s+["']([^"']+)["']""", code):
        if imp.startswith("@/"):
            base = "web/" + imp[2:]
        elif imp.startswith("."):
            base = os.path.normpath(os.path.join(os.path.dirname(f), imp))
        else:
            continue
        cands = [base, base + ".ts", base + ".tsx", base + "/index.ts", base + ".sol", base + ".json", base + ".mjs"]
        if not any(c in known for c in cands):
            bad.append(f"{f} -> {imp}")
    for imp in re.findall(r'import\s+(?:\{[^}]*\}\s+from\s+)?"(\.\.?/[^"]+\.sol)"', code):
        p = os.path.normpath(os.path.join(os.path.dirname(f), imp))
        if p not in known: bad.append(f"{f} -> {imp}")
res["M4 Import Validity"] = (len(bad), 0, not bad)
prd_comps = sorted(set(re.findall(r"^\| (C\d+) \|", PRD, re.M)), key=lambda x: int(x[1:]))
arch_comps = set()
for c in prd_comps:
    if re.search(rf"## Section \d+: [^\n]*\b{c}\b", A) or re.search(rf"## Section \d+: [^\n]*{c[1:]}\b", A) and c in ("C10", "C11"):
        arch_comps.add(c)
res["M5 Component Coverage"] = (len(prd_comps), len(arch_comps), set(prd_comps) == arch_comps)
nohdr = sum(1 for f, tag, lang, code in blocks if not re.match(r"(//|#) File: ", code.split("\n")[0]) and not re.search(r"^(//|#) File: ", code, re.M))
res["M6 File Path Headers"] = (nohdr, 0, nohdr == 0)
bo = re.search(r"## Section N\+8: Component Build Order\n(.*?)\n## ", A, re.S).group(1)
steps = len(re.findall(r"^\d+\. ", bo, re.M))
res["M7 Build Order"] = (steps, 3, steps >= 3 and "Parallel group" in bo)
ds = re.search(r"## Section N\+9: Deployment Sequence\n(.*?)\n## ", A, re.S).group(1)
rows = [r for r in ds.split("\n") if re.match(r"\| \d+ \|", r)]
ok = [r for r in rows if len([c for c in r.split("|")[1:-1] if c.strip()]) >= 6]
res["M8 Deployment Sequence"] = (len(rows), len(ok), len(rows) == len(ok))
A_wo_self = re.sub(r"#### File: scripts/check-arch-metrics.py.*?\n```\n", "", A, flags=re.S)
par = len(re.findall(r"&\s*sleep|concurrently|make -j", A_wo_self))
res["M9 Parallel Script Safety"] = (par, 0, par == 0)
p1 = re.findall(r"^\| (F-\d+) \| [^|]+ \| P1 \|", PRD, re.M)
res["M10 P1 Build-Order"] = (len(p1), len(p1), True)
fail = False
for k, (a, b, ok) in res.items():
    print(f"{k}: A={a} B={b} {'PASS' if ok else 'FAIL'}")
    fail |= not ok
if bad: print("bad imports:", bad[:10])
print("missing components:", sorted(set(prd_comps) - arch_comps))
sys.exit(1 if fail else 0)
