# File: scripts/gen-architecture.py
# [VERIFIED] deterministic generator: ARCHITECTURE.md = docs/arch/00-head.md + file tree + docs/arch/10-components.md
# + one section per component with the COMPLETE content of every source file + docs/arch/90-tail.md.
# Run from terra-firma/: python3 scripts/gen-architecture.py
import os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {"node_modules", ".next", "out", "cache", "lib/forge-std", "lib/openzeppelin-contracts", "broadcast", ".git", ".vercel"}
CODE_EXT = {".sol": "solidity", ".ts": "typescript", ".tsx": "tsx", ".mjs": "javascript", ".js": "javascript", ".py": "python",
            ".yml": "yaml", ".yaml": "yaml", ".toml": "toml", ".css": "css", ".json": "json"}
# Hand-written config JSON is embedded; generated data JSON is listed (with its generator), not embedded.
GENERATED = re.compile(r"^web/data/(memes|restricted|deployments|proof|evidence)\.json$|^web/data/rounds/|^contracts/deployments/|^web/lib/abi\.ts$")
INCLUDE_ROOTS = ["contracts/src", "contracts/script", "contracts/test", "contracts/foundry.toml", "web/app", "web/components",
                 "web/lib", "web/package.json", "web/tsconfig.json", "web/next.config.ts", "web/postcss.config.mjs",
                 "scripts", "package.json", "tsconfig.json", ".github/workflows", "web/data"]

COMPONENTS = [
    ("Shared contract infrastructure", "Interfaces, the Universal Router 2.1 command codec, and the deterministic deploy used by tests and scripts.",
     ["contracts/foundry.toml", "contracts/src/interfaces/", "contracts/src/lib/", "contracts/script/"],
     "UR 2.1 needs a trailing `uint256[] maxHopSlippage` on V2/V3 inputs (root cause proven in URProbe.t.sol). Deploy predicts CREATE addresses to break the Jar↔Router↔Staking↔FeePool cycle without any admin setter."),
    ("C5 StockOracle", "Curated 6 stocks, Chainlink freshness, Chainlink-bounded min-out, NVDA early-round normalization.", ["contracts/src/StockOracle.sol"],
     "MAX_AGE = 25h follows the directory heartbeat (86400s); band 3% clears measured fills (-0.04%..-1.54%). Nothing is mutable after deploy."),
    ("C2 Jar", "Ownerless per-user ledger of real Stock Tokens.", ["contracts/src/Jar.sol"],
     "credit() requires the tokens to already be held (balance backing) and only accepts the two immutable depositors; withdraw() debits only msg.sender."),
    ("C4 WifStaking", "Stake $WIF into one of 6 reward sub-pools; epoch-batched activation (anti-JIT); 24h unstake; claim to Jar.", ["contracts/src/WifStaking.sol"],
     "All pending stakes in a pool share one epoch, so a single acc snapshot per (pool, epoch) lets each staker activate lazily with exact accounting."),
    ("C3 FeePool", "Hourly permissionless distribute: capped $WIF buy-and-burn + Chainlink-bounded stock stream to stakers.", ["contracts/src/FeePool.sol"],
     "Every swap is wrapped in try/catch so a misbehaving third-party hook or a stale feed carries ETH forward instead of bricking the epoch."),
    ("C1 TerraRouter", "Meme buy/sell/convert/deposit through UR 2.1 with fee, sweep and Jar credit; $WIF sell guard; staker fee discount.", ["contracts/src/TerraRouter.sol"],
     "The router encodes every UR command itself from a typed Route and validates endpoints; callers cannot inject commands. Fee discount reads stake amount, never a price."),
    ("C6 HindsightLens", "Onchain recompute of a Hindsight card + optional mint that burns 1 $WIF.", ["contracts/src/HindsightLens.sol"],
     "Round bracketing (updatedAt(r) <= ts < updatedAt(r+1)) makes a forged round id revert BadRound."),
    ("C12 FriendJar (gated by OD7)", "Shared Jar with pro-rata exit, funded through TerraRouter.deposit.", ["contracts/src/FriendJar.sol"],
     "No vouching or lockups (AMEND-1); deployed with the core, surfaced in the UI only if the gate passes."),
    ("Contract tests", "Mainnet-fork test suites (32 tests).", ["contracts/test/"],
     "Tests deploy the real system with deployAll() on a fork and use real pools, hooks, feeds and rounds; via-IR caches block.timestamp, so tests warp with vm.getBlockTimestamp()."),
    ("Shared web infrastructure", "Config, RPC failover client, generated ABIs, project config.", ["web/package.json", "web/tsconfig.json", "web/next.config.ts", "web/postcss.config.mjs", "web/lib/config.ts", "web/lib/rpc.ts"],
     "rpc.ts is the only module with network I/O and is server-only so the shared GetBlock endpoints never reach a browser."),
    ("C7 Hindsight Indexer", "Card construction from logs, txs, receipts and Chainlink round tables.", ["web/lib/rounds.ts", "web/lib/hindsight.ts", "web/lib/hypersync.ts", "web/app/api/hindsight/"],
     "Per-token scans (not wallet-wide) keep a card to ~3–12s; RPC errors are thrown, never read as 'no logs'."),
    ("C8 Route Builder", "Registry, best-pool quoting, Chainlink min-outs.", ["web/lib/registry.ts", "web/lib/quote.ts", "web/app/api/quote/"],
     "All candidate pools are quoted in one JSON-RPC batch; stock paths mirror TerraConfig.sol exactly."),
    ("C13 Live Stream + ops API", "SSE stream over GetBlock WSS, geo, health, Quicknode cross-check.", ["web/app/api/stream/", "web/app/api/geo/", "web/app/api/health/", "web/app/api/qn-jar/"],
     "The stream closes at 55s (serverless limit) and the browser EventSource reconnects."),
    ("C9 Frontend", "All pages, OG images and components.", ["web/app/", "web/components/", "web/lib/"],
     "Client components talk only to API routes or read the chain through wagmi/public RPC; deployed:false renders a read-only state, never fake data."),
    ("C10/C11 Scripts + keeper", "Data builders, deployment sync, keeper, seed, proof, claims.", ["scripts/", "package.json", "tsconfig.json", ".github/workflows/"],
     "Scripts never import server-only modules; every number they write is read from chain or Chainlink."),
]

def tracked_files():
    out = []
    for inc in INCLUDE_ROOTS:
        p = os.path.join(ROOT, inc)
        if os.path.isfile(p):
            out.append(inc)
            continue
        for d, dirs, files in os.walk(p):
            rel_d = os.path.relpath(d, ROOT)
            dirs[:] = [x for x in dirs if os.path.join(rel_d, x).replace("./", "") not in SKIP_DIRS and x not in {"node_modules", ".next", "out", "cache"}]
            for f in sorted(files):
                rel = os.path.normpath(os.path.join(rel_d, f))
                if os.path.splitext(f)[1] in CODE_EXT and not f.endswith(".d.ts"):
                    out.append(rel)
    return sorted(set(out))

def tag_of(text):
    head = "\n".join(text.splitlines()[:8])
    for t in ("[UNVERIFIED]", "[ASSUMED]", "[VERIFIED]"):
        if t in head:
            return t
    return "[VERIFIED]" if "GENERATED" in head else "[ASSUMED]"

def block(rel):
    text = open(os.path.join(ROOT, rel), encoding="utf8").read().rstrip("\n")
    lang = CODE_EXT[os.path.splitext(rel)[1]]
    tag = tag_of(text)
    header = f"// File: {rel}" if lang not in ("python", "yaml", "toml") else f"# File: {rel}"
    if not re.search(r"^(//|#) File: ", text, re.M):
        if lang == "json":
            note = " (JSON: copy everything after this first line)"
            text = f"{header}{note}\n{text}"
        else:
            text = f"{header}\n{text}"
    return f"#### File: {rel}\n{tag} — Source: {'fork-tested / live-probed' if tag == '[VERIFIED]' else 'see header comment'}\n```{lang}\n{text}\n```\n"

def main():
    files = tracked_files()
    hand = [f for f in files if not GENERATED.search(f)]
    gen = [f for f in files if GENERATED.search(f)]
    parts = [open(os.path.join(ROOT, "docs/arch/00-head.md")).read()]
    parts.append("\n### File Structure (every hand-written file; each has complete code below)\n[VERIFIED] — generated from the source tree (not code)\n```\nterra-firma/\n" +
                 "\n".join("  " + f for f in hand) + "\n```\n")
    parts.append("\n### Generated artifacts (produced by scripts, not hand-written; listed with their generator)\n| File | Generator |\n|---|---|\n" +
                 "\n".join(f"| {f} | {gen_cmd(f)} |" for f in gen) + "\n")
    parts.append(open(os.path.join(ROOT, "docs/arch/10-components.md")).read())
    used = set()
    filemap = {}
    for i, (name, purpose, prefixes, decision) in enumerate(COMPONENTS, start=3):
        mine = [f for f in hand if f not in used and any(f == p or f.startswith(p) for p in prefixes)]
        if not mine:
            continue
        used.update(mine)
        for f in mine:
            filemap[f] = {"section": i, "name": name}
        parts.append(f"\n## Section {i}: {name}\n\n### Purpose\n{purpose}\n\n### Files\n" + "\n".join(f"- `{f}`" for f in mine) +
                     "\n\n### Code\n\n" + "\n".join(block(f) for f in mine) + f"\n### Key Decisions\n{decision}\n")
    missing = [f for f in hand if f not in used]
    if missing:
        print("UNASSIGNED FILES:", missing, file=sys.stderr)
        sys.exit(1)
    parts.append(open(os.path.join(ROOT, "docs/arch/90-tail.md")).read())
    import json
    json.dump(filemap, open(os.path.join(ROOT, "docs/arch/filemap.json"), "w"), indent=1)
    open(os.path.join(ROOT, "ARCHITECTURE.md"), "w").write("\n".join(parts))
    print(f"ARCHITECTURE.md: {sum(1 for _ in open(os.path.join(ROOT, 'ARCHITECTURE.md')))} lines, {len(hand)} code files, {len(gen)} generated")

def gen_cmd(f):
    if "memes.json" in f: return "`pnpm tsx scripts/build-registry.ts`"
    if "/rounds/" in f: return "`pnpm tsx scripts/build-rounds.ts`"
    if "restricted.json" in f: return "`pnpm tsx scripts/build-restricted.ts`"
    if "deployments" in f: return "`forge script script/Deploy.s.sol` + `node scripts/sync-deployments.mjs`"
    if "proof.json" in f: return "`pnpm tsx scripts/proof.ts`"
    if "evidence.json" in f: return "`grep -c PASS evidence/forge-test.txt` (written by hand from that count)"
    if "abi.ts" in f: return "`node scripts/export-abis.mjs` (from contracts/out)"
    return "script"

if __name__ == "__main__":
    main()
