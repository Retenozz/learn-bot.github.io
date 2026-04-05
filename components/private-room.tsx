"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import {
  getProfileInitials,
  useAuth,
} from "@/components/auth-provider";
import { ChatAttachmentPills } from "@/components/chat-attachment-pills";
import { ChatCitations } from "@/components/chat-citations";
import { StudyRoadmapPanel } from "@/components/study-roadmap-panel";
import {
  CardsIcon,
  PaperclipIcon,
  QuizIcon,
  SendIcon,
} from "@/components/icons";
import { useLearning } from "@/components/learning-provider";
import {
  buildAssistantReply,
  buildUploadAcknowledgement,
  chatFileAccept,
  parseChatFiles,
  prepareAssistantContext,
  type AssistantReply,
  type ChatAttachment,
  type ChatCitation,
  type ChatSourceChunk,
} from "@/lib/chat-documents";
import { createGeneratedFlashcardDeck } from "@/lib/generated-chat-flashcards";
import { createGeneratedQuizSession } from "@/lib/generated-chat-quiz";
import {
  isMissingTableError,
  upsertUserState,
} from "@/lib/supabase/user-state";

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
  attachments?: ChatAttachment[];
  citations?: ChatCitation[];
};

type ChatHistoryTurn = {
  role: "assistant" | "user";
  text: string;
};

const initialMessages: Message[] = [
  {
    id: "assistant-1",
    role: "assistant",
    text: "Hello, I can read your study files. Upload notes, worksheets, or text-based materials and I will help summarize or explain them.",
  },
];

const quickActions = [
  "Summarize my files",
  "Explain this lesson simply",
];

/**
 * When attachments are round-tripped through Supabase JSONB the `chunks`
 * array can be missing or empty (size limits / partial serialisation).
 * This helper rebuilds a minimal single-chunk from the stored `content`
 * string so that Quiz and Flashcard generation can still find the text.
 */
function rebuildAttachmentChunks(att: ChatAttachment): ChatAttachment {
  if (att.chunks && att.chunks.length > 0) {
    return att;
  }
  if (!att.content) {
    return att;
  }
  const chunk: ChatSourceChunk = {
    id: `${att.id}-0-0`,
    attachmentId: att.id,
    attachmentName: att.name,
    label: "Excerpt 1",
    content: att.content.slice(0, 7200),
    keywords: [],
  };
  return { ...att, chunks: [chunk] };
}

function restoreMessages(raw: Message[]): Message[] {
  return raw.map((msg) => ({
    ...msg,
    attachments: (msg.attachments ?? []).map(rebuildAttachmentChunks),
  }));
}

export function PrivateRoom() {
  const router = useRouter();
  const { supabase, user, profile, loading } = useAuth();
  const { saveGeneratedFlashcardDeck, saveGeneratedQuizSession } = useLearning();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // dirtyCount tracks user-driven changes (send / upload / assistant reply).
  // The save effect only fires when dirtyCount > 0, preventing the initial
  // hydration from overwriting Supabase with blank initialMessages before
  // the load effect has completed.
  const [dirtyCount, setDirtyCount] = useState(0);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const knowledgeFiles = useMemo(
    () => messages.flatMap((message) => message.attachments ?? []),
    [messages],
  );
  const userInitials = getProfileInitials(profile, user);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadPrivateRoom() {
      if (loading) {
        return;
      }

      if (!user) {
        setMessages(initialMessages);
        setHydrated(true);
        return;
      }

      setHydrated(false);

      const { data: rawData, error } = await supabase
        .from("user_private_room_state")
        .select("messages")
        .maybeSingle();
      const data = rawData as { messages: Message[] | null } | null;

      if (cancelled) {
        return;
      }

      if (error && !isMissingTableError(error)) {
        console.error("Failed to load private room", error);
      }

      // If no row exists yet for this user (e.g. signed up before the trigger
      // was in place), create one now so future saves work correctly.
      if (!error && data === null) {
        await supabase
          .from("user_private_room_state")
          .insert({ user_id: user.id, messages: [] })
          .then(({ error: insertError }) => {
            if (insertError && !isMissingTableError(insertError)) {
              console.error("Failed to initialise private room row", insertError);
            }
          });
      }

      // Restore saved messages and rebuild any attachment chunks that were
      // lost during Supabase JSONB serialisation.
      const saved =
        data?.messages && data.messages.length
          ? restoreMessages(data.messages as Message[])
          : initialMessages;

      setMessages(saved);
      setHydrated(true);
      // Reset dirty count so the save effect doesn't fire right after loading.
      setDirtyCount(0);
    }

    void loadPrivateRoom();

    return () => {
      cancelled = true;
    };
  }, [loading, supabase, user]);

  // ── Save (only when the user has actually changed something) ─────────────
  useEffect(() => {
    if (loading || !user || !hydrated || dirtyCount === 0) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      void upsertUserState({
        supabase,
        table: "user_private_room_state",
        values: {
          user_id: user.id,
          messages,
        },
      }).catch((error) => {
        console.error("Failed to save private room", error);
      });
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [dirtyCount, hydrated, loading, messages, supabase, user]);

  // ── Scroll to bottom ────────────────────────────────────────────────────
  useEffect(() => {
    const node = scrollAreaRef.current;

    if (!node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [messages, isTyping]);

  // ── Upload feedback auto-clear ──────────────────────────────────────────
  useEffect(() => {
    if (!uploadFeedback) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setUploadFeedback(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [uploadFeedback]);

  // ── Assistant reply ─────────────────────────────────────────────────────
  async function queueAssistantReply(
    prompt: string,
    history: ChatHistoryTurn[],
    nextMessages: Message[],
  ) {
    setIsTyping(true);

    const assistantContext = prepareAssistantContext(prompt, knowledgeFiles);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          history,
          context: assistantContext.contextText,
          preferThai: assistantContext.preferThai,
        }),
      });

      const payload = (await response.json()) as {
        text?: string;
        error?: string;
      };

      if (!response.ok || !payload.text) {
        throw new Error(payload.error ?? "Gemini did not return a reply.");
      }

      setMessages([
        ...nextMessages,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: payload.text,
          citations: assistantContext.citations,
        },
      ]);
      setDirtyCount((c) => c + 1);
    } catch (error) {
      console.error("Failed to fetch Gemini reply", error);
      const fallback = buildAssistantReply(prompt, knowledgeFiles);

      setMessages([
        ...nextMessages,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: fallback.text,
          citations:
            assistantContext.citations.length > 0
              ? assistantContext.citations
              : fallback.citations,
        },
      ]);
      setDirtyCount((c) => c + 1);
      setUploadFeedback("Gemini is unavailable right now, so Learn'Bot used the local fallback reply.");
    } finally {
      setIsTyping(false);
    }
  }

  // ── Send message ────────────────────────────────────────────────────────
  function handleSend(nextText?: string) {
    const text = (nextText ?? input).trim();

    if (!text || isTyping) {
      return;
    }

    const history = messages.slice(-8).map((message) => ({
      role: message.role,
      text: message.text,
    }));

    const nextMessages = [
      ...messages,
      {
        id: `user-${Date.now()}`,
        role: "user" as const,
        text,
      },
    ];

    setMessages(nextMessages);
    setDirtyCount((c) => c + 1);
    setInput("");
    void queueAssistantReply(text, history, nextMessages);
  }

  // ── File upload ─────────────────────────────────────────────────────────
  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = event.target.files;

    if (!selectedFiles?.length || isTyping) {
      return;
    }

    const { attachments, rejected } = await parseChatFiles(selectedFiles);

    if (rejected.length) {
      setUploadFeedback(rejected[0]);
    }

    if (attachments.length) {
      const userUploadMessage: Message = {
        id: `user-upload-${Date.now()}`,
        role: "user",
        text:
          attachments.length === 1
            ? `Uploaded ${attachments[0].name}`
            : `Uploaded ${attachments.length} study files`,
        attachments,
      };

      const nextMessages = [...messages, userUploadMessage];
      setMessages(nextMessages);
      setDirtyCount((c) => c + 1);

      const reply: AssistantReply = buildUploadAcknowledgement(attachments);

      setIsTyping(true);
      window.setTimeout(() => {
        setMessages([
          ...nextMessages,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            text: reply.text,
            citations: reply.citations,
          },
        ]);
        setDirtyCount((c) => c + 1);
        setIsTyping(false);
      }, 450);
    }

    event.target.value = "";
  }

  // ── Quiz / Flashcard generation ─────────────────────────────────────────
  async function handleCreateQuizFromChat() {
    setIsGeneratingQuiz(true);
    setUploadFeedback("กำลังสร้างควิซจากไฟล์... รอสักครู่นะครับ");
    const result = await createGeneratedQuizSession({
      title: "Quiz from Private Room",
      sourcePath: "/dashboard",
      sourceTitle: "Private room chat",
      messages: messages.map((message) => ({
        role: message.role === "user" ? "user" : "assistant",
        senderName: message.role === "user" ? "You" : "Learn'Bot",
        text: message.text,
        attachments: message.attachments,
        citations: message.citations,
      })),
    });

    if (!result.ok) {
      setUploadFeedback(result.message);
      setIsGeneratingQuiz(false);
      return;
    }

    saveGeneratedQuizSession(result.session);
    setIsGeneratingQuiz(false);
    router.push(`/quiz?generated=${result.session.id}`);
  }

  function handleCreateFlashcardsFromChat() {
    const result = createGeneratedFlashcardDeck({
      title: "Flashcards from Private Room",
      sourcePath: "/dashboard",
      sourceTitle: "Private room chat",
      messages: messages.map((message) => ({
        role: message.role === "user" ? "user" : "assistant",
        senderName: message.role === "user" ? "You" : "Learn'Bot",
        text: message.text,
        attachments: message.attachments,
        citations: message.citations,
      })),
    });

    if (!result.ok) {
      setUploadFeedback(result.message);
      return;
    }

    saveGeneratedFlashcardDeck(result.deck);
    router.push(`/flashcards?deck=${result.deck.id}`);
  }

  // ── Loading state ───────────────────────────────────────────────────────
  if ((loading || !hydrated) && user) {
    return (
      <AppShell
        activeHref="/dashboard"
        lockViewportHeight
        topBarRight={
          <button
            type="button"
            className="rounded-full bg-[#ffe100] px-4 py-2 text-[15px] font-black text-[#15296f]"
          >
            Socratic
          </button>
        }
      >
        <div className="flex h-full items-center justify-center rounded-[24px] border border-[#d8e5f2] bg-[#f6fbff]">
          <p className="text-base font-black text-[#18317a]">
            Loading your private room...
          </p>
        </div>
      </AppShell>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <AppShell
      activeHref="/dashboard"
      lockViewportHeight
      topBarRight={
        <button
          type="button"
          className="rounded-full bg-[#ffe100] px-4 py-2 text-[15px] font-black text-[#15296f]"
        >
          Socratic
        </button>
      }
    >
      <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex h-full min-h-0 flex-col">
          <div
            ref={scrollAreaRef}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white pr-2 pt-2 overscroll-contain"
          >
            <div className="space-y-9 pb-4">
              {messages.map((message) => {
                const userMessage = message.role === "user";

                return (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${
                      userMessage ? "justify-end" : ""
                    }`}
                  >
                    {!userMessage ? (
                      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border-[5px] border-[#1b2c77] bg-white">
                        <Image
                          src="/logo.png"
                          alt="Learn'Bot avatar"
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                      </div>
                    ) : null}

                    <div
                      className={`max-w-[560px] rounded-[18px] px-6 py-4 text-[17px] font-black leading-7 whitespace-pre-line shadow-sm ${
                        userMessage
                          ? "bg-[#99a2ae] text-white"
                          : "bg-[#1b2c77] text-white"
                      }`}
                    >
                      {message.text}
                      <ChatAttachmentPills
                        attachments={message.attachments ?? []}
                        tone="dark"
                      />
                      <ChatCitations
                        citations={message.citations ?? []}
                        tone="dark"
                      />
                    </div>

                    {userMessage ? (
                      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border-[4px] border-[#d8c4ff] bg-[radial-gradient(circle_at_35%_35%,#704cff_0%,#311760_70%)] text-base font-black text-white">
                        {userInitials}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {isTyping ? (
                <div className="flex items-end gap-3">
                  <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border-[5px] border-[#1b2c77] bg-white">
                    <Image
                      src="/logo.png"
                      alt="Learn'Bot avatar"
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className={`h-3 w-3 rounded-full ${
                          dot === 1 ? "bg-[#1b2c77]" : "bg-[#cfe1ff]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 bg-[#416f9d] px-2 pb-2 pt-2">
            {knowledgeFiles.length ? (
              <div className="mb-3 rounded-[14px] bg-[#c8e1fb] px-3 py-3 text-[#173567]">
                <p className="text-xs font-black tracking-[0.16em]">AI KNOWLEDGE</p>
                <ChatAttachmentPills attachments={knowledgeFiles.slice(-4)} />
              </div>
            ) : null}

            <div className="flex items-center gap-2 border border-[#6d93bb] bg-[#c8e1fb] px-2 py-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                className="h-10 flex-1 bg-transparent px-2 text-sm text-[#29496f] outline-none placeholder:text-[#6d89a8]"
                placeholder="Ask Learn'Bot about your uploaded files"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept={chatFileAccept}
                multiple
                onChange={handleFileSelection}
                className="hidden"
              />
              <button
                type="button"
                aria-label="Attach file"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#9fc5eb] text-[#173567]"
              >
                <PaperclipIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Send message"
                onClick={() => handleSend()}
                className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white text-[#173567]"
              >
                <SendIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCreateQuizFromChat}
                disabled={isGeneratingQuiz}
                className="inline-flex items-center gap-2 rounded-full bg-[#ffe7a8] px-5 py-2 text-sm font-black text-[#7b5b00] disabled:opacity-60"
              >
                <QuizIcon className="h-4 w-4" />
                {isGeneratingQuiz ? "กำลังสร้างควิซ..." : "Quiz from this chat"}
              </button>
              <button
                type="button"
                onClick={handleCreateFlashcardsFromChat}
                className="inline-flex items-center gap-2 rounded-full bg-[#dcecff] px-5 py-2 text-sm font-black text-[#173567]"
              >
                <CardsIcon className="h-4 w-4" />
                Flashcards from chat
              </button>

              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setInput(action)}
                  className="rounded-full bg-[#a5c9ec] px-5 py-2 text-sm font-black text-[#12296f]"
                >
                  {action}
                </button>
              ))}

              <span className="text-xs font-semibold text-white/88">
                Supports PDF, DOCX, PNG, JPG, TXT, MD, CSV, JSON, and source code notes.
              </span>
            </div>

            {uploadFeedback ? (
              <p className="mt-3 text-xs font-semibold text-[#fff3b0]">
                {uploadFeedback}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="hidden min-h-0 overflow-y-auto xl:block">
          <StudyRoadmapPanel
            variant="aside"
            onCreateQuizFromChat={handleCreateQuizFromChat}
            onCreateFlashcardsFromChat={handleCreateFlashcardsFromChat}
          />
        </aside>
      </div>
    </AppShell>
  );
}
