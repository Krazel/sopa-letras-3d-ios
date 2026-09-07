import type { Metadata, Viewport } from 'next';
import './globals.css';
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0b1120' };
export const metadata: Metadata = {
  title: 'Sopa de letras 3D · Krazel Games',
  description:
    'Gira un cubo de letras, explora sus capas y descubre seis palabras en tres dimensiones.',
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
