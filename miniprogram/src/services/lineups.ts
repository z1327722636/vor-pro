import { apiRequest, buildQuery } from './api'
import type { Lineup, LineupFilters } from './types'

function buildLineupQuery(filters: LineupFilters = {}) {
  return buildQuery({
    q: filters.q,
    map: filters.map,
    site: filters.site,
    agent: filters.agent,
    side: filters.side,
    ability: filters.ability,
    throw_type: filters.throw_type,
    source_type: filters.source_type,
    sort: filters.sort || 'latest',
    limit: filters.limit || 24,
    offset: filters.offset || 0
  })
}

export async function listLineups(filters: LineupFilters = {}): Promise<Lineup[]> {
  return apiRequest<Lineup[]>(`/lineups${buildLineupQuery(filters)}`, { auth: false })
}

export async function getLineup(id: number): Promise<Lineup> {
  return apiRequest<Lineup>(`/lineups/${id}`, { auth: false })
}

export async function listMyLineups(filters: LineupFilters = {}): Promise<Lineup[]> {
  return apiRequest<Lineup[]>(`/lineups/mine${buildLineupQuery({ limit: 100, ...filters })}`)
}

export async function updateMyLineupVisibility(id: number, isHidden: boolean): Promise<Lineup> {
  return apiRequest<Lineup>(`/lineups/mine/${id}`, {
    method: 'PATCH',
    data: { is_hidden: isHidden }
  })
}

export async function deleteMyLineup(id: number): Promise<void> {
  await apiRequest<void>(`/lineups/mine/${id}`, { method: 'DELETE' })
}
