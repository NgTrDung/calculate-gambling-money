import { useEffect, useRef, useState } from 'react'
import Dialog from '../../components/ui/Dialog.jsx'
import { formatRoundDate, formatSignedPoint, HISTORY_KEY, loadRoundHistory, paginateRoundHistory, sortRoundHistory } from './history.js'

function pointColor(value) {
  if (value > 0) return 'text-emerald-700 dark:text-emerald-400'
  if (value < 0) return 'text-rose-700 dark:text-rose-400'
  return 'text-slate-600 dark:text-zinc-300'
}

export default function RoundHistoryPage({ onBack }) {
  const [history, setHistory] = useState(loadRoundHistory)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const selectedTrigger = useRef(null)
  const sortedHistory = sortRoundHistory(history)
  const { totalPages, currentPage, start, items: visibleHistory } = paginateRoundHistory(sortedHistory, page)

  useEffect(() => {
    const refresh = (event) => {
      if (event.key === HISTORY_KEY) setHistory(loadRoundHistory())
    }
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  function openDetail(round, trigger) {
    selectedTrigger.current = trigger
    setSelected(round)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex min-h-16 max-w-3xl items-center px-4 sm:px-6">
          <h1 className="text-lg font-semibold sm:text-xl">Lịch sử ván đánh</h1>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        {sortedHistory.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">Chưa có ván nào được lưu.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Lịch sử sẽ xuất hiện sau khi bạn kết thúc một ván.</p>
          </div>
        ) : (
          <>
            <div data-page-scroll className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
              {visibleHistory.map((round, index) => {
                const number = sortedHistory.length - start - index
                return (
                  <button
                    key={round.id}
                    type="button"
                    onClick={(event) => openDetail(round, event.currentTarget)}
                    aria-label={`Xem chi tiết ván ${number}, ${formatRoundDate(round.completedAt)}`}
                    className="flex min-h-24 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-500 hover:bg-emerald-50 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-emerald-500 dark:hover:bg-zinc-800"
                  >
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-slate-900 dark:text-zinc-100">Ván {number}</span>
                      <span className="mt-1 block text-sm text-slate-600 dark:text-zinc-300">{formatRoundDate(round.completedAt)}</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-zinc-400">{round.players.length} người chơi</span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-2xl text-slate-400 dark:text-zinc-500">›</span>
                  </button>
                )
              })}
            </div>
            {totalPages > 1 && (
              <nav aria-label="Phân trang lịch sử" className="mt-5 flex shrink-0 items-center justify-center gap-3">
                <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} className="min-h-11 min-w-20 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">Trước</button>
                <span className="min-w-16 text-center text-sm font-medium tabular-nums text-slate-700 dark:text-zinc-200">{currentPage} / {totalPages}</span>
                <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages} className="min-h-11 min-w-20 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">Sau</button>
              </nav>
            )}
          </>
        )}
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <button type="button" onClick={onBack} className="min-h-12 w-full rounded-md border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">Back</button>
        </div>
      </footer>

      {selected && (
        <Dialog onClose={() => setSelected(null)} triggerRef={selectedTrigger} title="Chi tiết ván" closeAriaLabel="Đóng chi tiết ván">
          <p className="text-xs text-slate-500 dark:text-zinc-400">{formatRoundDate(selected.completedAt)}</p>
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-zinc-700">
            <div className="min-w-[15rem]">
              <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.5rem_minmax(3.25rem,max-content)] gap-1.5 border-b border-slate-200 bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                <span>STT</span><span>Tên</span><span>Role</span><span className="text-right">Điểm</span>
              </div>
              {selected.players.map((player, index) => (
                <div key={player.playerId} className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.5rem_minmax(3.25rem,max-content)] items-start gap-1.5 border-b border-slate-200 px-2 py-2.5 text-xs last:border-b-0 dark:border-zinc-700">
                  <span className="text-slate-500 dark:text-zinc-400">{index + 1}</span>
                  <span className="min-w-0 break-words font-medium text-slate-900 dark:text-zinc-100">{player.name}</span>
                  <span className="text-slate-600 dark:text-zinc-300">{player.role === 'host' ? 'Host' : 'Player'}</span>
                  <span className={`text-right font-semibold tabular-nums ${pointColor(player.point)}`}>{formatSignedPoint(player.point)}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-right text-xs text-slate-500 dark:text-zinc-400">Tổng điểm ván: 0</p>
        </Dialog>
      )}
    </div>
  )
}
