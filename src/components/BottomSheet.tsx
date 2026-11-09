import type { ReactNode } from 'react'
import './BottomSheet.css'

// Bedienfeld am unteren Bildschirmrand (auf großen Bildschirmen: schwebende Karte links unten).
// Der Inhalt wird von außen hineingegeben (children). "view" benennt den Inhalt (z. B. "route");
// wechselt er, blendet der neue Inhalt sanft ein.
export function BottomSheet({ children, view }: { children: ReactNode; view?: string }) {
  return (
    <section className="bottom-sheet">
      <div className="bottom-sheet__handle" aria-hidden="true" />
      <div key={view} className="bottom-sheet__content">
        {children}
      </div>
    </section>
  )
}
