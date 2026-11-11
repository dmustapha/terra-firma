import type { Metadata } from "next";
import { JarView } from "@/components/jar-view";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Jar" };

export default function JarPage() {
  return (
    <>
      <PageHeader title="Your Jar" sub="Real Stock Tokens held for you by an ownerless contract. Withdraw any time; nobody else can." />
      <JarView />
    </>
  );
}
