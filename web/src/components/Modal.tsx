import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full md:max-w-md animate-slide-up bg-zinc-900 md:rounded-2xl rounded-t-2xl border border-zinc-800 shadow-2xl">
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
            <h2 className="font-bold text-base">{title}</h2>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="px-5 py-4 pb-8 md:pb-5 max-h-[85vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
