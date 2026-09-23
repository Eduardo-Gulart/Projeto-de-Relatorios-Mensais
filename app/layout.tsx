import type { Metadata } from "next";
import "./globals.css";
import "./report.css";

export const metadata: Metadata = {
  title: "Relata | Relatórios de lojas",
  description: "Relatórios mensais de lojas a partir dos seus prints.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}


