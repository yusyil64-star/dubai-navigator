import { useEffect } from 'react'
import './Toast.css'

const VISIBLE_MS = 4000

// Kurze Hinweis-Meldung über dem Bedienfeld, verschwindet nach einigen Sekunden von selbst.
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [message, onClose])

  return (
    <div className="toast" role="status">
      {message}
    </div>
  )
}
