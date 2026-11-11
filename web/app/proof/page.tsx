import type { Metadata } from "next";
import { ProofView } from "@/components/proof-view";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Proof" };

export default function ProofPage() {
  return (
    <>
      <PageHeader
        title="Proof"
        sub="Every number here is read from Robinhood Chain mainnet. Click anything to verify. Terra Firma never prices or sells $WIF: it only buys, burns and stakes it."
      />
      <ProofView />
    </>
  );
}
