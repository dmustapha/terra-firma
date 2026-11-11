import type { Metadata } from "next";
import { BoardView } from "@/components/board-view";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Board" };

export default function BoardPage() {
  return (
    <>
      <PageHeader title="Leaderboards" sub="Built only from what the Terra Firma contracts recorded on Robinhood Chain. Every row links to its wallet and transaction." />
      <BoardView />
    </>
  );
}
