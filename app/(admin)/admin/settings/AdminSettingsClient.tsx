'use client'

import { useState } from 'react'

type Settings = Record<string, string>

function Section({ title }: { title: string }) {
  return (
    <h3 style={{ marginTop: 32, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid var(--border)', color: 'var(--ocean-deep)' }}>
      {title}
    </h3>
  )
}

function Field({ label, type = 'text', placeholder = '', value, onChange }: {
  label: string
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }}
      />
    </div>
  )
}

export default function AdminSettingsClient({ initialSettings }: { initialSettings: Settings }) {
  const [s, setS] = useState(initialSettings)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const [testEmailLoading, setTestEmailLoading] = useState(false)
  const [testEmailMsg, setTestEmailMsg]         = useState('')

  const set = (k: string, v: string) => setS(prev => ({ ...prev, [k]: v }))

  async function sendTestEmail() {
    setTestEmailLoading(true); setTestEmailMsg('')
    const res = await fetch('/api/admin/test-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: s.operator_email }),
    })
    const data = await res.json()
    if (data.success) {
      setTestEmailMsg(`✓ Test email sent to ${data.sentTo}`)
    } else {
      setTestEmailMsg(`✗ Failed: ${data.error}${data.config ? ` (host: ${data.config.host}, user: ${data.config.user}, hasPass: ${data.config.hasPass})` : ''}`)
    }
    setTestEmailLoading(false)
  }

  async function save() {
    setLoading(true); setMsg('')
    await fetch('/api/admin/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s),
    })
    setMsg('✓ Settings saved.')
    setLoading(false)
  }

  return (
    <>
      <div className="admin-page-header"><h1>Settings</h1></div>

      {msg && <div className="alert alert-success">{msg}</div>}

      <div style={{ maxWidth: 700 }}>
        <Section title="ANZ eGate Payment Gateway" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Merchant ID" value={s.egate_merchant_id ?? ''} onChange={v => set('egate_merchant_id', v)} placeholder="Your ANZ Merchant ID" />
          <div className="form-group">
            <label>Shared Secret</label>
            <input type="password" value={s.egate_shared_secret ?? ''} onChange={e => set('egate_shared_secret', e.target.value)}
              placeholder="Enter new secret to update"
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }} />
          </div>
        </div>
        <Field label="Production Endpoint URL" value={s.egate_endpoint ?? ''} onChange={v => set('egate_endpoint', v)} />
        <div className="form-group">
          <label>Mode</label>
          <select value={s.egate_sandbox ?? 'true'} onChange={e => set('egate_sandbox', e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }}>
            <option value="true">Sandbox (Test Mode)</option>
            <option value="false">Production (Live)</option>
          </select>
        </div>

        <Section title="Booking Settings" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <Field label="Hold Duration (minutes)" type="number" value={s.hold_minutes ?? ''} onChange={v => set('hold_minutes', v)} placeholder="20" />
        </div>

        <Section title="Payment Surcharge / Handling Fee" />
        <div style={{ background: 'var(--foam)', borderRadius: 10, padding: '20px 24px', marginBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, fontWeight: 600, fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={s.payment_surcharge_enabled === 'true'}
              onChange={e => set('payment_surcharge_enabled', e.target.checked ? 'true' : 'false')}
              style={{ width: 16, height: 16 }}
            />
            Enable
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Fee Display Text" value={s.payment_surcharge_label ?? ''} onChange={v => set('payment_surcharge_label', v)} placeholder="Service Fee (4%)" />
            <div className="form-group">
              <label>Applicable Amount Type</label>
              <select
                value={s.payment_surcharge_type ?? 'percentage'}
                onChange={e => set('payment_surcharge_type', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 4 }}>
            <label>
              Amount{' '}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                {s.payment_surcharge_type === 'fixed' ? '— flat fee in TOP$' : '— percentage, e.g. 4 for 4%'}
              </span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                {s.payment_surcharge_type === 'fixed' ? 'T$' : '%'}
              </span>
              <input
                type="number"
                value={s.payment_surcharge_amount ?? ''}
                onChange={e => set('payment_surcharge_amount', e.target.value)}
                placeholder="4"
                style={{ width: 120, padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }}
              />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Shown to customers at checkout and included in the amount charged to their card.
            </p>
          </div>
        </div>

        <Section title="Operator" />
        <Field label="Operator Email (receives all alerts)" type="email" value={s.operator_email ?? ''} onChange={v => set('operator_email', v)} placeholder="info@tahitonga.com" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <button className="btn btn-outline" onClick={sendTestEmail} disabled={testEmailLoading} type="button">
            {testEmailLoading ? 'Sending…' : 'Send Test Email'}
          </button>
          {testEmailMsg && (
            <span style={{ fontSize: '0.88rem', color: testEmailMsg.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>
              {testEmailMsg}
            </span>
          )}
        </div>

        <Section title="Whale Season" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Season Start (MM-DD)" value={s.whale_season_start ?? ''} onChange={v => set('whale_season_start', v)} placeholder="07-01" />
          <Field label="Season End (MM-DD)" value={s.whale_season_end ?? ''} onChange={v => set('whale_season_end', v)} placeholder="10-31" />
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
