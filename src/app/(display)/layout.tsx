import type { Metadata, Viewport } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Home Display',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
