import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton w="16rem" h="2.25rem" className="block" />
      <Skeleton w="100%" h="12rem" className="block" />
    </div>
  );
}
