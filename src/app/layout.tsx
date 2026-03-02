import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TTS Crossword — Platform Teka-Teki Silang',
  description: 'Buat dan mainkan teka-teki silang dengan mudah. Platform TTS interaktif untuk semua kalangan.',
  keywords: 'TTS, teka-teki silang, crossword, puzzle, game',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
