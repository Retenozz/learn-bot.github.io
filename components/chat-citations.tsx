import { BookIcon } from "@/components/icons";
import type { ChatCitation } from "@/lib/chat-documents";

type ChatCitationsProps = {
  citations: ChatCitation[];
  tone?: "light" | "dark";
};

export function ChatCitations({
  citations,
  tone = "light",
}: ChatCitationsProps) {
  if (!citations.length) {
    return null;
  }

  const containerClassName =
    tone === "dark"
      ? "border border-white/12 bg-white/10 text-white"
      : "border border-[#d7e4f2] bg-[#f7fbff] text-[#244574]";

  const metaClassName =
    tone === "dark" ? "text-white/72" : "text-[#6484ad]";

  return (
    <div className="mt-3 space-y-2">
      <details className={`rounded-[16px] px-3 py-2 ${containerClassName}`}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-black uppercase tracking-[0.18em]">
          <span className="flex items-center gap-2">
            <BookIcon className="h-4 w-4" />
            <span>Sources</span>
          </span>
          <span className={metaClassName}>{citations.length}</span>
        </summary>

        <div className="mt-2 max-h-[200px] space-y-2 overflow-y-auto pr-1">
          {citations.slice(0, 3).map((citation) => (
            <div
              key={citation.id}
              className="rounded-[12px] bg-white/10 px-3 py-2"
            >
              <p className="truncate text-xs font-black">{citation.attachmentName}</p>
              <p
                className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${metaClassName}`}
              >
                {citation.label}
              </p>
              <p className="mt-1 text-xs leading-6 break-all whitespace-pre-wrap">
                {citation.snippet}
              </p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
