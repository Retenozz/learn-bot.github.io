import type { ChatAttachment, ChatCitation } from "@/lib/chat-documents";
import type { QuizSubject } from "@/data/quiz-bank";

export type ChatStudyMessage = {
  role: "assistant" | "user" | "system" | "member" | "me";
  senderName: string;
  text: string;
  attachments?: ChatAttachment[];
  citations?: ChatCitation[];
};

export function normalizeStudyText(input: string) {
  return input
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isBoilerplate(line: string) {
  const lower = line.toLowerCase();

  return [
    "uploaded ",
    "i have read ",
    "here are the first study points",
    "room \"",
    "is ready.",
    "supports pdf",
    "sources",
  ].some((pattern) => lower.includes(pattern));
}

export function buildChatStudyFacts(messages: ChatStudyMessage[]) {
  const rawFacts: string[] = [];

  for (const message of messages) {
    const lines = normalizeStudyText(message.text)
      .split(/\n|(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter((line) => line.length >= 18)
      .filter((line) => !isBoilerplate(line));

    rawFacts.push(...lines);

    for (const attachment of message.attachments ?? []) {
      rawFacts.push(attachment.excerpt);
      rawFacts.push(
        ...(attachment.chunks ?? []).slice(0, 4).map((chunk) => chunk.content),
      );
    }

    for (const citation of message.citations ?? []) {
      rawFacts.push(citation.snippet);
    }
  }

  const uniqueFacts: string[] = [];
  const seen = new Set<string>();

  for (const fact of rawFacts) {
    const normalized = normalizeStudyText(fact);

    if (normalized.length < 18 || normalized.length > 240) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueFacts.push(normalized);
  }

  return uniqueFacts.slice(0, 18);
}

export function extractBlankPrompt(fact: string) {
  const patterns = [
    /"([^"\n]{3,48})"/,
    /'([^'\n]{3,48})'/,
    /\b(?:https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?/i,
    /\b[A-Z][A-Z0-9_./:-]{2,}\b/,
    /\b\d[\d./:-]*\b/,
    /\b[A-Za-z][A-Za-z0-9_./:-]{3,}\b/,
  ];

  for (const pattern of patterns) {
    const match = fact.match(pattern);

    if (!match) {
      continue;
    }

    const answer = (match[1] ?? match[0]).trim();

    if (answer.length < 3) {
      continue;
    }

    const prompt = fact.replace(match[0], "_____");

    if (prompt !== fact) {
      return {
        answer,
        prompt,
      };
    }
  }

  return null;
}

export function extractFlashcardPair(fact: string) {
  const assignmentMatch = fact.match(
    /^([A-Za-z0-9 _./()\-]{2,44})\s*(?:=|:|-)\s+(.{3,160})$/,
  );

  if (assignmentMatch) {
    return {
      front: `What should you remember about ${assignmentMatch[1].trim()}?`,
      back: assignmentMatch[2].trim(),
    };
  }

  const blank = extractBlankPrompt(fact);

  if (blank) {
    return {
      front: blank.prompt,
      back: blank.answer,
    };
  }

  const sentenceChunks = fact.split(/,|;| and /i).map((chunk) => chunk.trim());

  if (sentenceChunks.length >= 2 && sentenceChunks[0].length >= 10) {
    return {
      front: sentenceChunks[0],
      back: sentenceChunks.slice(1).join(", "),
    };
  }

  return {
    front: "Recall this study detail",
    back: fact,
  };
}

export function inferStudySubject(facts: string[]): QuizSubject {
  const content = facts.join(" ").toLowerCase();

  if (
    [
      "force",
      "motion",
      "velocity",
      "energy",
      "acceleration",
      "physics",
      "newton",
    ].some((keyword) => content.includes(keyword))
  ) {
    return "Physics";
  }

  if (
    [
      "equation",
      "fraction",
      "probability",
      "function",
      "slope",
      "math",
      "mathematics",
    ].some((keyword) => content.includes(keyword))
  ) {
    return "Mathematics";
  }

  return "General";
}
