import {
  type ChatAttachment,
  formatAttachmentSize,
} from "@/lib/chat-documents";

type ChatAttachmentPillsProps = {
  attachments: ChatAttachment[];
  tone?: "light" | "dark";
};

export function ChatAttachmentPills({
  attachments,
  tone = "light",
}: ChatAttachmentPillsProps) {
  if (!attachments.length) {
    return null;
  }

  const toneClassName =
    tone === "dark"
      ? "bg-white/15 text-white ring-1 ring-white/15"
      : "bg-[#eef5ff] text-[#355683] ring-1 ring-[#d7e4f2]";

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <span
          key={attachment.id}
          className={`inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${toneClassName}`}
          title={attachment.name}
        >
          <span className="truncate">{attachment.name}</span>
          <span className="shrink-0 opacity-70">
            {formatAttachmentSize(attachment.size)}
          </span>
        </span>
      ))}
    </div>
  );
}
