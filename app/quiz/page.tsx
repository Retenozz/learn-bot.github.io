import type { QuizSubject } from "@/data/quiz-bank";
import { QuizBoard } from "@/components/quiz-board";

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{
    topic?: string;
    concept?: string;
    mode?: string;
    subject?: QuizSubject;
    generated?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <QuizBoard
      topicFromQuery={params.topic}
      conceptFromQuery={params.concept}
      modeFromQuery={params.mode}
      subjectFromQuery={params.subject}
      generatedFromQuery={params.generated}
    />
  );
}
