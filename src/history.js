import { parsePointInput } from './players.js'

export const HISTORY_KEY = 'roundHistory'
export const HISTORY_PAGE_SIZE = 5

export function parseRoundHistory(raw) {
  if (!raw) return []
  try {
    const history = JSON.parse(raw)
    if (!Array.isArray(history)) return []
    return history.filter((round) => {
      if (!round || typeof round.id !== 'string' || !round.id ||
        typeof round.completedAt !== 'string' || !Number.isFinite(Date.parse(round.completedAt)) ||
        !Array.isArray(round.players) || round.players.length < 2) return false
      const ids = new Set()
      let hosts = 0
      let total = 0
      for (const player of round.players) {
        if (!player || typeof player.playerId !== 'string' || !player.playerId ||
          typeof player.name !== 'string' || !player.name ||
          (player.role !== 'host' && player.role !== 'player') ||
          !Number.isSafeInteger(player.point) ||
          (player.totalPointsAfterRound !== undefined && !Number.isSafeInteger(player.totalPointsAfterRound)) ||
          ids.has(player.playerId)) return false
        ids.add(player.playerId)
        if (player.role === 'host') hosts += 1
        total += player.point
        if (!Number.isSafeInteger(total)) return false
      }
      return hosts === 1 && total === 0
    })
  } catch {
    return []
  }
}

export function loadRoundHistory(storage = localStorage) {
  try {
    return parseRoundHistory(storage.getItem(HISTORY_KEY))
  } catch {
    return []
  }
}

export function createRoundHistory(players, updatedPlayers, pointDrafts, hostRoundPoints, id = crypto.randomUUID(), completedAt = new Date().toISOString()) {
  const totals = new Map(updatedPlayers.map((player) => [player.id, player.totalPoints]))
  return {
    id,
    completedAt,
    players: players.filter((player) => player.active).map((player) => ({
      playerId: player.id,
      name: player.name,
      role: player.role,
      point: player.role === 'host' ? hostRoundPoints : parsePointInput(pointDrafts[player.id]),
      totalPointsAfterRound: totals.get(player.id),
    })),
  }
}

export function saveCompletedRound(storage, updatedPlayers, round) {
  const previousHistory = storage.getItem(HISTORY_KEY)
  const history = parseRoundHistory(previousHistory)
  storage.setItem(HISTORY_KEY, JSON.stringify([...history, round]))
  try {
    storage.setItem('players', JSON.stringify(updatedPlayers))
  } catch (error) {
    if (previousHistory === null) storage.removeItem(HISTORY_KEY)
    else storage.setItem(HISTORY_KEY, previousHistory)
    throw error
  }
}

export function sortRoundHistory(history) {
  return [...history].sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
}

export function getPlayerHistoryPoints(history, playerId) {
  const ordered = [...history].sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt))
  let cumulative = 0
  return ordered.flatMap((round, index) => {
    const player = round.players.find((item) => item.playerId === playerId)
    if (!player) return []
    cumulative = player.totalPointsAfterRound ?? cumulative + player.point
    return [{ round: index + 1, completedAt: round.completedAt, point: player.point, totalPoints: cumulative }]
  })
}

export function paginateRoundHistory(history, requestedPage) {
  const totalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages)
  const start = (currentPage - 1) * HISTORY_PAGE_SIZE
  return {
    totalPages,
    currentPage,
    items: history.slice(start, start + HISTORY_PAGE_SIZE),
    start,
  }
}

export function formatSignedPoint(value) {
  return value > 0 ? `+${value}` : String(value)
}

export function formatRoundDate(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}
