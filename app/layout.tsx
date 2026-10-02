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
  themeColor: '#f4eedf',
};
export const metadata: Metadata = {
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
