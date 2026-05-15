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
  /** 思考模式: off | high | max */
  thinkingMode: 'off' | 'high' | 'max'
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
  /** 设置思考模式 */
  setThinkingMode: (mode: 'off' | 'high' | 'max') => void
  /** 循环切换思考模式: off -> high -> max -> off */
  cycleThinkingMode: () => void
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
  thinkingMode: 'max',
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
    setThinkingMode(mode) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.bar.thinkingMode = mode
        })
      })
    },
    cycleThinkingMode() {
      set((state: Store) => {
        return produce(state, (draft) => {
          const current = draft.bar.thinkingMode
          const next = current === 'off' ? 'high' : current === 'high' ? 'max' : 'off'
          draft.bar.thinkingMode = next
        })
      })
    },
    reset: () => set((state: Store) => {
      const currentThinkingMode = state.bar.thinkingMode
      return ({
        bar: {
          ...state.bar,
          ...initialValues,
          thinkingMode: currentThinkingMode, // 用户偏好，不随会话重置
        },
      })
    }),
  },
})