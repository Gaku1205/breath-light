import type { Metadata, Viewport } from "next";
import { Chivo, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ja",
});

const chivo = Chivo({
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-num",
});

export const metadata: Metadata = {
  title: "breath-light｜1分の深呼吸",
  description:
    "光が広がるあいだに吸って、止まったら息を止め、縮むあいだに吐きます。吸う4秒、止める4秒、吐く6秒を4回くり返します。",
};

export const viewport: Viewport = {
  themeColor: "#1B2236",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${zenKaku.variable} ${chivo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
