import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Home Screens — Smart Display for Your Home',
  description:
    'An open-source smart display system for Raspberry Pi. 35 modules, visual editor, 5 weather providers. Free forever.',
  openGraph: {
    title: 'Home Screens — Smart Display for Your Home',
    description:
      'An open-source smart display system for Raspberry Pi. 35 modules, visual editor, 5 weather providers.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#0a0a0a] text-neutral-200 antialiased">
        {children}
      </body>
    </html>
  );
}
