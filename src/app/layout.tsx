import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import PluginGlobals from '@/components/PluginGlobals';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Home Screens',
  description: 'Smart home display system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <PluginGlobals />
        {children}
      </body>
    </html>
  );
}
