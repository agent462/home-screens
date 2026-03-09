import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login — Home Screens',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-neutral-950 text-neutral-100 font-sans antialiased h-screen overflow-hidden">
      {children}
    </div>
  );
}
