import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ArrowRightIcon, MenuIcon, PlayIcon, SparklesIcon } from "@/components/icons";
import {
  classCards,
  privateRoomMessages,
  quickActions,
  studySquadMembers,
} from "@/data/site";

const stats = [
  { label: "ผู้ใช้งาน", value: "50K+" },
  { label: "บทเรียนที่สร้าง", value: "2M+" },
  { label: "คำถามต่อวัน", value: "10X" },
  { label: "ความพึงพอใจ", value: "98%" },
];

export default function Home() {
  return (
    <main className="px-4 py-5 md:px-6">
      <section className="mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-white/70 bg-white/88 shadow-[0_24px_80px_rgba(44,74,129,0.14)] backdrop-blur">
        <header className="flex items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm"
              aria-label="Open menu"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <Brand />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-[#bfd8f6] px-5 py-2 text-sm font-bold text-[#1b2c77] transition hover:bg-[#edf5ff]"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[#1b2c77] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#13215c]"
            >
              สมัครสมาชิก
            </Link>
          </div>
        </header>

        <div className="grid gap-8 px-5 pb-8 pt-2 md:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#dceeff] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#3d6c98]">
              <SparklesIcon className="h-4 w-4" />
              AI-Powered Learning Assistant
            </span>
            <div className="space-y-4">
              <h1 className="font-display max-w-xl text-5xl font-black leading-[0.95] tracking-tight text-[#1b2c77] md:text-7xl">
                เรียนอย่างอัจฉริยะ ไปกับ Learn&apos;Bot
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-600">
                ผู้ช่วยเรียนรู้ที่รวมแชต AI แบบฝึกหัด ห้องเรียน และระบบติดตามความก้าวหน้า
                ไว้ในประสบการณ์เดียวตามดีไซน์ของคุณ
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-[#4267d6] px-6 py-3 text-base font-extrabold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5"
              >
                เริ่มใช้งาน
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="#preview"
                className="inline-flex items-center gap-2 rounded-full border border-[#bfd8f6] bg-white px-6 py-3 text-base font-extrabold text-[#1b2c77] transition hover:bg-[#edf5ff]"
              >
                <PlayIcon className="h-4 w-4" />
                ดูตัวอย่าง
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[24px] border border-[#e4eefb] bg-[#fbfdff] px-4 py-4 shadow-sm"
                >
                  <p className="text-2xl font-black text-[#1b2c77]">{stat.value}</p>
                  <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-8 top-8 h-32 rounded-full bg-[#d7ecff] blur-3xl" />
            <div className="relative rounded-[30px] border border-[#efe7d9] bg-[#fcf8ef] p-4 shadow-xl shadow-slate-200/50">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-semibold text-slate-400">
                  Learn&apos;Bot Workspace
                </span>
              </div>
              <div className="grid gap-4 lg:grid-cols-[92px_1fr]">
                <div className="space-y-2 rounded-[24px] bg-[#dceeff] p-3">
                  {quickActions.map((tool) => (
                    <div
                      key={tool}
                      className="rounded-2xl bg-white/85 px-3 py-2 text-xs font-bold text-[#31507d]"
                    >
                      {tool}
                    </div>
                  ))}
                </div>
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <div className="space-y-3">
                    {privateRoomMessages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`max-w-[88%] rounded-[20px] px-4 py-3 text-sm leading-6 shadow-sm ${
                          message.role === "assistant"
                            ? "bg-[#1b2c77] text-white"
                            : "ml-auto bg-[#eef3fb] text-slate-600"
                        }`}
                      >
                        {message.text}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-[20px] border border-[#d7e5f8] bg-[#f9fbff] px-4 py-3 text-sm text-slate-400">
                    พิมพ์คำถาม เช่น ช่วยอธิบายเรื่องแรงโน้มถ่วง
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="preview"
        className="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <div className="rounded-[32px] border border-white/70 bg-white/88 p-6 shadow-[0_24px_70px_rgba(44,74,129,0.12)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#5f84aa]">
                Design Snapshot
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#1b2c77]">
                Prototype from your Figma direction
              </h2>
            </div>
            <Link
              href="/dashboard"
              className="rounded-full bg-[#1b2c77] px-4 py-2 text-sm font-bold text-white"
            >
              เปิดแอพ
            </Link>
          </div>
          <div className="overflow-hidden rounded-[26px] border border-[#d7e5f8] bg-[#f8fbff] p-3">
            <Image
              src="/example.png"
              alt="Learn'Bot Figma layout preview"
              width={1312}
              height={865}
              className="h-auto w-full rounded-[18px]"
            />
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-[32px] border border-white/70 bg-white/88 p-6 shadow-[0_24px_70px_rgba(44,74,129,0.12)]">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#5f84aa]">
              Classroom
            </p>
            <div className="mt-4 grid gap-3">
              {classCards.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[24px] bg-gradient-to-br from-[#d9edff] to-[#f8fbff] p-5"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#45608c]">
                    {item.code}
                  </p>
                  <h3 className="mt-2 text-xl font-black text-[#1b2c77]">{item.title}</h3>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/88 p-6 shadow-[0_24px_70px_rgba(44,74,129,0.12)]">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#5f84aa]">
              Leaderboard
            </p>
            <div className="mt-4 space-y-3">
              {studySquadMembers.slice(0, 3).map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-[22px] bg-[#eef6ff] px-4 py-4"
                >
                  <div>
                    <p className="text-sm font-bold text-[#6b88ab]">#{index + 1}</p>
                    <h3 className="text-lg font-black text-[#1b2c77]">{item.name}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-[#1b2c77]">#{index + 1}</p>
                    <p className="text-sm text-slate-500">Study Squad</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
