"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isAddress } from "viem";
import { Button, cx, inputCls } from "./ui";

/** "Look up any wallet" (0x only, validated before any request). Used on /, /app and /card/[addr]. */
export function AddressLookup({ id = "lookup", placeholder = "Paste a 0x address", label, button = "Read card" }: { id?: string; placeholder?: string; label?: string; button?: string }) {
  const router = useRouter();
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  const errId = `${id}-err`;
  return (
    <form
      role="search"
      aria-label="Look up a wallet"
      className="flex w-full min-w-0 flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const a = v.trim();
        if (!isAddress(a)) return setErr(true);
        router.push(`/card/${a}`);
      }}
    >
      <label htmlFor={id} className={label ? "text-sm font-semibold" : "sr-only"}>{label ?? "Wallet address"}</label>
      <div className="flex min-w-0">
        <input
          id={id}
          value={v}
          onChange={(e) => {
            setV(e.target.value);
            setErr(false);
          }}
          placeholder={placeholder}
          className={cx(inputCls, "min-w-0 flex-1 rounded-r-none border-r-0 font-mono")}
          aria-invalid={err}
          aria-describedby={err ? errId : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" variant="secondary" className="shrink-0 rounded-l-none px-4">{button}</Button>
      </div>
      {err && <p id={errId} role="alert" className="text-sm text-danger">Enter a 0x address (42 characters).</p>}
    </form>
  );
}
