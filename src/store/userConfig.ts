import { StateCreator } from 'zustand'
import { produce } from 'immer'
import { StateActions } from './index'

type ModelConfig = {
  provider: string
  model: string
  apiKey?: string
  baseURL?: string
  maxTokens?: number
}

type State = {
  modelConfig: ModelConfig
}

type Action = {
  setModelConfig: (config: ModelConfig) => void
  setModelName: (model: string) => void
  setApiKey: (apiKey: string) => void
  setBaseURL: (baseURL: string) => void
  setMaxTokens: (maxTokens: number) => void
  reset: () => void
}

export type Store = {
  userConfig: State
  userConfigActions: Action
}

const initialValues: State = {
  modelConfig: {
    provider: 'openai-compatible',
    model: 'gpt-4o-mini',
    maxTokens: 30_000
  }
}

export const stateCreator: StateCreator<
  StateActions,
  [],
  [],
  Store
> = (set, get) => ({
  userConfig: {
    ...initialValues,
  },
  userConfigActions: {
    setModelConfig: (config: ModelConfig) => {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.userConfig.modelConfig = config
        })
      })
    },
    setModelName: (model: string) => {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.userConfig.modelConfig.model = model
        })
      })
    },
    setApiKey: (apiKey: string) => {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.userConfig.modelConfig.apiKey = apiKey
        })
      })
    },
    setBaseURL: (baseURL: string) => {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.userConfig.modelConfig.baseURL = baseURL
        })
      })
    },
    setMaxTokens: (maxTokens: number) => {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.userConfig.modelConfig.maxTokens = maxTokens
        })
      })
    },
    reset: () => set((state: Store) => {
      return ({
        userConfig: {
          ...state.userConfig,
          ...initialValues,
        },
      })
    }),
  },
})
