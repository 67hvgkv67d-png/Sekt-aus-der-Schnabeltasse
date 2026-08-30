import type { Metadata } from 'next';
import './globals.css';

const title = 'Sekt aus der Schnabeltasse';
const description = 'Ein humorvolles Familien-Survival-Spiel über Sinn, Chaos, Fenja und Grillwurst.';

export const metadata: Metadata = {
  metadataBase: new URL('https://sekt-aus-der-schnabeltasse.mahu350.chatgpt.site'),
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'website',
    locale: 'de_DE',
    images: [{ url: '/og.png', width: 1730, height: 909, alt: title }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og.png'],
  },
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
