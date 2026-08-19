import type { Metadata } from 'next'
import {
  Inter,
  Bricolage_Grotesque,
  JetBrains_Mono,
  Playfair_Display,
  Nunito,
  Sora,
} from 'next/font/google'
import './globals.css'

// Body / UI text — highly legible neutral (Warmwood, Midnight).
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

// Display / headings — characterful, warm (Warmwood).
const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  display: 'swap',
})

// Monospace — tab staff, timers, BPM numerals (all themes).
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
})

// Serif display — Nocturne theme headings.
const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
})

// Rounded, friendly sans — Clay theme.
const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  display: 'swap',
})

// Geometric sans — Aurora Glass theme.
const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  display: 'swap',
})

// Applies the persisted theme before first paint to avoid a flash of the wrong
// look. Sets data-theme and toggles `.dark` for dark themes. Legacy 'dark'
// values map to Midnight; anything unknown falls back to Warmwood (light).
const THEME_INIT = `(function(){try{var ids=['warmwood','midnight','nocturne','aurora','clay'];var darks=['midnight','nocturne','aurora'];var t=localStorage.getItem('mysongpal_theme');if(t==='dark')t='midnight';if(ids.indexOf(t)===-1)t='warmwood';var el=document.documentElement;el.setAttribute('data-theme',t);el.classList.toggle('dark',darks.indexOf(t)!==-1);}catch(e){}})();`

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
        className={`${inter.variable} ${bricolage.variable} ${jetbrainsMono.variable} ${playfair.variable} ${nunito.variable} ${sora.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
