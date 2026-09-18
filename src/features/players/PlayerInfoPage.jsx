import { useRef, useState } from 'react'
import Dialog, { HelpButton } from '../../components/ui/Dialog.jsx'
import { formatVnd } from '../settings/gameSettings.js'
import {
  cleanName,
  getPlayerErrors,
  parsePointInput,
  parseSavedPlayers,
  retirePlayer,
  restorePlayer,
  setHost,
  totalPoints,
} from './players.js'

function loadPlayers() {
  try {
    return parseSavedPlayers(localStorage.getItem('players')) ?? []
  } catch {
    return []
  }
}

const nameErrors = {
  empty: 'Vui lòng nhập tên người chơi.',
  invalid: 'Tên chỉ dùng chữ, số, dấu cách và dấu . - \'.',
  duplicate: 'Tên này đã có trong danh sách.',
}

const formatSignedPoint = (value) => value > 0 ? `+${value}` : String(value)

export default function PlayerInfoPage({ pointValueVnd, onCancel, onSaved }) {
  const [players, setPlayers] = useState(loadPlayers)
  const [tab, setTab] = useState('active')
  const [pointDrafts, setPointDrafts] = useState({})
  const [lastEditedPointId, setLastEditedPointId] = useState(null)
  const [activeNameId, setActiveNameId] = useState(null)
  const [openSwipeId, setOpenSwipeId] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [saveError, setSaveError] = useState('')
  const swipeStart = useRef(null)
  const helpButton = useRef(null)

  const activePlayers = players.filter((player) => player.active)
  const retiredPlayers = players.filter((player) => !player.active)
  const visiblePlayers = tab === 'active' ? activePlayers : retiredPlayers
  const errors = getPlayerErrors(players, true)
  const pointErrors = new Set(Object.entries(pointDrafts)
    .filter(([, value]) => parsePointInput(value) === null)
    .map(([id]) => id))
  const total = totalPoints(players)
  const hostCount = activePlayers.filter((player) => player.role === 'host').length
  const hostValid = activePlayers.length ? hostCount === 1 : players.every((player) => player.role !== 'host')
  const balanced = total === 0 && Number.isSafeInteger(total)
  const canSave = errors.size === 0 && pointErrors.size === 0 && hostValid && balanced
  const duplicate = visiblePlayers.find((player) => player.id === activeNameId && errors.get(player.id) === 'duplicate')
    ?? visiblePlayers.find((player) => errors.get(player.id) === 'duplicate')

  function updateName(id, name) {
    setPlayers((current) => current.map((player) => player.id === id ? { ...player, name } : player))
    setActiveNameId(id)
    setSaveError('')
  }

  function updatePoint(id, value) {
    setPointDrafts((current) => ({ ...current, [id]: value }))
    setLastEditedPointId(id)
    setSaveError('')
    const parsed = parsePointInput(value)
    if (parsed !== null) {
      setPlayers((current) => current.map((player) => player.id === id
        ? { ...player, totalPoints: parsed }
        : player))
    }
  }

  function stepPoint(player, amount) {
    const current = parsePointInput(pointDrafts[player.id] ?? String(player.totalPoints))
    const next = (current ?? player.totalPoints) + amount
    if (!Number.isSafeInteger(next)) return
    updatePoint(player.id, String(next))
  }

  function save(event) {
    event.preventDefault()
    if (!canSave) return
    try {
      localStorage.setItem('players', JSON.stringify(players.map((player) => ({
        ...player,
        name: cleanName(player.name),
      }))))
      onSaved()
    } catch {
      setSaveError('Không thể lưu thay đổi trên thiết bị này.')
    }
  }

  function changeTab(nextTab) {
    setTab(nextTab)
    setOpenSwipeId(null)
  }

  function beginSwipe(event, id) {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      swipeStart.current = { id, x: event.clientX, y: event.clientY }
    }
  }

  function endSwipe(event, id) {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start || start.id !== id) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.3) return
    setOpenSwipeId(dx < 0 ? id : null)
  }

  function runRowAction(player) {
    setPlayers((current) => player.active
      ? retirePlayer(current, player.id)
      : restorePlayer(current, player.id))
    setOpenSwipeId(null)
  }

  function toggleRowAction(id, blocked) {
    const opening = openSwipeId !== id
    setOpenSwipeId(opening ? id : null)
    if (opening && !blocked) {
      requestAnimationFrame(() => document.getElementById(`row-action-${id}`)?.focus())
    }
  }

  return (
    <form onSubmit={save} className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex min-h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <h1 className="text-lg font-semibold sm:text-xl">Thông tin người chơi</h1>
          <HelpButton buttonRef={helpButton} label="Hướng dẫn" onClick={() => setHelpOpen(true)} />
        </div>
      </header>

      <main data-page-scroll className="mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-8">
        <div role="tablist" aria-label="Trạng thái người chơi" className="grid grid-cols-2 border-b border-slate-200 dark:border-zinc-700">
          {[
            ['active', 'Đang chơi', activePlayers.length],
            ['retired', 'Đã nghỉ', retiredPlayers.length],
          ].map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              aria-controls="player-panel"
              onClick={() => changeTab(value)}
              className={`min-h-12 border-b-2 px-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${tab === value ? 'border-emerald-600 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'}`}
            >
              {label} <span className="ml-1 text-xs font-medium">{count}</span>
            </button>
          ))}
        </div>

        <div id="player-panel" role="tabpanel" className="mt-5">
          {visiblePlayers.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              {tab === 'active' ? 'Chưa có người chơi đang chơi.' : 'Chưa có người chơi đã nghỉ.'}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_4rem] gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 md:grid-cols-[1.5rem_minmax(0,1fr)_4rem_13rem] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                <span>STT</span><span>Tên</span><span>Role</span><span className="hidden md:block">Điểm</span>
              </div>
              {visiblePlayers.map((player, index) => {
                const nameError = errors.get(player.id)
                const showNameError = nameError && (nameError !== 'duplicate' || player.id === activeNameId)
                const pointError = pointErrors.has(player.id)
                const pointWarning = !balanced && player.active && player.id !== lastEditedPointId
                const isHost = player.role === 'host'
                const cannotRetireHost = player.active && isHost && activePlayers.length > 1
                const actionBlocked = cannotRetireHost || (player.active && (Boolean(nameError) || pointError))
                const actionTitle = player.active
                  ? cannotRetireHost ? 'Chuyển Host cho người khác trước' : actionBlocked ? 'Sửa tên hoặc điểm trước khi cho nghỉ' : 'Đưa vào Đã nghỉ'
                  : 'Đưa trở lại Đang chơi'
                const swipeOpen = openSwipeId === player.id

                return (
                  <div key={player.id} className="relative overflow-hidden border-b border-slate-200 last:border-b-0 dark:border-zinc-700">
                    <button
                      id={`row-action-${player.id}`}
                      type="button"
                      disabled={actionBlocked}
                      tabIndex={swipeOpen && !actionBlocked ? 0 : -1}
                      aria-hidden={!swipeOpen}
                      onClick={() => runRowAction(player)}
                      title={actionTitle}
                      aria-label={player.active ? `Đưa ${player.name} vào Đã nghỉ` : `Thêm lại ${player.name} vào Đang chơi`}
                      className={`absolute inset-y-0 right-0 w-20 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400 ${player.active ? 'bg-rose-700 hover:bg-rose-800' : 'bg-emerald-700 hover:bg-emerald-800'}`}
                    >
                      {player.active ? 'Xóa' : 'Thêm lại'}
                    </button>
                    <div
                      onPointerDown={(event) => beginSwipe(event, player.id)}
                      onPointerUp={(event) => endSwipe(event, player.id)}
                      onPointerCancel={() => { swipeStart.current = null }}
                      className={`relative grid touch-pan-y grid-cols-[1.5rem_minmax(0,1fr)_4rem] items-start gap-x-2 gap-y-2 bg-white px-3 py-3 transition-transform duration-200 dark:bg-zinc-900 md:grid-cols-[1.5rem_minmax(0,1fr)_4rem_13rem] ${swipeOpen ? '-translate-x-20' : ''}`}
                    >
                      <span className="pt-3 text-xs font-semibold text-slate-500 dark:text-zinc-400">{index + 1}</span>
                      <div className="min-w-0">
                        {player.active ? (
                          <>
                            <label htmlFor={`info-name-${player.id}`} className="sr-only">Tên người chơi {index + 1}</label>
                            <input
                              id={`info-name-${player.id}`}
                              type="text"
                              value={player.name}
                              onChange={(event) => updateName(player.id, event.target.value)}
                              onFocus={() => setActiveNameId(player.id)}
                              aria-invalid={Boolean(nameError)}
                              aria-describedby={showNameError ? `info-name-error-${player.id}` : undefined}
                              title={nameError === 'duplicate' && !showNameError ? nameErrors.duplicate : undefined}
                              className={`h-11 w-full min-w-0 rounded-md border bg-white px-2 text-base outline-none focus:ring-2 dark:bg-zinc-950 dark:text-zinc-100 ${nameError ? 'border-rose-600 focus:ring-rose-100 dark:border-rose-400 dark:focus:ring-rose-900/40' : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-100 dark:border-zinc-600 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40'}`}
                            />
                            {showNameError && <p id={`info-name-error-${player.id}`} className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-300">{nameErrors[nameError]}</p>}
                          </>
                        ) : (
                          <span className="flex min-h-11 items-center break-words px-2 text-base font-medium text-slate-700 dark:text-zinc-200">{player.name}</span>
                        )}
                      </div>
                      {player.active ? (
                        <button
                          type="button"
                          disabled={isHost}
                          onClick={() => setPlayers((current) => setHost(current, player.id))}
                          aria-label={`${player.name}: ${isHost ? 'Host hiện tại' : 'Chuyển thành Host'}`}
                          title={isHost ? 'Host hiện tại' : 'Chuyển thành Host'}
                          className={`flex min-h-11 flex-col items-center justify-center rounded-md border text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-default ${isHost ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-200' : 'border-slate-200 bg-slate-50 text-slate-700 enabled:hover:border-emerald-500 enabled:active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}
                        >
                          <span aria-hidden="true" className="text-base leading-none">{isHost ? '♛' : '👤'}</span>
                          <span>{isHost ? 'Host' : 'Player'}</span>
                        </button>
                      ) : (
                        <span className="flex min-h-11 flex-col items-center justify-center text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                          <span aria-hidden="true" className="text-base leading-none">👤</span>
                          <span>Player</span>
                      </span>
                      )}
                      <div className="col-span-2 col-start-2 min-w-0 md:col-span-1 md:col-start-4">
                        {player.active ? (
                          <label htmlFor={`info-point-${player.id}`} className="mb-1 block text-xs font-medium text-slate-500 md:sr-only dark:text-zinc-400">Điểm</label>
                        ) : (
                          <span className="mb-1 block text-xs font-medium text-slate-500 md:sr-only dark:text-zinc-400">Điểm</span>
                        )}
                        <div className="flex min-w-0 items-center gap-1.5">
                          {player.active ? (
                            <>
                              <button type="button" onClick={() => stepPoint(player, -1)} aria-label="Giảm 1 điểm" title="Giảm 1 điểm" className="size-10 shrink-0 rounded-full border border-slate-300 bg-slate-50 text-xl text-slate-800 hover:bg-slate-100 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">−</button>
                              <input
                                id={`info-point-${player.id}`}
                                type="text"
                                inputMode="numeric"
                                value={pointDrafts[player.id] ?? String(player.totalPoints)}
                                onChange={(event) => updatePoint(player.id, event.target.value)}
                                aria-invalid={pointError}
                                aria-describedby={pointError ? `info-point-error-${player.id}` : undefined}
                                className={`h-10 w-full min-w-0 rounded-md border bg-white px-1 text-center text-base font-semibold outline-none focus:ring-2 dark:bg-zinc-950 dark:text-zinc-100 ${pointError ? 'border-rose-600 focus:ring-rose-100 dark:border-rose-400 dark:focus:ring-rose-900/40' : pointWarning ? 'border-amber-500 bg-amber-50 focus:ring-amber-100 dark:border-amber-500 dark:bg-amber-950/30 dark:focus:ring-amber-900/40' : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-100 dark:border-zinc-600 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40'}`}
                              />
                              <button type="button" onClick={() => stepPoint(player, 1)} aria-label="Tăng 1 điểm" title="Tăng 1 điểm" className="size-10 shrink-0 rounded-full border border-slate-300 bg-slate-50 text-xl text-slate-800 hover:bg-slate-100 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">+</button>
                            </>
                          ) : (
                            <output aria-label={`Điểm của ${player.name}: ${player.totalPoints}`} className="flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-md bg-slate-100 px-2 text-base font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
                              {player.totalPoints}
                            </output>
                          )}
                          <button type="button" onClick={() => toggleRowAction(player.id, actionBlocked)} aria-expanded={swipeOpen} aria-controls={`row-action-${player.id}`} aria-label={`Tùy chọn cho ${player.name}`} title={actionBlocked ? actionTitle : 'Tùy chọn'} className="size-10 shrink-0 rounded-md text-xl text-slate-600 hover:bg-slate-100 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-zinc-300 dark:hover:bg-zinc-800">⋯</button>
                        </div>
                        {player.active && pointError && <p id={`info-point-error-${player.id}`} className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-300">Chỉ nhập số nguyên.</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {duplicate && (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            Gợi ý tên khác: {cleanName(duplicate.name)}1 hoặc {cleanName(duplicate.name)}123.
          </p>
        )}
        {!hostValid && <p className="mt-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">Hãy chọn một người đang chơi làm Host.</p>}
        {!balanced && (
          <div role="status" className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">Tổng điểm đang lệch {formatSignedPoint(total)}.</p>
            <p className="mt-1">Cần điều chỉnh {formatSignedPoint(-total)} điểm để tổng trở về 0.</p>
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">Điểm của người đã nghỉ vẫn được tính vào tổng.</p>
          </div>
        )}
        {saveError && <p role="alert" className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-300">{saveError}</p>}
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-zinc-400">1 điểm = {formatVnd(pointValueVnd)}</p>
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="min-h-12 rounded-md border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">Cancel</button>
          <button type="submit" disabled={!canSave} className="min-h-12 rounded-md bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400">Lưu</button>
        </div>
      </footer>

      {helpOpen && (
        <Dialog onClose={() => setHelpOpen(false)} triggerRef={helpButton}>
              <section>
                <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Chỉnh sửa người chơi</h3>
                <p className="mt-1">Ở tab Đang chơi, bạn có thể chỉnh tên và điểm. Tên không được để trống, chứa emoji hoặc trùng với người khác.</p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Đổi Host</h3>
                <p className="mt-1">Chạm Player đang chơi để chọn làm Host. Host cũ tự chuyển thành Player; không thể tự tắt vai trò Host.</p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Chỉnh điểm</h3>
                <p className="mt-1">Nhập số điểm hoặc dùng nút − / +. Điểm phải là số nguyên và có thể âm.</p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Cân bằng điểm</h3>
                <p className="mt-1">Tổng điểm của tất cả người chơi phải bằng 0. Nếu tổng lệch, hãy chỉnh điểm của người đang chơi cho đến khi cân bằng.</p>
                <p className="mt-1">Điểm của người đã nghỉ vẫn được tính vào tổng.</p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Cho người chơi nghỉ</h3>
                <p className="mt-1">Vuốt hàng sang trái hoặc chạm ⋯, rồi chọn Xóa. Người chơi vẫn ở trong game và giữ nguyên điểm.</p>
                <p className="mt-1">Nếu còn người đang chơi khác, hãy chuyển Host trước khi cho Host hiện tại nghỉ.</p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Thêm người chơi trở lại</h3>
                <p className="mt-1">Ở tab Đã nghỉ, vuốt hàng hoặc chạm ⋯ rồi chọn Thêm lại. Người chơi quay về với tên và điểm trước đó.</p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Người chơi đã nghỉ</h3>
                <p className="mt-1">Tên, vai trò và điểm chỉ được xem. Hãy Thêm lại người chơi trước khi chỉnh sửa.</p>
              </section>
        </Dialog>
      )}
    </form>
  )
}
