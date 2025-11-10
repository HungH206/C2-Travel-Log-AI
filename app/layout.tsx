import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "C2 Travel AI",
  description: "Calculate your travel carbon footprint and get AI-powered tips for sustainable travel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">{children}</body>
    </html>
  );
}
