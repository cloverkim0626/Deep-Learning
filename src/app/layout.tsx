import type { Metadata } from "next";
import { Inter, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSerifKR = Noto_Serif_KR({
  variable: "--font-noto-serif",
  weight: ["300", "400", "700"],
  subsets: ["latin"], // Noto Serif KR handles Korean intrinsically if loaded, Next.js 'latin' subset is standard
});

export const metadata: Metadata = {
  title: "Deep Learning — Team Parallax",
  description: "Team Parallax의 AI 기반 영어 학습 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${notoSerifKR.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-700">
        <div className="fixed inset-0 pointer-events-none z-[-1] opacity-40 dark:opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-light via-transparent to-transparent"></div>
        {children}
      </body>
    </html>
  );
}
