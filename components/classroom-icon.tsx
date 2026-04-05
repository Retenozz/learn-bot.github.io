import type { SVGProps } from "react";
import type { ClassroomIconKey } from "@/components/classroom-provider";
import {
  GraduationCapIcon,
  LinkIcon,
  MonitorIcon,
  RocketIcon,
  SchoolIcon,
} from "@/components/icons";

type ClassroomIconBadgeProps = {
  icon: ClassroomIconKey;
  className?: string;
  iconClassName?: string;
};

type IconComponent = (props: SVGProps<SVGSVGElement>) => ReturnType<typeof GraduationCapIcon>;

const iconMap: Record<ClassroomIconKey, IconComponent> = {
  graduation: GraduationCapIcon,
  school: SchoolIcon,
  monitor: MonitorIcon,
  rocket: RocketIcon,
  link: LinkIcon,
};

export const classroomIconOptions: Array<{
  id: ClassroomIconKey;
  label: string;
}> = [
  { id: "graduation", label: "Study" },
  { id: "school", label: "School" },
  { id: "monitor", label: "Digital" },
  { id: "rocket", label: "Project" },
  { id: "link", label: "Link" },
];

export function ClassroomIconBadge({
  icon,
  className,
  iconClassName,
}: ClassroomIconBadgeProps) {
  const Icon = iconMap[icon] ?? GraduationCapIcon;

  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-[18px] bg-white text-[#1b2c77] shadow-[0_12px_28px_rgba(27,44,119,0.12)] ${className ?? ""}`}
    >
      <Icon className={`h-7 w-7 ${iconClassName ?? ""}`} />
    </div>
  );
}
