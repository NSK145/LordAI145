import { Plus, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ConversationRow {
  id: string;
  title: string;
  last_message_at: string;
}

interface ChatSidebarProps {
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  conversations: ConversationRow[];
}

export function ChatSidebar({ currentId, onSelect, onNew, conversations }: ChatSidebarProps) {
  const grouped = groupConversations(conversations);

  return (
    <div className="flex h-full flex-col gap-4 px-3 py-4">
      <button
        onClick={onNew}
        className={cn(
          "flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all",
          "border border-border/40 bg-[rgba(35,35,35,0.95)] text-white hover:border-border/60 hover:bg-[rgba(45,45,45,0.95)]",
        )}
      >
        <Plus className="h-4 w-4" />
        <span>New Chat</span>
      </button>

      <nav className="custom-scrollbar flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No conversations yet</p>
        ) : (
          Object.entries(grouped).map(([group, convs]) => (
            <div key={group} className="mb-5">
              <h3 className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/50">
                {group}
              </h3>
              <ul className="space-y-1">
                {convs.map((conv) => (
                  <SidebarItem
                    key={conv.id}
                    conv={conv}
                    active={currentId === conv.id}
                    onSelect={onSelect}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </nav>
    </div>
  );
}

function SidebarItem({
  conv,
  active,
  onSelect,
}: {
  conv: ConversationRow;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const timeAgo = getTimeAgo(conv.last_message_at);

  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        onClick={() => onSelect(conv.id)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all",
          active
            ? "border border-primary/20 bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-white/5 hover:text-white",
        )}
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{conv.title || "Untitled"}</p>
          <p className="text-[10px] text-muted-foreground/60">{timeAgo}</p>
        </div>
      </button>
    </motion.li>
  );
}

function groupConversations(conversations: ConversationRow[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const groups: Record<string, ConversationRow[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };

  conversations.forEach((conv) => {
    const convDate = new Date(conv.last_message_at);
    if (convDate >= today) {
      groups.Today.push(conv);
    } else if (convDate >= yesterday) {
      groups.Yesterday.push(conv);
    } else if (convDate >= sevenDaysAgo) {
      groups["Previous 7 Days"].push(conv);
    } else {
      groups.Older.push(conv);
    }
  });

  Object.entries(groups).forEach(([key, arr]) => {
    if (arr.length === 0) delete groups[key];
  });

  return groups;
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHrs / 24);

  if (diffHrs < 1) return "now";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return "1d ago";
  return `${diffDays}d ago`;
}
