"use client";

import { useEffect, useMemo, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { AppShell } from "@/components/app-shell";
import {
  buildStableStudyId,
  getProfileDisplayName,
  getProfileInitials,
  useAuth,
} from "@/components/auth-provider";
import { useLearning } from "@/components/learning-provider";
import { CopyIcon, PlusIcon, TrophyIcon } from "@/components/icons";
import { isMissingTableError } from "@/lib/supabase/user-state";

type FriendDirectoryRecord = {
  id: string;
  study_id: string;
  display_name: string | null;
};

type StudySquadRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

type StudySquadRequestRow = {
  id: string;
  requester_user_id: string;
  recipient_user_id: string;
  pair_key: string;
  status: StudySquadRequestStatus;
  created_at: string;
  responded_at: string | null;
};

type StudySquadPerson = {
  requestId: string;
  userId: string;
  studyId: string;
  name: string;
  initials: string;
  createdAt: string;
};

type StudySquadSnapshot = {
  friends: StudySquadPerson[];
  incoming: StudySquadPerson[];
  outgoing: StudySquadPerson[];
  schemaReady: boolean;
};

type FriendRequest = "idle" | "sending" | "sent";

const rankColors = [
  "bg-[#ffe566] text-[#7a5c00]",
  "bg-[#d8e8f5] text-[#2a4a6a]",
  "bg-[#f5dfd0] text-[#7a3a1a]",
];

function normalizeStudyId(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function buildPairKey(leftUserId: string, rightUserId: string) {
  return [leftUserId, rightUserId].sort().join(":");
}

function buildDisplayName(record: FriendDirectoryRecord) {
  return record.display_name?.trim() || `Learner ${record.study_id.slice(-4)}`;
}

function buildInitials(name: string) {
  const pieces = name.split(/\s+/).filter(Boolean);

  if (pieces.length >= 2) {
    return `${pieces[0]?.[0] ?? ""}${pieces[1]?.[0] ?? ""}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

function buildPerson(
  request: StudySquadRequestRow,
  currentUserId: string,
  profiles: Map<string, FriendDirectoryRecord>,
) {
  const otherUserId =
    request.requester_user_id === currentUserId
      ? request.recipient_user_id
      : request.requester_user_id;
  const profile = profiles.get(otherUserId);

  if (!profile) {
    return null;
  }

  const name = buildDisplayName(profile);

  return {
    requestId: request.id,
    userId: otherUserId,
    studyId: profile.study_id,
    name,
    initials: buildInitials(name),
    createdAt: request.created_at,
  } satisfies StudySquadPerson;
}

async function fetchStudySquadSnapshot(
  supabase: ReturnType<typeof useAuth>["supabase"],
  userId: string,
) {
  const { data: rawRequests, error: requestsError } = await supabase
    .from("study_squad_requests")
    .select(
      "id, requester_user_id, recipient_user_id, pair_key, status, created_at, responded_at",
    )
    .or(`requester_user_id.eq.${userId},recipient_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (requestsError) {
    if (isMissingTableError(requestsError)) {
      return {
        friends: [],
        incoming: [],
        outgoing: [],
        schemaReady: false,
      } satisfies StudySquadSnapshot;
    }

    throw requestsError;
  }

  const requests = (rawRequests ?? []) as StudySquadRequestRow[];
  const relatedUserIds = Array.from(
    new Set(
      requests.flatMap((request) => [request.requester_user_id, request.recipient_user_id]),
    ),
  ).filter((id) => id !== userId);

  if (!relatedUserIds.length) {
    return {
      friends: [],
      incoming: [],
      outgoing: [],
      schemaReady: true,
    } satisfies StudySquadSnapshot;
  }

  const { data: rawProfiles, error: profilesError } = await supabase
    .from("study_squad_directory")
    .select("id, study_id, display_name")
    .in("id", relatedUserIds);

  if (profilesError) {
    throw profilesError;
  }

  const profiles = new Map(
    ((rawProfiles ?? []) as FriendDirectoryRecord[]).map((item) => [item.id, item]),
  );

  return {
    friends: requests
      .filter((request) => request.status === "accepted")
      .map((request) => buildPerson(request, userId, profiles))
      .filter(Boolean) as StudySquadPerson[],
    incoming: requests
      .filter(
        (request) =>
          request.status === "pending" && request.recipient_user_id === userId,
      )
      .map((request) => buildPerson(request, userId, profiles))
      .filter(Boolean) as StudySquadPerson[],
    outgoing: requests
      .filter(
        (request) =>
          request.status === "pending" && request.requester_user_id === userId,
      )
      .map((request) => buildPerson(request, userId, profiles))
      .filter(Boolean) as StudySquadPerson[],
    schemaReady: true,
  } satisfies StudySquadSnapshot;
}

export function StudySquadBoard() {
  const { supabase, user, profile, refreshProfile, loading } = useAuth();
  const { attempts } = useLearning();
  const [open, setOpen] = useState(false);
  const [inviteValue, setInviteValue] = useState("");
  const [requestState, setRequestState] = useState<FriendRequest>("idle");
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [friends, setFriends] = useState<StudySquadPerson[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<StudySquadPerson[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<StudySquadPerson[]>([]);
  const [schemaReady, setSchemaReady] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const myName = getProfileDisplayName(profile, user);
  const myInitials = getProfileInitials(profile, user);
  const myStudyId = profile?.study_id ?? (user ? buildStableStudyId(user.id) : "Preparing ID...");
  const myPoints =
    attempts.filter((attempt) => attempt.isCorrect).length * 20 +
    attempts.length * 5;

  const leaderboard = useMemo(
    () =>
      [
        {
          id: "me",
          name: `${myName} (You)`,
          initials: myInitials,
          points: myPoints,
        },
        ...friends.map((friend) => ({
          id: friend.userId,
          name: friend.name,
          initials: friend.initials,
          points: 0,
        })),
      ].sort((left, right) => right.points - left.points),
    [friends, myInitials, myName, myPoints],
  );

  useEffect(() => {
    if (!profile?.study_id && user) {
      void refreshProfile();
    }
  }, [profile?.study_id, refreshProfile, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadStudySquad() {
      if (loading) {
        return;
      }

      if (!user) {
        setFriends([]);
        setIncomingRequests([]);
        setOutgoingRequests([]);
        setSchemaReady(true);
        setHydrated(true);
        return;
      }

      setHydrated(false);

      try {
        const snapshot = await fetchStudySquadSnapshot(supabase, user.id);

        if (cancelled) {
          return;
        }

        setFriends(snapshot.friends);
        setIncomingRequests(snapshot.incoming);
        setOutgoingRequests(snapshot.outgoing);
        setSchemaReady(snapshot.schemaReady);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load Study Squad", error);
          setFriends([]);
          setIncomingRequests([]);
          setOutgoingRequests([]);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    void loadStudySquad();

    return () => {
      cancelled = true;
    };
  }, [loading, refreshTick, supabase, user]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const channel = supabase
      .channel(`study-squad-requests-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_squad_requests",
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const nextRow = payload.new as Partial<StudySquadRequestRow> | null;
          const previousRow = payload.old as Partial<StudySquadRequestRow> | null;
          const relatedUserIds = [
            nextRow?.requester_user_id,
            nextRow?.recipient_user_id,
            previousRow?.requester_user_id,
            previousRow?.recipient_user_id,
          ];

          if (relatedUserIds.includes(user.id)) {
            setRefreshTick((current) => current + 1);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user]);

  async function handleSendRequest() {
    const normalizedStudyId = normalizeStudyId(inviteValue);

    if (!normalizedStudyId || requestState !== "idle" || !user) {
      return;
    }

    setRequestState("sending");
    setRequestMessage(null);

    const { data: friend, error: friendError } = await supabase
      .from("study_squad_directory")
      .select("id, study_id, display_name")
      .eq("study_id", normalizedStudyId)
      .maybeSingle();

    if (friendError) {
      setRequestState("idle");
      setRequestMessage(
        isMissingTableError(friendError)
          ? "Run the latest Supabase SQL migration first."
          : friendError.message,
      );
      return;
    }

    if (!friend) {
      setRequestState("idle");
      setRequestMessage("This Study ID was not found.");
      return;
    }

    if (friend.id === user.id) {
      setRequestState("idle");
      setRequestMessage("You cannot add your own Study ID.");
      return;
    }

    const pairKey = buildPairKey(user.id, friend.id);
    const { data: existingRaw, error: existingError } = await supabase
      .from("study_squad_requests")
      .select(
        "id, requester_user_id, recipient_user_id, pair_key, status, created_at, responded_at",
      )
      .eq("pair_key", pairKey)
      .maybeSingle();

    if (existingError && !isMissingTableError(existingError)) {
      setRequestState("idle");
      setRequestMessage(existingError.message);
      return;
    }

    const existing = (existingRaw ?? null) as StudySquadRequestRow | null;

    if (existing?.status === "accepted") {
      setRequestState("idle");
      setRequestMessage("You are already connected with this friend.");
      return;
    }

    if (
      existing?.status === "pending" &&
      existing.requester_user_id === user.id
    ) {
      setRequestState("idle");
      setRequestMessage("Request already sent. Waiting for your friend to accept.");
      return;
    }

    if (
      existing?.status === "pending" &&
      existing.recipient_user_id === user.id
    ) {
      const { error: acceptError } = await supabase
        .from("study_squad_requests")
        .update({
          status: "accepted",
          responded_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      setRequestState(acceptError ? "idle" : "sent");
      setRequestMessage(
        acceptError
          ? acceptError.message
          : `You and ${buildDisplayName(friend as FriendDirectoryRecord)} are now connected.`,
      );

      if (!acceptError) {
        setRefreshTick((current) => current + 1);
      }

      return;
    }

    if (existing) {
      const { error: resendError } = await supabase
        .from("study_squad_requests")
        .update({
          requester_user_id: user.id,
          recipient_user_id: friend.id,
          status: "pending",
          created_at: new Date().toISOString(),
          responded_at: null,
        })
        .eq("id", existing.id);

      setRequestState(resendError ? "idle" : "sent");
      setRequestMessage(
        resendError
          ? resendError.message
          : `Request sent to ${buildDisplayName(friend as FriendDirectoryRecord)}.`,
      );

      if (!resendError) {
        setRefreshTick((current) => current + 1);
      }

      return;
    }

    const { error: insertError } = await supabase.from("study_squad_requests").insert({
      requester_user_id: user.id,
      recipient_user_id: friend.id,
      pair_key: pairKey,
      status: "pending",
    });

    setRequestState(insertError ? "idle" : "sent");
    setRequestMessage(
      insertError
        ? insertError.message
        : `Request sent to ${buildDisplayName(friend as FriendDirectoryRecord)}.`,
    );

    if (!insertError) {
      setRefreshTick((current) => current + 1);
    }
  }

  async function updateRequestStatus(
    requestId: string,
    status: Exclude<StudySquadRequestStatus, "pending">,
  ) {
    setActionBusyId(requestId);

    const { error } = await supabase
      .from("study_squad_requests")
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    setActionBusyId(null);

    if (error) {
      setRequestMessage(error.message);
      return;
    }

    if (status === "accepted") {
      setRequestMessage("Friend request accepted.");
    } else if (status === "declined") {
      setRequestMessage("Friend request declined.");
    } else {
      setRequestMessage("Request cancelled.");
    }

    setRefreshTick((current) => current + 1);
  }

  function handleCloseModal() {
    setOpen(false);
    setInviteValue("");
    setRequestState("idle");
  }

  if ((loading || !hydrated) && user) {
    return (
      <AppShell activeHref="/study-squad">
        <div className="flex min-h-[744px] items-center justify-center rounded-[20px] border border-[#d7e2ef] bg-[#f8fbff]">
          <p className="text-lg font-black text-[#1b2c77]">
            Loading your Study Squad...
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell activeHref="/study-squad">
        <div className="flex min-h-[744px] flex-col gap-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-[18px] font-black text-[#111]">Friend list</p>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-[#9fc7ef] px-5 py-2.5 text-[15px] font-black text-[#1c1c1c]"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add friend
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {friends.length ? (
                  friends.map((friend) => (
                    <div
                      key={friend.requestId}
                      className="flex w-full max-w-[520px] items-center justify-between gap-4 rounded-[14px] bg-[#9fc7ef] px-4 py-3"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-[#1b2c77]">
                          {friend.initials}
                        </div>
                        <div>
                          <span className="text-[20px] font-black text-[#111]">
                            {friend.name}
                          </span>
                          <p className="text-xs font-black tracking-[0.14em] text-[#355683]">
                            {friend.studyId}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black tracking-[0.12em] text-[#1b2c77]">
                        CONNECTED
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[16px] border border-dashed border-[#bfd8f6] bg-[#f8fbff] px-4 py-5 text-sm leading-7 text-[#4b5e7c]">
                    No friends saved yet. Add a classmate by Study ID and they will see your request automatically.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end justify-start gap-2 pt-1">
              <p className="text-[18px] font-black text-[#111]">My Study ID</p>
              <div className="flex items-center gap-3">
                <div className="rounded-[14px] bg-[#cfe5ff] px-8 py-5 text-[22px] font-black text-[#111]">
                  {myStudyId}
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(myStudyId)}
                  className="flex h-16 w-16 items-center justify-center rounded-[14px] bg-[#cfe5ff] text-[#111]"
                  aria-label="Copy my study ID"
                >
                  <CopyIcon className="h-8 w-8" />
                </button>
              </div>
              <p className="max-w-[280px] text-right text-xs font-semibold leading-6 text-[#4b5e7c]">
                This ID stays with your account, so other users can add you with the same ID every time.
              </p>
            </div>
          </div>

          {!schemaReady ? (
            <section className="rounded-[18px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold leading-7 text-amber-800">
              Study Squad requests are not ready in Supabase yet. Run the latest SQL from [supabase/schema.sql](D:\learnbot by codex\supabase\schema.sql) first.
            </section>
          ) : null}

          {requestMessage ? (
            <section className="rounded-[18px] border border-[#d7e2ef] bg-[#f8fbff] px-5 py-4 text-sm font-semibold leading-7 text-[#355683]">
              {requestMessage}
            </section>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-[20px] border border-[#d7e2ef] bg-[#f8fbff] p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#6b87ac]">
                Incoming Requests
              </p>
              <div className="mt-4 space-y-3">
                {incomingRequests.length ? (
                  incomingRequests.map((request) => (
                    <div
                      key={request.requestId}
                      className="rounded-[16px] bg-white px-4 py-4 shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#9fc7ef] text-sm font-black text-[#1b2c77]">
                          {request.initials}
                        </div>
                        <div className="flex-1">
                          <p className="text-base font-black text-[#1b2c77]">
                            {request.name}
                          </p>
                          <p className="text-xs font-black tracking-[0.14em] text-[#6b87ac]">
                            {request.studyId}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            void updateRequestStatus(request.requestId, "accepted");
                          }}
                          disabled={actionBusyId === request.requestId}
                          className="rounded-full bg-[#1b2c77] px-5 py-2.5 text-sm font-black text-white disabled:opacity-60"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void updateRequestStatus(request.requestId, "declined");
                          }}
                          disabled={actionBusyId === request.requestId}
                          className="rounded-full bg-[#f3f6fb] px-5 py-2.5 text-sm font-black text-slate-600 disabled:opacity-60"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[16px] border border-dashed border-[#d7e2ef] bg-white px-4 py-5 text-sm leading-7 text-[#4b5e7c]">
                    No incoming requests right now.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[20px] border border-[#d7e2ef] bg-[#f8fbff] p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#6b87ac]">
                Outgoing Requests
              </p>
              <div className="mt-4 space-y-3">
                {outgoingRequests.length ? (
                  outgoingRequests.map((request) => (
                    <div
                      key={request.requestId}
                      className="rounded-[16px] bg-white px-4 py-4 shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#9fc7ef] text-sm font-black text-[#1b2c77]">
                          {request.initials}
                        </div>
                        <div className="flex-1">
                          <p className="text-base font-black text-[#1b2c77]">
                            {request.name}
                          </p>
                          <p className="text-xs font-black tracking-[0.14em] text-[#6b87ac]">
                            {request.studyId}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#ffe7a8] px-3 py-1 text-xs font-black tracking-[0.12em] text-[#7b5b00]">
                          PENDING
                        </span>
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => {
                            void updateRequestStatus(request.requestId, "cancelled");
                          }}
                          disabled={actionBusyId === request.requestId}
                          className="rounded-full bg-[#f3f6fb] px-5 py-2.5 text-sm font-black text-slate-600 disabled:opacity-60"
                        >
                          Cancel request
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[16px] border border-dashed border-[#d7e2ef] bg-white px-4 py-5 text-sm leading-7 text-[#4b5e7c]">
                    No outgoing requests right now.
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-[20px] border border-[#d7e2ef] bg-[#f8fbff] p-5">
            <div className="mb-4 flex items-center gap-2">
              <TrophyIcon className="h-5 w-5 text-[#6b87ac]" />
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#6b87ac]">
                Leaderboard
              </p>
            </div>
            <div className="grid gap-3">
              {leaderboard.map((member, index) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 rounded-[16px] bg-white px-4 py-3 shadow-sm"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                      rankColors[index] ?? "bg-[#eef3fb] text-[#6b87ac]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#9fc7ef] text-sm font-black text-[#1b2c77]">
                    {member.initials}
                  </div>
                  <span className="flex-1 text-[17px] font-black text-[#1b2c77]">
                    {member.name}
                  </span>
                  <span className="text-sm font-semibold text-[#6b87ac]">
                    {member.points.toLocaleString()} pts
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </AppShell>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
          <div className="w-full max-w-[520px] overflow-hidden rounded-[20px] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-4 bg-[#85b3e1] px-7 py-5 text-[#101010]">
              <PlusIcon className="h-8 w-8 stroke-[2.4]" />
              <h2 className="text-[26px] font-black">Add study friend</h2>
            </div>

            <div className="px-7 py-6">
              <p className="text-[17px] font-black leading-7 text-[#111]">
                Enter your friend&apos;s Study ID. They will see the request automatically in their Study Squad page.
              </p>

              <input
                value={inviteValue}
                onChange={(event) => setInviteValue(normalizeStudyId(event.target.value))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleSendRequest();
                  }
                }}
                className="mt-4 h-12 w-full rounded-full border-[4px] border-[#1b2c77] bg-[#f6fbff] px-5 text-[18px] font-black uppercase outline-none placeholder:text-[#4b5e7c] disabled:opacity-60"
                placeholder="IDXXXXXXXX"
                disabled={requestState === "sending"}
              />

              <p className="mt-3 text-xs font-semibold leading-6 text-[#4b5e7c]">
                Your ID: {myStudyId}
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-600"
                >
                  Close
                </button>
                {requestState === "sent" ? (
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-full bg-[#1b2c77] px-6 py-3 text-[16px] font-black text-white"
                  >
                    Done
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      void handleSendRequest();
                    }}
                    disabled={!normalizeStudyId(inviteValue) || requestState === "sending"}
                    className="rounded-full bg-[#9fc7ef] px-6 py-3 text-[16px] font-black text-[#111] disabled:opacity-60"
                  >
                    {requestState === "sending" ? "Sending..." : "Send request"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
