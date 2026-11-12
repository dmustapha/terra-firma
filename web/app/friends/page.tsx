import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FriendsView } from "@/components/friends-view";

export const metadata: Metadata = { title: "Friend Jars" };

/** Gated (PRD C12 / OD7): only exists when NEXT_PUBLIC_FRIEND_JARS === "1". */
export default function FriendsPage() {
  if (process.env.NEXT_PUBLIC_FRIEND_JARS !== "1") notFound();
  return (
    <>
      <header className="mb-10 sm:mb-14">
        <p className="eyebrow text-accent">Friend Jars · one stock, pro-rata</p>
        <h1 className="mt-3 max-w-[22ch] font-display text-[clamp(2.5rem,1.6rem+3vw,4.5rem)] leading-[0.92] tracking-[-0.025em] text-balance">
          One real stock, <em className="text-accent">shared by the group chat.</em>
        </h1>
        <p className="mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed text-muted">A shared Jar of one real stock, owned pro-rata by what each member put in. Exit any time with your share.</p>
      </header>
      <FriendsView />
    </>
  );
}
