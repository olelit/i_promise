import type { SkinId } from '../tamagotchi'

export interface Skin {
  id: SkinId
  name: string
  colors: Record<string, string>
}

export const SKINS: Skin[] = [
  {
    id: 'classic',
    name: 'Классика',
    colors: { g: '#7ec8a9', l: '#a8dcc0', b: '#f4a3a3', d: '#2f4f43' },
  },
  {
    id: 'sky',
    name: 'Небо',
    colors: { g: '#7fa9c9', l: '#a9c9dc', b: '#f4a3a3', d: '#2f4354' },
  },
  {
    id: 'rose',
    name: 'Роза',
    colors: { g: '#d98ca6', l: '#ecc0cd', b: '#b5657f', d: '#542f3f' },
  },
]

export function skinColors(id: SkinId): Record<string, string> {
  return (SKINS.find((skin) => skin.id === id) ?? SKINS[0]).colors
}
