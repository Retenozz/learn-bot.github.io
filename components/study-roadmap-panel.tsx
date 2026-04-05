"use client";

import Link from "next/link";
import { useLearning } from "@/components/learning-provider";
import { CardsIcon, QuizIcon, SparklesIcon, TargetIcon } from "@/components/icons";
import { getStudyRoadmap } from "@/lib/learning-insights";

type StudyRoadmapPanelProps = {
  onCreateQuizFromChat: () => void;
  onCreateFlashcardsFromChat: () => void;
  variant?: "wide" | "aside";
};

export function StudyRoadmapPanel({
  onCreateQuizFromChat,
  onCreateFlashcardsFromChat,
  variant = "wide",
}: StudyRoadmapPanelProps) {
  const { attempts } = useLearning();
  const roadmap = getStudyRoadmap(attempts);

  if (variant === "aside") {
    return (
      <div className="flex min-h-0 flex-col gap-4">
        <section className="rounded-[24px] border border-[#d7e2ef] bg-[linear-gradient(135deg,#eff7ff_0%,#ffffff_100%)] p-5">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#6b87ac]">
            Study Roadmap
          </p>
          <h2 className="mt-3 text-2xl font-black leading-tight text-[#1b2c77]">
            {roadmap.nextFocus
              ? roadmap.nextFocus.concept
              : "Build your first repair loop"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {roadmap.summary}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[18px] bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                Accuracy
              </p>
              <p className="mt-2 text-2xl font-black text-[#1b2c77]">
                {roadmap.accuracy}%
              </p>
            </div>
            <div className="rounded-[18px] bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                Attempts
              </p>
              <p className="mt-2 text-2xl font-black text-[#1b2c77]">
                {roadmap.totalAttempts}
              </p>
            </div>
            <div className="rounded-[18px] bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                Weak points
              </p>
              <p className="mt-2 text-2xl font-black text-[#1b2c77]">
                {roadmap.weaknessCount}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] bg-[#1b2c77] p-5 text-white">
          <div className="flex items-center gap-2 text-white/80">
            <SparklesIcon className="h-5 w-5" />
            <p className="text-xs font-black uppercase tracking-[0.18em]">
              From this chat
            </p>
          </div>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={onCreateQuizFromChat}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-[#1b2c77]"
            >
              <QuizIcon className="h-4 w-4" />
              Quiz from chat
            </button>
            <button
              type="button"
              onClick={onCreateFlashcardsFromChat}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ffe7a8] px-4 py-3 text-sm font-black text-[#7b5b00]"
            >
              <CardsIcon className="h-4 w-4" />
              Flashcards from chat
            </button>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#d7e2ef] bg-white p-5">
          <div className="flex items-center gap-2 text-[#1b2c77]">
            <TargetIcon className="h-5 w-5" />
            <p className="text-xs font-black uppercase tracking-[0.18em]">
              Next steps
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {roadmap.actions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className={`inline-flex w-full justify-center rounded-full px-4 py-3 text-sm font-black ${
                  action.tone === "primary"
                    ? "bg-[#1b2c77] text-white"
                    : action.tone === "accent"
                      ? "bg-[#ffe7a8] text-[#7b5b00]"
                      : "bg-[#dcecff] text-[#173567]"
                }`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <section className="mb-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[24px] border border-[#d7e2ef] bg-[linear-gradient(135deg,#eff7ff_0%,#ffffff_100%)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#6b87ac]">
              Study Roadmap
            </p>
            <h2 className="mt-2 text-[28px] font-black text-[#1b2c77]">
              {roadmap.nextFocus
                ? `Next focus: ${roadmap.nextFocus.concept}`
                : "Build your first repair loop"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              {roadmap.summary}
            </p>
          </div>

          <div className="rounded-[18px] bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Accuracy
            </p>
            <p className="mt-1 text-3xl font-black text-[#1b2c77]">
              {roadmap.accuracy}%
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[18px] bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Attempts
            </p>
            <p className="mt-2 text-2xl font-black text-[#1b2c77]">
              {roadmap.totalAttempts}
            </p>
          </div>
          <div className="rounded-[18px] bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Weak points
            </p>
            <p className="mt-2 text-2xl font-black text-[#1b2c77]">
              {roadmap.weaknessCount}
            </p>
          </div>
          <div className="rounded-[18px] bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Strongest subject
            </p>
            <p className="mt-2 text-lg font-black text-[#1b2c77]">
              {roadmap.strongestSubject ?? "Not enough history"}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {roadmap.actions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className={`rounded-full px-5 py-3 text-sm font-black ${
                action.tone === "primary"
                  ? "bg-[#1b2c77] text-white"
                  : action.tone === "accent"
                    ? "bg-[#ffe7a8] text-[#7b5b00]"
                    : "bg-[#dcecff] text-[#173567]"
              }`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-[24px] bg-[#1b2c77] p-5 text-white">
          <div className="flex items-center gap-2 text-white/80">
            <SparklesIcon className="h-5 w-5" />
            <p className="text-xs font-black uppercase tracking-[0.18em]">
              From this chat
            </p>
          </div>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={onCreateQuizFromChat}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-[#1b2c77]"
            >
              <QuizIcon className="h-4 w-4" />
              Quiz from chat
            </button>
            <button
              type="button"
              onClick={onCreateFlashcardsFromChat}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ffe7a8] px-4 py-3 text-sm font-black text-[#7b5b00]"
            >
              <CardsIcon className="h-4 w-4" />
              Flashcards from chat
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#d7e2ef] bg-white p-5">
          <div className="flex items-center gap-2 text-[#1b2c77]">
            <TargetIcon className="h-5 w-5" />
            <p className="text-xs font-black uppercase tracking-[0.18em]">
              Immediate focus
            </p>
          </div>
          <p className="mt-4 text-lg font-black text-[#1b2c77]">
            {roadmap.nextFocus
              ? `${roadmap.nextFocus.topic} - ${roadmap.nextFocus.concept}`
              : "Generate your first quiz to unlock a personal roadmap."}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {roadmap.nextFocus
              ? roadmap.nextFocus.recommendedAction
              : "Once you answer a few quiz questions, Learn'Bot will rank the concepts you still miss and suggest the next repair session here automatically."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/weakness-tracker"
              className="rounded-full bg-[#dcecff] px-4 py-3 text-sm font-black text-[#173567]"
            >
              Open tracker
            </Link>
            <Link
              href="/flashcards"
              className="rounded-full bg-[#f4f7fb] px-4 py-3 text-sm font-black text-slate-600"
            >
              View flashcards
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
