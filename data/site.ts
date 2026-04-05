export const navItems = [
  { href: "/dashboard", label: "ห้องเรียนส่วนตัว" },
  { href: "/weakness-tracker", label: "Weakness Tracker" },
  { href: "/study-squad", label: "Study Squad" },
  { href: "/quiz", label: "Quiz" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/classroom", label: "ห้องเรียนกลุ่ม" },
];

export const privateRoomMessages: Array<{
  id: string;
  role: "assistant" | "user";
  text: string;
}> = [
  {
    id: "assistant-1",
    role: "assistant",
    text: "สวัสดีครับ มีอะไรให้ผมช่วยไหมครับ",
  },
  {
    id: "user-1",
    role: "user",
    text: "อยากให้สรุปไฟล์ที่ผมส่งให้",
  },
];

export const privateRoomReplies = [
  "ขอละเอียดขึ้นอีกนิด",
  "ช่วยอธิบายเพิ่ม",
  "ขอแบบ bullet point",
];

export const quickActions = ["สรุป", "อธิบาย"];

export const classCards: Array<{
  id: string;
  code: string;
  title: string;
  type: "existing" | "new";
}> = [
  {
    id: "cpe408",
    code: "CPE408",
    title: "CPE408",
    type: "existing",
  },
  {
    id: "new-class",
    code: "",
    title: "New Class",
    type: "new",
  },
];

export const classroomIconOptions = [
  "graduation",
  "school",
  "monitor",
  "rocket",
  "link",
] as const;

export const studySquadMembers = [
  { id: "001", name: "Tharathorn", initials: "T" },
  { id: "002", name: "Kantinan", initials: "K" },
  { id: "003", name: "Panung", initials: "P" },
  { id: "004", name: "Chanothai", initials: "C" },
];

export const myStudyId = "IDT00784";

export const profileMenuItems = [
  "ข้อมูลส่วนตัว",
  "รหัสผ่าน",
  "ออกจากระบบ",
];
