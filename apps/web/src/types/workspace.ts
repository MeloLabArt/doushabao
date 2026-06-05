export type Workspace = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  sourceImage?: string
  hasSourceImage?: boolean
  hasSourceVideo?: boolean
  workspaceType?: string
  videoWidth?: number
  videoHeight?: number
  portraitData?: string // JSON-serialized portrait assets + clips
}

export type WorkspaceTabItem = {
  id: string
  title: string
  isDirty: boolean
}
