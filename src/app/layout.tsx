import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Openboard — Play chess",
  description: "An independent, modern client for the Lichess chess platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
