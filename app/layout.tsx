import type { Metadata, Viewport } from 'next';
import './globals.css';
import './ui.css';
import './reference-ui.css';
import './home-art.css';
import './ads.css';
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fbf5ed',
};
export const metadata: Metadata = {
  metadataBase: new URL('https://sopa-letras-3d.krazel.chatgpt.site'),
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png', sizes: '48x48' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'Sopa de letras 3D',
    images: [
      {
        url: '/branding/social-card.png',
        width: 1200,
        height: 630,
        alt: 'Sopa de letras 3D',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/branding/social-card.png'],
  },
  title: 'Sopa de letras 3D',
  description:
    'Niveles de sopa de letras 3D de fácil a experto y un creador con tus propias palabras. Gira, explora cubos, y guarda tu avance.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
