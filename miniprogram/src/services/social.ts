import { apiRequest } from './api'

export async function favoriteLineup(id: number): Promise<void> {
  await apiRequest<void>(`/lineups/${id}/favorite`, { method: 'POST' })
}

export async function unfavoriteLineup(id: number): Promise<void> {
  await apiRequest<void>(`/lineups/${id}/favorite`, { method: 'DELETE' })
}

export async function likeLineup(id: number): Promise<void> {
  await apiRequest<void>(`/lineups/${id}/like`, { method: 'POST' })
}

export async function unlikeLineup(id: number): Promise<void> {
  await apiRequest<void>(`/lineups/${id}/like`, { method: 'DELETE' })
}
