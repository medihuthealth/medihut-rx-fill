import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RxFill — Medicine Catalog Auto-Generator',
  description: 'AI-powered tool to fill pharmacy Excel sheets with complete medicine data. Supports Claude, GPT-4o, and Gemini.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
