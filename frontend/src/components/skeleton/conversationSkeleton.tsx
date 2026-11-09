import type { ComponentProps } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ConversationSkeleton({className, count = 4, compact = false, ...props}: ComponentProps<"div"> & {count?: number; compact?: boolean}) {
  const rows = Math.min(20, Math.max(1, Math.floor(count) || 4));
  return <div role="status" aria-label="Loading conversations" aria-busy="true" className={cn(compact ? "space-y-3 p-2" : "chat-card-grid", className)} {...props}>
    <span className="sr-only">Opening your conversations…</span>
    {Array.from({length: rows}, (_, index) => <div key={index} aria-hidden="true" className={cn(compact ? "flex items-center gap-3" : "conversation-card pointer-events-none")}>
      <Skeleton className={cn("shrink-0 rounded-xl bg-[#e7d9ee] motion-reduce:animate-none", compact ? "size-8" : "size-9")} />
      <div className={cn("flex min-w-0 flex-col gap-2", compact ? "flex-1" : "w-full")}>
        <Skeleton className="h-3 w-3/5 rounded bg-[#e7d9ee] motion-reduce:animate-none" />
        <Skeleton className="h-2.5 w-4/5 rounded bg-[#f0e6f2] motion-reduce:animate-none" />
      </div>
    </div>)}
  </div>;
}
export default ConversationSkeleton;
