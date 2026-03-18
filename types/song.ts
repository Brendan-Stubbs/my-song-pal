// Stubs for future song-related types

export interface ComponentLayout {
  id: string
  name: string
  position: number
}

export interface SongConfiguration {
  id: string
  title: string
  artist?: string
  components: ComponentLayout[]
  createdAt: string
  updatedAt: string
}
