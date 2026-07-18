'use client'

export function Modal({
  open,
  onClose,
  children,
  maxWidth = 'max-w-md'
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-overlay"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl p-6 w-full ${maxWidth} shadow-xl animate-modal`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}