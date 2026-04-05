import type { QuizAttempt } from "@/components/learning-provider";
import { quizQuestionBank, type QuizQuestion } from "@/data/quiz-bank";

export type MasteryLevel = "critical" | "watch" | "improving";
export type AdaptivePracticeMode = "default" | "focus" | "adaptive" | "repair";

export type WeaknessInsight = {
  key: string;
  subject: string;
  topic: string;
  concept: string;
  wrongCount: number;
  totalCount: number;
  correctCount: number;
  accuracy: number;
  lastPrompt: string;
  lastExplanation: string;
  relatedQuestions: QuizQuestion[];
  recommendedAction: string;
  masteryLevel: MasteryLevel;
};

export type AdaptivePracticePlan = {
  mode: AdaptivePracticeMode;
  heading: string;
  description: string;
  questions: QuizQuestion[];
  focusAreas: WeaknessInsight[];
};

export type StudyRoadmapAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  tone: "primary" | "accent" | "soft";
};

export type StudyRoadmap = {
  accuracy: number;
  totalAttempts: number;
  weaknessCount: number;
  summary: string;
  strongestSubject?: string;
  weakestSubject?: string;
  nextFocus?: WeaknessInsight;
  recentMistakes: QuizAttempt[];
  actions: StudyRoadmapAction[];
};

type BuildAdaptivePracticePlanInput = {
  attempts: QuizAttempt[];
  subject?: QuizQuestion["subject"];
  topic?: string;
  concept?: string;
  mode?: string;
};

function buildRecommendedAction(entry: {
  wrongCount: number;
  accuracy: number;
  concept: string;
  topic: string;
}) {
  if (entry.wrongCount >= 2 && entry.accuracy < 50) {
    return `Rebuild ${entry.concept} from the basics, then do a short checkpoint on ${entry.topic}.`;
  }

  if (entry.accuracy < 75) {
    return `Do another focused quiz on ${entry.concept} and compare your answer with the explanation right away.`;
  }

  return `Keep practicing ${entry.concept} with one or two more questions to make the idea stick.`;
}

function buildMasteryLevel(entry: {
  wrongCount: number;
  accuracy: number;
}): MasteryLevel {
  if (entry.wrongCount >= 2 && entry.accuracy < 50) {
    return "critical";
  }

  if (entry.wrongCount >= 1 && entry.accuracy < 80) {
    return "watch";
  }

  return "improving";
}

function uniqueQuestions(questions: QuizQuestion[]) {
  const seen = new Set<string>();

  return questions.filter((question) => {
    if (seen.has(question.id)) {
      return false;
    }

    seen.add(question.id);
    return true;
  });
}

function rotateOptions(options: string[], offset: number) {
  return options.map((_, index) => options[(index + offset) % options.length]);
}

function normalizeSubject(subject?: string): QuizQuestion["subject"] {
  if (subject === "Physics" || subject === "Mathematics" || subject === "General") {
    return subject;
  }

  return "General";
}

function filterQuestionBank({
  subject,
  topic,
  concept,
}: Omit<BuildAdaptivePracticePlanInput, "attempts" | "mode">) {
  return quizQuestionBank.filter((question) => {
    if (subject && question.subject !== subject) {
      return false;
    }

    if (topic && question.topic !== topic) {
      return false;
    }

    if (concept && question.concept !== concept) {
      return false;
    }

    return true;
  });
}

function buildRepairQuestionsFromAttempts(
  attempts: QuizAttempt[],
  subject?: QuizQuestion["subject"],
  topic?: string,
  concept?: string,
) {
  const fallbackOptionPool = Array.from(
    new Set(
      quizQuestionBank
        .filter((question) => !subject || question.subject === subject)
        .flatMap((question) => question.options),
    ),
  );

  return attempts
    .filter((attempt) => !attempt.isCorrect)
    .filter((attempt) => !subject || normalizeSubject(attempt.subject) === subject)
    .filter((attempt) => !topic || attempt.topic === topic)
    .filter((attempt) => !concept || attempt.concept === concept)
    .sort(
      (left, right) =>
        new Date(right.answeredAt).getTime() - new Date(left.answeredAt).getTime(),
    )
    .slice(0, 6)
    .map((attempt, index) => {
      const distractors = Array.from(
        new Set(
          [
            attempt.selectedAnswer,
            ...attempts
              .filter((item) => item.questionId !== attempt.questionId)
              .map((item) => item.correctAnswer),
            ...fallbackOptionPool,
          ].filter(
            (option) =>
              option &&
              option !== attempt.correctAnswer &&
              option !== attempt.selectedAnswer,
          ),
        ),
      ).slice(0, 2);

      const optionSet = rotateOptions(
        [
          attempt.correctAnswer,
          attempt.selectedAnswer,
          ...distractors,
        ]
          .filter(Boolean)
          .slice(0, 4),
        index % 4,
      );

      while (optionSet.length < 4) {
        optionSet.push(`Review detail ${optionSet.length + 1}`);
      }

      return {
        id: `repair-${attempt.id}`,
        subject: normalizeSubject(attempt.subject),
        topic: attempt.topic,
        concept: attempt.concept,
        prompt: attempt.prompt,
        options: optionSet,
        correctIndex: optionSet.indexOf(attempt.correctAnswer),
        explanation: `${attempt.explanation} Learn'Bot added this repair card because you previously answered "${attempt.selectedAnswer}".`,
      } satisfies QuizQuestion;
    });
}

function getSubjectPerformance(attempts: QuizAttempt[]) {
  const subjectMap = new Map<
    string,
    {
      total: number;
      correct: number;
      wrong: number;
    }
  >();

  for (const attempt of attempts) {
    const current = subjectMap.get(attempt.subject) ?? {
      total: 0,
      correct: 0,
      wrong: 0,
    };

    current.total += 1;
    if (attempt.isCorrect) {
      current.correct += 1;
    } else {
      current.wrong += 1;
    }

    subjectMap.set(attempt.subject, current);
  }

  return Array.from(subjectMap.entries()).map(([subject, value]) => ({
    subject,
    total: value.total,
    wrong: value.wrong,
    accuracy: value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0,
  }));
}

export function getWeaknessInsights(attempts: QuizAttempt[]) {
  const map = new Map<
    string,
    Omit<WeaknessInsight, "relatedQuestions" | "recommendedAction" | "masteryLevel">
  >();

  for (const attempt of attempts) {
    const key = `${attempt.subject}-${attempt.topic}-${attempt.concept}`;
    const current = map.get(key);

    if (!current) {
      map.set(key, {
        key,
        subject: attempt.subject,
        topic: attempt.topic,
        concept: attempt.concept,
        wrongCount: attempt.isCorrect ? 0 : 1,
        totalCount: 1,
        correctCount: attempt.isCorrect ? 1 : 0,
        accuracy: attempt.isCorrect ? 100 : 0,
        lastPrompt: attempt.prompt,
        lastExplanation: attempt.explanation,
      });
      continue;
    }

    current.totalCount += 1;

    if (attempt.isCorrect) {
      current.correctCount += 1;
    } else {
      current.wrongCount += 1;
      current.lastPrompt = attempt.prompt;
      current.lastExplanation = attempt.explanation;
    }

    current.accuracy = Math.round((current.correctCount / current.totalCount) * 100);
  }

  return Array.from(map.values())
    .map((entry) => {
      const relatedQuestions = quizQuestionBank.filter(
        (question) =>
          question.subject === normalizeSubject(entry.subject) &&
          question.topic === entry.topic &&
          question.concept === entry.concept,
      );

      return {
        ...entry,
        relatedQuestions,
        recommendedAction: buildRecommendedAction(entry),
        masteryLevel: buildMasteryLevel(entry),
      } satisfies WeaknessInsight;
    })
    .filter((entry) => entry.wrongCount > 0)
    .sort((left, right) => {
      if (right.wrongCount !== left.wrongCount) {
        return right.wrongCount - left.wrongCount;
      }

      if (left.accuracy !== right.accuracy) {
        return left.accuracy - right.accuracy;
      }

      return right.totalCount - left.totalCount;
    });
}

export function buildAdaptivePracticePlan({
  attempts,
  subject,
  topic,
  concept,
  mode,
}: BuildAdaptivePracticePlanInput): AdaptivePracticePlan {
  const insights = getWeaknessInsights(attempts).filter((entry) => {
    if (subject && entry.subject !== subject) {
      return false;
    }

    if (topic && entry.topic !== topic) {
      return false;
    }

    if (concept && entry.concept !== concept) {
      return false;
    }

    return true;
  });

  const baseQuestions = filterQuestionBank({ subject, topic, concept });
  const repairQuestions = buildRepairQuestionsFromAttempts(
    attempts,
    subject,
    topic,
    concept,
  );
  const selectedMode: AdaptivePracticeMode =
    mode === "repair"
      ? "repair"
      : mode === "adaptive"
        ? "adaptive"
        : topic || concept
          ? "focus"
          : "default";

  if (selectedMode === "repair") {
    const focusAreas =
      insights.length > 0
        ? insights.slice(0, 2)
        : getWeaknessInsights(attempts).filter(
            (entry) =>
              (!subject || entry.subject === subject) &&
              (!topic || entry.topic === topic) &&
              (!concept || entry.concept === concept),
          );
    const questions = uniqueQuestions([
      ...repairQuestions,
      ...focusAreas.flatMap((entry) => entry.relatedQuestions),
      ...baseQuestions,
    ]).slice(0, 8);

    return {
      mode: "repair",
      heading: concept
        ? `Repair session: ${concept}`
        : topic
          ? `Repair session: ${topic}`
          : "Repair session",
      description:
        "This repair session rebuilds the exact concepts you missed before, then mixes in nearby questions so the idea becomes stable.",
      questions,
      focusAreas,
    };
  }

  if (selectedMode === "adaptive") {
    const focusAreas = insights.slice(0, 3);
    const questions = uniqueQuestions([
      ...repairQuestions,
      ...focusAreas.flatMap((entry) => entry.relatedQuestions),
    ]).slice(0, 8);

    return {
      mode: "adaptive",
      heading: "Adaptive repair session",
      description: focusAreas.length
        ? "This session is built from the concepts you miss most often, so the quiz stays focused on your actual weak points."
        : "No clear weakness pattern yet, so this session uses a balanced practice set.",
      questions:
        questions.length > 0
          ? questions
          : uniqueQuestions(filterQuestionBank({ subject })).slice(0, 8),
      focusAreas,
    };
  }

  if (selectedMode === "focus") {
    const focusAreas =
      insights.length > 0
        ? insights.slice(0, 2)
        : getWeaknessInsights(attempts).filter(
            (entry) =>
              (!subject || entry.subject === subject) &&
              (!topic || entry.topic === topic) &&
              (!concept || entry.concept === concept),
          );

    const fallbackQuestions = uniqueQuestions([
      ...repairQuestions,
      ...filterQuestionBank({ subject }),
    ]).slice(0, 8);

    return {
      mode: "focus",
      heading: concept ? `Focused practice: ${concept}` : `Focused practice: ${topic}`,
      description:
        "This session keeps the questions narrow so you can repair one topic or concept at a time.",
      questions: baseQuestions.length > 0 ? baseQuestions : fallbackQuestions,
      focusAreas,
    };
  }

  return {
    mode: "default",
    heading: "Standard practice session",
    description:
      "Use this mode for a normal quiz, or jump into adaptive mode when you want Learn'Bot to target your weak points automatically.",
    questions:
      baseQuestions.length > 0 ? baseQuestions : filterQuestionBank({ subject }),
    focusAreas: insights.slice(0, 2),
  };
}

export function getStudyRoadmap(attempts: QuizAttempt[]): StudyRoadmap {
  const totalAttempts = attempts.length;
  const totalCorrect = attempts.filter((attempt) => attempt.isCorrect).length;
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const weaknesses = getWeaknessInsights(attempts);
  const nextFocus = weaknesses[0];
  const subjectPerformance = getSubjectPerformance(attempts).sort((left, right) => {
    if (right.accuracy !== left.accuracy) {
      return right.accuracy - left.accuracy;
    }

    return right.total - left.total;
  });
  const strongestSubject = subjectPerformance.find((item) => item.total >= 2)?.subject;
  const weakestSubject = [...subjectPerformance]
    .sort((left, right) => {
      if (right.wrong !== left.wrong) {
        return right.wrong - left.wrong;
      }

      return left.accuracy - right.accuracy;
    })
    .find((item) => item.wrong > 0)?.subject;

  const actions: StudyRoadmapAction[] = nextFocus
    ? [
        {
          id: "repair-focus",
          label: "Repair top weakness",
          description: `${nextFocus.topic} - ${nextFocus.concept}`,
          href: `/quiz?mode=repair&subject=${encodeURIComponent(nextFocus.subject)}&topic=${encodeURIComponent(nextFocus.topic)}&concept=${encodeURIComponent(nextFocus.concept)}`,
          tone: "primary",
        },
        {
          id: "adaptive-subject",
          label: "Run adaptive practice",
          description: weakestSubject
            ? `Let Learn'Bot target your weakest subject: ${weakestSubject}`
            : "Let Learn'Bot target your most repeated mistakes",
          href: weakestSubject
            ? `/quiz?mode=adaptive&subject=${encodeURIComponent(weakestSubject)}`
            : "/quiz?mode=adaptive",
          tone: "accent",
        },
        {
          id: "review-weakness",
          label: "Open weakness tracker",
          description: "Review the exact concepts you still miss and plan the next repair loop.",
          href: "/weakness-tracker",
          tone: "soft",
        },
      ]
    : [
        {
          id: "start-quiz",
          label: "Start first quiz",
          description: "Create your first learning history so Learn'Bot can map weak points.",
          href: "/quiz",
          tone: "primary",
        },
        {
          id: "open-tracker",
          label: "Open weakness tracker",
          description: "Your weak-point map will appear here after the first quiz attempts.",
          href: "/weakness-tracker",
          tone: "soft",
        },
      ];

  const summary = nextFocus
    ? `Your next best move is to repair ${nextFocus.concept} in ${nextFocus.topic}, because this is still the most repeated weak point in your recent practice.`
    : "You have not built enough quiz history yet, so start with a quiz or turn a chat into a study set first.";

  return {
    accuracy,
    totalAttempts,
    weaknessCount: weaknesses.length,
    summary,
    strongestSubject,
    weakestSubject,
    nextFocus,
    recentMistakes: attempts.filter((attempt) => !attempt.isCorrect).slice(-5).reverse(),
    actions,
  };
}
