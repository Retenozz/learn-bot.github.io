import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type GenerateFlashcardsRequestBody = {
  content: string;
  preferThai?: boolean;
  cardCount?: number;
};

type RawFlashcard = {
  front: string;
  back: string;
};

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY on the server.");
  return new GoogleGenAI({ apiKey });
}

function buildFlashcardPrompt(
  content: string,
  preferThai: boolean,
  cardCount: number,
) {
  const lang = preferThai
    ? "ตอบเป็นภาษาไทยทั้งหมด รวมถึงด้านหน้าและด้านหลังของบัตร"
    : "Reply entirely in English.";

  return [
    "You are Learn'Bot, an intelligent flashcard generator.",
    lang,
    "",
    "Your job:",
    "1. Read the study material below carefully.",
    `2. Identify the ${cardCount} most important concepts, terms, or facts.`,
    "3. For EACH concept create one flashcard with a clear question or prompt on the front and a concise answer on the back.",
    "   - The front should be a short question or fill-in-the-blank prompt (under 120 characters).",
    "   - The back should be a direct, concise answer (under 200 characters).",
    "   - Base EVERY card directly on the study material content — do NOT invent facts.",
    `4. Return ONLY a valid JSON array of exactly ${cardCount} objects — no markdown fences, no prose, nothing else.`,
    "",
    `JSON schema (array of ${cardCount} objects):`,
    '[{"front":"...","back":"..."}]',
    "",
    "Rules:",
    "- Do NOT number the cards.",
    "- Do NOT output anything outside the JSON array.",
    "- Fronts must be genuinely useful study prompts, not vague.",
    "",
    "Study material:",
    content.slice(0, 12000),
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateFlashcardsRequestBody;
    const content = body.content?.trim();
    const cardCount = Math.min(body.cardCount ?? 10, 20);

    if (!content || content.length < 30) {
      return NextResponse.json(
        { error: "Not enough content to generate flashcards." },
        { status: 400 },
      );
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildFlashcardPrompt(content, body.preferThai ?? false, cardCount),
    });

    const raw = response.text?.trim() ?? "";
    const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();

    let cards: RawFlashcard[];
    try {
      cards = JSON.parse(cleaned) as RawFlashcard[];
    } catch {
      console.error("Gemini returned non-JSON flashcard output:", raw);
      return NextResponse.json(
        { error: "Gemini returned an unexpected format. Please try again." },
        { status: 502 },
      );
    }

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json(
        { error: "No flashcards were generated from this content." },
        { status: 502 },
      );
    }

    return NextResponse.json({ cards });
  } catch (error) {
    console.error("generate-flashcards route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Flashcard generation failed." },
      { status: 500 },
    );
  }
}
