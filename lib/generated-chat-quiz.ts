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
  "not mentioned in the uploaded files",
  "an unrelated detail",
  "a different point from another topic",
  "something the files never confirmed",
];

function rotateOptions(options: string[], offset: number) {
  return options.map((_, index) => options[(index + offset) % options.length]);
}

/**
 * Build facts prioritising attachment content over raw chat text.
 * If attachments are present in the conversation, we only use facts that
 * originate from those attachments (excerpt / chunks / citations).
 * We fall back to chat-text facts only when no attachment content is found.
 */
function buildAttachmentPriorityFacts(messages: ChatQuizMessage[]): string[] {
  const attachmentFacts: string[] = [];

  for (const message of messages) {
    for (const attachment of message.attachments ?? []) {
      if (attachment.excerpt) {
        attachmentFacts.push(attachment.excerpt);
      }
      for (const chunk of (attachment.chunks ?? []).slice(0, 6)) {
        attachmentFacts.push(chunk.content);
      }
    }
    for (const citation of message.citations ?? []) {
      attachmentFacts.push(citation.snippet);
    }
  }

  // Deduplicate and normalise
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of attachmentFacts) {
    const key = raw.trim().toLowerCase();
    if (key.length >= 18 && key.length <= 240 && !seen.has(key)) {
      seen.add(key);
      unique.push(raw.trim());
    }
  }

  if (unique.length >= 2) {
    return unique.slice(0, 18);
  }

  // No attachment content — fall back to full chat facts
  return buildChatStudyFacts(messages);
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
      topic: "File review",
      concept: "Key ideas from the uploaded materials",
      prompt: `Fill in the missing detail from the uploaded file:\n${item.prompt}`,
      options: optionSet,
      correctIndex,
      explanation: `This answer comes from the uploaded file: ${item.fact}`,
    } satisfies QuizQuestion;
  });
}

export function createGeneratedQuizSession(
  input: CreateGeneratedQuizSessionInput,
) {
  const hasAttachments = input.messages.some(
    (m) => (m.attachments ?? []).length > 0,
  );

  const facts = buildAttachmentPriorityFacts(input.messages);

  if (facts.length < 2) {
    return {
      ok: false as const,
      message: hasAttachments
        ? "ไม่พบเนื้อหาที่ชัดเจนในไฟล์ที่อัปโหลด ลองอัปโหลดไฟล์ที่มีข้อความมากขึ้น แล้วกด Quiz อีกครั้งครับ"
        : "อัปโหลดไฟล์เรียนในแชทก่อน แล้วกด \"Quiz from this chat\" เพื่อให้ควิซมาจากเนื้อหาไฟล์ครับ",
    };
  }

  const subject = inferStudySubject(facts);
  const sessionId = `chat-quiz-${Date.now()}`;
  const questions = buildQuestions(sessionId, facts, subject);

  if (!questions.length) {
    return {
      ok: false as const,
      message: hasAttachments
        ? "ไฟล์ที่อัปโหลดมีข้อความ แต่ยังหาประเด็นที่จะออกเป็นข้อสอบได้ไม่พอ ลองอัปโหลดไฟล์เนื้อหาบทเรียนที่ละเอียดกว่านี้ครับ"
        : "ยังหาข้อมูลจากแชทไม่พอ ลองอัปโหลดไฟล์บทเรียนก่อนครับ",
    };
  }

  const description = hasAttachments
    ? "ควิซนี้สร้างจากเนื้อหาในไฟล์ที่อัปโหลดในแชทนี้โดยตรง"
    : "This quiz was generated from the current chat history and uploaded study materials in the conversation.";

  const session: GeneratedQuizSession = {
    id: sessionId,
    title: input.title,
    description,
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
