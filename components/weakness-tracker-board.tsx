"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useLearning } from "@/components/learning-provider";
import { getStudyRoadmap, getWeaknessInsights } from "@/lib/learning-insights";

export function WeaknessTrackerBoard() {
  const { attempts, hydrated, clearAttempts } = useLearning();

  const wrongAttempts = attempts.filter((attempt) => !attempt.isCorrect);
  const totalAttempts = attempts.length;
  const totalCorrect = attempts.filter((attempt) => attempt.isCorrect).length;
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const weaknesses = getWeaknessInsights(attempts);
  const topWeakness = weaknesses[0];
  const roadmap = getStudyRoadmap(attempts);

  return (
    <AppShell activeHref="/weakness-tracker">
      <div className="flex min-h-[744px] flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Weakness Tracker
            </p>
            <h1 className="mt-2 text-3xl font-black text-[#1b2c77]">
              Your repair map from quiz mistakes
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            {topWeakness ? (
              <Link
                href={`/quiz?mode=repair&subject=${encodeURIComponent(topWeakness.subject)}&topic=${encodeURIComponent(topWeakness.topic)}&concept=${encodeURIComponent(topWeakness.concept)}`}
                className="rounded-full bg-[#1b2c77] px-5 py-3 text-sm font-black text-white"
              >
                Repair top weakness
              </Link>
            ) : null}
            <Link
              href="/quiz?mode=adaptive"
              className="rounded-full bg-[#ffe6a6] px-5 py-3 text-sm font-black text-[#7b5b00]"
            >
              Start adaptive repair
            </Link>
            <button
              type="button"
              onClick={clearAttempts}
              className="rounded-full bg-[#f3f6fb] px-5 py-3 text-sm font-black text-slate-600"
            >
              Clear local practice data
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[18px] bg-[#eef6ff] p-5">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Attempts
            </p>
            <p className="mt-3 text-4xl font-black text-[#1b2c77]">{totalAttempts}</p>
            <p className="mt-2 text-sm text-slate-600">
              Total answers Learn&apos;Bot has stored in this account.
            </p>
          </div>
          <div className="rounded-[18px] bg-[#eef6ff] p-5">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Accuracy
            </p>
            <p className="mt-3 text-4xl font-black text-[#1b2c77]">{accuracy}%</p>
            <p className="mt-2 text-sm text-slate-600">
              Overall quiz accuracy across your recorded attempts.
            </p>
          </div>
          <div className="rounded-[18px] bg-[#eef6ff] p-5">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Focus Areas
            </p>
            <p className="mt-3 text-4xl font-black text-[#1b2c77]">{weaknesses.length}</p>
            <p className="mt-2 text-sm text-slate-600">
              Topics or concepts that deserve a targeted repair session.
            </p>
          </div>
        </div>

        {!hydrated ? (
          <section className="rounded-[18px] bg-[#f8fbff] p-6">
            <p className="text-lg font-black text-[#1b2c77]">
              Loading your learning history...
            </p>
          </section>
        ) : weaknesses.length === 0 ? (
          <section className="rounded-[18px] border border-dashed border-[#d7e2ef] bg-[#f8fbff] p-6">
            <h2 className="text-2xl font-black text-[#1b2c77]">
              No weak points recorded yet
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
              Finish a quiz first and Learn&apos;Bot will start mapping the topics you still miss, then turn them into focused repair sessions automatically.
            </p>
            <Link
              href="/quiz"
              className="mt-5 inline-flex rounded-full bg-[#1b2c77] px-6 py-3 text-sm font-black text-white"
            >
              Start a quiz
            </Link>
          </section>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-4">
              {weaknesses.map((entry) => {
                const toneClassName =
                  entry.masteryLevel === "critical"
                    ? "bg-[#fff2f2] text-rose-700"
                    : entry.masteryLevel === "watch"
                      ? "bg-[#fff8e7] text-[#9a6a00]"
                      : "bg-[#eef7ea] text-[#315c1e]";

                return (
                  <article
                    key={entry.key}
                    className="rounded-[20px] border border-[#d7e2ef] bg-white p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                          {entry.subject}
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-[#1b2c77]">
                          {entry.topic}
                        </h2>
                        <p className="mt-1 text-base font-semibold text-slate-600">
                          Concept to fix: {entry.concept}
                        </p>
                      </div>
                      <div className={`rounded-[16px] px-4 py-3 text-right ${toneClassName}`}>
                        <p className="text-sm font-black uppercase tracking-[0.16em]">
                          {entry.masteryLevel}
                        </p>
                        <p className="mt-1 text-2xl font-black">{entry.accuracy}%</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-[1fr_250px]">
                      <div className="rounded-[16px] bg-[#f7f9fd] p-4">
                        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                          Latest miss + next action
                        </p>
                        <p className="mt-2 text-base font-semibold leading-7 text-slate-700">
                          {entry.lastPrompt}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          {entry.lastExplanation}
                        </p>
                        <p className="mt-4 text-sm font-semibold leading-7 text-[#355683]">
                          {entry.recommendedAction}
                        </p>
                      </div>

                      <div className="rounded-[16px] bg-[#eef6ff] p-4">
                        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                          Repair actions
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          Wrong {entry.wrongCount} times from {entry.totalCount} attempts.
                        </p>
                        <div className="mt-4 flex flex-col gap-3">
                          <Link
                            href={`/quiz?mode=repair&subject=${encodeURIComponent(entry.subject)}&topic=${encodeURIComponent(entry.topic)}&concept=${encodeURIComponent(entry.concept)}`}
                            className="inline-flex justify-center rounded-full bg-[#1b2c77] px-5 py-3 text-sm font-black text-white"
                          >
                            Start repair session
                          </Link>
                          <Link
                            href={`/quiz?mode=adaptive&subject=${encodeURIComponent(entry.subject)}`}
                            className="inline-flex justify-center rounded-full bg-[#ffe6a6] px-5 py-3 text-sm font-black text-[#7b5b00]"
                          >
                            Run subject repair
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="space-y-4">
              {topWeakness ? (
                <section className="rounded-[18px] bg-[#fff5d6] p-5">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-[#9a6a00]">
                    Top priority
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-[#7b5b00]">
                    {topWeakness.topic}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-[#9a6a00]">
                    {topWeakness.concept}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[#7b5b00]">
                    {topWeakness.recommendedAction}
                  </p>
                  <Link
                    href={`/quiz?mode=repair&subject=${encodeURIComponent(topWeakness.subject)}&topic=${encodeURIComponent(topWeakness.topic)}&concept=${encodeURIComponent(topWeakness.concept)}`}
                    className="mt-4 inline-flex rounded-full bg-[#7b5b00] px-5 py-3 text-sm font-black text-white"
                  >
                    Start repair now
                  </Link>
                </section>
              ) : null}

              <section className="rounded-[18px] bg-[#eef6ff] p-5">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                  Roadmap summary
                </p>
                <p className="mt-3 text-base leading-8 text-slate-600">
                  {roadmap.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {roadmap.actions.slice(0, 2).map((action) => (
                    <Link
                      key={action.id}
                      href={action.href}
                      className={`rounded-full px-4 py-2 text-sm font-black ${
                        action.tone === "primary"
                          ? "bg-[#1b2c77] text-white"
                          : "bg-[#ffe6a6] text-[#7b5b00]"
                      }`}
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </section>

              <section className="rounded-[18px] bg-[#eef6ff] p-5">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                  Recent mistakes
                </p>
                <div className="mt-4 space-y-3">
                  {wrongAttempts.slice(-5).reverse().map((attempt) => (
                    <div key={attempt.id} className="rounded-[14px] bg-white p-4">
                      <p className="text-sm font-black text-[#1b2c77]">{attempt.topic}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b87ac]">
                        {attempt.concept}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{attempt.prompt}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[18px] bg-[#f8fbff] p-5">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                  Why Learn&apos;Bot is different
                </p>
                <p className="mt-4 text-base leading-8 text-slate-600">
                  Instead of stopping at document chat, Learn&apos;Bot remembers what you miss and turns that history into a personal repair loop. The more you practice, the more focused the next session becomes.
                </p>
              </section>
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
