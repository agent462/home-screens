import type { Metadata, Viewport } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Chores',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function ChoresLayout({ children }: { children: React.ReactNode }) {
  return children;
}
