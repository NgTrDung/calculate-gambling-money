import { useEffect, useRef, useState } from 'react'
import Dialog from '../../components/ui/Dialog.jsx'
import { formatRoundDate, formatSignedPoint, getPlayerHistoryPoints, loadRoundHistory } from '../history/history.js'
import { parseSavedPlayers } from '../players/players.js'
import { buildRankingText, formatPointMoneyK, getRankingChartLayout, RANKING_CHART, sortPlayersByPoints } from './ranking.js'
import { downloadRankingPng } from './rankingExport.js'

function loadPlayers() {
  try {
    return parseSavedPlayers(localStorage.getItem('players')) ?? []
  } catch {
    return []
  }
}

function pointColor(value) {
  if (value > 0) return 'text-emerald-700 dark:text-emerald-400'
  if (value < 0) return 'text-rose-700 dark:text-rose-400'
  return 'text-slate-600 dark:text-zinc-300'
}

function RankingChart({ players, pointValueVnd }) {
  const [selectedId, setSelectedId] = useState(null)
  const selected = players.find((player) => player.id === selectedId)
  const { low, high, y, zeroY, width } = getRankingChartLayout(players)

  return (
    <div>
      <div role="group" aria-label="Biểu đồ điểm hiện tại theo thứ tự tăng dần" className="overflow-x-auto overscroll-x-contain border-b border-slate-200 dark:border-zinc-700">
        <div className="relative grid h-[284px]" style={{ width, minWidth: '100%', gridTemplateColumns: `${RANKING_CHART.axisWidth}px repeat(${players.length}, minmax(${RANKING_CHART.slotWidth}px, 1fr))` }}>
          <div className="relative text-right text-[11px] font-medium tabular-nums text-slate-500 dark:text-zinc-400">
            <span className="absolute right-1 top-0">Điểm</span>
            {high !== 0 && <span className="absolute right-1" style={{ top: y(high) - 8 }}>{formatSignedPoint(high)}</span>}
            <span className="absolute right-1" style={{ top: zeroY - 8 }}>0</span>
            {low !== 0 && <span className="absolute right-1" style={{ top: y(low) - 8 }}>{formatSignedPoint(low)}</span>}
          </div>
          <span aria-hidden="true" className="pointer-events-none absolute right-0 border-t-2 border-slate-500 dark:border-zinc-400" style={{ left: RANKING_CHART.axisWidth, top: zeroY }} />
          {players.map((player) => {
            const pointY = y(player.totalPoints)
            const barTop = player.totalPoints === 0 ? zeroY - 2 : Math.min(pointY, zeroY)
            const barHeight = player.totalPoints === 0 ? 4 : Math.abs(pointY - zeroY)
            const barColor = player.totalPoints > 0 ? 'bg-emerald-600 dark:bg-emerald-400' : player.totalPoints < 0 ? 'bg-rose-600 dark:bg-rose-400' : 'bg-slate-500 dark:bg-zinc-300'
            const money = formatPointMoneyK(player.totalPoints, pointValueVnd)
            const tooltip = `${player.name}: Điểm: ${formatSignedPoint(player.totalPoints)}, Quy đổi: ${money}, ${player.active ? 'Đang chơi' : 'Đã nghỉ'}`
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => setSelectedId(player.id)}
                onFocus={() => setSelectedId(player.id)}
                onMouseEnter={() => setSelectedId(player.id)}
                aria-label={tooltip}
                title={tooltip}
                className="relative h-[284px] min-w-0 px-1 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600"
              >
                <span aria-hidden="true" className={`absolute left-1/2 w-8 -translate-x-1/2 rounded-t-sm ${barColor}`} style={{ top: barTop, height: barHeight }} />
                <span className="absolute inset-x-1 top-[220px] block truncate text-xs font-medium text-slate-800 dark:text-zinc-200">{player.name}</span>
                <span className={`absolute inset-x-1 top-[242px] block truncate text-xs font-semibold tabular-nums ${pointColor(player.totalPoints)}`}>{money}</span>
              </button>
            )
          })}
        </div>
      </div>
      {selected && (
        <p aria-live="polite" className="mt-3 text-sm text-slate-700 dark:text-zinc-200">
          <span className="font-semibold">{selected.name}</span> · Điểm: {formatSignedPoint(selected.totalPoints)} · Quy đổi: {formatPointMoneyK(selected.totalPoints, pointValueVnd)} · {selected.active ? 'Đang chơi' : 'Đã nghỉ'}
        </p>
      )}
    </div>
  )
}

function PlayerLineChart({ player, points }) {
  const [selectedIndex, setSelectedIndex] = useState(points.length - 1)
  const selected = points[selectedIndex]
  const low = Math.min(0, ...points.map((item) => item.totalPoints))
  const high = Math.max(0, ...points.map((item) => item.totalPoints))
  const domainLow = low === high ? -1 : low
  const domainHigh = low === high ? 1 : high
  const left = 42
  const top = 20
  const plotWidth = Math.max(180, (points.length - 1) * 56)
  const plotHeight = 176
  const width = left + plotWidth + 16
  const x = (index) => left + (points.length === 1 ? plotWidth / 2 : index * plotWidth / (points.length - 1))
  const y = (value) => top + (domainHigh - value) / (domainHigh - domainLow) * plotHeight
  const polyline = points.map((item, index) => `${x(index)},${y(item.totalPoints)}`).join(' ')

  return (
    <div>
      <div role="group" aria-label={`Biểu đồ tổng điểm sau từng ván của ${player.name}`} className="overflow-x-auto overscroll-x-contain rounded-md border border-slate-200 dark:border-zinc-700">
        <svg width={width} height="244" className="block text-sky-700 dark:text-sky-300">
          <line x1={left} x2={width - 16} y1={y(0)} y2={y(0)} className="stroke-slate-500 dark:stroke-zinc-400" strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1={left} x2={left} y1={top} y2={top + plotHeight} className="stroke-slate-300 dark:stroke-zinc-600" />
          {high !== 0 && <text x={left - 6} y={top + 4} textAnchor="end" className="fill-slate-500 text-[10px] dark:fill-zinc-400">{formatSignedPoint(high)}</text>}
          <text x={left - 6} y={y(0) + 4} textAnchor="end" className="fill-slate-500 text-[10px] dark:fill-zinc-400">0</text>
          {low !== 0 && <text x={left - 6} y={top + plotHeight + 4} textAnchor="end" className="fill-slate-500 text-[10px] dark:fill-zinc-400">{formatSignedPoint(low)}</text>}
          {points.length > 1 && <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
          {points.map((item, index) => (
            <g
              key={`${item.round}-${index}`}
              role="button"
              tabIndex="0"
              data-point-index={index}
              aria-label={`Ván ${item.round}: điểm ván ${formatSignedPoint(item.point)}, tổng sau ván ${formatSignedPoint(item.totalPoints)}`}
              onClick={() => setSelectedIndex(index)}
              onFocus={() => setSelectedIndex(index)}
              onMouseEnter={() => setSelectedIndex(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setSelectedIndex(index)
                }
              }}
              className="group cursor-pointer outline-none"
            >
              <circle cx={x(index)} cy={y(item.totalPoints)} r="20" fill="transparent" />
              <circle cx={x(index)} cy={y(item.totalPoints)} r="11" fill="none" strokeWidth="2" className={selectedIndex === index ? 'stroke-sky-500 dark:stroke-sky-200' : 'stroke-transparent group-focus-visible:stroke-sky-500 dark:group-focus-visible:stroke-sky-200'} />
              <circle cx={x(index)} cy={y(item.totalPoints)} r="6" fill="currentColor" stroke="white" strokeWidth="2" />
              <text x={x(index)} y="225" textAnchor="middle" className="fill-slate-500 text-[10px] dark:fill-zinc-400">V{item.round}</text>
              <title>{`Ván ${item.round}: ${formatSignedPoint(item.totalPoints)} điểm`}</title>
            </g>
          ))}
        </svg>
      </div>
      {selected && (
        <div aria-live="polite" className="mt-3 text-sm text-slate-700 dark:text-zinc-200">
          <p className="font-semibold">Ván {selected.round} · {formatRoundDate(selected.completedAt)}</p>
          <p className="mt-1">Điểm ván: {formatSignedPoint(selected.point)} · Tổng sau ván: {formatSignedPoint(selected.totalPoints)}</p>
        </div>
      )}
    </div>
  )
}

export default function RankingPage({ pointValueVnd, onBack }) {
  const [players] = useState(loadPlayers)
  const [history] = useState(loadRoundHistory)
  const [tab, setTab] = useState('ranking')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [outputType, setOutputType] = useState('text')
  const [feedback, setFeedback] = useState('')
  const [downloadBusy, setDownloadBusy] = useState(false)
  const selectedTrigger = useRef(null)
  const feedbackTimer = useRef(null)
  const ranked = sortPlayersByPoints(players)
  const points = selectedPlayer ? getPlayerHistoryPoints(history, selectedPlayer.id) : []

  useEffect(() => () => window.clearTimeout(feedbackTimer.current), [])

  function showFeedback(message) {
    window.clearTimeout(feedbackTimer.current)
    setFeedback(message)
    feedbackTimer.current = window.setTimeout(() => setFeedback(''), 2500)
  }

  async function handleOutput() {
    if (ranked.length === 0 || downloadBusy) return
    if (outputType === 'text') {
      try {
        await navigator.clipboard.writeText(buildRankingText(ranked, pointValueVnd))
        showFeedback('Đã copy')
      } catch {
        showFeedback('Không thể copy. Vui lòng thử lại.')
      }
      return
    }
    setDownloadBusy(true)
    try {
      await downloadRankingPng(ranked, pointValueVnd, document.documentElement.classList.contains('dark'))
      showFeedback('Đã tải ảnh')
    } catch {
      showFeedback('Không thể tải ảnh. Vui lòng thử lại.')
    } finally {
      setDownloadBusy(false)
    }
  }

  function openPlayer(player, trigger) {
    selectedTrigger.current = trigger
    setSelectedPlayer(player)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex min-h-16 max-w-4xl items-center px-4 sm:px-6">
          <h1 className="text-lg font-semibold sm:text-xl">BXH</h1>
        </div>
      </header>

      <main data-page-scroll className="mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-8">
        <div role="tablist" aria-label="BXH" className="grid grid-cols-2 border-b border-slate-200 dark:border-zinc-700">
          {[["ranking", "Xếp hạng"], ["players", "Chi tiết người chơi"]].map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={tab === value} aria-controls="ranking-panel" onClick={() => setTab(value)} className={`min-h-12 border-b-2 px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${tab === value ? 'border-emerald-600 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'}`}>{label}</button>
          ))}
        </div>

        <div id="ranking-panel" role="tabpanel" className="mt-5">
          {tab === 'ranking' ? (
            <>
              <div className="mb-5 flex flex-wrap items-end gap-3 border-b border-slate-200 pb-4 dark:border-zinc-700">
                <fieldset className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2">
                  <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-zinc-200">Định dạng</legend>
                  <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700 dark:text-zinc-200">
                    <input type="radio" name="ranking-output" value="text" checked={outputType === 'text'} disabled={downloadBusy} onChange={() => { setOutputType('text'); setFeedback('') }} className="size-4 accent-emerald-700 dark:accent-emerald-400" />
                    Văn bản
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700 dark:text-zinc-200">
                    <input type="radio" name="ranking-output" value="image" checked={outputType === 'image'} disabled={downloadBusy} onChange={() => { setOutputType('image'); setFeedback('') }} className="size-4 accent-emerald-700 dark:accent-emerald-400" />
                    Hình ảnh
                  </label>
                </fieldset>
                <button type="button" disabled={downloadBusy || ranked.length === 0} onClick={handleOutput} className="min-h-11 w-full rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400 sm:w-auto">{downloadBusy ? 'Đang tạo ảnh...' : outputType === 'text' ? 'Copy' : 'Download'}</button>
              </div>
              {feedback && <p role="status" className="mb-4 text-sm font-medium text-slate-700 dark:text-zinc-200">{feedback}</p>}
              {players.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">Chưa có dữ liệu người chơi.</p>
              ) : <RankingChart players={ranked} pointValueVnd={pointValueVnd} />}
            </>
          ) : players.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">Chưa có dữ liệu người chơi.</p>
          ) : (
            <div className="space-y-3">
              {players.map((player) => (
                <button key={player.id} type="button" onClick={(event) => openPlayer(player, event.currentTarget)} className="flex min-h-20 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left hover:border-emerald-500 hover:bg-emerald-50 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-emerald-500 dark:hover:bg-zinc-800">
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold text-slate-900 dark:text-zinc-100">{player.name}</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-zinc-400"><span className={`font-semibold ${pointColor(player.totalPoints)}`}>{formatSignedPoint(player.totalPoints)} điểm</span> · {player.active ? 'Đang chơi' : 'Đã nghỉ'}</span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-2xl text-slate-400 dark:text-zinc-500">›</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <button type="button" onClick={onBack} className="min-h-12 w-full rounded-md border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">Back</button>
        </div>
      </footer>

      {selectedPlayer && (
        <Dialog onClose={() => setSelectedPlayer(null)} triggerRef={selectedTrigger} title="Lịch sử điểm" closeAriaLabel="Đóng lịch sử điểm">
          <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{selectedPlayer.name}</p>
          {points.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-zinc-300">Chưa có dữ liệu ván đấu cho người chơi này.</p>
          ) : (
            <PlayerLineChart key={selectedPlayer.id} player={selectedPlayer} points={points} />
          )}
        </Dialog>
      )}
    </div>
  )
}
