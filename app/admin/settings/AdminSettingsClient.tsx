'use client'

import { useState } from 'react'

type Settings = Record<string, string>

export default function AdminSettingsClient({ initialSettings }: { initialSettings: Settings }) {
  const [s, setS] = useState(initialSettings)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')

  const set = (k: string, v: string) => setS(prev => ({ ...prev, [k]: v }))

  async function save() {
    setLoading(true); setMsg('')
    await fetch('/api/admin/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s),
    })
    setMsg('✓ Settings saved.')
    setLoading(false)
  }

  const Field = ({ label, k, type = 'text', placeholder = '' }: { label: string; k: string; type?: string; placeholder?: string }) => (
    <div className="form-group">
      <label>{label}</label>
      <input type={type} value={s[k] ?? ''} onChange={e => set(k, e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }} />
    </div>
  )

  const Section = ({ title }: { title: string }) => (
    <h3 style={{ marginTop: 32, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid var(--border)', color: 'var(--ocean-deep)' }}>{title}</h3>
  )

  return (
    <>
      <div className="admin-page-header"><h1>Settings</h1></div>

      {msg && <div className="alert alert-success">{msg}</div>}

      <div style={{ maxWidth: 700 }}>
        <Section title="ANZ eGate Payment Gateway" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Merchant ID" k="egate_merchant_id" placeholder="Your ANZ Merchant ID" />
          <div className="form-group">
            <label>Shared Secret</label>
            <input type="password" value={s.egate_shared_secret ?? ''} onChange={e => set('egate_shared_secret', e.target.value)}
              placeholder="Enter new secret to update"
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }} />
          </div>
        </div>
        <Field label="Production Endpoint URL" k="egate_endpoint" />
        <div className="form-group">
          <label>Mode</label>
          <select value={s.egate_sandbox ?? 'true'} onChange={e => set('egate_sandbox', e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }}>
            <option value="true">Sandbox (Test Mode)</option>
            <option value="false">Production (Live)</option>
          </select>
        </div>

        <Section title="Booking Settings" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Hold Duration (minutes)" k="hold_minutes" type="number" placeholder="20" />
          <Field label="Non-Refundable Fee (TOP)" k="non_refundable_fee" type="number" placeholder="0" />
        </div>

        <Section title="Operator" />
        <Field label="Operator Email (receives all alerts)" k="operator_email" type="email" placeholder="info@tahitonga.com" />

        <Section title="Whale Season" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Season Start (MM-DD)" k="whale_season_start" placeholder="07-01" />
          <Field label="Season End (MM-DD)" k="whale_season_end" placeholder="10-31" />
        </div>
        <div className="form-group">
          <label>Excluded Operating Dates (comma-separated YYYY-MM-DD)</label>
          <textarea value={s.excluded_dates ?? ''} onChange={e => set('excluded_dates', e.target.value)}
            placeholder="2026-04-05,2026-12-25" rows={3}
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem', resize: 'vertical' }} />
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>Easter Sunday and Christmas Day pre-seeded.</p>
        </div>

        <Section title="Confirmation Email Content" />
        <div className="form-group">
          <label>Meeting Point Instructions</label>
          <textarea value={s.email_meeting_point ?? ''} onChange={e => set('email_meeting_point', e.target.value)} rows={2}
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem', resize: 'vertical' }} />
        </div>
        <div className="form-group">
          <label>Inclusions</label>
          <textarea value={s.email_inclusions ?? ''} onChange={e => set('email_inclusions', e.target.value)} rows={2}
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem', resize: 'vertical' }} />
        </div>
        <div className="form-group">
          <label>What to Bring</label>
          <textarea value={s.email_what_to_bring ?? ''} onChange={e => set('email_what_to_bring', e.target.value)} rows={2}
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem', resize: 'vertical' }} />
        </div>

        <button className="btn btn-primary btn-lg" onClick={save} disabled={loading} style={{ marginTop: 8 }}>
          {loading ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </>
  )
}
