import { StateCreator } from 'zustand'
import { produce } from 'immer'
import { StateActions } from './index'
import fs from 'fs'

const FAT_CAP = 100000
const SIZE_CAP = 500000

type Stage = '幼崽' | '成长' | '成熟' | '巨型'

type State = {
  lifetimeTokens: number
}

type Action = {
  addTokens(tokens: number): void
  getStage(): { fatness: number; size: number; stage: Stage }
}

export type Store = {
  buddy: State & Action
}

function getStageInfo(tokens: number): { fatness: number; size: number; stage: Stage } {
  const fatness = Math.min(tokens / FAT_CAP, 1)
  const size = Math.min(tokens / SIZE_CAP, 1)
  let stage: Stage
  if (tokens < 5000) stage = '幼崽'
  else if (tokens < 50000) stage = '成长'
  else if (tokens < 200000) stage = '成熟'
  else stage = '巨型'
  return { fatness, size, stage }
}

export const buddyStateCreator = (
  buddyFilePath: string,
  initialLifetimeTokens: number,
): StateCreator<StateActions, [], [], Store> => (set, get) => ({
  buddy: {
    lifetimeTokens: initialLifetimeTokens,

    addTokens(tokens: number) {
      if (tokens <= 0) return
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.buddy.lifetimeTokens += tokens
        })
      })
      try {
        fs.writeFileSync(buddyFilePath, JSON.stringify({ lifetimeTokens: get().buddy.lifetimeTokens }))
      } catch {}
    },

    getStage() {
      return getStageInfo(get().buddy.lifetimeTokens)
    },
  },
})
