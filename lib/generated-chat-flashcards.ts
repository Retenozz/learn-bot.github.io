import type { QuizSubject } from "@/data/quiz-bank";
import type { ChatStudyMessage } from "@/lib/generated-chat-study";
import {
  buildChatStudyFacts,
  extractFlashcardPair,
  inferStudySubject,
} from "@/lib/generated-chat-study";

export type GeneratedFlashcard = {
  id: string;
  front: string;
  back: string;
  sourceFact: string;
};

export type GeneratedFlashcardDeck = {
  id: string;
  title: string;
  description: string;
  sourcePath: string;
  sourceTitle: string;
  subject: QuizSubject;
  cards: GeneratedFlashcard[];
  createdAt: string;
};

type CreateGeneratedFlashcardDeckInput = {
  title: string;
  sourcePath: string;
  sourceTitle: string;
  messages: ChatStudyMessage[];
};

function buildCards(deckId: string, facts: string[]) {
  return facts
    .map((fact, index) => {
      const pair = extractFlashcardPair(fact);

      if (!pair || pair.front.length < 6 || pair.back.length < 2) {
        return null;
      }

      return {
        id: `${deckId}-card-${index + 1}`,
        front: pair.front,
        back: pair.back,
        sourceFact: fact,
      } satisfies GeneratedFlashcard;
    })
    .filter(Boolean)
    .slice(0, 10) as GeneratedFlashcard[];
}

export function createGeneratedFlashcardDeck(
  input: CreateGeneratedFlashcardDeckInput,
) {
  const facts = buildChatStudyFacts(input.messages);

  if (facts.length < 2) {
    return {
      ok: false as const,
      message:
        "Add more lesson detail or upload a study file before turning this chat into flashcards.",
    };
  }

  const deckId = `chat-flashcards-${Date.now()}`;
  const cards = buildCards(deckId, facts);

  if (cards.length < 2) {
    return {
      ok: false as const,
      message:
        "I could not extract enough clear study facts for flashcards yet. Try adding more concrete content into the chat first.",
    };
  }

  const subject = inferStudySubject(facts);
  const deck: GeneratedFlashcardDeck = {
    id: deckId,
    title: input.title,
    description:
      "This flashcard deck was generated from the current chat and uploaded study materials in the conversation.",
    sourcePath: input.sourcePath,
    sourceTitle: input.sourceTitle,
    subject,
    cards,
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true as const,
    deck,
  };
}
