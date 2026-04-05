import type { ChatStudyMessage } from "@/lib/generated-chat-study";
import {
  buildChatStudyFacts,
  extractBlankPrompt,
  inferStudySubject,
} from "@/lib/generated-chat-study";
import type { QuizQuestion, QuizSubject } from "@/data/quiz-bank";

export type ChatQuizMessage = ChatStudyMessage;

export type GeneratedQuizSession = {
  id: string;
  title: string;
  description: string;
  sourcePath: string;
  sourceTitle: string;
  subject: QuizSubject;
  questions: QuizQuestion[];
  createdAt: string;
};

type CreateGeneratedQuizSessionInput = {
  title: string;
  sourcePath: string;
  sourceTitle: string;
  messages: ChatQuizMessage[];
};

const genericDistractors = [
  "not mentioned in the chat",
  "an unrelated detail",
  "a different point from another topic",
  "something the chat never confirmed",
];

function rotateOptions(options: string[], offset: number) {
  return options.map((_, index) => options[(index + offset) % options.length]);
}

function buildQuestions(sessionId: string, facts: string[], subject: QuizSubject) {
  const blanks = facts
    .map((fact) => {
      const extracted = extractBlankPrompt(fact);

      if (!extracted) {
        return null;
      }

      return {
        fact,
        answer: extracted.answer,
        prompt: extracted.prompt,
      };
    })
    .filter(Boolean) as Array<{
    fact: string;
    answer: string;
    prompt: string;
  }>;

  const answerPool = Array.from(
    new Set(blanks.map((item) => item.answer).filter((answer) => answer.length >= 3)),
  );

  return blanks.slice(0, 5).map((item, index) => {
    const distractors = answerPool
      .filter((answer) => answer !== item.answer)
      .slice(0, 3);

    while (distractors.length < 3) {
      distractors.push(genericDistractors[distractors.length]);
    }

    const optionSet = rotateOptions([item.answer, ...distractors], index % 4);
    const correctIndex = optionSet.indexOf(item.answer);

    return {
      id: `${sessionId}-q${index + 1}`,
      subject,
      topic: "Chat review",
      concept: "Key ideas from the conversation",
      prompt: `Fill in the missing detail from the chat:\n${item.prompt}`,
      options: optionSet,
      correctIndex,
      explanation: `This answer comes from the chat detail: ${item.fact}`,
    } satisfies QuizQuestion;
  });
}

export function createGeneratedQuizSession(
  input: CreateGeneratedQuizSessionInput,
) {
  const facts = buildChatStudyFacts(input.messages);

  if (facts.length < 2) {
    return {
      ok: false as const,
      message:
        "Add a bit more discussion or at least one study file before generating a quiz from this chat.",
    };
  }

  const subject = inferStudySubject(facts);
  const sessionId = `chat-quiz-${Date.now()}`;
  const questions = buildQuestions(sessionId, facts, subject);

  if (!questions.length) {
    return {
      ok: false as const,
      message:
        "I could not find enough concrete facts in the chat yet. Try adding more lesson detail or an uploaded document first.",
    };
  }

  const session: GeneratedQuizSession = {
    id: sessionId,
    title: input.title,
    description:
      "This quiz was generated from the current chat history and uploaded study materials in the conversation.",
    sourcePath: input.sourcePath,
    sourceTitle: input.sourceTitle,
    subject,
    questions,
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true as const,
    session,
  };
}
