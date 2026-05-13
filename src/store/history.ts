import { StateCreator, } from 'zustand'
import { produce, } from 'immer'
import { StateActions } from './index'

type State = {
  staticKey: number
}

type Action = {
  refreshStaticKey: () => void
  reset: () => void
}

export type Store = {
  history: State & Action
}

const initialValues: State = {
  staticKey: 0,
}


export const stateCreator: StateCreator<
  StateActions,
  [],
  [],
  Store
> = (set, get) => ({
  history: {
    ...initialValues,
    refreshStaticKey: () => {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.history.staticKey = new Date().getTime()
        })
      })
    },
    reset: () => set((state: Store) => {
      return ({
        history: {
          ...state.history,
          ...initialValues,
        },
      })
    }),
  },
})