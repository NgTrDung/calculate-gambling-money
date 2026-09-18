import { formatSignedPoint } from '../history/history.js'
import { pointToVnd } from '../settings/gameSettings.js'

export const RANKING_CHART = { axisWidth: 40, slotWidth: 72, height: 284, plotTop: 30, plotHeight: 170 }

export function sortPlayersByPoints(players) {
  return [...players].sort((a, b) => a.totalPoints - b.totalPoints ||
    a.name.localeCompare(b.name, 'vi-VN') || a.id.localeCompare(b.id))
}

export function formatMoneyK(valueVnd) {
  if (valueVnd === 0) return '0k'
  const absolute = Math.abs(valueVnd)
  const whole = Math.trunc(absolute / 1000)
  const fraction = String(absolute % 1000).padStart(3, '0').replace(/0+$/, '')
  return `${valueVnd > 0 ? '+' : '-'}${whole}${fraction ? `.${fraction}` : ''}k`
}

export function formatPointMoneyK(points, pointValueVnd) {
  const valueVnd = pointToVnd(points, pointValueVnd)
  return valueVnd === null ? '—' : formatMoneyK(valueVnd)
}

export function buildRankingText(sortedPlayers, pointValueVnd) {
  return sortedPlayers.map((player) => `${player.name} | ${formatSignedPoint(player.totalPoints)} | ${formatPointMoneyK(player.totalPoints, pointValueVnd)}`).join('\n')
}

export function getRankingChartLayout(players) {
  const { axisWidth, slotWidth, plotTop, plotHeight } = RANKING_CHART
  const { low, high } = players.reduce((range, player) => ({
    low: Math.min(range.low, player.totalPoints),
    high: Math.max(range.high, player.totalPoints),
  }), { low: 0, high: 0 })
  const domainLow = low === high ? -1 : low
  const domainHigh = low === high ? 1 : high
  const y = (value) => plotTop + (domainHigh - value) / (domainHigh - domainLow) * plotHeight
  return {
    low,
    high,
    y,
    zeroY: y(0),
    width: Math.max(300, axisWidth + players.length * slotWidth),
  }
}
