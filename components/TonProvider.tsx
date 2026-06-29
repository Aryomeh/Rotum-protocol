'use client'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import { TON_MANIFEST_URL } from '@/lib/tonconnect'

export default function TonProvider({ children }: { children: React.ReactNode }) {
  return (
    <TonConnectUIProvider manifestUrl={TON_MANIFEST_URL}>
      {children}
    </TonConnectUIProvider>
  )
}