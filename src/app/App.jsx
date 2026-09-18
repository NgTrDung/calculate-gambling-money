import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import AddPlayersPage from '../features/players/AddPlayersPage.jsx'
import Dialog from '../components/ui/Dialog.jsx'
import EndRoundPage from '../features/rounds/EndRoundPage.jsx'
import { clearGameData } from '../storage/gameStorage.js'
import { DEFAULT_POINT_VALUE_VND, formatVnd, formatVndNumber, loadPointValueVnd, parsePointValueInput, savePointValueVnd } from '../features/settings/gameSettings.js'
import PlayerInfoPage from '../features/players/PlayerInfoPage.jsx'
import RankingPage from '../features/ranking/RankingPage.jsx'
import RoundHistoryPage from '../features/history/RoundHistoryPage.jsx'

const features = [
  {
    number: '01',
    title: 'Thêm người chơi',
    description: 'Thêm người mới vào bàn chơi.',
    accent: 'bg-emerald-500',
  },
  {
    number: '02',
    title: 'Thông tin người chơi',
    description: 'Xem danh sách người chơi và point hiện tại.',
    accent: 'bg-sky-500',
  },
  {
    number: '03',
    title: 'Kết thúc ván',
    description: 'Nhập kết quả và tính point sau mỗi ván.',
    accent: 'bg-amber-500',
  },
  {
    number: '04',
    title: 'Lịch sử ván đánh',
    description: 'Xem lại kết quả các ván đã chơi.',
    accent: 'bg-rose-500',
  },
  {
    number: '05',
    title: 'BXH',
    description: 'Xem thứ hạng theo tổng point.',
    accent: 'bg-violet-500',
  },
  {
    number: '06',
    title: 'Xóa dữ liệu',
    description: 'Xóa người chơi, điểm và lịch sử ván đã lưu.',
    accent: 'bg-rose-700',
    destructive: true,
  },
]

const GAME_TYPES = [
  { id: 'xi-zach', label: 'Xì Zách', available: true },
  { id: 'tien-len', label: 'Tiến Lên', available: false },
]

const POINT_VALUE_PRESETS = [1000, 2000, 5000, 10000]

function getInitialTheme() {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Use the system preference when storage is unavailable.
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme)
  const [pointValueVnd, setPointValueVnd] = useState(loadPointValueVnd)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pointValueDraft, setPointValueDraft] = useState('')
  const [pointValueFocused, setPointValueFocused] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [page, setPage] = useState('main')
  const [selectedGameType, setSelectedGameType] = useState('xi-zach')
  const [gameMenuOpen, setGameMenuOpen] = useState(false)
  const [comingSoonOpen, setComingSoonOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const gameMenu = useRef(null)
  const gameButton = useRef(null)
  const deleteButton = useRef(null)
  const settingsButton = useRef(null)
  const selectedGame = GAME_TYPES.find((game) => game.id === selectedGameType)
  const parsedPointValue = parsePointValueInput(pointValueDraft)

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // The toggle still works without persistent storage.
    }
  }, [theme])

  useEffect(() => {
    if (!gameMenuOpen) return
    gameMenu.current?.querySelector('[role="menuitemradio"][aria-checked="true"]')?.focus({ preventScroll: true })
    const closeOutside = (event) => {
      if (!gameMenu.current?.contains(event.target)) setGameMenuOpen(false)
    }
    const closeOnFocusOutside = (event) => {
      if (!gameMenu.current?.contains(event.target)) setGameMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('focusin', closeOnFocusOutside)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('focusin', closeOnFocusOutside)
    }
  }, [gameMenuOpen])

  function chooseGame(game) {
    setGameMenuOpen(false)
    gameButton.current?.focus({ preventScroll: true })
    if (game.available) setSelectedGameType(game.id)
    else setComingSoonOpen(true)
  }

  function handleGameMenuKeyDown(event) {
    if (event.key === 'Escape') {
      setGameMenuOpen(false)
      gameButton.current?.focus()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const options = [...event.currentTarget.querySelectorAll('[role="menuitemradio"]')]
    const current = options.indexOf(document.activeElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 :
      event.key === 'ArrowDown' ? (current + 1) % options.length : (current - 1 + options.length) % options.length
    options[next]?.focus()
    event.preventDefault()
  }

  function closeDelete() {
    setDeleteOpen(false)
    setDeleteError('')
  }

  function openSettings() {
    setPointValueDraft(String(pointValueVnd))
    setPointValueFocused(false)
    setSettingsError('')
    setSettingsOpen(true)
  }

  function saveSettings(event) {
    event.preventDefault()
    if (parsedPointValue === null) return
    try {
      savePointValueVnd(localStorage, parsedPointValue)
      setPointValueVnd(parsedPointValue)
      setSettingsOpen(false)
    } catch {
      setSettingsError('Không thể lưu quy đổi điểm trên thiết bị này.')
    }
  }

  function confirmDelete() {
    try {
      clearGameData(localStorage)
      setPointValueVnd(DEFAULT_POINT_VALUE_VND)
      setSelectedFeature(null)
      closeDelete()
    } catch {
      setDeleteError('Không thể xóa dữ liệu trên thiết bị này. Vui lòng thử lại.')
    }
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      {page === 'addPlayers' ? (
        <AddPlayersPage pointValueVnd={pointValueVnd} onCancel={() => setPage('main')} onSaved={() => setPage('main')} />
      ) : page === 'playerInfo' ? (
        <PlayerInfoPage pointValueVnd={pointValueVnd} onCancel={() => setPage('main')} onSaved={() => setPage('main')} />
      ) : page === 'endRound' ? (
        <EndRoundPage pointValueVnd={pointValueVnd} onCancel={() => setPage('main')} onSaved={() => setPage('main')} />
      ) : page === 'roundHistory' ? (
        <RoundHistoryPage onBack={() => setPage('main')} />
      ) : page === 'ranking' ? (
        <RankingPage pointValueVnd={pointValueVnd} onBack={() => setPage('main')} />
      ) : (
      <>
      <header className="shrink-0 border-b border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Chế độ tối"
            title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="relative h-11 w-20 shrink-0 rounded-full border border-slate-300 bg-slate-100 transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-amber-500">☀</span>
            <span aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-500 dark:text-slate-300">☾</span>
            <span
              aria-hidden="true"
              className={`absolute left-1 top-1 flex size-9 items-center justify-center rounded-full bg-white text-xl shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none dark:bg-zinc-600 ${theme === 'dark' ? 'translate-x-9 text-slate-100' : 'translate-x-0 text-amber-500'}`}
            >
              {theme === 'dark' ? '☾' : '☀'}
            </span>
          </button>
          <div ref={gameMenu} className="relative shrink-0">
            <button
              ref={gameButton}
              type="button"
              aria-haspopup="menu"
              aria-expanded={gameMenuOpen}
              aria-controls="game-type-menu"
              onClick={() => setGameMenuOpen((open) => !open)}
              className="flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Loại Bài <span aria-hidden="true" className="text-base">▾</span>
            </button>
            {gameMenuOpen && (
              <div id="game-type-menu" role="menu" aria-label="Loại Bài" onKeyDown={handleGameMenuKeyDown} className="absolute right-0 top-full z-30 mt-2 w-40 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                {GAME_TYPES.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selectedGameType === game.id}
                    onClick={() => chooseGame(game)}
                    className={`flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600 dark:hover:bg-zinc-800 ${selectedGameType === game.id ? 'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'text-slate-700 dark:text-zinc-200'}`}
                  >
                    <span aria-hidden="true" className="w-4 shrink-0">{selectedGameType === game.id ? '✓' : ''}</span>
                    {game.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
          <div className="mt-3 min-w-0">
            <p className="text-[11px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">Cùng bạn bè</p>
            <h1 className="text-lg font-semibold leading-tight">Bàn chơi {selectedGame.label}</h1>
          </div>
        </div>
      </header>

      <main data-page-scroll className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl font-semibold sm:text-2xl">Bàn của bạn</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">Theo dõi người chơi và từng ván bài.</p>
        </div>

        <button ref={settingsButton} type="button" onClick={openSettings} className="mb-6 flex min-h-16 w-full items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-left hover:border-emerald-500 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500 dark:hover:bg-zinc-800 sm:mb-8">
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Quy đổi điểm</span>
            <span className="mt-0.5 block text-sm text-slate-600 dark:text-zinc-300">1 điểm = {formatVnd(pointValueVnd)}</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-xl text-slate-400 dark:text-zinc-500">›</span>
        </button>

        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {features.map((feature, index) => {
            const selected = selectedFeature === index

            return (
              <button
                key={feature.number}
                ref={feature.destructive ? deleteButton : undefined}
                type="button"
                aria-pressed={index < 2 || feature.destructive ? undefined : selected}
                onClick={() => {
                  if (index === 0) setPage('addPlayers')
                  else if (index === 1) setPage('playerInfo')
                  else if (index === 2) setPage('endRound')
                  else if (index === 3) setPage('roundHistory')
                  else if (index === 4) setPage('ranking')
                  else if (feature.destructive) setDeleteOpen(true)
                  else setSelectedFeature(selected ? null : index)
                }}
                className={`min-h-32 w-full rounded-lg border p-5 text-left shadow-sm transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:min-h-40 sm:p-6 ${index === 0 || feature.destructive ? 'md:col-span-2 md:mx-auto md:w-[calc(50%-0.5rem)]' : ''} ${feature.destructive ? 'mt-3 border-rose-300 bg-rose-50 hover:border-rose-500 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:hover:border-rose-600 dark:hover:bg-rose-950/50 sm:mt-4' : selected ? 'border-emerald-600 bg-white ring-1 ring-emerald-600 dark:border-emerald-400 dark:bg-zinc-900 dark:ring-emerald-400' : 'border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80'}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className={`block h-1.5 w-10 rounded-full ${feature.accent}`} aria-hidden="true" />
                  <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">{feature.number}</span>
                </span>
                <span className={`mt-4 block text-base font-semibold leading-snug sm:text-lg ${feature.destructive ? 'text-rose-900 dark:text-rose-200' : ''}`}>{feature.title}</span>
                <span className={`mt-1.5 block text-sm leading-relaxed ${feature.destructive ? 'text-rose-800 dark:text-rose-300' : 'text-slate-600 dark:text-zinc-400'}`}>{feature.description}</span>
                {!feature.destructive && <span className={`mt-3 block text-xs font-medium text-emerald-700 dark:text-emerald-400 ${selected ? 'visible' : 'invisible'}`} aria-hidden={!selected}>Đang chọn</span>}
              </button>
            )
          })}
        </div>
        </div>
      </main>
      {settingsOpen && (
        <Dialog onClose={() => setSettingsOpen(false)} triggerRef={settingsButton} title="Quy đổi điểm" closeAriaLabel="Đóng quy đổi điểm" footer={
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setSettingsOpen(false)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">Cancel</button>
            <button type="submit" form="point-value-form" disabled={parsedPointValue === null} className="min-h-11 rounded-md bg-emerald-700 px-3 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400">Lưu</button>
          </div>
        }>
          <form id="point-value-form" onSubmit={saveSettings} noValidate>
            <label htmlFor="point-value-input" className="block font-semibold text-slate-900 dark:text-zinc-100">Giá trị của 1 điểm bằng VNĐ</label>
            <div className="mt-2 flex items-center gap-3">
              <span className="shrink-0">1 điểm =</span>
              <input id="point-value-input" type="text" inputMode="numeric" autoComplete="off" value={pointValueFocused ? pointValueDraft : parsedPointValue === null ? pointValueDraft : formatVndNumber(parsedPointValue)} onChange={(event) => { setPointValueDraft(event.target.value); setSettingsError('') }} onFocus={() => setPointValueFocused(true)} onBlur={() => setPointValueFocused(false)} aria-invalid={parsedPointValue === null} aria-describedby={parsedPointValue === null ? 'point-value-error' : undefined} className={`h-11 min-w-0 flex-1 rounded-md border bg-white px-3 text-base font-semibold tabular-nums text-slate-900 outline-none focus:ring-2 dark:bg-zinc-950 dark:text-zinc-100 ${parsedPointValue === null ? 'border-rose-600 focus:ring-rose-100 dark:border-rose-400 dark:focus:ring-rose-900/40' : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-100 dark:border-zinc-600 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40'}`} />
              <span className="shrink-0 font-medium">VNĐ</span>
            </div>
            {parsedPointValue === null && <p id="point-value-error" className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">Vui lòng nhập số nguyên lớn hơn 0.</p>}
            <p className="mt-5 font-semibold text-slate-900 dark:text-zinc-100">Chọn nhanh</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {POINT_VALUE_PRESETS.map((preset) => <button key={preset} type="button" aria-pressed={parsedPointValue === preset} onClick={() => { setPointValueDraft(String(preset)); setSettingsError('') }} className={`min-h-11 rounded-md border px-2 text-sm font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${parsedPointValue === preset ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'}`}>{formatVndNumber(preset)}</button>)}
            </div>
            {settingsError && <p role="alert" className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-300">{settingsError}</p>}
          </form>
        </Dialog>
      )}
      {comingSoonOpen && (
        <Dialog onClose={() => setComingSoonOpen(false)} triggerRef={gameButton} title="Tiến Lên" closeAriaLabel="Đóng thông báo Tiến Lên">
          <p className="font-semibold text-slate-900 dark:text-zinc-100">Tính năng đang được phát triển.</p>
          <p>Chế độ Tiến Lên sẽ được bổ sung trong phiên bản sau.</p>
          <p>Hiện tại bạn có thể tiếp tục sử dụng Xì Zách.</p>
        </Dialog>
      )}
      {deleteOpen && (
        <Dialog
          onClose={closeDelete}
          triggerRef={deleteButton}
          title="Xác nhận xóa dữ liệu"
          closeAriaLabel="Hủy xóa dữ liệu"
          footer={
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={closeDelete} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">Cancel</button>
              <button type="button" onClick={confirmDelete} className="min-h-11 rounded-md bg-rose-700 px-3 font-semibold text-white hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 dark:bg-rose-500 dark:text-zinc-950 dark:hover:bg-rose-400">OK</button>
            </div>
          }
        >
          <p>Bạn có chắc muốn xóa toàn bộ dữ liệu bàn chơi hiện tại?</p>
          <p>Người chơi, điểm và lịch sử các ván đã lưu sẽ bị xóa và <strong className="font-semibold text-rose-700 dark:text-rose-300">không thể khôi phục.</strong></p>
          {deleteError && <p role="alert" className="font-medium text-rose-700 dark:text-rose-300">{deleteError}</p>}
        </Dialog>
      )}
      </>
      )}
    </div>
  )
}
