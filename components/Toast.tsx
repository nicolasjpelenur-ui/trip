'use client'

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { Check, Info, X, AlertTriangle } from 'lucide-react'

type ToastVariant = 'success' | 'info' | 'error'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2800)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  )
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (typeof window === 'undefined') return null
  return (
    <div
      className="fixed z-[60] pointer-events-none flex flex-col gap-2
                 bottom-4 right-4 items-end
                 max-md:bottom-auto max-md:top-3 max-md:right-1/2 max-md:translate-x-1/2 max-md:items-center"
    >
      {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [leaving, setLeaving] = useState(false)

  // Trigger fade-out shortly before auto-dismiss completes
  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), 2400)
    return () => clearTimeout(timer)
  }, [])

  const Icon = toast.variant === 'success' ? Check
    : toast.variant === 'error' ? AlertTriangle
    : Info
  const iconColor =
    toast.variant === 'success' ? 'text-[#10b981]'
    : toast.variant === 'error' ? 'text-[#e8724a]'
    : 'text-[#5b4cf5]'

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 rounded-xl bg-white border border-[#e8e0d5] shadow-lg px-3.5 py-2.5 min-w-[180px] max-w-sm ${leaving ? 'toast-leave' : 'toast-enter'}`}
      style={{ boxShadow: '0 6px 20px rgba(90,50,10,0.15), 0 2px 6px rgba(90,50,10,0.08)' }}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
      <p className="text-sm text-[#1a1614] flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-[#9c8b75] hover:text-[#1a1614] flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
