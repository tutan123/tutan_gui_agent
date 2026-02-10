import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StyleDebug from "@/components/StyleDebug";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TUTAN_AGENT | Industrial Android GUI Agent",
  description: "Next-generation Android automation powered by LLM and Ref System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className={`${inter.className} h-full text-slate-900 antialiased`}>
        <StyleDebug />
        {children}
      </body>
    </html>
  );
}
