import { FlashcardsBoard } from "@/components/flashcards-board";

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{
    deck?: string;
  }>;
}) {
  const params = await searchParams;

  return <FlashcardsBoard deckFromQuery={params.deck} />;
}
