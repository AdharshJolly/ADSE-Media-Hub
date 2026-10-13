import type { ReactNode } from 'react';
import BrandLogo from '@/components/ui/BrandLogo';

export default function AuthLayout({ headline, blurb, preview, children }: { headline: string; blurb: string; preview?: boolean; children: ReactNode }) {
  return (
    <div className="app">
      <div className="auth">
        <aside className="auth-art">
          <span className="ring" style={{ width: 520, height: 520, right: -180, top: -140 }} />
          <span className="ring" style={{ width: 340, height: 340, right: -90, top: -50 }} />
          <div className="row" style={{ gap: 12 }}>
            <BrandLogo height={96} force="dark" />
          </div>
          <div className="col" style={{ gap: preview ? 28 : 12, position: 'relative' }}>
            <div className="col" style={{ gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 36, lineHeight: 1.12, letterSpacing: '-.025em', fontWeight: 600, maxWidth: 420 }}>{headline}</h2>
              <p style={{ margin: 0, maxWidth: 400, color: 'rgba(255,255,255,.78)' }}>{blurb}</p>
            </div>
            {preview ? (
              <div style={{ background: 'rgba(255,255,255,.96)', color: '#0B1B33', borderRadius: 16, padding: 16, maxWidth: 360, boxShadow: '0 24px 48px rgba(3,12,40,.35), 0 2px 4px rgba(3,12,40,.2)' }}>
                <div className="sp">
                  <span style={{ fontWeight: 600 }}>Annual day poster</span>
                  <span className="chip c-prog" style={{ background: '#EAF1FF', color: '#1448D6' }}>In progress</span>
                </div>
                <div className="row" style={{ marginTop: 12, gap: 8 }}>
                  <div className="av sm" style={{ background: '#EAF1FF', color: '#1448D6' }}>MK</div>
                  <span style={{ fontSize: 13, color: '#5B6B82' }}>Meera K. · due 18 Oct, 17:30</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: '#E3E8F0', marginTop: 14, overflow: 'hidden' }}>
                  <i style={{ display: 'block', width: '64%', height: '100%', background: '#1D5CFF', borderRadius: 99 }} />
                </div>
              </div>
            ) : null}
          </div>
          <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.65)' }}>Authorised media team members only.</span>
        </aside>
        <section className="auth-form">
          <div className="auth-card">
            <div className="row show-m" style={{ gap: 10, justifyContent: "center" }}>
              <BrandLogo height={64} />
            </div>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
