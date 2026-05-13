import { StateCreator, } from 'zustand'
import { produce, } from 'immer'
import { StateActions } from './index'


type State = {
  cwd: string
}

type Action = {
  setCwd: (cwd: string) => void
  reset: () => void
}

export type Store = {
  config: State & Action
}

const initialValues: State = {
  cwd: ''
}


export const stateCreator: StateCreator<
  StateActions,
  [],
  [],
  Store
> = (set, get) => ({
  config: {
    ...initialValues,
    setCwd: (cwd: string) => set((state: Store) => {
      return produce(state, (draft) => {
        draft.config.cwd = cwd
      })
    }),
    reset: () => set((state: Store) => {
      return ({
        config: {
          ...state.config,
          ...initialValues,
        },
      })
    }),
  },
})