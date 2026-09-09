import type { Metadata, Viewport } from 'next';
import './globals.css';
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b1120',
};
export const metadata: Metadata = {
  title: 'Sopa de letras 3D',
  description:
    'Catorce sopas de letras en tres dimensiones, de 3×3×3 a 10×10×10. Gira, haz zoom y encuentra las palabras con tema claro u oscuro.',
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
