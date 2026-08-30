import type { Metadata } from 'next';
import './globals.css';

const title = 'Sekt aus der Schnabeltasse';
const description = 'Ein humorvolles Familien-Survival-Spiel über Sinn, Chaos, Fenja und Grillwurst.';

export const metadata: Metadata = {
  metadataBase: new URL('https://sekt-aus-der-schnabeltasse.mahu350.chatgpt.site'),
  title,
  description,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Schnabeltasse',
  },
  icons: {
    icon: [
      { url: '/app-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/app-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#10231f',
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
