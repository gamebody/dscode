import { StateCreator, } from 'zustand'
import { produce, } from 'immer'
import { StateActions } from './index'


type State = {
  isPending: boolean
  /**
   * 用户是否正在做一些确定操作
   */
  isUserDecison: boolean
  statusText: string
  /** 上一次所消耗的tokens */
  usage: number
  /** 当前会话的总使用量 */
  totalUsage: number
  upgradeStateText: string
  sessionId: string
  /** 退出确认状态 */
  exitConfirmState: 'idle' | 'confirming' | 'exiting'
  /** StatusBar 是否可见 */
  isStatusBarVisible: boolean
}

type Action = {
  setPending: (isPending: boolean) => void
  setUserDecison: (isUserDecison: boolean) => void
  setStatusText: (text: string) => void
  setUsage: (usage: number) => void
  setTotalUsage: (totalUsage: number) => void
  setUpgradeStateText: (text: string) => void
  setSessionId: (sessionId: string) => void
  /** 设置退出确认状态 */
  setExitConfirmState: (state: 'idle' | 'confirming' | 'exiting') => void
  /** 设置 StatusBar 可见性 */
  setIsStatusBarVisible: (visible: boolean) => void
  reset: () => void
}

export type Store = {
  bar: State & Action

}

const initialValues: State = {
  isPending: false,
  isUserDecison: false,
  statusText: '',
  upgradeStateText: '',
  usage: 0,
  totalUsage: 0,
  sessionId: '',
  exitConfirmState: 'idle',
  isStatusBarVisible: true,
}


export const stateCreator: StateCreator<
  StateActions,
  [],
  [],
  Store
> = (set, get) => ({
  bar: {
    ...initialValues,
    setPending(isPending) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.bar.isPending = isPending
        })
      })
    },
    setUserDecison(isUserDecison) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.bar.isUserDecison = isUserDecison
        })
      })
    },
    setStatusText(text) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.bar.statusText = text
        })
      })
    },
    setUsage(usage) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.bar.usage = usage
        })
      })
    },
    setTotalUsage(totalUsage) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.bar.totalUsage = totalUsage
        })
      })
    },
    setUpgradeStateText(text) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.bar.upgradeStateText = text
        })
      })
    },
    setSessionId(sessionId) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.bar.sessionId = sessionId
        })
      })
    },
    setExitConfirmState(newState) {
      set((storeState: Store) => {
        return produce(storeState, (draft) => {
          draft.bar.exitConfirmState = newState
        })
      })
    },
    setIsStatusBarVisible(visible) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.bar.isStatusBarVisible = visible
        })
      })
    },
    reset: () => set((state: Store) => {
      return ({
        bar: {
          ...state.bar,
          ...initialValues,
        },
      })
    }),
  },
})