import { StateCreator } from 'zustand'
import { produce } from 'immer'
import { StateActions } from './index'
import path from 'path'
import fs from 'fs'

const MAX_HISTORY = 200

type State = {
  messages: string[]
  currentIndex: number
}

type Action = {
  pushMessage: (text: string) => void
  navigateUp: () => string | null
  navigateDown: () => string | null
  resetNavigation: () => void
}

export type Store = {
  messageHistory: State & Action
}

const saveToFile = (messages: string[], storageDir: string) => {
  try {
    const filePath = path.join(storageDir, '.message-history.json')
    fs.writeFileSync(filePath, JSON.stringify({ messages }, null, 2))
  } catch {
    // silent fail
  }
}

export const stateCreator = (initialMessages: string[]): StateCreator<StateActions, [], [], Store> =>
  (set, get) => ({
    messageHistory: {
      messages: initialMessages,
      currentIndex: -1,
      pushMessage: (text: string) => {
        if (!text.trim()) return
        set((state) => produce(state, (draft) => {
          if (draft.messageHistory.messages[0] === text) return
          draft.messageHistory.messages.unshift(text)
          if (draft.messageHistory.messages.length > MAX_HISTORY) {
            draft.messageHistory.messages = draft.messageHistory.messages.slice(0, MAX_HISTORY)
          }
          saveToFile(draft.messageHistory.messages, get().base.storageDir)
        }))
      },
      navigateUp: () => {
        const state = get().messageHistory
        const nextIndex = state.currentIndex + 1
        if (nextIndex >= state.messages.length) return null
        set((s) => produce(s, (draft) => {
          draft.messageHistory.currentIndex = nextIndex
        }))
        return state.messages[nextIndex] ?? null
      },
      navigateDown: () => {
        const state = get().messageHistory
        const nextIndex = state.currentIndex - 1
        if (nextIndex < -1) return null
        set((s) => produce(s, (draft) => {
          draft.messageHistory.currentIndex = nextIndex
        }))
        return nextIndex === -1 ? '' : (state.messages[nextIndex] ?? null)
      },
      resetNavigation: () => {
        set((state) => produce(state, (draft) => {
          draft.messageHistory.currentIndex = -1
        }))
      },
    },
  })
