const allowedName = /^[\p{L}\p{M}\p{N}]+(?:[ .'-][\p{L}\p{M}\p{N}]+)*$/u

export function createPlayer(role = 'player') {
  return { id: crypto.randomUUID(), name: '', role, totalPoints: 0, active: true }
}

export function cleanName(name) {
  return name.trim().replace(/\s+/gu, ' ').normalize('NFC')
}

export function getPlayerErrors(players, showEmpty = false, existingPlayers = []) {
  const errors = new Map()
  const groups = new Map()
  const existingNames = new Set(existingPlayers.map((player) =>
    cleanName(player.name).toLocaleLowerCase('vi-VN')
  ))

  for (const player of players) {
    const name = cleanName(player.name)
    if (!name) {
      if (showEmpty) errors.set(player.id, 'empty')
      continue
    }
    if (!allowedName.test(name)) {
      errors.set(player.id, 'invalid')
      continue
    }

    const key = name.toLocaleLowerCase('vi-VN')
    groups.set(key, [...(groups.get(key) ?? []), player.id])
  }

  for (const [name, ids] of groups) {
    if (ids.length > 1 || existingNames.has(name)) {
      ids.forEach((id) => errors.set(id, 'duplicate'))
    }
  }

  return errors
}

export function setHost(players, id) {
  if (!players.some((player) => player.id === id && player.active !== false)) return players

  return players.map((player) => ({
    ...player,
    role: player.id === id ? 'host' : 'player',
  }))
}

export function retirePlayer(players, id) {
  const target = players.find((player) => player.id === id && player.active)
  if (!target) return players

  const activeCount = players.filter((player) => player.active).length
  if (target.role === 'host' && activeCount > 1) return players

  return players.map((player) => player.id === id
    ? { ...player, active: false, role: 'player' }
    : player)
}

export function restorePlayer(players, id) {
  const target = players.find((player) => player.id === id && !player.active)
  if (!target) return players

  const hasActiveHost = players.some((player) => player.active && player.role === 'host')
  return players.map((player) => player.id === id
    ? { ...player, active: true, role: hasActiveHost ? 'player' : 'host' }
    : player)
}

export function parsePointInput(value) {
  if (!/^-?\d+$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) ? number : null
}

export function totalPoints(players) {
  return players.reduce((sum, player) => sum + player.totalPoints, 0)
}

export function parseSavedPlayers(raw) {
  if (!raw) return null

  try {
    const players = JSON.parse(raw)
    if (!Array.isArray(players)) return null
    if (!players.every((player) =>
      player &&
      typeof player.id === 'string' && player.id.length > 0 &&
      typeof player.name === 'string' &&
      (player.role === 'host' || player.role === 'player') &&
      Number.isSafeInteger(player.totalPoints) &&
      (player.active === undefined || typeof player.active === 'boolean')
    )) return null
    if (new Set(players.map((player) => player.id)).size !== players.length) return null

    const normalized = players.map((player) => ({
      ...player,
      active: player.active ?? true,
      role: player.role === 'host' && player.active === false ? 'player' : player.role,
    }))
    if (normalized.filter((player) => player.role === 'host').length > 1) return null
    if (getPlayerErrors(normalized, true).size > 0) return null

    return normalized
  } catch {
    return null
  }
}
