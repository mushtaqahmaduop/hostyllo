import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hostyllo',
  description: 'Hostel management for owners, chain managers and wardens.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom stays available: the users this is built for are often reading small numbers in
  // poor light, and disabling zoom would be an accessibility failure, not a polish decision.
  themeColor: '#0b0e14',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Dark is the documented default (UX design system §2). The stored per-user theme preference
  // arrives with the session and will drive this attribute once settings are wired.
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
