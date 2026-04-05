import type { Metadata } from "next";
import { Bai_Jamjuree, Sarabun } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { ClassroomProvider } from "@/components/classroom-provider";
import { LearningProvider } from "@/components/learning-provider";
import "./globals.css";

const baiJamjuree = Bai_Jamjuree({
  variable: "--font-display",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
});

const sarabun = Sarabun({
  variable: "--font-body",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Learn'Bot",
  description: "AI learning assistant prototype built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${baiJamjuree.variable} ${sarabun.variable}`}>
      <body>
        <AuthProvider>
          <LearningProvider>
            <ClassroomProvider>{children}</ClassroomProvider>
          </LearningProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
