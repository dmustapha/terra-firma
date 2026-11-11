// File: web/lib/hypersync.ts
// [UNVERIFIED] Envio HyperSync for Robinhood Chain 4663: endpoint + bearer auth VERIFIED (spike-indexing.md §2: /height open,
// /query returns 401 without a token); query/response shape follows docs.envio.dev HyperSync JSON API and is exercised by
// livetest once ENVIO_API_TOKEN is set. WARNING: UNVERIFIED PATTERN — callers fall back to eth_getLogs on any error.
import "server-only";
import type { Address, Hex } from "viem";

const URL_QUERY = "https://robinhood.hypersync.xyz/query";
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export type HsLog = { address: Address; topics: Hex[]; data: Hex; blockNumber: Hex; transactionHash: Hex };

interface HsResponse {
  next_block: number;
  archive_height?: number;
  data: { logs?: { address: Address; topic0: Hex; topic1: Hex | null; topic2: Hex | null; topic3: Hex | null; data: Hex; block_number: number; transaction_hash: Hex }[] }[];
}

export const hypersyncEnabled = () => typeof process.env.ENVIO_API_TOKEN === "string" && process.env.ENVIO_API_TOKEN.length > 0;

/** All Transfer(*, wallet) logs of `tokens` from `fromBlock`, paginated until HyperSync reports no more data. */
export async function transfersTo(wallet: Address, tokens: Address[], fromBlock: number): Promise<HsLog[]> {
  const padded = `0x000000000000000000000000${wallet.slice(2).toLowerCase()}`;
  const out: HsLog[] = [];
  let from = fromBlock;
  for (let page = 0; page < 50; page++) {
    const res = await fetch(URL_QUERY, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.ENVIO_API_TOKEN}` },
      body: JSON.stringify({
        from_block: from,
        logs: [{ address: tokens, topics: [[TRANSFER], [], [padded]] }],
        field_selection: { log: ["address", "topic0", "topic1", "topic2", "topic3", "data", "block_number", "transaction_hash"] },
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`hypersync HTTP ${res.status}`);
    const j = (await res.json()) as HsResponse;
    for (const batch of j.data ?? []) {
      for (const l of batch.logs ?? []) {
        out.push({
          address: l.address,
          topics: [l.topic0, l.topic1, l.topic2, l.topic3].filter((t): t is Hex => !!t),
          data: l.data,
          blockNumber: `0x${l.block_number.toString(16)}` as Hex,
          transactionHash: l.transaction_hash,
        });
      }
    }
    if (!j.next_block || (j.archive_height !== undefined && j.next_block >= j.archive_height) || j.next_block <= from) break;
    from = j.next_block;
  }
  return out;
}
