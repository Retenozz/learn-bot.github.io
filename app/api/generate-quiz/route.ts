import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type GenerateQuizRequestBody = {
  content: string;
  title?: string;
  preferThai?: boolean;
};

type RawQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY on the server.");
  return new GoogleGenAI({ apiKey });
}

function buildQuizPrompt(content: string, preferThai: boolean) {
  const lang = preferThai
    ? "ตอบเป็นภาษาไทยทั้งหมด รวมถึงคำถาม ตัวเลือก และคำอธิบาย"
    : "Reply entirely in English.";

  return [
    "You are Learn'Bot, an intelligent quiz generator.",
    lang,
    "",
    "Your job:",
    "1. Read the study material below carefully.",
    "2. Identify the 5 most important concepts or facts.",
    "3. For EACH concept write one multiple-choice question with 4 options.",
    "   - Only ONE option must be correct.",
    "   - The 3 wrong options must be plausible but clearly incorrect based on the material.",
    "   - The question must be directly answerable from the material.",
    "4. Return ONLY a valid JSON array — no markdown fences, no prose, nothing else.",
    "",
    "JSON schema (array of 5 objects):",
    '[{"prompt":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]',
    "",
    "Rules:",
    "- correctIndex is 0-based (0=first option, 1=second, 2=third, 3=fourth).",
    "- explanation briefly states why the correct answer is right, citing the material.",
    "- Do NOT number the options (no A. B. C. D. prefix).",
    "- Do NOT include question numbers in the prompt field.",
    "- Do NOT output anything outside the JSON array.",
    "",
    "Study material:",
    content.slice(0, 12000),
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateQuizRequestBody;
    const content = body.content?.trim();

    if (!content || content.length < 50) {
      return NextResponse.json(
        { error: "Not enough content to generate a quiz." },
        { status: 400 },
      );
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildQuizPrompt(content, body.preferThai ?? false),
    });

    const raw = response.text?.trim() ?? "";
    const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();

    let questions: RawQuestion[];
    try {
      questions = JSON.parse(cleaned) as RawQuestion[];
    } catch {
      console.error("Gemini returned non-JSON quiz output:", raw);
      return NextResponse.json(
        { error: "Gemini returned an unexpected format. Please try again." },
        { status: 502 },
      );
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "No questions were generated from this content." },
        { status: 502 },
      );
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("generate-quiz route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Quiz generation failed." },
      { status: 500 },
    );
  }
}
