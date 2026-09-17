import { useRef, useState } from 'react'
import Dialog, { HelpButton } from './Dialog.jsx'
import { createRoundHistory, formatSignedPoint, saveCompletedRound } from './history.js'
import { parsePointInput, parseSavedPlayers } from './players.js'
import { calculateRound } from './round.js'

function loadPlayers() {
  try {
    return parseSavedPlayers(localStorage.getItem('players')) ?? []
  } catch {
    return []
  }
}

export default function EndRoundPage({ onCancel, onSaved }) {
  const [players] = useState(loadPlayers)
  const roundPlayers = players.filter((player) => player.active && player.role === 'player')
  const [pointDrafts, setPointDrafts] = useState(() => Object.fromEntries(
    players.filter((player) => player.active && player.role === 'player').map((player) => [player.id, '0'])
  ))
  const [saveError, setSaveError] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const helpButton = useRef(null)
  const result = calculateRound(players, pointDrafts)
  const host = players.find((player) => player.active && player.role === 'host')

  function updatePoint(id, value) {
    setPointDrafts((current) => ({ ...current, [id]: value }))
    setSaveError('')
  }

  function stepPoint(id, amount) {
    const current = parsePointInput(pointDrafts[id]) ?? 0
    const next = current + amount
    if (Number.isSafeInteger(next)) updatePoint(id, String(next))
  }

  function save(event) {
    event.preventDefault()
    if (result.error) return
    try {
      const currentPlayers = loadPlayers()
      if (JSON.stringify(currentPlayers) !== JSON.stringify(players)) {
        setSaveError('Danh sách người chơi đã thay đổi. Hãy mở lại màn này để nhập ván mới.')
        return
      }
      const round = createRoundHistory(players, result.updatedPlayers, pointDrafts, result.hostRoundPoints)
      saveCompletedRound(localStorage, result.updatedPlayers, round)
      onSaved()
    } catch {
      setSaveError('Không thể lưu kết quả ván trên thiết bị này.')
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex min-h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <h1 className="text-lg font-semibold sm:text-xl">Kết thúc ván</h1>
          <HelpButton buttonRef={helpButton} label="Hướng dẫn kết thúc ván" onClick={() => setHelpOpen(true)} />
        </div>
      </header>

      <main data-page-scroll className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Điểm ván này</h2>
          <span className="text-xs text-slate-500 dark:text-zinc-400">{roundPlayers.length} người chơi</span>
        </div>

        {roundPlayers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            Không có người chơi để nhập kết quả ván.
          </p>
        ) : (
          <div className="space-y-3">
            {roundPlayers.map((player) => {
              const value = pointDrafts[player.id]
              const invalid = parsePointInput(value) === null
              return (
                <div key={player.id} className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-4 sm:gap-4 sm:px-5 dark:border-zinc-700 dark:bg-zinc-900">
                  <button type="button" onClick={() => stepPoint(player.id, -1)} aria-label={`Giảm 1 điểm của ${player.name}`} title="Giảm 1 điểm" className="size-12 rounded-full border border-slate-300 bg-slate-50 text-2xl text-slate-800 hover:bg-slate-100 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">−</button>
                  <div className="min-w-0 text-center">
                    <label htmlFor={`round-point-${player.id}`} className="block truncate text-sm font-semibold text-slate-900 dark:text-zinc-100" title={player.name}>{player.name}</label>
                    <input
                      id={`round-point-${player.id}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={value}
                      onChange={(event) => updatePoint(player.id, event.target.value)}
                      aria-label={`Điểm ván này của ${player.name}`}
                      aria-invalid={invalid}
                      aria-describedby={invalid ? `round-error-${player.id}` : undefined}
                      className={`mt-2 h-11 w-full max-w-32 rounded-md border bg-white px-2 text-center text-base font-semibold outline-none focus:ring-2 dark:bg-zinc-950 dark:text-zinc-100 ${invalid ? 'border-rose-600 focus:ring-rose-100 dark:border-rose-400 dark:focus:ring-rose-900/40' : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-100 dark:border-zinc-600 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40'}`}
                    />
                    {invalid && <p id={`round-error-${player.id}`} className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-300">Chỉ nhập số nguyên.</p>}
                  </div>
                  <button type="button" onClick={() => stepPoint(player.id, 1)} aria-label={`Tăng 1 điểm của ${player.name}`} title="Tăng 1 điểm" className="size-12 rounded-full border border-slate-300 bg-slate-50 text-2xl text-slate-800 hover:bg-slate-100 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">+</button>
                </div>
              )
            })}
          </div>
        )}

        {host && roundPlayers.length > 0 && result.error !== 'invalid' && result.error !== 'range' && (
          <div className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-zinc-700 dark:text-zinc-300">
            <p className="flex justify-between gap-3"><span>Host: {host.name}</span><span className="font-semibold tabular-nums">{formatSignedPoint(result.hostRoundPoints)} điểm</span></p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Điểm Host được tính tự động từ điểm của Player.</p>
          </div>
        )}

        {result.error === 'host' && <p role="status" className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">Không tìm thấy Host hợp lệ. Hãy kiểm tra thông tin người chơi trước khi kết thúc ván.</p>}
        {result.error === 'balance' && <p role="status" className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">Tổng điểm sau ván sẽ là {formatSignedPoint(result.projectedTotal)}. Không thể kết thúc ván vì tổng điểm của tất cả người chơi phải bằng 0. Hãy kiểm tra lại thông tin người chơi.</p>}
        {result.error === 'range' && <p role="status" className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">Tổng điểm vượt quá phạm vi số nguyên hợp lệ. Hãy giảm điểm của ván này.</p>}
        {saveError && <p role="alert" className="mt-4 text-sm font-medium text-rose-700 dark:text-rose-300">{saveError}</p>}
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-zinc-400">1 điểm = 1.000đ</p>
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="min-h-12 rounded-md border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">Cancel</button>
          <button type="submit" disabled={Boolean(result.error)} className="min-h-12 rounded-md bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400">OK</button>
        </div>
      </footer>

      {helpOpen && (
        <Dialog onClose={() => setHelpOpen(false)} triggerRef={helpButton}>
          <section>
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Nhập điểm ván này</h3>
            <p className="mt-1">Nhập số điểm mỗi Player thắng hoặc thua trong ván vừa kết thúc.</p>
            <p className="mt-1">Thắng 3 điểm: +3. Thua 2 điểm: -2.</p>
          </section>
          <section>
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Dùng nút − / +</h3>
            <p className="mt-1">Chạm − hoặc + để thay đổi 1 điểm, hoặc nhập trực tiếp số nguyên.</p>
          </section>
          <section>
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Điểm của Host</h3>
            <p className="mt-1">Host không cần nhập điểm. Điểm Host được tính tự động từ tổng điểm của các Player.</p>
            <p className="mt-1">Player tổng +5: Host -5. Player tổng -3: Host +3.</p>
          </section>
          <section>
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Cân bằng điểm</h3>
            <p className="mt-1">Sau khi cập nhật, tổng điểm của tất cả người chơi phải bằng 0. Nếu dữ liệu chưa cân bằng, hãy sửa ở màn Thông tin người chơi trước.</p>
          </section>
          <section>
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Lưu kết quả</h3>
            <p className="mt-1">Chọn OK để cộng điểm ván này vào tổng điểm. Chọn Cancel để quay lại mà không lưu.</p>
          </section>
        </Dialog>
      )}
    </form>
  )
}
