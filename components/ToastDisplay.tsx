'use client'
import { useStore } from '@/store/useStore'

export function ToastDisplay() {
  const toast = useStore((s) => s.toast)
  if (!toast) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#1a1a2e',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: 8,
        border: '1px solid #a855f7',
        fontFamily: 'monospace',
        fontSize: 13,
        zIndex: 9999,
      }}
    >
      {toast}
    </div>
  )
}