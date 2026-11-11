"use client";

// Geofence on the stock leg only (PRD F8): IP country from /api/geo + one-time attestation in localStorage.
// Restricted -> stock actions disabled. Unknown or not restricted -> attestation required, never silently allowed.
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import restricted from "@/data/restricted.json";
import { Button, ExtLink } from "./ui";

const KEY = "tf.attest.v1";
const listeners = new Set<() => void>();
const read = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
function setAttested() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* storage blocked: attestation lasts for this page only */
  }
  memo = true;
  listeners.forEach((l) => l());
}
let memo = false;

export type StockAccess = "loading" | "restricted" | "needs-attest" | "ok";
export const GEO_BLOCKED = "Stock purchases aren't available in your region. Your card still works.";

export function useStockAccess() {
  const geo = useQuery({
    queryKey: ["geo"],
    queryFn: async () => (await fetch("/api/geo")).json() as Promise<{ country: string; restricted: boolean; unknown: boolean }>,
    staleTime: Infinity,
  });
  const attested = useSyncExternalStore(subscribe, () => memo || read(), () => false);
  const status: StockAccess = geo.isLoading ? "loading" : geo.data?.restricted ? "restricted" : attested ? "ok" : "needs-attest";
  return { status, country: geo.data?.country };
}

/** `gate(fn)` runs fn when allowed, otherwise opens the attestation dialog first. */
export function useStockGate() {
  const { status, country } = useStockAccess();
  const [pending, setPending] = useState<null | (() => void)>(null);
  const gate = useCallback(
    (fn: () => void) => {
      if (status === "ok") fn();
      else if (status === "needs-attest") setPending(() => fn);
    },
    [status],
  );
  const dialog = (
    <AttestDialog
      open={pending !== null}
      country={country}
      onClose={() => setPending(null)}
      onConfirm={() => {
        setAttested();
        const fn = pending;
        setPending(null);
        fn?.();
      }}
    />
  );
  return { status, gate, dialog };
}

function AttestDialog({ open, country, onClose, onConfirm }: { open: boolean; country?: string; onClose: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const list = (restricted as { countries: string[]; source: string }).countries;
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="attest-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-6 text-fg"
    >
      <h2 id="attest-title" className="text-xl font-semibold">One quick check</h2>
      <p className="mt-3 text-muted">
        Stock Tokens aren&apos;t available in some regions. We detected{" "}
        <strong className="text-fg">{country && country !== "UNKNOWN" ? country : "an unknown region"}</strong>. This check is a
        frontend control, not enforced onchain.
      </p>
      <p className="mt-2 text-sm text-muted">
        Restricted list:{" "}
        {list.length > 0 ? list.join(", ") : "see the published list"} (
        <ExtLink href={(restricted as { source: string }).source}>source</ExtLink>).
      </p>
      <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-1 size-5 accent-[var(--accent)]" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>I am not a resident of a restricted jurisdiction.</span>
      </label>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={!checked} onClick={onConfirm}>Continue</Button>
      </div>
    </dialog>
  );
}
