import { ClassroomChatRoom } from "@/components/classroom-chat-room";

function normalizeClassroomId(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function ClassroomDetailPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;

  return <ClassroomChatRoom classroomId={normalizeClassroomId(classroomId)} />;
}
