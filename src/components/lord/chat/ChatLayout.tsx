import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChatLayoutProps {
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChatLayout({ sidebar, children, className }: ChatLayoutProps) {
  return (
    <div className="flex h-full w-full">
      {sidebar && (
        <aside className="hidden w-72 flex-shrink-0 overflow-hidden rounded-r-3xl lg:block">
          {sidebar}
        </aside>
      )}
      <main className={cn("flex w-full flex-1 flex-col", className)}>{children}</main>
    </div>
  );
}
