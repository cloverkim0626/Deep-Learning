import type { Metadata } from "next";
import { Inter, Noto_Serif_KR, Gaegu, Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import SplashScreen from "@/components/SplashV4";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const notoSerifKR = Noto_Serif_KR({
  variable: "--font-noto-serif",
  weight: ["300", "400", "700"],
  subsets: ["latin"],
});

const gaegu = Gaegu({
  variable: "--font-gaegu",
  weight: ["300", "400", "700"],
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

export const metadata: Metadata = {
  title: "Deep Learning — Team Parallax",
  description: "Team Parallax의 AI 기반 영어 학습 플랫폼",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Deep Learning",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${jakarta.variable} ${notoSerifKR.variable} ${gaegu.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-700">
        {/* 네이티브 스플래시 이전 순간 — JS 로드 전 검은화면 */}
        <noscript>
          <div style={{position:'fixed',inset:0,background:'#07070e',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
            <img src="/app-icon.jpg" width={64} height={64} alt="" style={{borderRadius:16}}/>
            <div style={{color:'rgba(255,255,255,.7)',fontSize:15,fontWeight:300,letterSpacing:'0.15em'}}>DEEP LEARNING</div>
          </div>
        </noscript>
        <SplashScreen />
        <div className="fixed inset-0 pointer-events-none z-[-1] opacity-40 dark:opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-light via-transparent to-transparent"></div>
        {children}
      </body>
    </html>
  );
}
