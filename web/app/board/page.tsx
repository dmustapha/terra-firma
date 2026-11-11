import type { Metadata } from "next";
import { BoardView } from "@/components/board-view";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Board" };

export default function BoardPage() {
  return (
    <>
      <PageHeader title="Leaderboards" sub="Built from contract events only. Every row links to its wallet and transaction." />
      <BoardView />
    </>
  );
}
