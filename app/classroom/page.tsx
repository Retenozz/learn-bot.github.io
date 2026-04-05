import { ClassroomBoard } from "@/components/classroom-board";

export default async function ClassroomPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;

  return <ClassroomBoard initialInviteCode={invite} />;
}
