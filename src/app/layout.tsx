import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS & Lager",
  description: "Internt POS- och lagerhanteringssystem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
