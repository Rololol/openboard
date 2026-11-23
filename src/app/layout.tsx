import type { Metadata } from "next";
import "./globals.css";
import "./premium-dashboard.css";

export const metadata: Metadata = {
  title: "Openboard — Dein Premium-Schachclient",
  description: "Ein moderner, unabhängiger Schachclient auf Basis der offiziellen Lichess-Infrastruktur.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
