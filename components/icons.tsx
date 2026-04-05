import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </IconBase>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </IconBase>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7Z" />
      <path d="m18.5 15 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z" />
      <path d="m5.5 15 .8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z" />
    </IconBase>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m4 11 8-6 8 6" />
      <path d="M6.5 10.5V19h11v-8.5" />
      <path d="M10 19v-5h4v5" />
    </IconBase>
  );
}

export function MessageIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 18.5 3.5 20V6.5A2.5 2.5 0 0 1 6 4h12a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 16H8z" />
      <path d="M8 9h8" />
      <path d="M8 12h5" />
    </IconBase>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v15.5A2.5 2.5 0 0 0 17.5 17H4z" />
      <path d="M6.5 4A2.5 2.5 0 0 0 4 6.5V20" />
      <path d="M12 7h4" />
      <path d="M12 10h4" />
    </IconBase>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4a2 2 0 0 0 2 2h1" />
      <path d="M17 6h3a2 2 0 0 1-2 2h-1" />
    </IconBase>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 11.5 20.5 4 14 20 11 13 3 11.5Z" />
      <path d="M11 13 20.5 4" />
    </IconBase>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </IconBase>
  );
}

export function DotsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M18.5 5.5 16 8" />
      <path d="m18.5 5.5-4 1" />
    </IconBase>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M4.5 19a5 5 0 0 1 9 0" />
      <path d="M14.5 18.5a4 4 0 0 1 5 0" />
    </IconBase>
  );
}

export function QuizIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 9h6" />
      <path d="M9 13h3" />
      <circle cx="15.5" cy="14.5" r="0.8" fill="currentColor" stroke="none" />
      <path d="M15 10a1.75 1.75 0 1 0-2.8 1.4c.5.35.8.73.8 1.35" />
    </IconBase>
  );
}

export function CardsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6.5" y="5" width="11" height="14" rx="2" />
      <path d="M9 9h6" />
      <path d="M9 12h5" />
      <path d="M4.5 8V18a2 2 0 0 0 2 2H15" />
      <path d="M9 3h8a2 2 0 0 1 2 2v10" />
    </IconBase>
  );
}

export function BoardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 5.5h16v10H4z" />
      <path d="M8 20h8" />
      <path d="m10 15.5-1 4.5" />
      <path d="m14 15.5 1 4.5" />
      <path d="M7 9h5" />
      <path d="M7 12h8" />
    </IconBase>
  );
}

export function PaperclipIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m10 13.5 5.5-5.5a3 3 0 1 1 4.2 4.2l-7.4 7.4a5 5 0 0 1-7.1-7.1l7.1-7.1" />
    </IconBase>
  );
}

export function GraduationCapIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m3 9 9-5 9 5-9 5-9-5Z" />
      <path d="M7 11.2V16c0 1.7 2.4 3 5 3s5-1.3 5-3v-4.8" />
      <path d="M21 10v5" />
    </IconBase>
  );
}

export function SchoolIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 20h16" />
      <path d="M6 20V9" />
      <path d="M10 20V9" />
      <path d="M14 20V9" />
      <path d="M18 20V9" />
      <path d="m3 9 9-5 9 5" />
    </IconBase>
  );
}

export function MonitorIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M10 20h4" />
      <path d="m12 16-.5 4" />
      <path d="m12 16 .5 4" />
    </IconBase>
  );
}

export function RocketIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M13 4c3 0 6 3 6 6-2.5.5-4.3 2.3-4.8 4.8-3 0-6-3-6-6C10.7 8.3 12.5 6.5 13 4Z" />
      <path d="M10.5 13.5 6 18l1.5-4.5" />
      <path d="m13.5 10.5 4.5-4.5L16.5 10.5" />
      <circle cx="14" cy="9" r="1.2" />
    </IconBase>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10 13.5 8.5 15a3.5 3.5 0 0 1-5-5L7 6.5a3.5 3.5 0 0 1 5 5L10.5 13" />
      <path d="M14 10.5 15.5 9a3.5 3.5 0 0 1 5 5L17 17.5a3.5 3.5 0 0 1-5-5l1.5-1.5" />
    </IconBase>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="18" cy="5" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="m7.7 11.1 8-4.2" />
      <path d="m7.7 12.9 8 4.2" />
    </IconBase>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="9" y="9" width="10" height="11" rx="2" />
      <path d="M15 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </IconBase>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" />
      <path d="m12.5 7.5 4 4" />
    </IconBase>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </IconBase>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2" />
      <path d="M10 12h10" />
      <path d="m17 7 5 5-5 5" />
    </IconBase>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 3v6" />
      <path d="M16 3v6" />
      <path d="M4 10h16" />
    </IconBase>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 7.5h15" />
      <path d="M9.5 3.5h5" />
      <path d="M7 7.5 8 20h8l1-12.5" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </IconBase>
  );
}
