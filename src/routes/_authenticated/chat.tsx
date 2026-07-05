import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCcw, Copy, Check } from "lucide-react";
import { AppShell } from "@/components/lord/AppShell";
import { useAppContext } from "@/components/lord/AppContextProvider";
import { supabase } from "@/integrations/supabase/client";
import { getApiBaseUrl } from "@/lib/api-config";
import { getSupabaseAuthHeaders } from "@/lib/authenticated-fetch";
import { cn } from "@/lib/utils";
import type { LordMode } from "@/lib/lord-config";
import { ChatLayout } from "@/components/lord/chat/ChatLayout";
import { ChatSidebar } from "@/components/lord/chat/ChatSidebar";
import { EmptyState } from "@/components/lord/chat/EmptyState";
import { MessageBubble } from "@/components/lord/chat/MessageBubble";
import { ChatInputBar } from "@/components/lord/chat/ChatInputBar";
import { ModelSelector } from "@/components/lord/chat/ModelSelector";
import { TypingIndicator } from "@/components/lord/chat/TypingIndicator";
import { RichMessage } from "@/components/lord/chat/RichMessage";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [{ title: "LORD — Chat" }, { name: "description", content: "Talk to LORD AI." }],
  }),
  component: ChatPage,
});

interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  created_at: string;
}

function ChatPage() {
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const { metrics, currentRoute, activeWorkflow, history } = useAppContext();

  const [mode, setMode] = useState<LordMode>("balanced");
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [savingMessage, setSavingMessage] = useState(false);
  const [pendingInitialSend, setPendingInitialSend] = useState<{
    conversationId: string;
    message: UIMessage;
  } | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const activeRequestModeRef = useRef<LordMode>(mode);
  const requestBodyRef = useRef({
    mode,
    context: { page: currentRoute, workflow: activeWorkflow, metrics, history },
  });

  requestBodyRef.current = {
    mode,
    context: { page: currentRoute, workflow: activeWorkflow, metrics, history },
  };

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as ConversationRow[];
    },
  });

  const { data: storedMessages = [], error: storedMessagesError } = useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as MessageRow[];
    },
  });

  const initialMessages = useMemo<UIMessage[]>(
    () =>
      storedMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          parts: [{ type: "text", text: m.content }],
        })),
    [storedMessages],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${getApiBaseUrl()}/api/chat`,
        headers: getSupabaseAuthHeaders,
        body: () => requestBodyRef.current,
      }),
    [],
  );

  const { messages, setMessages, sendMessage, status, error, regenerate } = useChat({
    id: conversationId ?? "draft",
    messages: initialMessages,
    transport,
    onFinish: async ({ messages: completed, isError }) => {
      const activeConversationId = activeConversationIdRef.current;
      const requestMode = activeRequestModeRef.current;
      if (isError || !activeConversationId) {
        console.warn(
          JSON.stringify({
            event: "chat_stream_finish_skipped",
            conversationId: activeConversationId,
            mode: requestMode,
            isError,
          }),
        );
        return;
      }

      const assistantMessage = completed
        .slice()
        .reverse()
        .find((m) => m.role === "assistant");
      const content =
        assistantMessage?.parts
          .filter((p) => p.type === "text")
          .map((p) => (p as { text: string }).text)
          .join("") ?? "";

      if (content.trim()) {
        const assistantMessageId = crypto.randomUUID();
        console.info(
          JSON.stringify({
            event: "supabase_insert_start",
            table: "messages",
            role: "assistant",
            conversationId: activeConversationId,
            messageId: assistantMessageId,
            mode: requestMode,
          }),
        );
        const { error: insertError } = await supabase.from("messages").insert({
          id: assistantMessageId,
          conversation_id: activeConversationId,
          user_id: user.id,
          role: "assistant",
          content,
          model: requestMode,
        });
        if (insertError) {
          console.error(
            JSON.stringify({
              event: "supabase_insert_error",
              table: "messages",
              role: "assistant",
              conversationId: activeConversationId,
              messageId: assistantMessageId,
              mode: requestMode,
              error: insertError.message,
            }),
          );
          setPersistenceError(insertError.message);
        } else {
          console.info(
            JSON.stringify({
              event: "supabase_insert_success",
              table: "messages",
              role: "assistant",
              conversationId: activeConversationId,
              messageId: assistantMessageId,
              mode: requestMode,
            }),
          );
        }
      }
      const { error: updateError } = await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", activeConversationId);
      if (updateError) {
        console.error(
          JSON.stringify({
            event: "supabase_update_error",
            table: "conversations",
            conversationId: activeConversationId,
            error: updateError.message,
          }),
        );
        setPersistenceError(updateError.message);
      }
      qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      qc.invalidateQueries({ queryKey: ["messages", activeConversationId] });
    },
  });

  const ensureConversation = async (firstMessage: string): Promise<string> => {
    if (conversationId) return conversationId;
    const title = firstMessage.slice(0, 60) || "New conversation";
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title })
      .select()
      .single();
    if (error) throw error;
    console.info(
      JSON.stringify({
        event: "supabase_insert_success",
        table: "conversations",
        conversationId: data.id,
        mode,
      }),
    );
    setConversationId(data.id);
    activeConversationIdRef.current = data.id;
    qc.invalidateQueries({ queryKey: ["conversations", user.id] });
    return data.id;
  };

  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("conversations").update({ title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations", user.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", id);
      if (messagesError) throw messagesError;
      const { error } = await supabase.from("conversations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      if (id === conversationId) startNewChat();
    },
  });

  const startNewChat = () => {
    setPersistenceError(null);
    setSavingMessage(false);
    setPendingInitialSend(null);
    setConversationId(null);
    activeConversationIdRef.current = null;
    setMessages([]);
  };

  const loadConversation = (id: string) => {
    setPersistenceError(null);
    setPendingInitialSend(null);
    setConversationId(id);
    activeConversationIdRef.current = id;
    setMessages([]);
  };

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const busy = savingMessage || status === "submitted" || status === "streaming";

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setPersistenceError(null);
    const isNewConversation = !conversationId;
    setSavingMessage(true);
    try {
      const convId = await ensureConversation(text);
      activeConversationIdRef.current = convId;
      activeRequestModeRef.current = mode;
      console.info(
        JSON.stringify({
          event: "chat_submit",
          conversationId: convId,
          mode,
          isNewConversation,
        }),
      );
      const userMsgId = crypto.randomUUID();
      const userMessage: UIMessage = {
        id: userMsgId,
        role: "user",
        parts: [{ type: "text", text }],
      };
      console.info(
        JSON.stringify({
          event: "supabase_insert_start",
          table: "messages",
          role: "user",
          conversationId: convId,
          messageId: userMsgId,
          mode,
        }),
      );
      const { error: insertError } = await supabase.from("messages").insert({
        id: userMsgId,
        conversation_id: convId,
        user_id: user.id,
        role: "user",
        content: text,
      });
      if (insertError) {
        console.error(
          JSON.stringify({
            event: "supabase_insert_error",
            table: "messages",
            role: "user",
            conversationId: convId,
            messageId: userMsgId,
            mode,
            error: insertError.message,
          }),
        );
        throw insertError;
      }
      console.info(
        JSON.stringify({
          event: "supabase_insert_success",
          table: "messages",
          role: "user",
          conversationId: convId,
          messageId: userMsgId,
          mode,
        }),
      );
      const { error: touchError } = await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", convId);
      if (touchError) {
        console.error(
          JSON.stringify({
            event: "supabase_update_error",
            table: "conversations",
            conversationId: convId,
            error: touchError.message,
          }),
        );
        throw touchError;
      }
      qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      setInput("");
      if (isNewConversation) {
        setPendingInitialSend({ conversationId: convId, message: userMessage });
      } else {
        console.info(
          JSON.stringify({
            event: "chat_stream_start",
            conversationId: convId,
            mode,
            messageId: userMsgId,
          }),
        );
        void sendMessage(userMessage).finally(() => setSavingMessage(false));
      }
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "chat_submit_error",
          message: err instanceof Error ? err.message : "Failed to send message",
        }),
      );
      setSavingMessage(false);
      setPersistenceError(err instanceof Error ? err.message : "Failed to save this message.");
    }
  };

  const regenerateLast = async () => {
    if (busy) return;
    const activeConversationId = activeConversationIdRef.current;
    const lastAssistant = messages
      .slice()
      .reverse()
      .find((message) => message.role === "assistant");
    try {
      setPersistenceError(null);
      setSavingMessage(true);
      activeRequestModeRef.current = mode;
      if (activeConversationId && lastAssistant) {
        const { error: deleteError } = await supabase
          .from("messages")
          .delete()
          .eq("conversation_id", activeConversationId)
          .eq("id", lastAssistant.id);
        if (deleteError) throw deleteError;
        console.info(
          JSON.stringify({
            event: "supabase_delete_success",
            table: "messages",
            role: "assistant",
            conversationId: activeConversationId,
            messageId: lastAssistant.id,
            mode,
          }),
        );
      }
      console.info(
        JSON.stringify({
          event: "chat_stream_start",
          conversationId: activeConversationId,
          mode,
          trigger: "regenerate",
        }),
      );
      await regenerate();
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "chat_regenerate_error",
          conversationId: activeConversationId,
          message: err instanceof Error ? err.message : "Failed to regenerate response",
        }),
      );
      setPersistenceError(err instanceof Error ? err.message : "Failed to regenerate response.");
    } finally {
      setSavingMessage(false);
    }
  };

  return (
    <AppShell>
      <ChatLayout
        sidebar={
          <div className="h-full rounded-3xl border border-border/40 bg-[rgba(30,30,30,0.7)] backdrop-blur-xl">
            <ChatSidebar
              currentId={conversationId}
              onSelect={loadConversation}
              onNew={startNewChat}
              conversations={conversations}
            />
          </div>
        }
      >
        <div className="flex h-full flex-col">
          <header className="flex-shrink-0 px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-white">
                <span className="gradient-text">LORD</span>
              </h1>
              <ModelSelector value={mode} onChange={setMode} />
            </div>
          </header>

          <div ref={scrollerRef} aria-live="polite" className="flex-1 overflow-y-auto px-6">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center px-6">
                {persistenceError || storedMessagesError ? (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {persistenceError ??
                      (storedMessagesError instanceof Error
                        ? storedMessagesError.message
                        : "Failed to load saved messages.")}
                  </div>
                ) : (
                  <EmptyState onPick={setInput} userName={user?.user_metadata?.name || user?.email?.split("@")[0]} />
                )}
              </div>
            )}

            {messages.length > 0 && (
              <div className="space-y-6 py-6">
                {messages.map((m, idx) => {
                  const isLast = idx === messages.length - 1;
                  const role = m.role as "user" | "assistant";
                  const text = m.parts
                    .filter((p) => p.type === "text")
                    .map((p) => (p as { text: string }).text)
                    .join("");
                  return (
                    <div key={m.id}>
                      <MessageBubble role={role}>
                        {role === "user" ? (
                          text
                        ) : (
                          <>
                            <RichMessage text={text} />
                            <MessageActions
                              text={text}
                              canRegenerate={isLast && !busy}
                              onRegenerate={regenerateLast}
                            />
                          </>
                        )}
                      </MessageBubble>
                    </div>
                  );
                })}
                {error && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {error.message || "The AI request failed. Please retry."}
                  </div>
                )}
              </div>
            )}

            {busy && (
              <div className="flex items-center gap-3 px-6 pb-4">
                <AssistantAvatar />
                <TypingIndicator />
              </div>
            )}
          </div>

          <footer className="flex-shrink-0 px-6 py-4">
            <ChatInputBar
              value={input}
              onChange={setInput}
              onSubmit={submit}
              busy={busy}
              onAttachClick={() => setToolMenuOpen(true)}
              placeholder="Ask LORD anything..."
            />
          </footer>
        </div>
      </ChatLayout>
    </AppShell>
  );
}

function MessageActions({
  text,
  canRegenerate,
  onRegenerate,
}: {
  text: string;
  canRegenerate: boolean;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Copy failed silently
    }
  };
  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        onClick={copy}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition",
          copied
            ? "text-[var(--hud-success)]"
            : "text-muted-foreground hover:bg-white/5 hover:text-primary",
        )}
        aria-label="Copy message"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      {canRegenerate && (
        <button
          onClick={onRegenerate}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-muted-foreground transition hover:bg-white/5 hover:text-primary"
          aria-label="Regenerate response"
        >
          <RefreshCcw className="h-3 w-3" />
          Regenerate
        </button>
      )}
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ background: "var(--gradient-hud)", boxShadow: "0 0 12px var(--hud)" }}
    >
      <span className="font-sans text-[10px] font-bold text-background">L</span>
    </div>
  );
}
