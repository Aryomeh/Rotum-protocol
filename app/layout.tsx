import type { Metadata, Viewport } from 'next'
import TonProvider from '@/components/TonProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rotum Protocol',
  description: 'Compete globally. Mine $RTM. Dominate the network.',
  icons: { icon: '/icon.png' },
}

export const viewport: Viewport = {
  width:          'device-width',
  initialScale:   1,
  maximumScale:   1,
  userScalable:   false,
  themeColor:     '#080a0f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="//libtl.com/sdk.js" data-zone="11234708" data-sdk="show_11234708"></script>
        <script src="https://telegram.org/js/telegram-web-app.js" />
      </head>
      <body className="antialiased">
        <TonProvider>
          {children}
        </TonProvider>
      </body>
    </html>
  )
}