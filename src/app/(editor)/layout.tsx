import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home Screen Editor',
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-neutral-950 text-neutral-100 font-sans antialiased h-screen overflow-hidden">
      {children}
    </div>
  );
}
