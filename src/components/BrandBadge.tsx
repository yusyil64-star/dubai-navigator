import './BrandBadge.css'

// Kleines Namensschild oben links mit Logo und App-Namen.
export function BrandBadge() {
  return (
    <header className="brand-badge">
      <svg className="brand-badge__logo" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 10 L46 50 L32 42 L18 50 Z" />
      </svg>
      <span className="brand-badge__name">Dubai Navigator</span>
    </header>
  )
}
