"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isAddress } from "viem";
import { Button, inputCls } from "./ui";

/** "Look up any wallet" (0x only, validated before any request). Used on /, /app and /card/[addr]. */
export function AddressLookup({ id = "lookup", placeholder = "or look up any wallet: 0x…" }: { id?: string; placeholder?: string }) {
  const router = useRouter();
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  const errId = `${id}-err`;
  return (
    <form
      role="search"
      aria-label="Look up a wallet"
      className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap"
      onSubmit={(e) => {
        e.preventDefault();
        const a = v.trim();
        if (!isAddress(a)) return setErr(true);
        router.push(`/card/${a}`);
      }}
    >
      <label htmlFor={id} className="sr-only">Wallet address</label>
      <input
        id={id}
        value={v}
        onChange={(e) => {
          setV(e.target.value);
          setErr(false);
        }}
        placeholder={placeholder}
        className={`${inputCls} font-mono text-sm sm:w-auto sm:flex-1`}
        aria-invalid={err}
        aria-describedby={err ? errId : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      <Button type="submit" variant="secondary">Look up</Button>
      {err && <p id={errId} role="alert" className="text-sm text-danger sm:basis-full">Enter a 0x address (42 characters).</p>}
    </form>
  );
}
