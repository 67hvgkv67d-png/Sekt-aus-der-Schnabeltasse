import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sekt aus der Schnabeltasse',
  description: 'Ein Familien-Survival-Spiel über Sinn, Chaos, Hund und Grillwurst.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
