"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { AppShell } from "@/components/app-shell";
import { ChatAttachmentPills } from "@/components/chat-attachment-pills";
import { ChatCitations } from "@/components/chat-citations";
import { ClassroomIconBadge } from "@/components/classroom-icon";
import {
  type GroupMessage,
  useClassrooms,
} from "@/components/classroom-provider";
import { useLearning } from "@/components/learning-provider";
import {
  ArrowRightIcon,
  BookIcon,
  CardsIcon,
  CopyIcon,
  PaperclipIcon,
  QuizIcon,
  SendIcon,
  ShareIcon,
  TrashIcon,
  UsersIcon,
} from "@/components/icons";
import {
  buildAssistantReply,
  buildUploadAcknowledgement,
  chatFileAccept,
  parseChatFiles,
  shouldRespondToGroupPrompt,
  type AssistantReply,
} from "@/lib/chat-documents";
import { createGeneratedFlashcardDeck } from "@/lib/generated-chat-flashcards";
import { createGeneratedQuizSession } from "@/lib/generated-chat-quiz";

type ClassroomChatRoomProps = {
  classroomId: string;
};

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ClassroomChatRoom({ classroomId }: ClassroomChatRoomProps) {
  const router = useRouter();
  const {
    hydrated,
    addClassroomMessages,
    getClassroomById,
    deleteClassroom,
    leaveClassroom,
  } = useClassrooms();
  const { saveGeneratedFlashcardDeck, saveGeneratedQuizSession } = useLearning();
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [sharedLink, setSharedLink] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classroom = getClassroomById(classroomId);
  const knowledgeFiles = useMemo(
    () => classroom?.messages.flatMap((message) => message.attachments ?? []) ?? [],
    [classroom],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [classroom?.messages]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    if (!sharedLink) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setSharedLink(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [sharedLink]);

  useEffect(() => {
    if (!uploadFeedback) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setUploadFeedback(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [uploadFeedback]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!classroom || !draft.trim()) {
      return;
    }

    const trimmed = draft.trim();
    const drafts: Array<{
      senderRole: GroupMessage["senderRole"];
      senderName: string;
      text: string;
      citations?: GroupMessage["citations"];
    }> = [
      {
        senderRole: "me",
        senderName: "You",
        text: trimmed,
      },
    ];

    if (shouldRespondToGroupPrompt(trimmed)) {
      const reply: AssistantReply = buildAssistantReply(trimmed, knowledgeFiles);
      drafts.push({
        senderRole: "assistant",
        senderName: "Learn'Bot",
        text: reply.text,
        citations: reply.citations,
      });
    }

    const result = await addClassroomMessages(classroom.id, drafts);

    if (!result.ok) {
      setUploadFeedback(result.message);
      return;
    }

    setDraft("");
  }

  async function handleCopyCode() {
    if (!classroom) {
      return;
    }

    await navigator.clipboard.writeText(classroom.code);
    setCopied(true);
    setSharedLink(false);
  }

  function buildInviteLink() {
    if (!classroom) {
      return "";
    }

    if (typeof window === "undefined") {
      return `/classroom?invite=${encodeURIComponent(classroom.code)}`;
    }

    const url = new URL("/classroom", window.location.origin);
    url.searchParams.set("invite", classroom.code);
    return url.toString();
  }

  async function handleShareRoomLink() {
    if (!classroom) {
      return;
    }

    const url = buildInviteLink();

    if (navigator.share) {
      try {
        await navigator.share({
          title: classroom.name,
          text: `Join ${classroom.name} with room code ${classroom.code}`,
          url,
        });
        setSharedLink(true);
        setCopied(false);
        return;
      } catch {
        // Fall back to copying the invite link.
      }
    }

    await navigator.clipboard.writeText(url);
    setSharedLink(true);
    setCopied(false);
  }

  async function handleDeleteClassroom() {
    if (!classroom) {
      return;
    }

    const confirmed = window.confirm(
      classroom.isOwner
        ? `Delete "${classroom.name}"?\nThis will remove the shared room for everyone in it.`
        : `Leave "${classroom.name}"?\nYou will leave this shared room from your account.`,
    );

    if (!confirmed) {
      return;
    }

    const result = classroom.isOwner
      ? await deleteClassroom(classroom.id)
      : await leaveClassroom(classroom.id);

    if (!result.ok) {
      setUploadFeedback(result.message);
      return;
    }

    router.push("/classroom");
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    if (!classroom || !event.target.files?.length) {
      return;
    }

    const { attachments, rejected } = await parseChatFiles(event.target.files);

    if (rejected.length) {
      setUploadFeedback(rejected[0]);
    }

    if (attachments.length) {
      const acknowledgement = buildUploadAcknowledgement(attachments);
      const result = await addClassroomMessages(classroom.id, [
        {
          senderRole: "me",
          senderName: "You",
          text:
            attachments.length === 1
              ? `Uploaded ${attachments[0].name} for this room`
              : `Uploaded ${attachments.length} study files for this room`,
          attachments,
        },
        {
          senderRole: "assistant",
          senderName: "Learn'Bot",
          text: acknowledgement.text,
          citations: acknowledgement.citations,
        },
      ]);

      if (!result.ok) {
        setUploadFeedback(result.message);
      }
    }

    event.target.value = "";
  }

  function handleCreateQuizFromChat() {
    if (!classroom) {
      return;
    }

    const result = createGeneratedQuizSession({
      title: `Quiz from ${classroom.name}`,
      sourcePath: `/classroom/${encodeURIComponent(classroom.id)}`,
      sourceTitle: classroom.name,
      messages: classroom.messages.map((message) => ({
        role: message.senderRole,
        senderName: message.senderName,
        text: message.text,
        attachments: message.attachments,
        citations: message.citations,
      })),
    });

    if (!result.ok) {
      setUploadFeedback(result.message);
      return;
    }

    saveGeneratedQuizSession(result.session);
    router.push(`/quiz?generated=${result.session.id}`);
  }

  function handleCreateFlashcardsFromChat() {
    if (!classroom) {
      return;
    }

    const result = createGeneratedFlashcardDeck({
      title: `Flashcards from ${classroom.name}`,
      sourcePath: `/classroom/${encodeURIComponent(classroom.id)}`,
      sourceTitle: classroom.name,
      messages: classroom.messages.map((message) => ({
        role: message.senderRole,
        senderName: message.senderName,
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

  if (!classroom) {
    return (
      <AppShell
        activeHref="/classroom"
        lockViewportHeight
        topBarRight={
          <span className="rounded-full bg-[#ffde43] px-4 py-2 text-[11px] font-black tracking-[0.28em] text-[#15296f]">
            CLASSROOM
          </span>
        }
      >
        <div className="flex min-h-full items-center justify-center rounded-[24px] border border-[#d8e5f2] bg-[#f6fbff] p-8 text-center">
          <div className="max-w-[520px] space-y-4">
            <p className="text-[13px] font-black tracking-[0.3em] text-[#5b7aa4]">
              GROUP CHAT
            </p>
            <h1 className="text-[32px] font-black text-[#18317a]">
              {hydrated ? "This classroom was not found" : "Loading classroom..."}
            </h1>
              <p className="text-[15px] leading-7 text-[#49658c]">
                {hydrated
                  ? "The link may be invalid, or the room has not been created in this account yet."
                  : "Checking your classroom data first."}
              </p>
            <Link
              href="/classroom"
              className="inline-flex items-center gap-2 rounded-full bg-[#1b2c77] px-5 py-3 text-sm font-black text-white"
            >
              Back to classroom list
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      activeHref="/classroom"
      lockViewportHeight
      topBarRight={
        <span className="rounded-full bg-[#ffde43] px-4 py-2 text-[11px] font-black tracking-[0.28em] text-[#15296f]">
          {classroom.code}
        </span>
      }
    >
      <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[24px] border border-[#d8e5f2] bg-[#f8fbff]">
          <div className="border-b border-[#d8e5f2] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <ClassroomIconBadge icon={classroom.icon} />
                <div>
                  <p className="text-[13px] font-black tracking-[0.28em] text-[#5b7aa4]">
                    GROUP CHAT
                  </p>
                  <h1 className="mt-2 text-[30px] font-black text-[#18317a]">
                    {classroom.name}
                  </h1>
                  <p className="mt-1 text-sm leading-6 text-[#49658c]">
                    {"Upload materials into this room, then ask Learn'Bot to summarize, explain, or quiz the group from those files."}
                  </p>
                </div>
              </div>

              <Link
                href="/classroom"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-[#1b2c77] shadow-sm"
              >
                View all rooms
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto px-5 py-5 xl:px-6">
            <div className="flex min-h-full flex-col gap-4">
              {classroom.messages.map((message) => {
                const isMe = message.senderRole === "me";
                const isSystem = message.senderRole === "system";
                const isAssistant = message.senderRole === "assistant";
                const headerName = isMe ? "You" : message.senderName;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[72%] rounded-[24px] px-4 py-3 whitespace-pre-line break-words shadow-sm xl:max-w-[78%] ${
                        isSystem
                          ? "bg-[#eef5ff] text-[#355683]"
                          : isAssistant
                            ? "bg-[#1b2c77] text-white"
                            : isMe
                              ? "bg-[#99a2ae] text-white"
                              : "bg-white text-[#18317a]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[12px] font-black tracking-[0.08em] opacity-80">
                        <span>{headerName}</span>
                        <span>|</span>
                        <span>{formatMessageTime(message.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-[15px] leading-7 break-words">
                        {message.text}
                      </p>
                      <ChatAttachmentPills
                        attachments={message.attachments ?? []}
                        tone={isMe || isAssistant ? "dark" : "light"}
                      />
                      <ChatCitations
                        citations={message.citations ?? []}
                        tone={isMe || isAssistant ? "dark" : "light"}
                      />
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-[#d8e5f2] bg-white px-5 py-4">
            <input
              ref={fileInputRef}
              type="file"
              accept={chatFileAccept}
              multiple
              onChange={handleFileSelection}
              className="hidden"
            />

            {knowledgeFiles.length ? (
              <div className="mb-3 rounded-[18px] bg-[#f7fbff] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black tracking-[0.16em] text-[#5b7aa4]">
                      AI KNOWLEDGE IN THIS ROOM
                    </p>
                    <ChatAttachmentPills attachments={knowledgeFiles.slice(-4)} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCreateQuizFromChat}
                      className="inline-flex items-center gap-2 rounded-full bg-[#ffe7a8] px-4 py-2 text-sm font-black text-[#7b5b00]"
                    >
                      <QuizIcon className="h-4 w-4" />
                      Quiz from chat
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateFlashcardsFromChat}
                      className="inline-flex items-center gap-2 rounded-full bg-[#dcecff] px-4 py-2 text-sm font-black text-[#173567]"
                    >
                      <CardsIcon className="h-4 w-4" />
                      Flashcards
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCreateQuizFromChat}
                  className="inline-flex items-center gap-2 rounded-full bg-[#ffe7a8] px-4 py-2 text-sm font-black text-[#7b5b00]"
                >
                  <QuizIcon className="h-4 w-4" />
                  Quiz from chat
                </button>
                <button
                  type="button"
                  onClick={handleCreateFlashcardsFromChat}
                  className="inline-flex items-center gap-2 rounded-full bg-[#dcecff] px-4 py-2 text-sm font-black text-[#173567]"
                >
                  <CardsIcon className="h-4 w-4" />
                  Flashcards
                </button>
              </div>
            )}

            <form
              onSubmit={handleSend}
              className="grid grid-cols-[minmax(0,1fr)_56px_56px] gap-3"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Talk to the group or ask Learn'Bot about uploaded files"
                className="h-14 min-w-0 rounded-[18px] border border-[#c8d9ed] bg-[#f7fbff] px-4 text-[15px] text-[#18317a] outline-none focus:border-[#1b2c77]"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#cfe1ff] text-[#1b2c77]"
                aria-label="Attach study files"
              >
                <PaperclipIcon className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={!draft.trim()}
                className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#1b2c77] text-white shadow-[0_12px_24px_rgba(27,44,119,0.18)] disabled:bg-[#a5b6d9]"
                aria-label="Send message"
              >
                <SendIcon className="h-5 w-5" />
              </button>
            </form>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[#5b7aa4]">
                Supports PDF, DOCX, PNG, JPG, TXT, MD, CSV, JSON, and source code notes.
              </p>
              {uploadFeedback ? (
                <p className="text-xs font-semibold text-[#b45309]">
                  {uploadFeedback}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-y-auto rounded-[24px] bg-[#eef5ff] p-5">
          <div className="rounded-[22px] bg-white p-4 shadow-sm">
            <p className="text-[13px] font-black tracking-[0.28em] text-[#5b7aa4]">
              ROOM CODE
            </p>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] bg-[#f7fbff] px-4 py-3">
              <span className="text-[20px] font-black text-[#18317a]">
                {classroom.code}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef5ff] text-[#1b2c77]"
                  aria-label="Copy room code"
                >
                  <CopyIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleShareRoomLink}
                  className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef5ff] text-[#1b2c77]"
                  aria-label="Share room invite link"
                >
                  <ShareIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#49658c]">
              {copied
                ? "Room code copied"
                : sharedLink
                  ? "Invite link copied"
                  : "Copy the code or share an invite link for this room."}
            </p>
            <button
              type="button"
              onClick={handleDeleteClassroom}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#fff1f3] px-4 py-3 text-sm font-black text-[#c03945]"
            >
              <TrashIcon className="h-4 w-4" />
              {classroom.isOwner ? "Delete room" : "Leave room"}
            </button>
          </div>

          <div className="rounded-[22px] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#18317a]">
              <UsersIcon className="h-5 w-5" />
              <p className="text-[13px] font-black tracking-[0.28em]">MEMBERS</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {classroom.members.map((member) => (
                <span
                  key={member}
                  className="rounded-full bg-[#eef5ff] px-3 py-2 text-sm font-black text-[#18317a]"
                >
                  {member}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#18317a]">
              <BookIcon className="h-5 w-5" />
              <p className="text-[13px] font-black tracking-[0.28em]">MATERIALS</p>
            </div>

            <div className="mt-4 space-y-3">
              {classroom.materials.length ? (
                classroom.materials.map((material) => (
                  <div
                    key={material}
                    className="rounded-[18px] bg-[#f7fbff] px-4 py-3 text-sm font-semibold leading-6 break-words text-[#355683]"
                  >
                    {material}
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] bg-[#f7fbff] px-4 py-3 text-sm leading-6 text-[#49658c]">
                  {"No materials yet. Upload a study file into the chat to let Learn'Bot read it."}
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto rounded-[22px] bg-white px-4 py-4 text-sm leading-7 text-[#49658c] shadow-sm">
            {'Ask Learn\'Bot with prompts like "summarize the uploaded files", "explain this lesson", or "make a quiz from these notes".'}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
