import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FriendsView } from "@/components/friends-view";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Friend Jars" };

/** Gated (PRD C12 / OD7): only exists when NEXT_PUBLIC_FRIEND_JARS === "1". */
export default function FriendsPage() {
  if (process.env.NEXT_PUBLIC_FRIEND_JARS !== "1") notFound();
  return (
    <>
      <PageHeader title="Friend Jars" sub="A shared Jar of one real stock, owned pro-rata by what each member put in. Exit any time with your share." />
      <FriendsView />
    </>
  );
}
