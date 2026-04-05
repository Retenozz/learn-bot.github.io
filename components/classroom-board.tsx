"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ClassroomIconBadge, classroomIconOptions } from "@/components/classroom-icon";
import {
  type ClassroomIconKey,
  useClassrooms,
} from "@/components/classroom-provider";
import {
  ArrowRightIcon,
  CopyIcon,
  LinkIcon,
  PlusIcon,
  ShareIcon,
  SparklesIcon,
  TrashIcon,
} from "@/components/icons";

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

type ClassroomBoardProps = {
  initialInviteCode?: string;
};

export function ClassroomBoard({ initialInviteCode }: ClassroomBoardProps) {
  const router = useRouter();
  const {
    classrooms,
    hydrated,
    schemaReady,
    createClassroom,
    joinClassroomByCode,
    deleteClassroom,
    leaveClassroom,
  } = useClassrooms();
  const [open, setOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [materialLabel, setMaterialLabel] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<ClassroomIconKey>("graduation");
  const [joinCode, setJoinCode] = useState(() => initialInviteCode?.trim() ?? "");
  const [joinName, setJoinName] = useState("");
  const [joinFeedback, setJoinFeedback] = useState<string | null>(null);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const [copiedCodeRoomId, setCopiedCodeRoomId] = useState<string | null>(null);
  const [sharedRoomId, setSharedRoomId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmedName = className.trim();
  const trimmedMaterial = materialLabel.trim();
  const trimmedJoinCode = joinCode.trim();
  const trimmedJoinName = joinName.trim();
  const inviteCodeHint = initialInviteCode?.trim();
  const canCreate = trimmedName.length >= 2 && !isPending;
  const canJoin = trimmedJoinCode.length >= 3 && !isPending;

  function resetForm() {
    setClassName("");
    setMaterialLabel("");
    setSelectedIcon("graduation");
  }

  const openRoom = useCallback((roomId: string) => {
    setPendingRoomId(roomId);
    startTransition(() => {
      router.push(`/classroom/${encodeURIComponent(roomId)}`);
    });
  }, [router, startTransition]);

  function buildInviteLink(roomCode: string) {
    if (typeof window === "undefined") {
      return `/classroom?invite=${encodeURIComponent(roomCode)}`;
    }

    const url = new URL("/classroom", window.location.origin);
    url.searchParams.set("invite", roomCode);
    return url.toString();
  }

  async function handleCopyCode(roomId: string, roomCode: string) {
    await navigator.clipboard.writeText(roomCode);
    setCopiedCodeRoomId(roomId);
    setSharedRoomId(null);
  }

  async function handleShareLink(classroom: { id: string; name: string; code: string }) {
    const url = buildInviteLink(classroom.code);

    if (navigator.share) {
      try {
        await navigator.share({
          title: classroom.name,
          text: `Join ${classroom.name} with room code ${classroom.code}`,
          url,
        });
        setSharedRoomId(classroom.id);
        setCopiedCodeRoomId(null);
        return;
      } catch {
        // Fall back to copying the link if the share sheet is dismissed or unavailable.
      }
    }

    await navigator.clipboard.writeText(url);
    setSharedRoomId(classroom.id);
    setCopiedCodeRoomId(null);
  }

  useEffect(() => {
    if (!copiedCodeRoomId && !sharedRoomId) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setCopiedCodeRoomId(null);
      setSharedRoomId(null);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [copiedCodeRoomId, sharedRoomId]);

  async function handleJoinClassroom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canJoin) {
      return;
    }

    const result = await joinClassroomByCode({
      code: trimmedJoinCode,
      memberName: trimmedJoinName || undefined,
    });

    setJoinFeedback(result.message);

    if (!result.ok) {
      return;
    }

    setJoinCode("");
    setJoinName("");
    openRoom(result.roomId);
  }

  async function handleDeleteClassroom(
    classroomId: string,
    classroomName: string,
    isOwner: boolean,
  ) {
    const confirmed = window.confirm(
      isOwner
        ? `Delete "${classroomName}"?\nThis will remove the shared room for everyone in it.`
        : `Leave "${classroomName}"?\nYou will leave this shared room from your account.`,
    );

    if (!confirmed) {
      return;
    }

    const result = isOwner
      ? await deleteClassroom(classroomId)
      : await leaveClassroom(classroomId);

    setJoinFeedback(result.message);

    if (pendingRoomId === classroomId) {
      setPendingRoomId(null);
    }
  }

  async function handleCreateClassroom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreate) {
      return;
    }

    const result = await createClassroom({
      name: trimmedName,
      icon: selectedIcon,
      materialLabel: trimmedMaterial || undefined,
    });

    setJoinFeedback(result.message);

    if (!result.ok) {
      return;
    }

    resetForm();
    setOpen(false);
    openRoom(result.roomId);
  }

  if (!hydrated) {
    return (
      <AppShell
        activeHref="/classroom"
        topBarRight={
          <span className="rounded-full bg-[#ffde43] px-4 py-2 text-[11px] font-black tracking-[0.28em] text-[#15296f]">
            CLASSROOM
          </span>
        }
      >
        <div className="flex min-h-[744px] items-center justify-center rounded-[24px] border border-[#d8e5f2] bg-[#f6fbff]">
          <p className="text-lg font-black text-[#18317a]">
            Loading your classrooms...
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell
        activeHref="/classroom"
        topBarRight={
          <span className="rounded-full bg-[#ffde43] px-4 py-2 text-[11px] font-black tracking-[0.28em] text-[#15296f]">
            CLASSROOM
          </span>
        }
      >
        <div className="grid min-h-full gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
            {!schemaReady ? (
              <section className="rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold leading-7 text-amber-800">
                Shared classrooms are not ready in Supabase yet. Run the latest SQL from [supabase/schema.sql](D:\learnbot by codex\supabase\schema.sql) first.
              </section>
            ) : null}

            <section className="rounded-[24px] border border-[#d8e5f2] bg-[#f6fbff] p-5">
              <p className="text-[13px] font-black tracking-[0.25em] text-[#5878a5]">
                MY CLASS
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-2">
                  <h1 className="text-[32px] font-black text-[#18317a]">
                    ห้องเรียนกลุ่มของคุณ
                  </h1>
                  <p className="max-w-[700px] text-[15px] leading-7 text-[#49658c]">
                    สร้างห้องเรียนกลุ่มเพื่อคุยงาน แชร์สรุปบทเรียน และนัดเพื่อนในทีมได้ในห้องเดียว
                    กดการ์ดห้องไหนก็จะเข้า group chat ของห้องนั้นทันที
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1b2c77] px-5 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(27,44,119,0.18)]"
                >
                  <PlusIcon className="h-4 w-4" />
                  สร้างห้องใหม่
                </button>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              {classrooms.map((classroom) => {
                const isOpening = isPending && pendingRoomId === classroom.id;

                return (
                  <article
                    key={classroom.id}
                    className="group rounded-[24px] border border-[#b8d1ea] bg-[#dff0ff] p-6 text-left shadow-[0_16px_32px_rgba(48,84,136,0.08)] hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(48,84,136,0.14)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[13px] font-black tracking-[0.3em] text-[#5b7aa4]">
                          {classroom.code}
                        </p>
                        <h2 className="mt-3 text-[28px] font-black text-[#18317a]">
                          {classroom.name}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteClassroom(
                              classroom.id,
                              classroom.name,
                              classroom.isOwner,
                            )
                          }
                          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-[#c03945] shadow-sm transition hover:bg-[#fff1f3]"
                          aria-label={`${classroom.isOwner ? "Delete" : "Leave"} ${classroom.name}`}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openRoom(classroom.id)}
                          className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white text-[#18317a] shadow-sm transition group-hover:bg-[#1b2c77] group-hover:text-white"
                          aria-label={`Open ${classroom.name}`}
                        >
                          <ArrowRightIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-8 flex items-end justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <ClassroomIconBadge icon={classroom.icon} />
                        <div className="space-y-1 text-sm font-semibold text-[#49658c]">
                          <p>{classroom.members.length} members</p>
                          <p>{classroom.materials.length} materials</p>
                        </div>
                      </div>

                      <div className="text-right text-sm font-semibold text-[#5b7aa4]">
                        <p>{classroom.messages.length} messages</p>
                        <p>สร้างเมื่อ {formatCreatedAt(classroom.createdAt)}</p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-[18px] bg-white/75 px-4 py-3 text-sm font-semibold leading-6 text-[#355683]">
                      {isOpening
                        ? "กำลังเปิดห้อง..."
                        : classroom.materials[0]
                          ? `หัวข้อเริ่มต้น: ${classroom.materials[0]}`
                          : "กดเพื่อเข้าแชตกลุ่มของห้องนี้ แล้วเริ่มคุยกับเพื่อนในห้องได้เลย"}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-[#5b7aa4]">
                        {copiedCodeRoomId === classroom.id
                          ? "Copied room code"
                          : sharedRoomId === classroom.id
                            ? "Shared room link"
                            : `Room code: ${classroom.code}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(classroom.id, classroom.code)}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-[#1b2c77]"
                        >
                          <CopyIcon className="h-4 w-4" />
                          Copy code
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShareLink(classroom)}
                          className="inline-flex items-center gap-2 rounded-full bg-[#eef5ff] px-4 py-2 text-sm font-black text-[#1b2c77]"
                        >
                          <ShareIcon className="h-4 w-4" />
                          Share link
                        </button>
                        <button
                          type="button"
                          onClick={() => openRoom(classroom.id)}
                          className="rounded-full bg-[#1b2c77] px-4 py-2 text-sm font-black text-white"
                        >
                          Open room
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}

              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-[24px] border border-dashed border-[#9cbbe0] bg-[#f6fbff] p-6 text-left text-[#18317a] shadow-[0_16px_32px_rgba(48,84,136,0.05)] hover:-translate-y-0.5 hover:border-[#1b2c77] hover:shadow-[0_22px_38px_rgba(48,84,136,0.1)]"
              >
                <div className="flex h-full min-h-[280px] flex-col justify-between">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#1b2c77] text-white shadow-[0_14px_28px_rgba(27,44,119,0.18)]">
                    <PlusIcon className="h-7 w-7" />
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-[30px] font-black">New Class</h2>
                    <p className="max-w-[320px] text-[15px] leading-7 text-[#4a668d]">
                      สร้างห้องใหม่สำหรับวิชา โปรเจกต์ หรือกลุ่มติว แล้วพาเข้าไปห้องแชตทันที
                    </p>
                  </div>
                </div>
              </button>
            </section>
          </div>

          <aside className="flex flex-col rounded-[24px] bg-[#eef5ff] p-5">
            <p className="text-[13px] font-black tracking-[0.3em] text-[#5b7aa4]">
              NEW CLASS
            </p>

            <div className="mt-4 rounded-[22px] bg-white p-5 shadow-[0_16px_28px_rgba(48,84,136,0.08)]">
              <p className="text-sm font-semibold text-[#5b7aa4]">ห้องทั้งหมด</p>
              <p className="mt-2 text-[34px] font-black text-[#18317a]">
                {classrooms.length}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#49658c]">
                ห้องล่าสุดจะถูกเก็บไว้ให้กลับเข้ามาคุยต่อได้เสมอ
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#1b2c77] px-4 py-3 text-sm font-black text-white"
            >
              <PlusIcon className="h-4 w-4" />
              สร้างห้องใหม่
            </button>

            <form
              onSubmit={handleJoinClassroom}
              className="mt-5 rounded-[22px] bg-white p-4 shadow-sm"
            >
              <p className="text-[13px] font-black tracking-[0.28em] text-[#5b7aa4]">
                JOIN BY CODE
              </p>
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder="Enter room code"
                className="mt-3 h-12 w-full rounded-[16px] border border-[#c8d9ed] bg-[#f7fbff] px-4 text-sm text-[#18317a] outline-none focus:border-[#1b2c77]"
              />
              <input
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                placeholder="Join as (optional)"
                className="mt-3 h-12 w-full rounded-[16px] border border-[#c8d9ed] bg-[#f7fbff] px-4 text-sm text-[#18317a] outline-none focus:border-[#1b2c77]"
              />
              <button
                type="submit"
                disabled={!canJoin}
                className="mt-3 inline-flex w-full items-center justify-center rounded-[16px] bg-[#18317a] px-4 py-3 text-sm font-black text-white disabled:bg-[#a5b6d9]"
              >
                Open room with code
              </button>
              <p className="mt-3 text-xs leading-6 text-[#49658c]">
                {joinFeedback ??
                  (inviteCodeHint
                    ? `Invite link ready. Press open to join room code ${inviteCodeHint}.`
                    : "Use a room code from the room card to jump straight into that group chat in your account.")}
              </p>
            </form>

            <div className="mt-5 space-y-3">
              {classrooms.slice(0, 3).map((classroom) => (
                <div
                  key={classroom.id}
                  className="w-full rounded-[18px] bg-white px-4 py-3 text-left shadow-sm hover:shadow-[0_14px_24px_rgba(48,84,136,0.1)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black tracking-[0.22em] text-[#5b7aa4]">
                        {classroom.code}
                      </p>
                      <p className="mt-1 text-base font-black text-[#18317a]">
                        {classroom.name}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#4a668d]">
                      {classroom.members.length} คน
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(classroom.id, classroom.code)}
                      className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#eef5ff] text-[#1b2c77]"
                      aria-label={`Copy code for ${classroom.name}`}
                    >
                      <CopyIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareLink(classroom)}
                      className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#eef5ff] text-[#1b2c77]"
                      aria-label={`Share link for ${classroom.name}`}
                    >
                      <LinkIcon className="h-4 w-4" />
                    </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteClassroom(
                              classroom.id,
                              classroom.name,
                              classroom.isOwner,
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#fff1f3] text-[#c03945]"
                          aria-label={`${classroom.isOwner ? "Delete" : "Leave"} ${classroom.name}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                    <button
                      type="button"
                      onClick={() => openRoom(classroom.id)}
                      className="rounded-full bg-[#1b2c77] px-4 py-2 text-sm font-black text-white"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto rounded-[22px] bg-white px-4 py-4 text-sm leading-7 text-[#49658c] shadow-sm">
              <div className="flex items-center gap-2 text-[#18317a]">
                <SparklesIcon className="h-5 w-5" />
                <span className="font-black">Tip</span>
              </div>
              <p className="mt-2">
                ตั้งชื่อห้องให้ชัด เช่นชื่อวิชาหรือชื่อโปรเจกต์ จะช่วยให้ค้นหาห้องและแยกการคุยได้ง่ายขึ้น
              </p>
            </div>
          </aside>
        </div>
      </AppShell>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a173f]/35 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[28px] bg-white shadow-[0_28px_70px_rgba(9,20,55,0.28)]">
            <div className="flex items-center gap-4 bg-[#dff0ff] px-6 py-5 text-[#18317a]">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#1b2c77] text-white">
                <PlusIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[30px] font-black">New Class</h2>
                <p className="text-sm font-semibold text-[#49658c]">
                  สร้างเสร็จแล้วระบบจะพาเข้า group chat ของห้องนี้ทันที
                </p>
              </div>
            </div>

            <form className="space-y-6 px-6 py-6" onSubmit={handleCreateClassroom}>
              <label className="block">
                <span className="mb-3 block text-[16px] font-black text-[#18317a]">
                  ชื่อห้องเรียน
                </span>
                <input
                  value={className}
                  onChange={(event) => setClassName(event.target.value)}
                  placeholder="เช่น Physics Class หรือ กลุ่มติว Calculus"
                  className="h-12 w-full rounded-[16px] border border-[#b8d1ea] bg-[#f8fbff] px-4 text-[#18317a] outline-none focus:border-[#1b2c77]"
                />
              </label>

              <label className="block">
                <span className="mb-3 block text-[16px] font-black text-[#18317a]">
                  หัวข้อเริ่มต้นหรือเอกสารหลัก
                </span>
                <input
                  value={materialLabel}
                  onChange={(event) => setMaterialLabel(event.target.value)}
                  placeholder="เช่น Motion Basics summary"
                  className="h-12 w-full rounded-[16px] border border-[#b8d1ea] bg-[#f8fbff] px-4 text-[#18317a] outline-none focus:border-[#1b2c77]"
                />
              </label>

              <div>
                <p className="mb-3 text-[16px] font-black text-[#18317a]">เลือกไอคอนห้อง</p>
                <div className="grid grid-cols-5 gap-3">
                  {classroomIconOptions.map((option) => {
                    const active = selectedIcon === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedIcon(option.id)}
                        aria-pressed={active}
                        className={`rounded-[20px] border px-2 py-3 text-center ${
                          active
                            ? "border-[#1b2c77] bg-[#dff0ff] text-[#18317a] shadow-[0_12px_22px_rgba(27,44,119,0.14)]"
                            : "border-[#d5e2ef] bg-white text-[#5b7aa4]"
                        }`}
                      >
                        <ClassroomIconBadge
                          icon={option.id}
                          className={`mx-auto h-12 w-12 rounded-[16px] ${
                            active ? "bg-[#1b2c77] text-white" : "bg-[#f3f8ff]"
                          }`}
                          iconClassName="h-5 w-5"
                        />
                        <span className="mt-2 block text-[12px] font-black tracking-[0.08em]">
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[20px] bg-[#eef5ff] px-4 py-4 text-sm leading-7 text-[#49658c]">
                เมื่อสร้างห้องแล้ว ห้องนั้นจะอยู่ในรายการด้านซ้ายถาวร และสามารถกดกลับเข้าไปคุยต่อได้ตลอด
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-600"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!canCreate}
                  className="rounded-full bg-[#1b2c77] px-5 py-2.5 text-sm font-black text-white disabled:bg-[#97abd2] disabled:text-white/90"
                >
                  {isPending ? "กำลังสร้าง..." : "สร้างห้อง"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
