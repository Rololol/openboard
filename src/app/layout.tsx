import type { Metadata } from "next";
import "./globals.css";
import "./premium-dashboard.css";

export const metadata: Metadata = {
  title: "Openboard — Play Chess Online",
  description: "Spiele Schach online, trainiere Taktik und analysiere deine Partien mit Openboard."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
