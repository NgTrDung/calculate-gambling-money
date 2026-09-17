import { useEffect, useId, useRef } from 'react'

export function HelpButton({ buttonRef, label, onClick }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-11 shrink-0 items-center justify-center rounded-md border border-slate-300 text-lg font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      ?
    </button>
  )
}

export default function Dialog({ onClose, triggerRef, children, footer, title = 'Hướng dẫn', closeLabel = 'Đóng', closeAriaLabel = 'Đóng hướng dẫn' }) {
  const titleId = useId()
  const closeButton = useRef(null)

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyPaddingRight = document.body.style.paddingRight
    const pageScrollAreas = [...document.querySelectorAll('[data-page-scroll]')].map((element) => ({
      element,
      overflowY: element.style.overflowY,
    }))
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) {
      const paddingRight = parseFloat(getComputedStyle(document.body).paddingRight) || 0
      document.body.style.paddingRight = `${paddingRight + scrollbarWidth}px`
    }
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    pageScrollAreas.forEach(({ element }) => { element.style.overflowY = 'hidden' })
    closeButton.current?.focus({ preventScroll: true })
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.paddingRight = previousBodyPaddingRight
      pageScrollAreas.forEach(({ element, overflowY }) => { element.style.overflowY = overflowY })
      triggerRef.current?.focus({ preventScroll: true })
    }
  }, [triggerRef])

  function trapFocus(event) {
    if (event.key !== 'Tab') return
    const buttons = event.currentTarget.querySelectorAll('button')
    if (event.shiftKey && document.activeElement === buttons[0]) {
      buttons[buttons.length - 1].focus()
      event.preventDefault()
    } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) {
      buttons[0].focus()
      event.preventDefault()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-none bg-black/60 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={trapFocus} className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white text-slate-900 shadow-xl dark:bg-zinc-900 dark:text-zinc-100">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-zinc-700">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          <button ref={closeButton} type="button" onClick={onClose} aria-label={closeAriaLabel} className="flex size-10 shrink-0 items-center justify-center rounded-md text-xl hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-600 dark:hover:bg-zinc-800">×</button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4 text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
          {children}
        </div>
        <div className="shrink-0 border-t border-slate-200 px-5 py-3 dark:border-zinc-700">
          {footer ?? <button type="button" onClick={onClose} className="min-h-11 w-full rounded-md bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:bg-emerald-500 dark:text-zinc-950">{closeLabel}</button>}
        </div>
      </div>
    </div>
  )
}
