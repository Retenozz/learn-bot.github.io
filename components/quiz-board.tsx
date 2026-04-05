"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useLearning } from "@/components/learning-provider";
import type { QuizSubject } from "@/data/quiz-bank";
import type { GeneratedQuizSession } from "@/lib/generated-chat-quiz";
import { buildAdaptivePracticePlan } from "@/lib/learning-insights";

type SessionAnswer = {
  questionId: string;
  isCorrect: boolean;
};

type QuizBoardProps = {
  topicFromQuery?: string;
  conceptFromQuery?: string;
  modeFromQuery?: string;
  subjectFromQuery?: QuizSubject;
  generatedFromQuery?: string;
};

type QuizSessionProps = {
  subject: QuizSubject;
  topicFromQuery?: string;
  conceptFromQuery?: string;
  modeFromQuery?: string;
  generatedSession?: GeneratedQuizSession;
};

const standardSubjects: QuizSubject[] = ["Physics", "Mathematics"];

export function QuizBoard({
  topicFromQuery,
  conceptFromQuery,
  modeFromQuery,
  subjectFromQuery,
  generatedFromQuery,
}: QuizBoardProps) {
  const { generatedQuizSessions, hydrated, deleteGeneratedQuizSession } = useLearning();
  const router = useRouter();
  const generatedSession = generatedFromQuery
    ? generatedQuizSessions[generatedFromQuery]
    : undefined;
  const [subject, setSubject] = useState<QuizSubject>(subjectFromQuery ?? "Physics");
  const activeSubject = generatedSession?.subject ?? subject;
  const sessionKey = [
    activeSubject,
    topicFromQuery ?? "all",
    conceptFromQuery ?? "all",
    modeFromQuery ?? "default",
    generatedFromQuery ?? "standard",
  ].join("-");

  // Sorted list of all previously generated quiz sessions (newest first)
  const allGeneratedSessions = Object.values(generatedQuizSessions).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  function handleDelete(e: React.MouseEvent, sessionId: string) {
    e.preventDefault();
    e.stopPropagation();
    deleteGeneratedQuizSession(sessionId);
    // ถ้ากำลังดู session ที่ถูกลบอยู่ ให้กลับไปหน้า quiz หลัก
    if (generatedFromQuery === sessionId) {
      router.push("/quiz");
    }
  }

  if (generatedFromQuery && !hydrated) {
    return (
      <AppShell activeHref="/quiz">
        <div className="flex min-h-[744px] flex-col gap-5">
          <section className="rounded-[18px] border border-[#d7e2ef] bg-[#f8fbff] p-6">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Chat Quiz
            </p>
            <h1 className="mt-3 text-3xl font-black text-[#1b2c77]">
              Loading your generated quiz
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
              Learn&apos;Bot is opening the quiz stored in your account.
            </p>
          </section>
        </div>
      </AppShell>
    );
  }

  if (generatedFromQuery && hydrated && !generatedSession) {
    return (
      <AppShell activeHref="/quiz">
        <div className="flex min-h-[744px] flex-col gap-5">
          <section className="rounded-[18px] border border-dashed border-[#d7e2ef] bg-[#f8fbff] p-6">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Chat Quiz
            </p>
            <h1 className="mt-3 text-3xl font-black text-[#1b2c77]">
              This generated quiz is not available
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
              The quiz could not be found in this account yet. Generate it again from the latest chat if needed.
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

  return (
    <AppShell activeHref="/quiz">
      <div className="flex min-h-[744px] flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          {generatedSession ? (
            <>
              <span className="rounded-full bg-[#ffe6a6] px-4 py-2 text-sm font-black text-[#7b5b00]">
                Chat quiz
              </span>
              <span className="rounded-full bg-[#e7f2ff] px-4 py-2 text-sm font-black text-[#173567]">
                {generatedSession.sourceTitle}
              </span>
              <Link
                href={generatedSession.sourcePath}
                className="rounded-full bg-[#1b2c77] px-4 py-2 text-sm font-black text-white"
              >
                Back to chat
              </Link>
            </>
          ) : (
            <>
              {standardSubjects.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSubject(item)}
                  className={`rounded-full px-5 py-2.5 text-sm font-black transition ${
                    activeSubject === item
                      ? "bg-[#1b2c77] text-white"
                      : "bg-[#cfe5ff] text-[#173567]"
                  }`}
                >
                  {item}
                </button>
              ))}

              {modeFromQuery === "adaptive" ? (
                <span className="rounded-full bg-[#ffe6a6] px-4 py-2 text-sm font-black text-[#7b5b00]">
                  Adaptive mode
                </span>
              ) : modeFromQuery === "repair" ? (
                <span className="rounded-full bg-[#ffd8dd] px-4 py-2 text-sm font-black text-[#a93b4a]">
                  Repair mode
                </span>
              ) : null}

              {topicFromQuery ? (
                <span className="rounded-full bg-[#e7f2ff] px-4 py-2 text-sm font-black text-[#173567]">
                  Focus topic: {topicFromQuery}
                </span>
              ) : null}

              {conceptFromQuery ? (
                <span className="rounded-full bg-[#eef7ea] px-4 py-2 text-sm font-black text-[#315c1e]">
                  Focus concept: {conceptFromQuery}
                </span>
              ) : null}
            </>
          )}
        </div>

        <QuizSession
          key={sessionKey}
          subject={activeSubject}
          topicFromQuery={topicFromQuery}
          conceptFromQuery={conceptFromQuery}
          modeFromQuery={modeFromQuery}
          generatedSession={generatedSession}
        />

        {/* ── Generated quiz history ── */}
        {allGeneratedSessions.length > 0 && (
          <section className="rounded-[20px] border border-[#d7e2ef] bg-[#f8fbff] p-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#6b87ac]">
              My Generated Quizzes
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {allGeneratedSessions.map((session) => {
                const isActive = session.id === generatedFromQuery;
                return (
                  <div key={session.id} className="relative group">
                    <Link
                      href={`/quiz?generated=${session.id}`}
                      className={`block rounded-[16px] border px-4 py-4 transition hover:-translate-y-0.5 ${
                        isActive
                          ? "border-[#1b2c77] bg-[#eef6ff]"
                          : "border-[#d7e2ef] bg-white hover:border-[#9fc5eb]"
                      }`}
                    >
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6b87ac] pr-7">
                        {session.subject} · {session.questions.length} ข้อ
                      </p>
                      <p className="mt-2 text-[15px] font-black leading-6 text-[#1b2c77]">
                        {session.title}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#4b5e7c]">
                        {session.sourceTitle}
                      </p>
                      <p className="mt-2 text-[11px] text-[#8ba4c2]">
                        {new Intl.DateTimeFormat("th-TH", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(session.createdAt))}
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, session.id)}
                      aria-label="Delete quiz"
                      className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#c03945] opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-rose-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function QuizSession({
  subject,
  topicFromQuery,
  conceptFromQuery,
  modeFromQuery,
  generatedSession,
}: QuizSessionProps) {
  const { attempts, recordAttempt } = useLearning();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [finished, setFinished] = useState(false);

  const practicePlan = generatedSession
    ? null
    : buildAdaptivePracticePlan({
        attempts,
        subject,
        topic: topicFromQuery,
        concept: conceptFromQuery,
        mode: modeFromQuery,
      });
  const questions = generatedSession?.questions ?? practicePlan?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const score = sessionAnswers.filter((answer) => answer.isCorrect).length;
  const sessionHeading = generatedSession?.title ?? practicePlan?.heading ?? "Quiz";
  const sessionDescription =
    generatedSession?.description ??
    practicePlan?.description ??
    "Practice from your current study flow.";
  const sessionTone = generatedSession
    ? "bg-[#eef7ea] text-[#315c1e]"
    : practicePlan?.mode === "repair"
      ? "bg-[#fff2f2] text-[#a93b4a]"
      : practicePlan?.mode === "adaptive"
        ? "bg-[#fff5d6] text-[#7b5b00]"
        : practicePlan?.mode === "focus"
          ? "bg-[#e7f2ff] text-[#173567]"
          : "bg-[#eef6ff] text-[#173567]";

  function handleSubmit() {
    if (selectedIndex === null || submitted || !currentQuestion) {
      return;
    }

    recordAttempt(currentQuestion, selectedIndex);
    setSessionAnswers((current) => [
      ...current,
      {
        questionId: currentQuestion.id,
        isCorrect: selectedIndex === currentQuestion.correctIndex,
      },
    ]);
    setSubmitted(true);
  }

  function handleNext() {
    if (!currentQuestion) {
      return;
    }

    if (currentIndex === questions.length - 1) {
      setFinished(true);
      return;
    }

    setCurrentIndex((index) => index + 1);
    setSelectedIndex(null);
    setSubmitted(false);
  }

  function restartQuiz() {
    setCurrentIndex(0);
    setSelectedIndex(null);
    setSubmitted(false);
    setSessionAnswers([]);
    setFinished(false);
  }

  if (finished) {
    return (
      <section className="rounded-[20px] border border-[#d7e2ef] bg-[#f8fbff] p-6">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#6b87ac]">
          Quiz Summary
        </p>
        <h1 className="mt-3 text-4xl font-black text-[#1b2c77]">
          You scored {score}/{questions.length}
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">
          Every wrong answer has already been saved into your account so Learn&apos;Bot can recommend what to fix next instead of only showing a score.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={restartQuiz}
            className="rounded-full bg-[#1b2c77] px-6 py-3 text-sm font-black text-white"
          >
            Retry this session
          </button>
          {generatedSession ? (
            <Link
              href={generatedSession.sourcePath}
              className="rounded-full bg-[#cfe5ff] px-6 py-3 text-sm font-black text-[#173567]"
            >
              Return to chat
            </Link>
          ) : practicePlan?.mode === "repair" ? (
            <Link
              href="/weakness-tracker"
              className="rounded-full bg-[#ffd8dd] px-6 py-3 text-sm font-black text-[#a93b4a]"
            >
              Back to weakness tracker
            </Link>
          ) : (
            <Link
              href={`/quiz?mode=adaptive&subject=${encodeURIComponent(subject)}`}
              className="rounded-full bg-[#ffe6a6] px-6 py-3 text-sm font-black text-[#7b5b00]"
            >
              Start adaptive repair
            </Link>
          )}
          <Link
            href="/weakness-tracker"
            className="rounded-full bg-[#cfe5ff] px-6 py-3 text-sm font-black text-[#173567]"
          >
            Open Weakness Tracker
          </Link>
        </div>
      </section>
    );
  }

  if (!currentQuestion) {
    return (
      <section className="rounded-[18px] bg-[#eef6ff] p-6">
        <p className="text-lg font-black text-[#1b2c77]">
          No question set was found for this filter yet. Try another subject or generate a new quiz from the latest chat.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-[18px] bg-[#eef6ff] p-5">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
              Progress
            </p>
            <p className="mt-3 text-4xl font-black text-[#1b2c77]">
              {currentIndex + 1}/{questions.length}
            </p>
            <div className="mt-4 h-3 rounded-full bg-white">
              <div
                className="h-3 rounded-full bg-[#1b2c77]"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
            <div className="mt-5 space-y-2 text-sm text-slate-600">
              <p>Subject: {currentQuestion.subject}</p>
              <p>Topic: {currentQuestion.topic}</p>
              <p>Concept: {currentQuestion.concept}</p>
            </div>
          </div>

          <div className={`rounded-[18px] p-5 ${sessionTone}`}>
            <p className="text-sm font-black uppercase tracking-[0.16em]">
              Session mode
            </p>
            <h2 className="mt-3 text-xl font-black">{sessionHeading}</h2>
            <p className="mt-3 text-sm leading-7">{sessionDescription}</p>
          </div>

          {!generatedSession && practicePlan?.focusAreas.length ? (
            <div className="rounded-[18px] border border-[#d7e2ef] bg-white p-5">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                What this session is fixing
              </p>
              <div className="mt-4 space-y-3">
                {practicePlan.focusAreas.slice(0, 3).map((area) => (
                  <div key={area.key} className="rounded-[14px] bg-[#f7fbff] p-4">
                    <p className="text-sm font-black text-[#1b2c77]">{area.topic}</p>
                    <p className="mt-1 text-sm text-slate-600">{area.concept}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b87ac]">
                      Wrong {area.wrongCount} / Accuracy {area.accuracy}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : generatedSession ? (
            <div className="rounded-[18px] border border-[#d7e2ef] bg-white p-5">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                Built from chat
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                This quiz was generated from the discussion and uploaded materials in {generatedSession.sourceTitle}. If the conversation changes, generate a fresh quiz from the chat again.
              </p>
              <Link
                href={generatedSession.sourcePath}
                className="mt-4 inline-flex rounded-full bg-[#1b2c77] px-5 py-3 text-sm font-black text-white"
              >
                Back to source chat
              </Link>
            </div>
          ) : null}
        </div>

        <div className="rounded-[20px] border border-[#d7e2ef] bg-white p-6">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
            Question
          </p>
          <h1 className="mt-3 text-2xl font-black leading-10 text-[#1b2c77]">
            {currentQuestion.prompt}
          </h1>

          <div className="mt-6 grid gap-3">
            {currentQuestion.options.map((option, index) => {
              const selected = selectedIndex === index;
              const correct = currentQuestion.correctIndex === index;
              const revealWrong = submitted && selected && !correct;

              return (
                <button
                  key={option}
                  type="button"
                  disabled={submitted}
                  onClick={() => setSelectedIndex(index)}
                  className={`rounded-[16px] border px-5 py-4 text-left text-base font-semibold transition ${
                    submitted && correct
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : revealWrong
                        ? "border-rose-300 bg-rose-50 text-rose-800"
                        : selected
                          ? "border-[#1b2c77] bg-[#eef6ff] text-[#1b2c77]"
                          : "border-[#d7e2ef] bg-[#fbfdff] text-slate-700 hover:bg-[#f4f8ff]"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {submitted ? (
            <div className="mt-6 rounded-[16px] bg-[#f7f9fd] p-5">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
                Feedback
              </p>
              <p
                className={`mt-2 text-lg font-black ${
                  selectedIndex === currentQuestion.correctIndex
                    ? "text-emerald-700"
                    : "text-rose-700"
                }`}
              >
                {selectedIndex === currentQuestion.correctIndex
                  ? "Correct. Nice work."
                  : practicePlan?.mode === "repair"
                    ? "Still not there yet. Learn'Bot will keep this concept in your repair loop."
                    : "Not quite yet. Learn'Bot saved this concept into your repair history."}
              </p>
              <p className="mt-3 text-base leading-7 text-slate-600">
                {currentQuestion.explanation}
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedIndex === null || submitted}
              className="rounded-full bg-[#1b2c77] px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Check answer
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!submitted}
              className="rounded-full bg-[#cfe5ff] px-6 py-3 text-sm font-black text-[#173567] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {currentIndex === questions.length - 1 ? "Finish session" : "Next question"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[18px] bg-[#eef6ff] p-5">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6b87ac]">
          Why this matters
        </p>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Learn&apos;Bot can now turn your actual discussion into a quiz, so the app is not limited to a fixed bank of questions. That makes review sessions much closer to the notes and conversations you just had.
        </p>
      </section>
    </>
  );
}
