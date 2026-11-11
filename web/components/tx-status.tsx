"use client";

import type { ReactNode } from "react";
import type { TxState } from "./hooks";
import { Notice, TxLink } from "./ui";

/** Pending / success / error line for a multi-step transaction, always with explorer links. */
export function TxStatus({ state, success, onReset }: { state: TxState; success?: ReactNode; onReset?: () => void }) {
  if (state.phase === "idle") return null;
  const stepTxt = state.total > 1 ? `Step ${state.step} of ${state.total}: ` : "";
  return (
    <div role="status" aria-live="polite" className="mt-4 space-y-2">
      {state.phase === "sign" && <Notice>{stepTxt}{state.label}. Confirm in your wallet.</Notice>}
      {state.phase === "pending" && (
        <Notice>
          {stepTxt}{state.label} is confirming… {state.hash && <TxLink hash={state.hash}>view on explorer</TxLink>}
        </Notice>
      )}
      {state.phase === "done" && <Notice tone="accent">{success ?? "Done."}</Notice>}
      {state.phase === "error" && (
        <Notice tone="danger">
          {state.error}{" "}
          {onReset && (
            <button type="button" onClick={onReset} className="ml-1 underline underline-offset-4">
              Dismiss
            </button>
          )}
        </Notice>
      )}
      {state.hashes.length > 0 && (
        <ul className="space-y-1 text-sm text-muted">
          {state.hashes.map((h) => (
            <li key={h.hash}>
              {h.label}: <TxLink hash={h.hash} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
