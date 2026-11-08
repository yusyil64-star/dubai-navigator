import type { ReactNode } from 'react'
import './BottomSheet.css'

// Bedienfeld am unteren Bildschirmrand (auf großen Bildschirmen: schwebende Karte links unten).
// Der Inhalt wird von außen hineingegeben (children).
export function BottomSheet({ children }: { children: ReactNode }) {
  return (
    <section className="bottom-sheet">
      <div className="bottom-sheet__handle" aria-hidden="true" />
      {children}
    </section>
  )
}
