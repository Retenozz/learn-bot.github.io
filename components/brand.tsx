import Image from "next/image";
import Link from "next/link";

type BrandProps = {
  compact?: boolean;
};

export function Brand({ compact = false }: BrandProps) {
  return (
    <Link href="/" className="flex items-center gap-3 text-slate-900">
      <Image
        src="/logo.png"
        alt="Learn'Bot logo"
        width={compact ? 40 : 42}
        height={compact ? 40 : 42}
        className="rounded-full"
        priority
      />
      <div className="leading-none">
        <div
          className={`font-black tracking-tight text-[#1b2c77] ${
            compact ? "text-[18px]" : "text-xl"
          }`}
        >
          Learn&apos;Bot
        </div>
        {!compact ? (
          <p className="text-xs font-medium text-slate-500">
            สนุกกับการเรียนรู้ในแบบของคุณ
          </p>
        ) : null}
      </div>
    </Link>
  );
}
