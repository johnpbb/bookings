'use client'

import { useState } from 'react'
import { OnlineTour, EnquiryTour } from '@/lib/tours'

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
          <h2 style={{ marginBottom: 16 }}>Online Bookable Packages</h2>
          <div style={{ display: 'grid', gap: 20 }}>
            {onlineTours.map((t, idx) => (
              <div key={t.id} style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>{t.emoji} {t.name} <span style={{ fontSize: '0.8rem', fontWeight: 500, background: 'var(--foam)', padding: '2px 8px', borderRadius: 4 }}>ID: {t.id}</span></h3>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={t.isActive} onChange={(e) => {
                      const nu = [...onlineTours]
                      nu[idx] = { ...t, isActive: e.target.checked }
                      setOnlineTours(nu)
                    }} /> Active on Storefront
                  </label>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Package Name</label>
                    <input value={t.name} onChange={(e) => {
                      const nu = [...onlineTours]
                      nu[idx].name = e.target.value
                      setOnlineTours(nu)
                    }} />
                  </div>
                  <div className="form-group">
                    <label>Tagline</label>
                    <input value={t.tagline} onChange={(e) => {
                      const nu = [...onlineTours]
                      nu[idx].tagline = e.target.value
                      setOnlineTours(nu)
                    }} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={2} value={t.desc} onChange={(e) => {
                    const nu = [...onlineTours]
                    nu[idx].desc = e.target.value
                    setOnlineTours(nu)
                  }} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Price Label (Frontend text)</label>
                    <input value={t.priceLabel} onChange={(e) => {
                      const nu = [...onlineTours]
                      nu[idx].priceLabel = e.target.value
                      setOnlineTours(nu)
                    }} />
                  </div>
                  {t.id === 'island_reef' ? (
                     <div className="form-group">
                        <label>Base Price per Pax: {t.reefPriceSmall} (Small) / {t.reefPriceLarge} (Large)</label>
                        <input value={t.reefPriceSmall || 400} type="number" onChange={(e) => {
                          const nu = [...onlineTours]
                          nu[idx].reefPriceSmall = parseInt(e.target.value) || 0
                          setOnlineTours(nu)
                        }} style={{ marginBottom: 4 }} />
                        <input value={t.reefPriceLarge || 320} type="number" onChange={(e) => {
                          const nu = [...onlineTours]
                          nu[idx].reefPriceLarge = parseInt(e.target.value) || 0
                          setOnlineTours(nu)
                        }} />
                     </div>
                  ) : (
                    <div className="form-group">
                      <label>Base Price per Pax (TOP$ Integer)</label>
                      <input type="number" value={t.pricePerPerson || 0} onChange={(e) => {
                        const nu = [...onlineTours]
                        nu[idx].pricePerPerson = parseInt(e.target.value) || 0
                        setOnlineTours(nu)
                      }} />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Highlights (Comma separated)</label>
                  <input value={t.highlights.join(', ')} onChange={(e) => {
                    const nu = [...onlineTours]
                    nu[idx].highlights = e.target.value.split(',').map(s => s.trim())
                    setOnlineTours(nu)
                  }} />
                </div>

              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ marginBottom: 16 }}>Enquiry Packages</h2>
          <div style={{ display: 'grid', gap: 20 }}>
            {enquiryTours.map((t, idx) => (
              <div key={t.id} style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>{t.emoji} {t.name} <span style={{ fontSize: '0.8rem', fontWeight: 500, background: 'var(--foam)', padding: '2px 8px', borderRadius: 4 }}>ID: {t.id}</span></h3>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={t.isActive} onChange={(e) => {
                      const nu = [...enquiryTours]
                      nu[idx] = { ...t, isActive: e.target.checked }
                      setEnquiryTours(nu)
                    }} /> Active on Storefront
                  </label>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Package Name</label>
                    <input value={t.name} onChange={(e) => {
                      const nu = [...enquiryTours]
                      nu[idx].name = e.target.value
                      setEnquiryTours(nu)
                    }} />
                  </div>
                  <div className="form-group">
                    <label>Tagline</label>
                    <input value={t.tagline} onChange={(e) => {
                      const nu = [...enquiryTours]
                      nu[idx].tagline = e.target.value
                      setEnquiryTours(nu)
                    }} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={2} value={t.desc} onChange={(e) => {
                    const nu = [...enquiryTours]
                    nu[idx].desc = e.target.value
                    setEnquiryTours(nu)
                  }} />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </>
  )
}
