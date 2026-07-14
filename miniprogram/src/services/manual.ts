import { apiRequest } from './api'
import { agentAbilityMap, agentOptions, mapOptions, throwOptions } from './labels'
import type { Lineup } from './types'

export type LineupBaseValue = {
  map: string
  site: string
  side: string
  agent: string
  ability: string
  throw_type: string
}

export type ManualLineupFormPayload = LineupBaseValue & {
  standing_description: string
  aim_description: string
  landing_description: string
  minimap_x?: number | null
  minimap_y?: number | null
  landing_x?: number | null
  landing_y?: number | null
}

export type ManualImagePayload = {
  image_base64: string
  filename?: string
  note: string
}

export type ManualUploadPayload = {
  form: ManualLineupFormPayload
  images: ManualImagePayload[]
}

export type ExternalVideoResolveResponse = {
  playable_url: string
  title?: string | null
  duration_seconds?: number | null
}

export type FrameNodePayload = {
  timestamp_ms: number
  note: string
  order_index: number
}

export type VideoFrameSubmitPayload = {
  source_url?: string | null
  timestamps: {
    standing: number
    aim: number
    landing: number
  }
  form: ManualLineupFormPayload
  frame_nodes: FrameNodePayload[]
}

export type CorrectionSession = {
  video_url?: string | null
  original_timestamps: {
    standing: number
    aim: number
    landing: number
  }
  original_form: ManualLineupFormPayload
}

export function defaultLineupBaseValue(): LineupBaseValue {
  const agent = agentOptions[0]?.value || 'sova'
  return {
    map: mapOptions[0]?.value || 'ascent',
    site: 'a',
    side: 'attack',
    agent,
    ability: agentAbilityMap[agent]?.[0]?.value || '',
    throw_type: throwOptions[0]?.value || 'direct'
  }
}

export function withDefaultDescriptions(
  value: LineupBaseValue,
  descriptions?: Partial<Pick<ManualLineupFormPayload, 'standing_description' | 'aim_description' | 'landing_description'>>
): ManualLineupFormPayload {
  return {
    ...value,
    standing_description: descriptions?.standing_description || '',
    aim_description: descriptions?.aim_description || '',
    landing_description: descriptions?.landing_description || ''
  }
}

export async function uploadManualLineup(payload: ManualUploadPayload): Promise<Lineup> {
  return apiRequest<Lineup>('/lineups/manual-upload-json', {
    method: 'POST',
    data: payload
  })
}

export async function resolveExternalVideo(sourceUrl: string): Promise<ExternalVideoResolveResponse> {
  return apiRequest<ExternalVideoResolveResponse>('/manual/external-video/resolve', {
    method: 'POST',
    data: { source_url: sourceUrl }
  })
}

export async function submitManualVideo(payload: VideoFrameSubmitPayload): Promise<Lineup> {
  return apiRequest<Lineup>('/manual/video/submit', {
    method: 'POST',
    data: payload
  })
}

export async function getCorrectionSession(lineupId: number): Promise<CorrectionSession> {
  return apiRequest<CorrectionSession>(`/lineups/${lineupId}/correction-session`, { method: 'POST' })
}

export async function submitCorrection(lineupId: number, payload: VideoFrameSubmitPayload): Promise<Lineup> {
  return apiRequest<Lineup>(`/lineups/${lineupId}/corrections`, {
    method: 'POST',
    data: payload
  })
}
