import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mysongpal.co.za'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'My Song Pal — Guitar Theory & Practice Companion',
    template: '%s | My Song Pal',
  },
  description:
    'My Song Pal helps guitarists explore chords, scales, CAGED positions, and build structured practice sessions — all in one place.',
  keywords: [
    'guitar',
    'chords',
    'scales',
    'fretboard',
    'music theory',
    'CAGED system',
    'practice',
    'guitar app',
  ],
  authors: [{ name: 'My Song Pal' }],
  openGraph: {
    type: 'website',
    url: APP_URL,
    siteName: 'My Song Pal',
    title: 'My Song Pal — Guitar Theory & Practice Companion',
    description:
      'Explore chords, scales, and fretboard positions. Build structured guitar practice sessions.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'My Song Pal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Song Pal — Guitar Theory & Practice Companion',
    description:
      'Explore chords, scales, and fretboard positions. Build structured guitar practice sessions.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
