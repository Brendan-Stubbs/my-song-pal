import type { Metadata } from 'next'
import { Inter, Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google'
import './globals.css'

// Body / UI text — highly legible neutral.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

// Display / headings — characterful, warm, clearly not a framework default.
const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  display: 'swap',
})

// Monospace — tab staff, timers, BPM numerals.
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
})

// Applies the persisted theme (or system preference) before first paint to
// avoid a flash of the wrong colour scheme.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('mysongpal_theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body
        className={`${inter.variable} ${bricolage.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
