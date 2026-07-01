import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPD Manager — Clinic Patient Flow",
  description:
    "Outpatient department manager — reception to doctor to lab to pharmacy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
