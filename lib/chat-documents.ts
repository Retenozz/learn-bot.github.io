import type { PDFPageProxy } from "pdfjs-dist/types/src/display/api";

type PdfJsModule = typeof import("pdfjs-dist");
type MammothModule = typeof import("mammoth");
type TesseractModule = typeof import("tesseract.js");

type ExtractedSection = {
  label: string;
  content: string;
};

export type ChatSourceType = "text" | "pdf" | "docx" | "image";

export type ChatSourceChunk = {
  id: string;
  attachmentId: string;
  attachmentName: string;
  label: string;
  content: string;
  keywords: string[];
};

export type ChatCitation = {
  id: string;
  attachmentId: string;
  attachmentName: string;
  label: string;
  snippet: string;
};

export type ChatAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  sourceType: ChatSourceType;
  content: string;
  excerpt: string;
  uploadedAt: string;
  chunks: ChatSourceChunk[];
};

export type AssistantReply = {
  text: string;
  citations: ChatCitation[];
};

export type AssistantContext = {
  preferThai: boolean;
  citations: ChatCitation[];
  contextText: string;
};

const MAX_TEXT_FILE_BYTES = 1_000_000;
const MAX_PDF_FILE_BYTES = 15_000_000;
const MAX_DOCX_FILE_BYTES = 10_000_000;
const MAX_IMAGE_FILE_BYTES = 6_000_000;
const MAX_CONTENT_CHARS = 7_200;
const MAX_PDF_PAGES = 12;
const MAX_PDF_OCR_PAGES = 3;
const MAX_CHUNK_CHARS = 380;

const supportedExtensions = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "java",
  "c",
  "cpp",
  "css",
  "html",
  "xml",
  "yml",
  "yaml",
  "pdf",
  "docx",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);

const supportedMimeTypes = new Set([
  "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/xml",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/html",
  "text/javascript",
  "text/markdown",
  "text/plain",
  "text/xml",
]);

const englishStopwords = new Set([
  "about",
  "after",
  "also",
  "an",
  "and",
  "are",
  "for",
  "from",
  "give",
  "help",
  "into",
  "just",
  "make",
  "need",
  "please",
  "show",
  "that",
  "the",
  "them",
  "these",
  "this",
  "with",
  "your",
]);

let pdfJsPromise: Promise<PdfJsModule> | null = null;
let mammothPromise: Promise<MammothModule> | null = null;
let tesseractWorkerPromise: Promise<
  Awaited<ReturnType<TesseractModule["createWorker"]>>
> | null = null;

export const chatFileAccept = Array.from(supportedExtensions)
  .map((extension) => `.${extension}`)
  .join(",");

function getExtension(fileName: string) {
  const segments = fileName.split(".");
  return segments.length > 1 ? segments.at(-1)?.toLowerCase() ?? "" : "";
}

function normalizeContent(input: string) {
  return input
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    // PDF/OCR Thai text often arrives split by spaces between characters.
    .replace(/([\u0E00-\u0E7F])\s+(?=[\u0E00-\u0E7F])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasThaiText(input: string) {
  return /[\u0E00-\u0E7F]/.test(input);
}

function includesAny(input: string, keywords: string[]) {
  return keywords.some((keyword) => input.includes(keyword));
}

const thaiIntentKeywords = {
  quiz: ["ควิซ", "คำถาม", "แบบฝึกหัด"],
  summary: ["สรุป", "ใจความ", "ย่อ"],
  explain: ["อธิบาย", "สอน", "ช่วยอธิบาย"],
  support: ["ช่วย", "บทเรียน"],
};

function buildExcerpt(content: string) {
  const firstParagraph = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 24);

  if (!firstParagraph) {
    return "The file was uploaded successfully.";
  }

  return firstParagraph.slice(0, 180);
}

function isPdfFile(file: File) {
  const extension = getExtension(file.name);
  return extension === "pdf" || file.type === "application/pdf";
}

function isDocxFile(file: File) {
  const extension = getExtension(file.name);
  return (
    extension === "docx" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

function isImageFile(file: File) {
  const extension = getExtension(file.name);
  return (
    ["png", "jpg", "jpeg", "webp"].includes(extension) ||
    file.type.startsWith("image/")
  );
}

function isSupportedTextFile(file: File) {
  const extension = getExtension(file.name);

  if (supportedExtensions.has(extension)) {
    return true;
  }

  if (file.type.startsWith("text/")) {
    return true;
  }

  return supportedMimeTypes.has(file.type);
}

function getSourceType(file: File): ChatSourceType {
  if (isPdfFile(file)) {
    return "pdf";
  }

  if (isDocxFile(file)) {
    return "docx";
  }

  if (isImageFile(file)) {
    return "image";
  }

  return "text";
}

function getMaxFileBytes(file: File) {
  if (isPdfFile(file)) {
    return MAX_PDF_FILE_BYTES;
  }

  if (isDocxFile(file)) {
    return MAX_DOCX_FILE_BYTES;
  }

  if (isImageFile(file)) {
    return MAX_IMAGE_FILE_BYTES;
  }

  return MAX_TEXT_FILE_BYTES;
}

function getMaxLabel(file: File) {
  if (isPdfFile(file)) {
    return "8 MB";
  }

  if (isDocxFile(file)) {
    return "7.5 MB";
  }

  if (isImageFile(file)) {
    return "6 MB";
  }

  return "450 KB";
}

function buildSearchTokens(input: string) {
  const latinTokens = (input.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter(
    (token) => !englishStopwords.has(token),
  );
  const thaiTokens = input.match(/[\u0E00-\u0E7F]{2,}/g) ?? [];
  return Array.from(new Set([...latinTokens, ...thaiTokens]));
}

function getKeyPoints(content: string, limit = 3) {
  const candidates = content
    .split(/\n|(?<=[.!?])\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 24)
    .filter((line, index, array) => array.indexOf(line) === index);

  return candidates.slice(0, limit);
}

function splitSectionIntoChunks(section: ExtractedSection) {
  const normalized = normalizeContent(section.content);

  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs.length ? paragraphs : [normalized]) {
    if ((`${current}\n\n${paragraph}`).trim().length <= MAX_CHUNK_CHARS) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }

    if (current) {
      chunks.push(current.trim());
      current = "";
    }

    if (paragraph.length <= MAX_CHUNK_CHARS) {
      current = paragraph;
      continue;
    }

    const sentences = paragraph
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    let sentenceBuffer = "";

    for (const sentence of sentences.length ? sentences : [paragraph]) {
      if (`${sentenceBuffer} ${sentence}`.trim().length <= MAX_CHUNK_CHARS) {
        sentenceBuffer = sentenceBuffer
          ? `${sentenceBuffer} ${sentence}`
          : sentence;
        continue;
      }

      if (sentenceBuffer) {
        chunks.push(sentenceBuffer.trim());
      }

      sentenceBuffer = sentence;
    }

    if (sentenceBuffer) {
      current = sentenceBuffer.trim();
    }
  }

  if (current) {
    chunks.push(current.trim());
  }

  return chunks.map((content, index) => ({
    label:
      chunks.length > 1 ? `${section.label} · Excerpt ${index + 1}` : section.label,
    content,
  }));
}

async function readTextFileContent(file: File) {
  const buffer = await file.arrayBuffer();
  const candidates = ["utf-8", "windows-874", "utf-16le"];
  const decoded = candidates.flatMap((encoding) => {
    try {
      const value = new TextDecoder(encoding, {
        fatal: encoding === "utf-8",
      }).decode(buffer);
      const normalized = normalizeContent(value);
      const thaiCount = normalized.match(/[\u0E00-\u0E7F]/g)?.length ?? 0;
      return [
        {
          normalized,
          score: thaiCount * 2 + normalized.length,
        },
      ];
    } catch {
      return [];
    }
  });
  if (!decoded.length) {
    return new TextDecoder().decode(buffer);
  }
  return decoded.sort((left, right) => right.score - left.score)[0].normalized;
}
function buildChunks(
  attachmentId: string,
  attachmentName: string,
  content: string,
  sections: ExtractedSection[],
) {
  const normalizedSections = sections
    .map((section) => ({
      label: section.label,
      content: normalizeContent(section.content),
    }))
    .filter((section) => section.content.length > 0);

  const fallbackSections = normalizedSections.length
    ? normalizedSections
    : [{ label: "Excerpt 1", content }];

  return fallbackSections.flatMap((section, sectionIndex) =>
    splitSectionIntoChunks(section).map((chunk, chunkIndex) => ({
      id: `${attachmentId}-${sectionIndex}-${chunkIndex}`,
      attachmentId,
      attachmentName,
      label: chunk.label,
      content: chunk.content,
      keywords: buildSearchTokens(`${attachmentName} ${chunk.label} ${chunk.content}`),
    })),
  );
}

async function getPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist").then((module) => {
      module.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";
      return module;
    });
  }

  return pdfJsPromise;
}

async function getMammoth() {
  if (!mammothPromise) {
    mammothPromise = import("mammoth").then(
      (module) => ((module.default ?? module) as MammothModule),
    );
  }

  return mammothPromise;
}

async function getTesseractWorker() {
  if (!tesseractWorkerPromise) {
    tesseractWorkerPromise = import("tesseract.js").then(async (module) => {
      const tesseract = (module.default ?? module) as TesseractModule;
      return tesseract.createWorker(["eng", "tha"]);
    });
  }

  return tesseractWorkerPromise;
}

async function extractImageText(
  input: File | Blob | string,
  sourceLabel = "image",
) {
  const worker = await getTesseractWorker();
  const result = await worker.recognize(input);
  const text = normalizeContent(result.data.text).slice(0, MAX_CONTENT_CHARS);

  return {
    content: text,
    sections: text
      ? [
          {
            label: `OCR · ${sourceLabel}`,
            content: text,
          },
        ]
      : [],
  };
}

async function renderPdfPageToImage(page: PDFPageProxy) {
  if (typeof document === "undefined") {
    return null;
  }

  const viewport = page.getViewport({ scale: 1.45 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas.toDataURL("image/png");
}

async function extractPdfText(file: File) {
  const pdfjs = await getPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useWorkerFetch: false,
  });
  const document = await loadingTask.promise;

  try {
    const pageCount = Math.min(document.numPages, MAX_PDF_PAGES);
    const sections: ExtractedSection[] = [];
    const contentParts: string[] = [];
    let ocrPagesUsed = 0;

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const lines: string[] = [];

      for (const item of textContent.items) {
        if (!("str" in item)) {
          continue;
        }

        const value = item.str.trim();

        if (!value) {
          continue;
        }

        lines.push(value);

        if (item.hasEOL) {
          lines.push("\n");
        }
      }

      const pageText = normalizeContent(
        lines
          .join(" ")
          .replace(/\s+\n/g, "\n")
          .replace(/\n\s+/g, "\n"),
      );

      if (pageText) {
        sections.push({
          label: `Page ${pageNumber}`,
          content: pageText,
        });
        contentParts.push(`Page ${pageNumber}\n${pageText}`);
      } else if (ocrPagesUsed < MAX_PDF_OCR_PAGES) {
        const pageImage = await renderPdfPageToImage(page);

        if (pageImage) {
          const ocrResult = await extractImageText(pageImage, `PDF page ${pageNumber}`);

          if (ocrResult.content) {
            ocrPagesUsed += 1;
            sections.push({
              label: `Page ${pageNumber} · OCR`,
              content: ocrResult.content,
            });
            contentParts.push(`Page ${pageNumber}\n${ocrResult.content}`);
          }
        }
      }

      page.cleanup();

      if (normalizeContent(contentParts.join("\n\n")).length >= MAX_CONTENT_CHARS) {
        break;
      }
    }

    return {
      content: normalizeContent(contentParts.join("\n\n")).slice(0, MAX_CONTENT_CHARS),
      sections,
    };
  } finally {
    await document.destroy();
  }
}

async function extractDocxText(file: File) {
  const mammoth = await getMammoth();
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  const content = normalizeContent(result.value).slice(0, MAX_CONTENT_CHARS);
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    content,
    sections: paragraphs.map((paragraph, index) => ({
      label: `Section ${index + 1}`,
      content: paragraph,
    })),
  };
}

async function extractTextContent(file: File) {
  if (isPdfFile(file)) {
    return extractPdfText(file);
  }

  if (isDocxFile(file)) {
    return extractDocxText(file);
  }

  if (isImageFile(file)) {
    return extractImageText(file, file.name);
  }

  const rawContent = await readTextFileContent(file);
  const content = normalizeContent(rawContent).slice(0, MAX_CONTENT_CHARS);
  return {
    content,
    sections: getKeyPoints(content, 6).map((point, index) => ({
      label: `Excerpt ${index + 1}`,
      content: point,
    })),
  };
}

function makeAttachmentId(fileName: string, index: number) {
  return `${Date.now()}-${index}-${fileName.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}

function buildFallbackChunks(attachment: ChatAttachment) {
  return buildChunks(
    attachment.id,
    attachment.name,
    attachment.content,
    attachment.content
      ? [
          {
            label: "Excerpt 1",
            content: attachment.content,
          },
        ]
      : [],
  );
}

function getAttachmentChunks(attachment: ChatAttachment) {
  return attachment.chunks?.length ? attachment.chunks : buildFallbackChunks(attachment);
}

function selectRelevantChunks(prompt: string, attachments: ChatAttachment[], limit = 4) {
  const chunks = attachments.flatMap(getAttachmentChunks);

  if (!chunks.length) {
    return [];
  }

  const tokens = buildSearchTokens(prompt);

  const scored = chunks.map((chunk, index) => {
    const haystack = `${chunk.attachmentName} ${chunk.label} ${chunk.content}`.toLowerCase();
    let score = 0;

    for (const token of tokens) {
      if (haystack.includes(token.toLowerCase())) {
        score += token.length > 5 ? 4 : 2;
      }
    }

    if (!score) {
      const promptLower = prompt.toLowerCase();

      if (
        promptLower.includes("summary") ||
        promptLower.includes("summarize") ||
        prompt.includes("สรุป")
      ) {
        score += index / 1000;
      }
    }

    return {
      chunk,
      index,
      score,
    };
  });

  const matched = scored
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.index - left.index)
    .slice(0, limit)
    .map((item) => item.chunk);

  if (matched.length) {
    return matched;
  }

  return chunks.slice(-limit);
}

function buildCitations(chunks: ChatSourceChunk[]) {
  const citations: ChatCitation[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const key = `${chunk.attachmentId}-${chunk.label}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    citations.push({
      id: key,
      attachmentId: chunk.attachmentId,
      attachmentName: chunk.attachmentName,
      label: chunk.label,
      snippet: chunk.content.slice(0, 180),
    });
  }

  return citations;
}

export function prepareAssistantContext(
  prompt: string,
  attachments: ChatAttachment[],
): AssistantContext {
  const preferThai = hasThaiText(prompt);

  if (!attachments.length) {
    return {
      preferThai,
      citations: [],
      contextText: "",
    };
  }

  const relevantChunks = selectRelevantChunks(prompt, attachments);
  const citations = buildCitations(relevantChunks);
  const contextText = relevantChunks
    .map(
      (chunk, index) =>
        `Source ${index + 1}: ${chunk.attachmentName}\nSection: ${chunk.label}\nContent:\n${chunk.content}`,
    )
    .join("\n\n---\n\n");

  return {
    preferThai,
    citations,
    contextText,
  };
}

function buildSummaryReply(chunks: ChatSourceChunk[], preferThai = false) {
  const keyPoints = chunks.flatMap((chunk) => getKeyPoints(chunk.content, 1)).slice(0, 4);
  const sources = Array.from(new Set(chunks.map((chunk) => chunk.attachmentName))).join(", ");

  return preferThai
    ? [`สรุปจาก ${sources}:`, ...keyPoints.map((point, index) => `${index + 1}. ${point}`)].join(
        "\n",
      )
    : [
        `Summary based on ${sources}:`,
        ...keyPoints.map((point, index) => `${index + 1}. ${point}`),
      ].join("\n");
}

function buildExplanationReply(chunks: ChatSourceChunk[], preferThai = false) {
  const keyPoints = chunks.flatMap((chunk) => getKeyPoints(chunk.content, 1)).slice(0, 3);

  return preferThai
    ? [
        "อธิบายให้ง่ายขึ้นได้แบบนี้:",
        ...keyPoints.map((point, index) => `${index + 1}. ${point}`),
        "ถ้าต้องการ ผมช่วยสรุปย่อหรือทำควิซจากเนื้อหานี้ต่อให้ได้ครับ",
      ].join("\n")
    : [
        "Here is the lesson in a simpler way:",
        ...keyPoints.map((point, index) => `${index + 1}. ${point}`),
        "If you want, I can turn this into a quick recap sheet or a practice quiz next.",
      ].join("\n");
}

function sentenceToQuestion(sentence: string, index: number, preferThai = false) {
  const cleaned = sentence.replace(/\s+/g, " ").trim().replace(/[.?!]+$/, "");

  if (!cleaned) {
    return preferThai
      ? `ข้อ ${index + 1}: ใจความสำคัญจากแหล่งข้อมูลที่ ${index + 1} คืออะไร`
      : `Question ${index + 1}: What is the main idea from source ${index + 1}?`;
  }

  const shortened = cleaned.length > 110 ? `${cleaned.slice(0, 107)}...` : cleaned;
  return preferThai
    ? `ข้อ ${index + 1}: จากโน้ตส่วนนี้ "${shortened}" ลองอธิบายด้วยคำของตัวเอง`
    : `Question ${index + 1}: Based on this note, explain "${shortened}" in your own words.`;
}

function buildQuizReply(chunks: ChatSourceChunk[], preferThai = false) {
  const prompts = chunks
    .flatMap((chunk) => getKeyPoints(chunk.content, 1))
    .slice(0, 3)
    .map((sentence, index) => sentenceToQuestion(sentence, index, preferThai));

  return preferThai
    ? [
        "ผมทำชุดเช็กความเข้าใจสั้น ๆ จากเอกสารให้แล้ว:",
        ...prompts,
        "ตอบกลับมาได้เลย แล้วผมจะช่วยตรวจและให้ feedback จากไฟล์ที่อัปไว้ครับ",
      ].join("\n")
    : [
        "I made a short document-based check for you:",
        ...prompts,
        "Reply with your answers and I can give feedback based on the uploaded materials.",
      ].join("\n");
}

function buildGenericReplyFromChunks(chunks: ChatSourceChunk[], preferThai = false) {
  const sources = Array.from(new Set(chunks.map((chunk) => chunk.attachmentName))).join(", ");
  const points = chunks.flatMap((chunk) => getKeyPoints(chunk.content, 1)).slice(0, 3);

  return preferThai
    ? [
        `ผมอ่าน ${sources} แล้วครับ`,
        ...points.map((point, index) => `${index + 1}. ${point}`),
        "ถ้าต้องการ ผมช่วยสรุป อธิบาย หรือสร้างควิซจากแหล่งข้อมูลเหล่านี้ต่อให้ได้ครับ",
      ].join("\n")
    : [
        `I checked ${sources}.`,
        ...points.map((point, index) => `${index + 1}. ${point}`),
        "Ask me to summarize, explain, or generate a quiz from these sources if you want a more focused answer.",
      ].join("\n");
}

function buildGenericReply(prompt: string): AssistantReply {
  const lower = prompt.toLowerCase();
  const preferThai = hasThaiText(prompt);
  const isQuizPrompt =
    lower.includes("quiz") ||
    lower.includes("question") ||
    includesAny(prompt, thaiIntentKeywords.quiz);
  const isSummaryPrompt =
    lower.includes("summary") ||
    lower.includes("summarize") ||
    includesAny(prompt, thaiIntentKeywords.summary);
  const isExplainPrompt =
    lower.includes("explain") ||
    lower.includes("teach") ||
    includesAny(prompt, thaiIntentKeywords.explain);

  if (isQuizPrompt) {
    return {
      text: preferThai
        ? "อัปโหลดไฟล์เรียนก่อน แล้วผมจะช่วยสร้างคำถามหรือควิซจากเนื้อหาให้ได้ครับ"
        : "Upload a study file first, then I can generate practice questions from it.",
      citations: [],
    };
  }
  if (isSummaryPrompt) {
    return {
      text: preferThai
        ? "อัปโหลดไฟล์เรียนก่อน แล้วผมจะสรุปให้พร้อมอ้างอิงจากแหล่งข้อมูลได้ครับ"
        : "Upload a study file first, then I can summarize it for you with source references.",
      citations: [],
    };
  }
  if (isExplainPrompt) {
    return {
      text: preferThai
        ? "อัปโหลดโน้ต ไฟล์บทเรียน PDF DOCX หรือรูปภาพก่อน แล้วผมจะช่วยอธิบายเป็นขั้นตอนให้ครับ"
        : "Upload your notes, lesson file, PDF, DOCX, or an image first, and I will explain it step by step.",
      citations: [],
    };
  }
  return {
    text: preferThai
      ? "ผมอ่านไฟล์เรียนที่อัปโหลดได้ อ้างอิงแหล่งข้อมูลได้ และช่วยสรุป อธิบาย หรือทำควิซจากไฟล์เหล่านั้นให้ได้ครับ"
      : "I can read uploaded study files, cite the source, and help summarize, explain, or quiz you from them.",
    citations: [],
  };
}

export async function parseChatFiles(fileList: FileList | File[]) {
  const files = Array.from(fileList);
  const attachments: ChatAttachment[] = [];
  const rejected: string[] = [];

  for (const [index, file] of files.entries()) {
    if (!isSupportedTextFile(file)) {
      rejected.push(`${file.name} is not a supported study file yet.`);
      continue;
    }

    const maxFileBytes = getMaxFileBytes(file);

    if (file.size > maxFileBytes) {
      rejected.push(
        `${file.name} is too large. Keep each file under ${getMaxLabel(file)} for now.`,
      );
      continue;
    }

    try {
      const { content, sections } = await extractTextContent(file);

      if (!content) {
        rejected.push(`${file.name} has no readable text content.`);
        continue;
      }

      const attachmentId = makeAttachmentId(file.name, index);
      attachments.push({
        id: attachmentId,
        name: file.name,
        mimeType:
          file.type ||
          (isPdfFile(file)
            ? "application/pdf"
            : isDocxFile(file)
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : isImageFile(file)
                ? "image/png"
                : "text/plain"),
        size: file.size,
        sourceType: getSourceType(file),
        content,
        excerpt: buildExcerpt(content),
        uploadedAt: new Date().toISOString(),
        chunks: buildChunks(attachmentId, file.name, content, sections),
      });
    } catch {
      rejected.push(`${file.name} could not be read in the browser.`);
    }
  }

  return { attachments, rejected };
}

export function formatAttachmentSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildUploadAcknowledgement(
  attachments: ChatAttachment[],
): AssistantReply {
  const names = attachments.map((attachment) => attachment.name).join(", ");
  const citations = buildCitations(
    attachments.flatMap((attachment) => getAttachmentChunks(attachment).slice(0, 1)),
  );
  const points = attachments
    .flatMap((attachment) => getKeyPoints(attachment.content, 2))
    .slice(0, 3);

  if (!points.length) {
    return {
      text: `ผมอ่าน ${names} เรียบร้อยแล้วครับ พิมพ์ต่อได้เลยว่าต้องการให้สรุป อธิบาย หรือสร้างควิซจากไฟล์เหล่านี้`,
      citations,
    };
  }

  return {
    text: [
      `ผมอ่าน ${names} เรียบร้อยแล้วครับ`,
      "นี่คือประเด็นแรก ๆ ที่ผมพบจากไฟล์:",
      ...points.map((point, index) => `${index + 1}. ${point}`),
    ].join("\n"),
    citations,
  };
}

export function buildAssistantReply(
  prompt: string,
  attachments: ChatAttachment[],
): AssistantReply {
  if (!attachments.length) {
    return buildGenericReply(prompt);
  }
  const lower = prompt.toLowerCase();
  const preferThai = hasThaiText(prompt);
  const relevantChunks = selectRelevantChunks(prompt, attachments);
  const citations = buildCitations(relevantChunks);
  const isQuizPrompt =
    lower.includes("quiz") ||
    lower.includes("question") ||
    includesAny(prompt, thaiIntentKeywords.quiz);
  const isExplainPrompt =
    lower.includes("explain") ||
    lower.includes("teach") ||
    includesAny(prompt, thaiIntentKeywords.explain);
  const isSummaryPrompt =
    lower.includes("summary") ||
    lower.includes("summarize") ||
    includesAny(prompt, thaiIntentKeywords.summary);

  if (isQuizPrompt) {
    return {
      text: buildQuizReply(relevantChunks, preferThai),
      citations,
    };
  }
  if (isExplainPrompt) {
    return {
      text: buildExplanationReply(relevantChunks, preferThai),
      citations,
    };
  }
  if (isSummaryPrompt) {
    return {
      text: buildSummaryReply(relevantChunks, preferThai),
      citations,
    };
  }
  return {
    text: buildGenericReplyFromChunks(relevantChunks, preferThai),
    citations,
  };
}
export function shouldRespondToGroupPrompt(prompt: string) {
  const lower = prompt.toLowerCase();
  return [
    "learnbot",
    "bot",
    "summary",
    "summarize",
    "explain",
    "quiz",
    "question",
    "teach",
    "source",
  ].some((keyword) => lower.includes(keyword))
    ? true
    : includesAny(prompt, [
        ...thaiIntentKeywords.summary,
        ...thaiIntentKeywords.explain,
        ...thaiIntentKeywords.quiz,
        ...thaiIntentKeywords.support,
      ]);
}
