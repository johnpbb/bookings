'use client'

import { useState, useRef } from 'react'
import { OnlineTour, EnquiryTour } from '@/lib/tours'
import RichTextEditor from './RichTextEditor'

function ImageUploader({
  currentImage,
  onUploaded,
}: {
  currentImage?: string | null
  onUploaded: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        onUploaded(data.url)
      } else {
        setError(data.error ?? 'Upload failed.')
      }
    } catch {
      setError('Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="form-group">
      <label>Package Image</label>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{
          width: 120, height: 80, borderRadius: 8, border: '1.5px solid var(--border)',
          background: 'var(--foam)', overflow: 'hidden', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {currentImage
            ? <img src={currentImage} alt="Tour" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No image</span>
          }
        </div>
        <div>
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: '0.82rem', marginBottom: 6 }}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : currentImage ? 'Replace Image' : 'Upload Image'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {currentImage && (
            <button
              type="button"
              style={{ display: 'block', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
              onClick={() => onUploaded('')}
            >
              Remove image
            </button>
          )}
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            JPEG, PNG, WebP — max 5 MB
          </p>
          {error && <p style={{ fontSize: '0.78rem', color: 'red', margin: '4px 0 0' }}>{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default function AdminPackagesClient({
  initialOnline,
  initialEnquiry,
}: {
  initialOnline: OnlineTour[]
  initialEnquiry: EnquiryTour[]
}) {
  const [onlineTours, setOnlineTours] = useState(initialOnline)
  const [enquiryTours, setEnquiryTours] = useState(initialEnquiry)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function saveTours() {
    setLoading(true)
    setSaved(false)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          online_tours_config: JSON.stringify(onlineTours),
          enquiry_tours_config: JSON.stringify(enquiryTours),
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  function addOnlineTour() {
    const id = `tour_${Date.now()}`
    const blank: OnlineTour = {
      id,
      name: 'New Package',
      emoji: '🌊',
      tagline: '',
      desc: '',
      priceLabel: 'TOP$ 0',
      perNote: 'per person',
      badge: null,
      type: 'book',
      isActive: false,
      dateCount: 1,
      pricePerPerson: 0,
    }
    setOnlineTours(prev => [...prev, blank])
  }

  function addEnquiryTour() {
    const id = `tour_${Date.now()}`
    const blank: EnquiryTour = {
      id,
      name: 'New Enquiry Package',
      emoji: '🌴',
      tagline: '',
      desc: '',
      type: 'enquiry',
      isActive: false,
    }
    setEnquiryTours(prev => [...prev, blank])
  }

  function moveToEnquiry(idx: number) {
    const t = onlineTours[idx]
    const asEnquiry: EnquiryTour = {
      id: t.id,
      name: t.name,
      emoji: t.emoji,
      image: t.image,
      tagline: t.tagline,
      desc: t.desc,
      type: 'enquiry',
      isActive: t.isActive,
    }
    setOnlineTours(prev => prev.filter((_, i) => i !== idx))
    setEnquiryTours(prev => [...prev, asEnquiry])
  }

  function moveToOnline(idx: number) {
    const t = enquiryTours[idx]
    const asOnline: OnlineTour = {
      id: t.id,
      name: t.name,
      emoji: t.emoji,
      image: t.image,
      tagline: t.tagline,
      desc: t.desc,
      priceLabel: 'TOP$ 0',
      perNote: 'per person',
      badge: null,
      type: 'book',
      isActive: t.isActive,
      dateCount: 1,
      pricePerPerson: 0,
    }
    setEnquiryTours(prev => prev.filter((_, i) => i !== idx))
    setOnlineTours(prev => [...prev, asOnline])
  }

  const updateOnline = (idx: number, patch: Partial<OnlineTour>) =>
    setOnlineTours(prev => prev.map((t, i) => i === idx ? { ...t, ...patch } : t))

  const updateEnquiry = (idx: number, patch: Partial<EnquiryTour>) =>
    setEnquiryTours(prev => prev.map((t, i) => i === idx ? { ...t, ...patch } : t))

  return (
    <>
      <div className="admin-page-header">
        <h1>Manage Packages & Tours</h1>
        <button className="btn btn-primary" onClick={saveTours} disabled={loading}>
          {loading ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {saved && <div className="alert alert-success" style={{ marginBottom: 24 }}>✨ Package configurations saved successfully!</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

        <section>
          <h2 style={{ marginBottom: 4 }}>Online Bookable Packages</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            Customers can select dates and pay online. Use "Move to Enquiry" to switch a tour to enquiry-only.
          </p>
          <div style={{ display: 'grid', gap: 20 }}>
            {onlineTours.map((t, idx) => (
              <div key={t.id} style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>
                    {t.emoji} {t.name}{' '}
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, background: 'var(--foam)', padding: '2px 8px', borderRadius: 4 }}>ID: {t.id}</span>
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={t.isActive} onChange={e => updateOnline(idx, { isActive: e.target.checked })} />
                      Active on Storefront
                    </label>
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                      onClick={() => {
                        if (confirm(`Move "${t.name}" to Enquiry-only? You can move it back at any time. Remember to Save All Changes.`)) {
                          moveToEnquiry(idx)
                        }
                      }}
                    >
                      Move to Enquiry →
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Package Name</label>
                    <input value={t.name} onChange={e => updateOnline(idx, { name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>
                      URL ID{' '}
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        — used in booking links, set once
                      </span>
                    </label>
                    <input value={t.id}
                      onChange={e => updateOnline(idx, { id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                      style={{ fontFamily: 'monospace' }} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tagline</label>
                    <input value={t.tagline} onChange={e => updateOnline(idx, { tagline: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <RichTextEditor value={t.desc} onChange={html => updateOnline(idx, { desc: html })} />
                </div>

                <ImageUploader
                  currentImage={t.image}
                  onUploaded={url => updateOnline(idx, { image: url || null })}
                />

                <div className="form-row">
                  <div className="form-group">
                    <label>Price Label (display text)</label>
                    <input value={t.priceLabel} onChange={e => updateOnline(idx, { priceLabel: e.target.value })} />
                  </div>
                  {t.id === 'island_reef' ? (
                    <div className="form-group">
                      <label>Price per Pax — Small group / Large group (5+)</label>
                      <input value={t.reefPriceSmall || 400} type="number" style={{ marginBottom: 4 }}
                        onChange={e => updateOnline(idx, { reefPriceSmall: parseInt(e.target.value) || 0 })} />
                      <input value={t.reefPriceLarge || 320} type="number"
                        onChange={e => updateOnline(idx, { reefPriceLarge: parseInt(e.target.value) || 0 })} />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Base Price per Person (TOP$)</label>
                      <input type="number" value={t.pricePerPerson || 0}
                        onChange={e => updateOnline(idx, { pricePerPerson: parseInt(e.target.value) || 0 })} />
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Number of Dates Required</label>
                    <input type="number" min={1} value={t.dateCount}
                      onChange={e => updateOnline(idx, { dateCount: parseInt(e.target.value) || 1 })} />
                  </div>
                  <div className="form-group">
                    <label>Badge (e.g. "Most popular" — leave blank for none)</label>
                    <input value={t.badge ?? ''} onChange={e => updateOnline(idx, { badge: e.target.value || null })} />
                  </div>
                </div>

              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-outline" onClick={addOnlineTour}>
              + Add Online Package
            </button>
          </div>
        </section>

        <section>
          <h2 style={{ marginBottom: 4 }}>Enquiry-Only Packages</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            Customers submit an enquiry form — no online payment. Use "Move to Online Booking" to enable direct booking.
          </p>
          <div style={{ display: 'grid', gap: 20 }}>
            {enquiryTours.map((t, idx) => (
              <div key={t.id} style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>
                    {t.emoji} {t.name}{' '}
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, background: 'var(--foam)', padding: '2px 8px', borderRadius: 4 }}>ID: {t.id}</span>
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={t.isActive} onChange={e => updateEnquiry(idx, { isActive: e.target.checked })} />
                      Active on Storefront
                    </label>
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                      onClick={() => {
                        if (confirm(`Move "${t.name}" to Online Booking? You'll need to set a price and date count, then Save All Changes.`)) {
                          moveToOnline(idx)
                        }
                      }}
                    >
                      ← Move to Online Booking
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Package Name</label>
                    <input value={t.name} onChange={e => updateEnquiry(idx, { name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>
                      URL ID{' '}
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        — used in enquiry links, set once
                      </span>
                    </label>
                    <input value={t.id}
                      onChange={e => updateEnquiry(idx, { id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                      style={{ fontFamily: 'monospace' }} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tagline</label>
                    <input value={t.tagline} onChange={e => updateEnquiry(idx, { tagline: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <RichTextEditor value={t.desc} onChange={html => updateEnquiry(idx, { desc: html })} />
                </div>

                <ImageUploader
                  currentImage={t.image}
                  onUploaded={url => updateEnquiry(idx, { image: url || null })}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-outline" onClick={addEnquiryTour}>
              + Add Enquiry Package
            </button>
          </div>
        </section>

      </div>

      {/* Bottom save */}
      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
        {saved && <span style={{ alignSelf: 'center', marginRight: 16, color: 'var(--success)', fontSize: '0.9rem' }}>✓ Saved successfully</span>}
        <button className="btn btn-primary btn-lg" onClick={saveTours} disabled={loading}>
          {loading ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </>
  )
}
