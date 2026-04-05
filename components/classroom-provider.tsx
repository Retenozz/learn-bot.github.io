"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ChatAttachment, ChatCitation } from "@/lib/chat-documents";
import {
  getProfileDisplayName,
  useAuth,
} from "@/components/auth-provider";
import { isMissingTableError } from "@/lib/supabase/user-state";

export type ClassroomIconKey =
  | "graduation"
  | "school"
  | "monitor"
  | "rocket"
  | "link";

export type GroupMessage = {
  id: string;
  senderRole: "me" | "member" | "system" | "assistant";
  senderName: string;
  senderUserId?: string | null;
  text: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  citations?: ChatCitation[];
};

export type GroupClassroom = {
  id: string;
  name: string;
  code: string;
  icon: ClassroomIconKey;
  materials: string[];
  members: string[];
  messages: GroupMessage[];
  createdAt: string;
  ownerUserId: string;
  isOwner: boolean;
};

type LegacyGroupClassroom = {
  id: string;
  name: string;
  code: string;
  icon: ClassroomIconKey;
  materials: string[];
  members: string[];
  messages: GroupMessage[];
  createdAt: string;
};

type CreateClassroomInput = {
  name: string;
  icon: ClassroomIconKey;
  materialLabel?: string;
};

type ClassroomMessageDraft = {
  senderRole: GroupMessage["senderRole"];
  senderName: string;
  text: string;
  attachments?: ChatAttachment[];
  citations?: ChatCitation[];
};

type JoinClassroomInput = {
  code: string;
  memberName?: string;
};

type JoinClassroomResult =
  | {
      ok: true;
      roomId: string;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

type ClassroomMutationResult = {
  ok: boolean;
  message: string;
};

type CreateClassroomResult =
  | {
      ok: true;
      roomId: string;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

type ClassroomContextValue = {
  classrooms: GroupClassroom[];
  hydrated: boolean;
  schemaReady: boolean;
  createClassroom: (input: CreateClassroomInput) => Promise<CreateClassroomResult>;
  joinClassroomByCode: (input: JoinClassroomInput) => Promise<JoinClassroomResult>;
  deleteClassroom: (classroomId: string) => Promise<ClassroomMutationResult>;
  leaveClassroom: (classroomId: string) => Promise<ClassroomMutationResult>;
  getClassroomById: (classroomId: string) => GroupClassroom | undefined;
  addClassroomMessages: (
    classroomId: string,
    drafts: ClassroomMessageDraft[],
  ) => Promise<ClassroomMutationResult>;
  reloadClassrooms: () => Promise<void>;
};

type ClassroomRow = {
  id: string;
  owner_user_id: string;
  name: string;
  code: string;
  icon: ClassroomIconKey;
  materials: string[] | null;
  created_at: string;
};

type ClassroomMemberRow = {
  classroom_id: string;
  user_id: string;
  display_name: string;
};

type ClassroomMessageRow = {
  id: string;
  classroom_id: string;
  sender_user_id: string | null;
  sender_role: "me" | "member" | "system" | "assistant";
  sender_name: string;
  text: string;
  attachments: ChatAttachment[] | null;
  citations: ChatCitation[] | null;
  created_at: string;
};

type LoadSharedClassroomsResult =
  | {
      classrooms: GroupClassroom[];
      schemaReady: true;
    }
  | {
      classrooms: GroupClassroom[];
      schemaReady: false;
    };

const EMPTY_CLASSROOMS: GroupClassroom[] = [];

function buildRoomId() {
  return `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeClassCode(input: string) {
  return input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function buildRoomCodeCandidate(name: string, attempt = 0) {
  const sanitized = sanitizeClassCode(name);

  if (attempt === 0 && sanitized.length >= 3) {
    return sanitized.slice(0, 6);
  }

  if (sanitized.length >= 2) {
    return `${sanitized.slice(0, 4)}${Math.floor(Math.random() * 90 + 10)}`.slice(0, 6);
  }

  return `CLS${Math.floor(Math.random() * 900 + 100)}`;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeMaterials(values: string[] | null | undefined) {
  return uniqueStrings((values ?? []).map((item) => item.trim()).filter(Boolean));
}

function normalizeLegacyClassrooms(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const candidate = item as Partial<LegacyGroupClassroom>;
    const id = typeof candidate.id === "string" ? candidate.id : buildRoomId();
    const name =
      typeof candidate.name === "string" && candidate.name.trim()
        ? candidate.name.trim()
        : "Untitled room";
    const code = sanitizeClassCode(typeof candidate.code === "string" ? candidate.code : "");
    const icon =
      candidate.icon === "graduation" ||
      candidate.icon === "school" ||
      candidate.icon === "monitor" ||
      candidate.icon === "rocket" ||
      candidate.icon === "link"
        ? candidate.icon
        : "graduation";

    return [
      {
        id,
        name,
        code,
        icon,
        materials: normalizeMaterials(candidate.materials),
        members: Array.isArray(candidate.members)
          ? candidate.members.filter((member): member is string => typeof member === "string")
          : [],
        messages: Array.isArray(candidate.messages)
          ? candidate.messages.filter(
              (message): message is GroupMessage =>
                !!message &&
                typeof message === "object" &&
                typeof message.id === "string" &&
                typeof message.senderRole === "string" &&
                typeof message.senderName === "string" &&
                typeof message.text === "string" &&
                typeof message.createdAt === "string",
            )
          : [],
        createdAt:
          typeof candidate.createdAt === "string"
            ? candidate.createdAt
            : new Date().toISOString(),
      } satisfies LegacyGroupClassroom,
    ];
  });
}

async function loadLegacyClassrooms(
  supabase: ReturnType<typeof useAuth>["supabase"],
) {
  const { data, error } = await supabase
    .from("user_classroom_state")
    .select("classrooms")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }

    throw error;
  }

  const row = data as { classrooms: unknown } | null;
  return normalizeLegacyClassrooms(row?.classrooms);
}

function buildGroupClassrooms(
  userId: string,
  roomRows: ClassroomRow[],
  memberRows: ClassroomMemberRow[],
  messageRows: ClassroomMessageRow[],
) {
  const membersByRoom = new Map<string, ClassroomMemberRow[]>();
  const messagesByRoom = new Map<string, ClassroomMessageRow[]>();

  memberRows.forEach((member) => {
    const current = membersByRoom.get(member.classroom_id) ?? [];
    current.push(member);
    membersByRoom.set(member.classroom_id, current);
  });

  messageRows.forEach((message) => {
    const current = messagesByRoom.get(message.classroom_id) ?? [];
    current.push(message);
    messagesByRoom.set(message.classroom_id, current);
  });

  return roomRows.map((room) => {
    const roomMembers = membersByRoom.get(room.id) ?? [];
    const memberNameByUserId = new Map(
      roomMembers.map((member) => [member.user_id, member.display_name]),
    );

    return {
      id: room.id,
      name: room.name,
      code: room.code,
      icon: room.icon,
      materials: normalizeMaterials(room.materials),
      members: roomMembers.map((member) => member.display_name),
      messages: (messagesByRoom.get(room.id) ?? []).map((message) => {
        const senderRole: GroupMessage["senderRole"] =
          message.sender_role === "assistant" || message.sender_role === "system"
            ? message.sender_role
            : message.sender_user_id === userId
              ? "me"
              : "member";
        const senderName =
          senderRole === "assistant" || senderRole === "system"
            ? message.sender_name
            : message.sender_user_id
              ? memberNameByUserId.get(message.sender_user_id) ?? message.sender_name
              : message.sender_name;

        return {
          id: message.id,
          senderRole,
          senderName,
          senderUserId: message.sender_user_id,
          text: message.text,
          createdAt: message.created_at,
          attachments: message.attachments ?? undefined,
          citations: message.citations ?? undefined,
        };
      }),
      createdAt: room.created_at,
      ownerUserId: room.owner_user_id,
      isOwner: room.owner_user_id === userId,
    } satisfies GroupClassroom;
  });
}

async function loadSharedClassrooms(
  supabase: ReturnType<typeof useAuth>["supabase"],
  userId: string,
): Promise<LoadSharedClassroomsResult> {
  const { data: membershipData, error: membershipError } = await supabase
    .from("classroom_members")
    .select("classroom_id")
    .eq("user_id", userId);

  if (membershipError) {
    if (isMissingTableError(membershipError)) {
      return {
        classrooms: [],
        schemaReady: false,
      };
    }

    throw membershipError;
  }

  const classroomIds = Array.from(
    new Set(
      ((membershipData ?? []) as Array<{ classroom_id: string }>).map(
        (item) => item.classroom_id,
      ),
    ),
  );

  if (!classroomIds.length) {
    return {
      classrooms: [],
      schemaReady: true,
    };
  }

  const [{ data: roomData, error: roomError }, { data: membersData, error: membersError }, { data: messagesData, error: messagesError }] =
    await Promise.all([
      supabase
        .from("classrooms")
        .select("id, owner_user_id, name, code, icon, materials, created_at")
        .in("id", classroomIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("classroom_members")
        .select("classroom_id, user_id, display_name")
        .in("classroom_id", classroomIds),
      supabase
        .from("classroom_messages")
        .select(
          "id, classroom_id, sender_user_id, sender_role, sender_name, text, attachments, citations, created_at",
        )
        .in("classroom_id", classroomIds)
        .order("created_at", { ascending: true }),
    ]);

  if (roomError) {
    throw roomError;
  }

  if (membersError) {
    throw membersError;
  }

  if (messagesError) {
    throw messagesError;
  }

  return {
    classrooms: buildGroupClassrooms(
      userId,
      (roomData ?? []) as ClassroomRow[],
      (membersData ?? []) as ClassroomMemberRow[],
      (messagesData ?? []) as ClassroomMessageRow[],
    ),
    schemaReady: true,
  };
}

const ClassroomContext = createContext<ClassroomContextValue | undefined>(undefined);

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const { supabase, user, profile, loading } = useAuth();
  const [classrooms, setClassrooms] = useState<GroupClassroom[]>(EMPTY_CLASSROOMS);
  const [hydrated, setHydrated] = useState(false);
  const [schemaReady, setSchemaReady] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const myDisplayName = getProfileDisplayName(profile, user);

  const migrateLegacyClassroomsIfNeeded = useCallback(async () => {
    if (!user) {
      return;
    }

    const legacyRooms = await loadLegacyClassrooms(supabase);

    if (!legacyRooms.length) {
      return;
    }

    for (const legacyRoom of legacyRooms) {
      let code = legacyRoom.code || buildRoomCodeCandidate(legacyRoom.name);
      let inserted = false;

      for (let attempt = 0; attempt < 8 && !inserted; attempt += 1) {
        const { error } = await supabase.from("classrooms").upsert(
          {
            id: legacyRoom.id,
            owner_user_id: user.id,
            name: legacyRoom.name,
            code,
            icon: legacyRoom.icon,
            materials: normalizeMaterials(legacyRoom.materials),
            created_at: legacyRoom.createdAt,
          },
          { onConflict: "id" },
        );

        if (!error) {
          inserted = true;
          break;
        }

        if (error.code === "23505") {
          code = buildRoomCodeCandidate(legacyRoom.name, attempt + 1);
          continue;
        }

        throw error;
      }

      if (!inserted) {
        throw new Error(`Could not migrate legacy classroom ${legacyRoom.name}.`);
      }

      const { error: membershipError } = await supabase.from("classroom_members").upsert(
        {
          classroom_id: legacyRoom.id,
          user_id: user.id,
          display_name: myDisplayName,
        },
        { onConflict: "classroom_id,user_id" },
      );

      if (membershipError) {
        throw membershipError;
      }

      if (legacyRoom.messages.length) {
        const { error: messageError } = await supabase
          .from("classroom_messages")
          .upsert(
            legacyRoom.messages.map((message) => ({
              id: message.id,
              classroom_id: legacyRoom.id,
              sender_user_id: user.id,
              sender_role: message.senderRole,
              sender_name: message.senderName,
              text: message.text,
              attachments: message.attachments ?? [],
              citations: message.citations ?? [],
              created_at: message.createdAt,
            })),
            { onConflict: "id" },
          );

        if (messageError) {
          throw messageError;
        }
      }
    }

    await supabase
      .from("user_classroom_state")
      .update({
        classrooms: [],
      })
      .eq("user_id", user.id);
  }, [myDisplayName, supabase, user]);

  const reloadClassrooms = useCallback(async () => {
    if (!user) {
      setClassrooms(EMPTY_CLASSROOMS);
      setSchemaReady(true);
      return;
    }

    try {
      const shared = await loadSharedClassrooms(supabase, user.id);

      if (!shared.schemaReady) {
        setSchemaReady(false);
        setClassrooms(EMPTY_CLASSROOMS);
        return;
      }

      await migrateLegacyClassroomsIfNeeded();

      const refreshed = await loadSharedClassrooms(supabase, user.id);
      setSchemaReady(refreshed.schemaReady);
      setClassrooms(refreshed.classrooms);
    } catch (error) {
      console.error("Failed to load classrooms", error);
      setClassrooms(EMPTY_CLASSROOMS);
    }
  }, [migrateLegacyClassroomsIfNeeded, supabase, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadClassrooms() {
      if (loading) {
        return;
      }

      if (!user) {
        setClassrooms(EMPTY_CLASSROOMS);
        setSchemaReady(true);
        setHydrated(true);
        return;
      }

      setHydrated(false);

      try {
        await reloadClassrooms();
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    void loadClassrooms();

    return () => {
      cancelled = true;
    };
  }, [loading, refreshTick, reloadClassrooms, user]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const channel = supabase
      .channel(`classroom-sync-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classrooms",
        },
        () => {
          setRefreshTick((current) => current + 1);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classroom_members",
        },
        () => {
          setRefreshTick((current) => current + 1);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classroom_messages",
        },
        () => {
          setRefreshTick((current) => current + 1);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user]);

  async function createClassroom(
    input: CreateClassroomInput,
  ): Promise<CreateClassroomResult> {
    if (!user) {
      return {
        ok: false,
        message: "Sign in first.",
      };
    }

    if (!schemaReady) {
      return {
        ok: false,
        message: "Run the latest Supabase SQL migration first.",
      };
    }

    const roomId = buildRoomId();
    const timestamp = new Date().toISOString();
    let code = buildRoomCodeCandidate(input.name);
    let created = false;

    for (let attempt = 0; attempt < 8 && !created; attempt += 1) {
      const { error } = await supabase.from("classrooms").insert({
        id: roomId,
        owner_user_id: user.id,
        name: input.name.trim(),
        code,
        icon: input.icon,
        materials: input.materialLabel ? [input.materialLabel.trim()] : [],
        created_at: timestamp,
      });

      if (!error) {
        created = true;
        break;
      }

      if (error.code === "23505") {
        code = buildRoomCodeCandidate(input.name, attempt + 1);
        continue;
      }

      return {
        ok: false,
        message: error.message,
      };
    }

    if (!created) {
      return {
        ok: false,
        message: "Could not generate a unique room code yet.",
      };
    }

    const { error: memberError } = await supabase.from("classroom_members").insert({
      classroom_id: roomId,
      user_id: user.id,
      display_name: myDisplayName,
    });

    if (memberError) {
      return {
        ok: false,
        message: memberError.message,
      };
    }

    const { error: messageError } = await supabase.from("classroom_messages").insert({
      id: `${roomId}-system-1`,
      classroom_id: roomId,
      sender_user_id: user.id,
      sender_role: "system",
      sender_name: "Learn'Bot",
      text: `Room "${input.name.trim()}" is ready. Share code ${code} so your classmates can join this shared room.`,
      attachments: [],
      citations: [],
      created_at: timestamp,
    });

    if (messageError) {
      return {
        ok: false,
        message: messageError.message,
      };
    }

    await reloadClassrooms();

    return {
      ok: true,
      roomId,
      message: `Created ${input.name.trim()}.`,
    };
  }

  async function joinClassroomByCode(
    input: JoinClassroomInput,
  ): Promise<JoinClassroomResult> {
    if (!user) {
      return {
        ok: false,
        message: "Sign in first.",
      };
    }

    if (!schemaReady) {
      return {
        ok: false,
        message: "Run the latest Supabase SQL migration first.",
      };
    }

    const code = sanitizeClassCode(input.code.trim());

    if (!code) {
      return {
        ok: false,
        message: "Enter a room code first.",
      };
    }

    const memberName = input.memberName?.trim() || myDisplayName;
    const { data, error } = await supabase.rpc("join_classroom_by_code", {
      room_code_input: code,
      member_display_name_input: memberName,
    });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    const resultRow = Array.isArray(data)
      ? (data[0] as
          | {
              joined_classroom_id: string;
              joined_classroom_name: string;
              joined_classroom_code: string;
              joined_now: boolean;
            }
          | undefined)
      : undefined;

    if (!resultRow) {
      return {
        ok: false,
        message: "Room code not found.",
      };
    }

    await reloadClassrooms();

    return {
      ok: true,
      roomId: resultRow.joined_classroom_id,
      message: resultRow.joined_now
        ? `${memberName} joined ${resultRow.joined_classroom_name}.`
        : `Opened ${resultRow.joined_classroom_name}.`,
    };
  }

  async function deleteClassroom(
    classroomId: string,
  ): Promise<ClassroomMutationResult> {
    if (!user) {
      return {
        ok: false,
        message: "Sign in first.",
      };
    }

    const classroom = classrooms.find((item) => item.id === classroomId);

    if (!classroom) {
      return {
        ok: false,
        message: "Room not found.",
      };
    }

    if (!classroom.isOwner) {
      return {
        ok: false,
        message: "Only the room owner can delete this room.",
      };
    }

    const { error } = await supabase.from("classrooms").delete().eq("id", classroomId);

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    await reloadClassrooms();

    return {
      ok: true,
      message: `"${classroom.name}" was deleted.`,
    };
  }

  async function leaveClassroom(
    classroomId: string,
  ): Promise<ClassroomMutationResult> {
    if (!user) {
      return {
        ok: false,
        message: "Sign in first.",
      };
    }

    const classroom = classrooms.find((item) => item.id === classroomId);

    if (!classroom) {
      return {
        ok: false,
        message: "Room not found.",
      };
    }

    if (classroom.isOwner) {
      return {
        ok: false,
        message: "Room owners need to delete the room instead of leaving it.",
      };
    }

    const { error: messageError } = await supabase.from("classroom_messages").insert({
      id: `${classroom.id}-leave-${user.id}-${Date.now()}`,
      classroom_id: classroom.id,
      sender_user_id: user.id,
      sender_role: "system",
      sender_name: "Learn'Bot",
      text: `${myDisplayName} left this room.`,
      attachments: [],
      citations: [],
      created_at: new Date().toISOString(),
    });

    if (messageError) {
      return {
        ok: false,
        message: messageError.message,
      };
    }

    const { error } = await supabase
      .from("classroom_members")
      .delete()
      .eq("classroom_id", classroomId)
      .eq("user_id", user.id);

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    await reloadClassrooms();

    return {
      ok: true,
      message: `You left ${classroom.name}.`,
    };
  }

  function getClassroomById(classroomId: string) {
    return classrooms.find((classroom) => classroom.id === classroomId);
  }

  async function addClassroomMessages(
    classroomId: string,
    drafts: ClassroomMessageDraft[],
  ): Promise<ClassroomMutationResult> {
    if (!user) {
      return {
        ok: false,
        message: "Sign in first.",
      };
    }

    if (!drafts.length) {
      return {
        ok: false,
        message: "No messages to save.",
      };
    }

    const classroom = classrooms.find((item) => item.id === classroomId);

    if (!classroom) {
      return {
        ok: false,
        message: "Room not found.",
      };
    }

    const baseTimestamp = Date.now();
    const nextMessages = drafts.map((draft, index) => ({
      id: `${classroomId}-${baseTimestamp}-${index}`,
      classroom_id: classroomId,
      sender_user_id:
        draft.senderRole === "assistant" || draft.senderRole === "system"
          ? null
          : user.id,
      sender_role: draft.senderRole,
      sender_name:
        draft.senderRole === "assistant" || draft.senderRole === "system"
          ? draft.senderName
          : myDisplayName,
      text: draft.text,
      attachments: draft.attachments ?? [],
      citations: draft.citations ?? [],
      created_at: new Date(baseTimestamp + index * 1000).toISOString(),
    }));

    const { error: messageError } = await supabase
      .from("classroom_messages")
      .insert(nextMessages);

    if (messageError) {
      return {
        ok: false,
        message: messageError.message,
      };
    }

    const nextMaterials = normalizeMaterials([
      ...classroom.materials,
      ...drafts.flatMap((draft) =>
        (draft.attachments ?? []).map((attachment) => attachment.name),
      ),
    ]);

    if (nextMaterials.length !== classroom.materials.length) {
      const { error: classroomError } = await supabase
        .from("classrooms")
        .update({
          materials: nextMaterials,
        })
        .eq("id", classroomId);

      if (classroomError) {
        return {
          ok: false,
          message: classroomError.message,
        };
      }
    }

    await reloadClassrooms();

    return {
      ok: true,
      message: "Saved to classroom.",
    };
  }

  const value = {
    classrooms,
    hydrated,
    schemaReady,
    createClassroom,
    joinClassroomByCode,
    deleteClassroom,
    leaveClassroom,
    getClassroomById,
    addClassroomMessages,
    reloadClassrooms,
  };

  return (
    <ClassroomContext.Provider value={value}>
      {children}
    </ClassroomContext.Provider>
  );
}

export function useClassrooms() {
  const context = useContext(ClassroomContext);

  if (!context) {
    throw new Error("useClassrooms must be used within ClassroomProvider");
  }

  return context;
}
