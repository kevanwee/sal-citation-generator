import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SAL Citation Generator',
  description:
    'Singapore case citation helper with SAL-style short-form references — Ibid, Id, and supra.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
