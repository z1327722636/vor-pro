import { apiRequest, buildQuery } from './api'
import type { Lineup, LineupFilters } from './types'

export async function listLineups(filters: LineupFilters = {}): Promise<Lineup[]> {
  const query = buildQuery({
    q: filters.q,
    map: filters.map,
    site: filters.site,
    agent: filters.agent,
    side: filters.side,
    ability: filters.ability,
    throw_type: filters.throw_type,
    sort: filters.sort || 'latest',
    limit: filters.limit || 24,
    offset: filters.offset || 0
  })
  return apiRequest<Lineup[]>(`/lineups${query}`, { auth: false })
}

export async function getLineup(id: number): Promise<Lineup> {
  return apiRequest<Lineup>(`/lineups/${id}`, { auth: false })
}
