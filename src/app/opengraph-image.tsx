import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Beacon — school suite for any school'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 64,
          background: 'linear-gradient(165deg, #0a1628 0%, #0c4a6e 50%, #0369a1 100%)',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            B
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>Beacon</div>
        </div>
        <div style={{ fontSize: 52, fontWeight: 650, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: 900 }}>
          The school suite families actually open
        </div>
        <div style={{ marginTop: 18, fontSize: 22, color: '#bae6fd', maxWidth: 720 }}>
          Academics · Family Desk · Dinner Table Digests · honest tuition
        </div>
      </div>
    ),
    { ...size }
  )
}
