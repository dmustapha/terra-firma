import type { Metadata } from "next";
import { BoardView } from "@/components/board-view";

export const metadata: Metadata = { title: "Board" };

export default function BoardPage() {
  return (
    <>
      <header className="mb-10 sm:mb-14">
        <p className="eyebrow text-accent">Leaderboards · read from Robinhood Chain</p>
        <h1 className="mt-3 max-w-[22ch] font-display text-[clamp(2.5rem,1.6rem+3vw,4.5rem)] leading-[0.92] tracking-[-0.025em] text-balance">
          Who got buried. <em className="text-accent">Who hit bedrock.</em>
        </h1>
        <p className="mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed text-muted">Built only from what the Terra Firma contracts recorded on Robinhood Chain. Every row links to its wallet and transaction.</p>
      </header>
      <BoardView />
    </>
  );
}
