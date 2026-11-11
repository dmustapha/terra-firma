"use client";

import { useState } from "react";
import { keccak256, parseEventLogs, toBytes, type Abi, type Address } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { friendJarAbi, stockOracleAbi } from "@/lib/abi";
import { CHAIN_ID, STOCKS, TF } from "@/lib/config";
import { DEPLOYED, publicClient } from "@/lib/ui-chain";
import { orDash, parseAmount, shares18 } from "@/lib/ui-format";
import { only } from "@/lib/ui-logs";
import { sharesOf } from "@/lib/ui-report";
import { ConnectButton } from "./connect-button";
import { GEO_BLOCKED, GeoLoadingNote, useStockGate } from "./geo-gate";
import { useMounted, useStockQuotes, useTfLogs, useTx } from "./hooks";
import { StockSelect } from "./stock-select";
import { TxStatus } from "./tx-status";
import { AddrLink, Button, Notice, Panel, Skeleton, inputCls } from "./ui";

const F = { address: TF.FriendJar, abi: friendJarAbi as unknown as Abi };

export function FriendsView() {
  const mounted = useMounted();
  const { address } = useAccount();
  if (!DEPLOYED) return <Notice tone="warn">Friend Jars open when the Terra Firma contracts are live on Robinhood Chain.</Notice>;
  if (!mounted) return <Skeleton w="100%" h="10rem" className="block" />;
  if (!address)
    return (
      <Panel className="flex flex-col items-start gap-4">
        <p className="text-lg">Connect a wallet to start or join a Friend Jar.</p>
        <ConnectButton />
      </Panel>
    );
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Create />
        <Join />
      </div>
      <MyJars user={address} />
    </div>
  );
}

function Create() {
  const [stock, setStock] = useState("NVDA");
  const [invite, setInvite] = useState("");
  const [created, setCreated] = useState<bigint | null>(null);
  const tx = useTx();
  const create = async () => {
    const id = STOCKS.find((s) => s.symbol === stock)!.id;
    const r = await tx.run([{ label: "Create Friend Jar", call: { ...F, functionName: "create", args: [id, keccak256(toBytes(invite))] } }]);
    const ev = r && parseEventLogs({ abi: friendJarAbi, logs: r.logs, eventName: "JarCreated" })[0];
    if (ev) setCreated(ev.args.id);
  };
  return (
    <Panel aria-labelledby="create-h" className="space-y-4">
      <h2 id="create-h" className="font-display text-deck">Start a Friend Jar</h2>
      <StockSelect value={stock} onChange={setStock} label="Jar stock" name="fj-stock" />
      <div>
        <label htmlFor="fj-invite" className="text-sm text-muted">Invite code (share it with friends; only its hash goes onchain)</label>
        <input id="fj-invite" value={invite} onChange={(e) => setInvite(e.target.value)} className={`${inputCls} mt-2`} minLength={6} autoComplete="off" />
      </div>
      <Button className="w-full" disabled={invite.length < 6 || tx.busy} onClick={create}>Create</Button>
      <TxStatus state={tx.state} onReset={tx.reset} success={created !== null ? <>Created Friend Jar #{created.toString()}. Friends join with id {created.toString()} and your code.</> : "Created."} />
    </Panel>
  );
}

function Join() {
  const [id, setId] = useState("");
  const [invite, setInvite] = useState("");
  const tx = useTx();
  const valid = /^\d+$/.test(id) && invite.length > 0;
  return (
    <Panel aria-labelledby="join-h" className="space-y-4">
      <h2 id="join-h" className="font-display text-deck">Join with an invite</h2>
      <div>
        <label htmlFor="fj-id" className="text-sm text-muted">Jar id</label>
        <input id="fj-id" inputMode="numeric" value={id} onChange={(e) => setId(e.target.value)} className={`${inputCls} num mt-2`} />
      </div>
      <div>
        <label htmlFor="fj-code" className="text-sm text-muted">Invite code</label>
        <input id="fj-code" value={invite} onChange={(e) => setInvite(e.target.value)} className={`${inputCls} mt-2`} autoComplete="off" />
      </div>
      <Button className="w-full" disabled={!valid || tx.busy} onClick={() => tx.run([{ label: "Join Friend Jar", call: { ...F, functionName: "join", args: [BigInt(id), invite] } }])}>Join</Button>
      <TxStatus state={tx.state} onReset={tx.reset} success="Joined. Contribute ETH below to buy into the Jar's stock." />
    </Panel>
  );
}

function MyJars({ user }: { user: Address }) {
  const logs = useTfLogs();
  const ids = [...new Set(only(logs.data?.friend ?? [], "Joined").filter((l) => l.args.member.toLowerCase() === user.toLowerCase()).map((l) => l.args.id))];
  if (logs.isLoading) return <Skeleton w="100%" h="6rem" className="block" />;
  if (ids.length === 0) return <Panel><p className="text-muted">You&apos;re not in any Friend Jar yet.</p></Panel>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ids.map((id) => <JarCard key={id.toString()} id={id} user={user} />)}
    </div>
  );
}

function JarCard({ id, user }: { id: bigint; user: Address }) {
  const fj = { address: TF.FriendJar, abi: friendJarAbi, chainId: CHAIN_ID } as const;
  const r = useReadContracts({ contracts: [{ ...fj, functionName: "groups", args: [id] }, { ...fj, functionName: "sharesOf", args: [id, user] }, { ...fj, functionName: "stockOf", args: [id] }] });
  const quotes = useStockQuotes();
  const gate = useStockGate();
  const tx = useTx();
  const [amt, setAmt] = useState("");
  const g = r.data?.[0]?.result as readonly [number, Address, `0x${string}`, bigint] | undefined;
  const mine = r.data?.[1]?.result as bigint | undefined;
  const pot = r.data?.[2]?.result as bigint | undefined;
  const stockId = g?.[0] ?? 0;
  const q = quotes.data?.[stockId];
  const myStock = g && mine !== undefined && pot !== undefined && g[3] > 0n ? (pot * mine) / g[3] : 0n;
  const wei = parseAmount(amt);
  const contribute = () =>
    gate.gate(async () => {
      if (!wei) return;
      const min = await publicClient.readContract({ address: TF.StockOracle, abi: stockOracleAbi, functionName: "minStockOut", args: [stockId, wei] });
      await tx.run([{ label: "Contribute", call: { ...F, functionName: "contribute", args: [id, min], value: wei } }]);
      r.refetch();
    });
  return (
    <Panel className="space-y-4">
      {gate.dialog}
      <h3 className="font-semibold">Friend Jar #{id.toString()} · {STOCKS[stockId]?.symbol}</h3>
      <p className="num text-sm text-muted">
        Your share: {quotes.data ? <AddrLink addr={TF.FriendJar}>{orDash(sharesOf(myStock, q), shares18)} {STOCKS[stockId]?.symbol}</AddrLink> : <Skeleton w="5rem" />} · whole Jar{" "}
        {pot !== undefined && quotes.data ? <AddrLink addr={TF.FriendJar}>{orDash(sharesOf(pot, q), shares18)}</AddrLink> : "…"}
      </p>
      {gate.status === "restricted" ? (
        <Notice tone="warn">{GEO_BLOCKED}</Notice>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor={`fj-amt-${id}`} className="sr-only">ETH to contribute</label>
          <input id={`fj-amt-${id}`} inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="ETH" className={`${inputCls} num sm:flex-1`} />
          <Button disabled={!wei || tx.busy || gate.status === "loading"} onClick={contribute}>Contribute</Button>
        </div>
      )}
      <GeoLoadingNote status={gate.status} />
      <Button variant="secondary" className="w-full" disabled={!mine || tx.busy} onClick={async () => { await tx.run([{ label: "Exit Friend Jar", call: { ...F, functionName: "exit", args: [id] } }]); r.refetch(); }}>
        Exit with my share
      </Button>
      <TxStatus state={tx.state} onReset={tx.reset} />
    </Panel>
  );
}
