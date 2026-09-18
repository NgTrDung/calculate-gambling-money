import { parsePointInput, totalPoints } from '../players/players.js'

export function calculateRound(players, pointDrafts) {
  const roundPlayers = players.filter((player) => player.active && player.role === 'player')
  const hosts = players.filter((player) => player.active && player.role === 'host')
  const deltas = new Map()
  let playerRoundTotal = 0

  for (const player of roundPlayers) {
    const point = parsePointInput(pointDrafts[player.id] ?? '0')
    if (point === null) return { error: 'invalid' }
    deltas.set(player.id, point)
    playerRoundTotal += point
    if (!Number.isSafeInteger(playerRoundTotal)) return { error: 'range' }
  }

  if (roundPlayers.length === 0) return { error: 'empty' }
  if (hosts.length !== 1) return { error: 'host' }

  const hostRoundPoints = playerRoundTotal === 0 ? 0 : -playerRoundTotal
  const updatedPlayers = players.map((player) => {
    if (!player.active) return player
    const delta = player.role === 'host' ? hostRoundPoints : deltas.get(player.id)
    return { ...player, totalPoints: player.totalPoints + delta }
  })
  if (updatedPlayers.some((player) => !Number.isSafeInteger(player.totalPoints))) return { error: 'range' }

  const projectedTotal = totalPoints(updatedPlayers)
  if (!Number.isSafeInteger(projectedTotal)) return { error: 'range' }
  if (projectedTotal !== 0) return { error: 'balance', projectedTotal, hostRoundPoints }

  return { error: null, updatedPlayers, projectedTotal, hostRoundPoints }
}
