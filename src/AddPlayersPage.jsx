import { useState } from 'react'
import { cleanName, createPlayer, getPlayerErrors, parseSavedPlayers, setHost } from './players.js'

const errorMessages = {
  empty: 'Vui lòng nhập tên người chơi.',
  invalid: 'Chỉ dùng chữ, số, dấu cách và dấu . - \' trong tên.',
  duplicate: 'Tên này đã có trong danh sách.',
}

function loadExistingPlayers() {
  try {
    return parseSavedPlayers(localStorage.getItem('players')) ?? []
  } catch {
    return []
  }
}

export default function AddPlayersPage({ onCancel, onSaved }) {
  const [existingPlayers, setExistingPlayers] = useState(loadExistingPlayers)
  const [newPlayers, setNewPlayers] = useState(() => [
    createPlayer(existingPlayers.some((player) => player.role === 'host') ? 'player' : 'host'),
  ])
  const [submitted, setSubmitted] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [saveError, setSaveError] = useState('')
  const hasExistingHost = existingPlayers.some((player) => player.role === 'host')
  const errors = getPlayerErrors(newPlayers, submitted, existingPlayers)
  const duplicates = newPlayers.filter((player) => errors.get(player.id) === 'duplicate')
  const duplicate = duplicates.find((player) => player.id === activeId) ?? duplicates.at(-1)
  const duplicateName = duplicate ? cleanName(duplicate.name) : ''

  function updateName(id, name) {
    setNewPlayers((current) => current.map((player) => player.id === id ? { ...player, name } : player))
    setActiveId(id)
    setSaveError('')
  }

  function selectHost(id) {
    if (!hasExistingHost) setNewPlayers((current) => setHost(current, id))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
    setSaveError('')

    const currentExistingPlayers = loadExistingPlayers()
    setExistingPlayers(currentExistingPlayers)
    const currentErrors = getPlayerErrors(newPlayers, true, currentExistingPlayers)
    if (currentErrors.size > 0) {
      const firstInvalid = newPlayers.find((player) => currentErrors.has(player.id))
      document.getElementById(`player-name-${firstInvalid.id}`)?.focus()
      return
    }

    const hostCount = [...currentExistingPlayers, ...newPlayers]
      .filter((player) => player.role === 'host').length
    if (hostCount !== 1) {
      setSaveError('Chủ bàn đã thay đổi. Vui lòng mở lại màn này để thêm người chơi.')
      return
    }

    const validatedNewPlayers = newPlayers.map((player) => ({
      id: player.id,
      name: cleanName(player.name),
      role: player.role,
      totalPoints: 0,
      active: true,
    }))

    try {
      localStorage.setItem('players', JSON.stringify([...currentExistingPlayers, ...validatedNewPlayers]))
      onSaved()
    } catch {
      setSaveError('Không thể lưu danh sách người chơi trên thiết bị này.')
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex min-h-16 max-w-3xl items-center px-4 sm:px-6">
          <h1 className="text-lg font-semibold sm:text-xl">Thêm người chơi</h1>
        </div>
      </header>

      <main data-page-scroll className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Danh sách người chơi</h2>
          <span className="text-xs text-slate-500 dark:text-zinc-400">{newPlayers.length} người</span>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <div className="grid grid-cols-[minmax(0,1fr)_4.75rem] gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <span>Tên người chơi</span>
            <span className="text-center">Vai trò</span>
          </div>
          {newPlayers.map((player, index) => {
            const error = errors.get(player.id)
            const showErrorText = error && (error !== 'duplicate' || player.id === activeId)
            const host = player.role === 'host'

            return (
              <div key={player.id} className="grid grid-cols-[minmax(0,1fr)_4.75rem] items-start gap-2 border-b border-slate-200 px-3 py-3 last:border-b-0 dark:border-zinc-700">
                <div className="min-w-0">
                  <label htmlFor={`player-name-${player.id}`} className="sr-only">Tên người chơi {index + 1}</label>
                  <input
                    id={`player-name-${player.id}`}
                    type="text"
                    autoComplete="off"
                    value={player.name}
                    onChange={(event) => updateName(player.id, event.target.value)}
                    onFocus={() => setActiveId(player.id)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={showErrorText ? `player-error-${player.id}` : undefined}
                    title={error === 'duplicate' && !showErrorText ? errorMessages.duplicate : undefined}
                    placeholder="Nhập tên người chơi"
                    className={`h-12 w-full min-w-0 rounded-md border bg-white px-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${error ? 'border-rose-600 focus:border-rose-600 focus:ring-rose-100 dark:border-rose-400 dark:focus:ring-rose-900/40' : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-100 dark:border-zinc-600 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40'}`}
                  />
                  {showErrorText && <p id={`player-error-${player.id}`} className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">{errorMessages[error]}</p>}
                </div>
                <button
                  type="button"
                  disabled={hasExistingHost}
                  onClick={() => selectHost(player.id)}
                  aria-label={`${player.name || `Người chơi ${index + 1}`}: ${host ? 'Chủ bàn' : 'Người chơi'}. ${hasExistingHost ? 'Bàn đã có chủ bàn' : host ? 'Đang là chủ bàn' : 'Chọn làm chủ bàn'}`}
                  title={hasExistingHost ? 'Bàn đã có chủ bàn' : host ? 'Chủ bàn' : 'Chọn làm chủ bàn'}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-md border px-1 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${hasExistingHost ? 'cursor-default' : 'hover:border-emerald-500 active:scale-95'} ${host ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-200' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}
                >
                  <span aria-hidden="true" className="text-lg leading-none">{host ? '♛' : '👤'}</span>
                  <span>{host ? 'Host' : 'Player'}</span>
                </button>
              </div>
            )
          })}
        </div>

        {duplicate && (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            Gợi ý tên khác: {duplicateName}1 hoặc {duplicateName}123.
          </p>
        )}

        <button
          type="button"
          onClick={() => setNewPlayers((current) => [...current, createPlayer()])}
          className="mt-4 flex min-h-12 w-full items-center justify-center rounded-md border border-dashed border-emerald-500 bg-white px-4 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-zinc-800"
        >
          + Thêm người chơi
        </button>
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-zinc-400">1 điểm = 1.000đ</p>
        {saveError && <p role="alert" className="mt-4 text-sm font-medium text-rose-700 dark:text-rose-300">{saveError}</p>}
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="min-h-12 rounded-md border border-slate-300 bg-white px-4 font-semibold text-slate-700 transition-colors hover:bg-slate-100 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">Cancel</button>
          <button type="submit" className="min-h-12 rounded-md bg-emerald-700 px-4 font-semibold text-white transition-colors hover:bg-emerald-800 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400">OK</button>
        </div>
      </footer>
    </form>
  )
}
