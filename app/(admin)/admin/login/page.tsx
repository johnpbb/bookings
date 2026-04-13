'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function AdminLoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email, password, redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password.')
      setLoading(false)
    } else {
      window.location.href = '/admin'
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a2e4a 0%, #0e4d73 100%)',
      fontFamily: 'Inter, sans-serif', padding: 24,
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: 48, width: '100%', maxWidth: 400,
        boxShadow: '0 24px 80px rgba(0,0,0,.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🐋</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: '#0a2e4a', marginBottom: 4 }}>
            Tahi Tonga
          </h1>
          <p style={{ color: '#8a9ab0', fontSize: '0.85rem' }}>Booking Admin Panel</p>
        </div>

        {error && (
          <div style={{
            background: '#fde8e8', color: '#c03030', border: '1px solid #f5b0b0',
            borderRadius: 8, padding: '12px 16px', fontSize: '0.88rem', marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#4a5568', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="admin@tahitonga.com"
              style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #d8e4ec', borderRadius: 10, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#4a5568', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #d8e4ec', borderRadius: 10, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', background: '#0f7ea8', color: 'white',
            border: 'none', borderRadius: 10, fontSize: '0.95rem', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1,
          }}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  )
}
