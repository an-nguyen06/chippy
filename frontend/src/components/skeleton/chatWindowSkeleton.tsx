import type { ComponentProps } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ChatWindowSkeleton({className, ...props}: ComponentProps<"section">) {
  return <section role="status" aria-label="Loading chat" aria-busy="true" className={cn("chat-window flex min-h-[420px] flex-col", className)} {...props}>
    <span className="sr-only">Opening your conversation…</span>
    <div className="chat-window-bar flex items-center gap-3" aria-hidden="true">
      <Skeleton className="size-9 rounded-xl bg-[#baa4d4] motion-reduce:animate-none" />
      <div className="flex flex-1 flex-col gap-2"><Skeleton className="h-3 w-32 rounded bg-[#baa4d4] motion-reduce:animate-none" /><Skeleton className="h-2 w-20 rounded bg-[#c2afda] motion-reduce:animate-none" /></div>
    </div>
    <div className="flex flex-1 flex-col gap-5 p-6" aria-hidden="true">
      {[false, true, false, false, true].map((outgoing, index) => <div key={index} className={cn("flex max-w-[80%] items-end gap-2", outgoing && "self-end")}>
        {!outgoing && <Skeleton className="size-7 shrink-0 rounded-full bg-[#eadcf1] motion-reduce:animate-none" />}
        <Skeleton className={cn("h-12 rounded-2xl motion-reduce:animate-none", outgoing ? "w-40 bg-[#e6d5f0]" : "w-48 bg-[#ecedf8]", index === 3 && "h-16")} />
      </div>)}
    </div>
    <div className="flex items-center gap-3 border-t border-[#e4d5df] p-4" aria-hidden="true"><Skeleton className="h-11 flex-1 rounded-xl bg-[#f0e6f2] motion-reduce:animate-none" /><Skeleton className="size-11 shrink-0 rounded-xl bg-[#e6d5f0] motion-reduce:animate-none" /></div>
  </section>;
}
export default ChatWindowSkeleton;
