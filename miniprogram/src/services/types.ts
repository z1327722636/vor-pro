export type LineupStep = {
  id?: number | null
  title: string
  image_path?: string | null
  note: string
  order_index: number
}

export type Lineup = {
  id: number
  map: string
  agent: string
  side: string
  ability: string
  throw_type: string
  site: string
  source_type: string
  standing_description: string
  aim_description: string
  landing_description: string
  standing_image_path?: string | null
  aim_image_path?: string | null
  landing_image_path?: string | null
  steps: LineupStep[]
  corrected_from_id?: number | null
  original_video_url?: string | null
  original_video_timestamp_ms?: number | null
  minimap_x?: number | null
  minimap_y?: number | null
  landing_x?: number | null
  landing_y?: number | null
  likes_count: number
  reports_count: number
  is_hidden: boolean
  is_favorited: boolean
  is_liked: boolean
  can_edit: boolean
  created_at: string
}

export type UserProfile = {
  id: number
  email?: string | null
  is_admin: boolean
}

export type TokenResponse = {
  access_token: string
  token_type: string
}

export type LineupFilters = {
  q?: string
  map?: string
  site?: string
  agent?: string
  side?: string
  ability?: string
  throw_type?: string
  source_type?: string
  sort?: string
  limit?: number
  offset?: number
}
