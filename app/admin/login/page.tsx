'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res  = await fetch('/api/admin/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Invalid password')
    }
    setLoading(false)
  }

  return (
    <div style={{
      background:     '#080a0f',
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontFamily:     "'Share Tech Mono', monospace",
    }}>
      <div style={{
        background:   '#0d1017',
        border:       '1px solid #1a2230',
        borderRadius: 6,
        padding:      '32px 28px',
        width:        320,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ color: '#9d7fd4', fontSize: 16, letterSpacing: 4 }}>
            ROTUM PROTOCOL
          </div>
          <div style={{
            display:        'inline-block',
            marginTop:      6,
            background:     '#1a1030',
            border:         '1px solid #7b5ea7',
            color:          '#9d7fd4',
            fontSize:        9,
            padding:        '2px 10px',
            borderRadius:   3,
            letterSpacing:  3,
          }}>
            ADMIN ACCESS
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display:       'block',
              fontSize:      10,
              color:         '#4a5a70',
              letterSpacing: '1px',
              marginBottom:  5,
            }}>
              ADMIN PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              style={{
                width:        '100%',
                background:   '#080a0f',
                border:       `1px solid ${error ? '#ff4455' : '#1a2230'}`,
                color:        '#c0cce0',
                fontFamily:   "'Share Tech Mono', monospace",
                fontSize:     12,
                padding:      '8px 10px',
                borderRadius: 3,
                outline:      'none',
              }}
            />
            {error && (
              <div style={{ color: '#ff4455', fontSize: 10, marginTop: 5 }}>
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width:         '100%',
              background:    loading ? '#0a0d14' : '#0f0820',
              border:        '1px solid #7b5ea7',
              color:         '#9d7fd4',
              fontFamily:    "'Share Tech Mono', monospace",
              fontSize:      11,
              padding:       '9px 0',
              borderRadius:  3,
              cursor:        loading ? 'not-allowed' : 'pointer',
              letterSpacing: '2px',
              marginTop:     4,
            }}
          >
            {loading ? 'VERIFYING...' : 'ACCESS PANEL'}
          </button>
        </form>

        <div style={{
          marginTop:  20,
          textAlign:  'center',
          fontSize:   9,
          color:      '#4a5a70',
          letterSpacing: '1px',
        }}>
          ROTUM PROTOCOL ADMIN v1.0
        </div>
      </div>
    </div>
  )
}
