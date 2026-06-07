import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "EduBridge AI - Learn Better with AI Tutoring",
  description: "Personalized learning paths, intelligent question solving, and instant feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-text-primary">
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
