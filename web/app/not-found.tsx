import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-16">
      <h1 className="font-display text-title">Nothing here.</h1>
      <p className="mt-3 text-muted">That page doesn&apos;t exist, or the address in the link isn&apos;t valid.</p>
      <LinkButton href="/" className="mt-6">Back to solid ground</LinkButton>
    </div>
  );
}
