import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SAL Citation — Your sources, in good form",
  description:
    "Build SAL academic footnotes for cases, legislation, books, chapters, journals and websites, with automatic repeat references and formatted export.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-SG">
      <body>{children}</body>
    </html>
  );
}
