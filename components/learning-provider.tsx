"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { QuizQuestion } from "@/data/quiz-bank";
import type { GeneratedFlashcardDeck } from "@/lib/generated-chat-flashcards";
import type { GeneratedQuizSession } from "@/lib/generated-chat-quiz";
import { useAuth } from "@/components/auth-provider";
import {
  isMissingTableError,
  upsertUserState,
} from "@/lib/supabase/user-state";

export type QuizAttempt = {
  id: string;
  questionId: string;
  subject: string;
  topic: string;
  concept: string;
  prompt: string;
  selectedIndex: number;
  selectedAnswer: string;
  correctIndex: number;
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
  answeredAt: string;
};

type LearningContextValue = {
  attempts: QuizAttempt[];
  generatedQuizSessions: Record<string, GeneratedQuizSession>;
  generatedFlashcardDecks: Record<string, GeneratedFlashcardDeck>;
  hydrated: boolean;
  recordAttempt: (question: QuizQuestion, selectedIndex: number) => void;
  clearAttempts: () => void;
  saveGeneratedQuizSession: (session: GeneratedQuizSession) => void;
  saveGeneratedFlashcardDeck: (deck: GeneratedFlashcardDeck) => void;
  deleteGeneratedQuizSession: (sessionId: string) => void;
};

type LearningStateRow = {
  attempts: QuizAttempt[] | null;
  generated_quizzes: Record<string, GeneratedQuizSession> | null;
  generated_flashcards: Record<string, GeneratedFlashcardDeck> | null;
};

const EMPTY_ATTEMPTS: QuizAttempt[] = [];
const EMPTY_QUIZ_SESSIONS: Record<string, GeneratedQuizSession> = {};
const EMPTY_FLASHCARD_DECKS: Record<string, GeneratedFlashcardDeck> = {};
const MAX_SAVED_GENERATED_ITEMS = 24;

// ── localStorage cache ────────────────────────────────────────────────────
const LS_KEY = "learnbot_learning_state_cache";

type LearningCache = {
  userId: string;
  attempts: QuizAttempt[];
  generatedQuizSessions: Record<string, GeneratedQuizSession>;
  generatedFlashcardDecks: Record<string, GeneratedFlashcardDeck>;
};

function readLearningCache(userId: string): LearningCache | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LearningCache;
    // ใช้ cache เฉพาะถ้าเป็น user เดิม
    return parsed.userId === userId ? parsed : null;
  } catch {
    return null;
  }
}

function writeLearningCache(cache: LearningCache) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache));
  } catch {
    // quota exceeded — ignore
  }
}

const LearningContext = createContext<LearningContextValue | undefined>(undefined);

function trimGeneratedItems<T extends { createdAt: string }>(items: Record<string, T>) {
  return Object.fromEntries(
    Object.entries(items)
      .sort(
        (left, right) =>
          new Date(right[1].createdAt).getTime() -
          new Date(left[1].createdAt).getTime(),
      )
      .slice(0, MAX_SAVED_GENERATED_ITEMS),
  ) as Record<string, T>;
}

// race a promise against a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export function LearningProvider({ children }: { children: ReactNode }) {
  const { supabase, user, loading } = useAuth();
  const [attempts, setAttempts] = useState<QuizAttempt[]>(EMPTY_ATTEMPTS);
  const [generatedQuizSessions, setGeneratedQuizSessions] = useState<
    Record<string, GeneratedQuizSession>
  >(EMPTY_QUIZ_SESSIONS);
  const [generatedFlashcardDecks, setGeneratedFlashcardDecks] = useState<
    Record<string, GeneratedFlashcardDeck>
  >(EMPTY_FLASHCARD_DECKS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLearningState() {
      if (loading) {
        return;
      }

      if (!user) {
        if (!cancelled) {
          setAttempts(EMPTY_ATTEMPTS);
          setGeneratedQuizSessions(EMPTY_QUIZ_SESSIONS);
          setGeneratedFlashcardDecks(EMPTY_FLASHCARD_DECKS);
          setHydrated(true);
        }
        return;
      }

      // ── ใช้ cache ก่อนเพื่อแสดง UI ทันที ──────────────────────────────
      const cached = readLearningCache(user.id);
      if (cached && !cancelled) {
        setAttempts(cached.attempts);
        setGeneratedQuizSessions(cached.generatedQuizSessions);
        setGeneratedFlashcardDecks(cached.generatedFlashcardDecks);
        setHydrated(true); // แสดง UI ได้เลย ไม่ต้องรอ Supabase
      }

      // ── query Supabase พื้นหลัง + timeout 8 วิ ───────────────────────
      try {
        const fetchPromise = supabase
          .from("user_learning_state")
          .select("attempts, generated_quizzes, generated_flashcards")
          .maybeSingle() as unknown as Promise<{ data: LearningStateRow | null; error: unknown }>;

        const { data: rawData, error } = await withTimeout(
          fetchPromise,
          8000,
          { data: null, error: new Error("timeout") },
        );

        if (cancelled) return;

        if (error && error instanceof Error && error.message !== "timeout") {
          if (!isMissingTableError(error as Parameters<typeof isMissingTableError>[0])) {
            console.error("Failed to load learning state", error);
          }
        }

        const data = rawData as LearningStateRow | null;

        if (data) {
          const nextAttempts = data.attempts ?? EMPTY_ATTEMPTS;
          const nextQuizSessions = trimGeneratedItems(data.generated_quizzes ?? EMPTY_QUIZ_SESSIONS);
          const nextFlashcardDecks = trimGeneratedItems(data.generated_flashcards ?? EMPTY_FLASHCARD_DECKS);

          if (!cancelled) {
            setAttempts(nextAttempts);
            setGeneratedQuizSessions(nextQuizSessions);
            setGeneratedFlashcardDecks(nextFlashcardDecks);

            // อัปเดต cache ด้วยข้อมูลใหม่จาก Supabase
            writeLearningCache({
              userId: user.id,
              attempts: nextAttempts,
              generatedQuizSessions: nextQuizSessions,
              generatedFlashcardDecks: nextFlashcardDecks,
            });
          }
        }
      } catch (err) {
        console.error("loadLearningState unexpected error", err);
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    void loadLearningState();

    return () => {
      cancelled = true;
    };
  }, [loading, supabase, user]);

  useEffect(() => {
    if (loading || !user || !hydrated) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      void upsertUserState({
        supabase,
        table: "user_learning_state",
        values: {
          user_id: user.id,
          attempts,
          generated_quizzes: generatedQuizSessions,
          generated_flashcards: generatedFlashcardDecks,
        },
      }).then(() => {
        // อัปเดต cache หลัง save
        writeLearningCache({
          userId: user.id,
          attempts,
          generatedQuizSessions,
          generatedFlashcardDecks,
        });
      }).catch((error) => {
        console.error("Failed to save learning state", error);
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [
    attempts,
    generatedFlashcardDecks,
    generatedQuizSessions,
    hydrated,
    loading,
    supabase,
    user,
  ]);

  function recordAttempt(question: QuizQuestion, selectedIndex: number) {
    setAttempts((current) => [
      ...current,
      {
        id: `${question.id}-${Date.now()}-${current.length}`,
        questionId: question.id,
        subject: question.subject,
        topic: question.topic,
        concept: question.concept,
        prompt: question.prompt,
        selectedIndex,
        selectedAnswer: question.options[selectedIndex],
        correctIndex: question.correctIndex,
        correctAnswer: question.options[question.correctIndex],
        explanation: question.explanation,
        isCorrect: selectedIndex === question.correctIndex,
        answeredAt: new Date().toISOString(),
      },
    ]);
  }

  function clearAttempts() {
    setAttempts(EMPTY_ATTEMPTS);
  }

  function saveGeneratedQuizSession(session: GeneratedQuizSession) {
    setGeneratedQuizSessions((current) =>
      trimGeneratedItems({
        ...current,
        [session.id]: session,
      }),
    );
  }

  function saveGeneratedFlashcardDeck(deck: GeneratedFlashcardDeck) {
    setGeneratedFlashcardDecks((current) =>
      trimGeneratedItems({
        ...current,
        [deck.id]: deck,
      }),
    );
  }

  function deleteGeneratedQuizSession(sessionId: string) {
    setGeneratedQuizSessions((current) => {
      const next = { ...current };
      delete next[sessionId];
      return next;
    });
  }

  const value = {
    attempts,
    generatedQuizSessions,
    generatedFlashcardDecks,
    hydrated,
    recordAttempt,
    clearAttempts,
    saveGeneratedQuizSession,
    saveGeneratedFlashcardDeck,
    deleteGeneratedQuizSession,
  };

  return (
    <LearningContext.Provider value={value}>{children}</LearningContext.Provider>
  );
}

export function useLearning() {
  const context = useContext(LearningContext);

  if (!context) {
    throw new Error("useLearning must be used within LearningProvider");
  }

  return context;
}
