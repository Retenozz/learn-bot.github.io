"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useLearning } from "@/components/learning-provider";
import { CardsIcon, QuizIcon } from "@/components/icons";
import type { GeneratedFlashcardDeck } from "@/lib/generated-chat-flashcards";

type FlashcardsBoardProps = {
  deckFromQuery?: string;
};

function formatDeckDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function FlashcardsBoard({ deckFromQuery }: FlashcardsBoardProps) {
  const { generatedFlashcardDecks, hydrated } = useLearning();
  const recentDecks = Object.values(generatedFlashcardDecks).sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const activeDeck = deckFromQuery ? generatedFlashcardDecks[deckFromQuery] : undefined;

  if (deckFromQuery && !hydrated) {
    return (
      <AppShell activeHref="/flashcards">
        <div className="flex min-h-[744px] flex-col gap-5">
          <section className="rounded-[20px] border border-[#d7e2ef] bg-[#f8fbff] p-6">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Flashcards
            </p>
            <h1 className="mt-3 text-3xl font-black text-[#1b2c77]">
              Loading your study deck
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
              Learn&apos;Bot is opening the flashcards saved in your account.
            </p>
          </section>
        </div>
      </AppShell>
    );
  }

  if (deckFromQuery && hydrated && !activeDeck) {
    return (
      <AppShell activeHref="/flashcards">
        <div className="flex min-h-[744px] flex-col gap-5">
          <section className="rounded-[20px] border border-dashed border-[#d7e2ef] bg-[#f8fbff] p-6">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Flashcards
            </p>
            <h1 className="mt-3 text-3xl font-black text-[#1b2c77]">
              This flashcard deck is not available
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
              The deck could not be found in this account. Generate a fresh deck from chat if needed.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-full bg-[#1b2c77] px-6 py-3 text-sm font-black text-white"
              >
                Back to private room
              </Link>
              <Link
                href="/classroom"
                className="rounded-full bg-[#cfe5ff] px-6 py-3 text-sm font-black text-[#173567]"
              >
                Open classrooms
              </Link>
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  if (!activeDeck) {
    return (
      <AppShell activeHref="/flashcards">
        <div className="flex min-h-[744px] flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                Flashcards
              </p>
              <h1 className="mt-2 text-3xl font-black text-[#1b2c77]">
                Review decks generated from your chats
              </h1>
            </div>
            <Link
              href="/dashboard"
              className="rounded-full bg-[#1b2c77] px-5 py-3 text-sm font-black text-white"
            >
              Open private room
            </Link>
          </div>

          {recentDecks.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {recentDecks.map((deck) => (
                <article
                  key={deck.id}
                  className="rounded-[20px] border border-[#d7e2ef] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                        {deck.subject}
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-[#1b2c77]">
                        {deck.title}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {deck.description}
                      </p>
                    </div>
                    <div className="rounded-[16px] bg-[#eef6ff] px-4 py-3 text-right">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                        Cards
                      </p>
                      <p className="mt-1 text-2xl font-black text-[#1b2c77]">
                        {deck.cards.length}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[16px] bg-[#f7fbff] p-4">
                    <p className="text-sm font-black text-[#1b2c77]">
                      Source: {deck.sourceTitle}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Created {formatDeckDate(deck.createdAt)}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/flashcards?deck=${encodeURIComponent(deck.id)}`}
                      className="inline-flex items-center gap-2 rounded-full bg-[#1b2c77] px-5 py-3 text-sm font-black text-white"
                    >
                      <CardsIcon className="h-4 w-4" />
                      Open deck
                    </Link>
                    <Link
                      href={deck.sourcePath}
                      className="rounded-full bg-[#cfe5ff] px-5 py-3 text-sm font-black text-[#173567]"
                    >
                      Back to source chat
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <section className="rounded-[20px] border border-dashed border-[#d7e2ef] bg-[#f8fbff] p-6">
              <h2 className="text-2xl font-black text-[#1b2c77]">
                No flashcard decks yet
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
                Open a private room or classroom chat, then use the flashcards action to turn the conversation into a review deck that stays with your account.
              </p>
            </section>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeHref="/flashcards">
      <FlashcardDeckView key={activeDeck.id} activeDeck={activeDeck} />
    </AppShell>
  );
}

function FlashcardDeckView({
  activeDeck,
}: {
  activeDeck: GeneratedFlashcardDeck;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = activeDeck.cards[currentIndex];

  return (
    <div className="grid min-h-[744px] gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-[24px] border border-[#d7e2ef] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Flashcards
            </p>
            <h1 className="mt-2 text-3xl font-black text-[#1b2c77]">
              {activeDeck.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              {activeDeck.description}
            </p>
          </div>
          <div className="rounded-[18px] bg-[#eef6ff] px-4 py-3 text-right">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Progress
            </p>
            <p className="mt-1 text-2xl font-black text-[#1b2c77]">
              {currentIndex + 1}/{activeDeck.cards.length}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          className={`mt-6 flex min-h-[360px] w-full flex-col justify-between rounded-[28px] border px-6 py-6 text-left shadow-sm ${
            revealed
              ? "border-[#dbe8c8] bg-[#eef7ea]"
              : "border-[#d7e2ef] bg-[#f7fbff]"
          }`}
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6b87ac]">
              {revealed ? "Back" : "Front"}
            </p>
            <p className="mt-5 text-[28px] font-black leading-[1.35] text-[#1b2c77]">
              {revealed ? card.back : card.front}
            </p>
          </div>

          <div className="rounded-[18px] bg-white/70 px-4 py-3 text-sm leading-7 text-slate-600">
            {revealed
              ? `Source detail: ${card.sourceFact}`
              : "Tap the card to reveal the answer."}
          </div>
        </button>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setCurrentIndex((index) => Math.max(0, index - 1));
              setRevealed(false);
            }}
            disabled={currentIndex === 0}
            className="rounded-full bg-[#cfe5ff] px-5 py-3 text-sm font-black text-[#173567] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous card
          </button>
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            className="rounded-full bg-[#ffe7a8] px-5 py-3 text-sm font-black text-[#7b5b00]"
          >
            {revealed ? "Hide answer" : "Reveal answer"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentIndex((index) =>
                Math.min(activeDeck.cards.length - 1, index + 1),
              );
              setRevealed(false);
            }}
            disabled={currentIndex === activeDeck.cards.length - 1}
            className="rounded-full bg-[#1b2c77] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next card
          </button>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-[20px] bg-[#eef6ff] p-5">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
            Deck info
          </p>
          <p className="mt-3 text-lg font-black text-[#1b2c77]">
            {activeDeck.sourceTitle}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Subject: {activeDeck.subject}
          </p>
          <p className="mt-1 text-sm leading-7 text-slate-600">
            Created {formatDeckDate(activeDeck.createdAt)}
          </p>
        </section>

        <section className="rounded-[20px] border border-[#d7e2ef] bg-white p-5">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
            Next actions
          </p>
          <div className="mt-4 space-y-3">
            <Link
              href={activeDeck.sourcePath}
              className="inline-flex w-full justify-center rounded-full bg-[#1b2c77] px-5 py-3 text-sm font-black text-white"
            >
              Return to chat
            </Link>
            <Link
              href="/quiz"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#cfe5ff] px-5 py-3 text-sm font-black text-[#173567]"
            >
              <QuizIcon className="h-4 w-4" />
              Open quiz practice
            </Link>
            <Link
              href="/flashcards"
              className="inline-flex w-full justify-center rounded-full bg-[#f4f7fb] px-5 py-3 text-sm font-black text-slate-600"
            >
              View all decks
            </Link>
          </div>
        </section>

        <section className="rounded-[20px] bg-[#f8fbff] p-5">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
            Why this helps
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Flashcards give you a fast recall loop before you jump back into quizzes, so Learn&apos;Bot can support both memory review and targeted repair practice from the same study chat.
          </p>
        </section>
      </aside>
    </div>
  );
}
