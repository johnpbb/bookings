'use client'

import { useState } from 'react'
import type { PromoCode } from '@prisma/client'

const TOURS = ['whale_day_trip', 'whale_3day', 'whale_5day', 'island_reef']
const BLANK: Partial<PromoCode> = {
  code: '', discountType: 'fixed', discountValue: 0 as any,
  applicableTours: null, validDateStart: null, validDateEnd: null,
  excludeSundays: false, maxUses: null, notes: '', isActive: true,
}

export default function AdminPromoClient({ initialCodes }: { initialCodes: PromoCode[] }) {
  const [codes, setCodes]     = useState(initialCodes)
  const [form, setForm]       = useState(BLANK)
  const [editing, setEditing] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')

  function openNew() { setForm(BLANK); setEditing(-1) }
  function openEdit(c: PromoCode) { setForm(c); setEditing(c.id) }

  async function save() {
    setLoading(true); setMsg('')
    const method = editing === -1 ? 'POST' : 'PATCH'
    const body = editing === -1 ? form : { ...form, id: editing }
    const res = await fetch('/api/admin/promo-codes', {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()
    if (editing === -1) {
      setCodes(c => [data, ...c])
      setMsg('✓ Promo code created.')
    } else {
      setCodes(c => c.map(x => x.id === editing ? data : x))
      setMsg('✓ Promo code updated.')
    }
    setEditing(null)
    setLoading(false)
  }

  async function toggleActive(code: PromoCode) {
    await fetch('/api/admin/promo-codes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: code.id, isActive: !code.isActive }),
    })
    setCodes(c => c.map(x => x.id === code.id ? { ...x, isActive: !x.isActive } : x))
  }

  const f = (k: keyof typeof BLANK, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <div className="admin-page-header">
        <h1>Promo Codes</h1>
        <button className="btn btn-primary" onClick={openNew}>+ New Code</button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr><th>Code</th><th>Type</th><th>Value</th><th>Tours</th><th>Valid</th><th>Uses</th><th>Active</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {codes.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.code}</td>
                <td>{c.discountType}</td>
                <td>{c.discountType === 'fixed' ? `TOP$ ${Number(c.discountValue).toFixed(0)}` : `${c.discountValue}%`}</td>
                <td style={{ fontSize: '0.78rem' }}>{c.applicableTours ?? 'All tours'}</td>
                <td style={{ fontSize: '0.78rem' }}>
                  {c.validDateStart ? new Date(c.validDateStart).toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' }) : '—'}
                  {c.validDateStart && c.validDateEnd ? ' → ' : ''}
                  {c.validDateEnd ? new Date(c.validDateEnd).toLocaleDateString('en-NZ', { month: 'short', day: 'numeric', year: '2-digit' }) : ''}
                  {c.excludeSundays ? ' (no Sun)' : ''}
                </td>
                <td>{c.usesCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                <td><span className={`status-badge ${c.isActive ? 'confirmed' : 'cancelled'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm" style={{ background: 'var(--foam)', border: '1px solid var(--border)' }} onClick={() => openEdit(c)}>Edit</button>
                  <button className="btn btn-sm" style={{ background: 'var(--foam)', border: '1px solid var(--border)' }} onClick={() => toggleActive(c)}>
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {codes.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No promo codes yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Create / Edit modal */}
      {editing !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: 24 }}>{editing === -1 ? 'New Promo Code' : 'Edit Promo Code'}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Code *</label>
                <input value={form.code ?? ''} onChange={e => f('code', e.target.value.toUpperCase())} placeholder="FRINGE2026-JUL" />
              </div>
              <div className="form-group">
                <label>Discount Type</label>
                <select value={form.discountType ?? 'fixed'} onChange={e => f('discountType', e.target.value)}>
                  <option value="fixed">Fixed (TOP$)</option>
                  <option value="percent">Percent (%)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Discount Value</label>
                <input type="number" step="0.01" value={Number(form.discountValue)} onChange={e => f('discountValue', parseFloat(e.target.value))} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Applicable Tours (leave blank for all)</label>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                  {TOURS.map(t => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 'normal', textTransform: 'none', letterSpacing: 0 }}>
                      <input type="checkbox"
                        checked={(form.applicableTours ?? '').includes(t)}
                        onChange={e => {
                          const current = (form.applicableTours ?? '').split(',').filter(Boolean)
                          const updated = e.target.checked ? [...current, t] : current.filter(x => x !== t)
                          f('applicableTours', updated.join(',') || null)
                        }}
                      />
                      {t.replace('whale_', '').replace('_', ' ')}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Valid From</label>
                <input type="date" value={form.validDateStart ? new Date(form.validDateStart as any).toISOString().slice(0,10) : ''}
                  onChange={e => f('validDateStart', e.target.value || null)} />
              </div>
              <div className="form-group">
                <label>Valid To</label>
                <input type="date" value={form.validDateEnd ? new Date(form.validDateEnd as any).toISOString().slice(0,10) : ''}
                  onChange={e => f('validDateEnd', e.target.value || null)} />
              </div>
              <div className="form-group">
                <label>Max Uses (blank = unlimited)</label>
                <input type="number" value={form.maxUses ?? ''} onChange={e => f('maxUses', e.target.value ? parseInt(e.target.value) : null)} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
                <input type="checkbox" id="excl-sun" checked={form.excludeSundays ?? false} onChange={e => f('excludeSundays', e.target.checked)} />
                <label htmlFor="excl-sun" style={{ fontWeight: 'normal', textTransform: 'none', letterSpacing: 0 }}>Exclude Sundays</label>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Notes</label>
                <input value={form.notes ?? ''} onChange={e => f('notes', e.target.value)} placeholder="Internal note..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
