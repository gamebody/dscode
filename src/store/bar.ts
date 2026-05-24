import { StateCreator, } from 'zustand'
import { produce, } from 'immer'
import { StateActions } from './index'


type State = {
  /**
   * 用户是否正在做一些确定操作
   */
  isUserDecison: boolean
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
  /** Agent 模式: agent 标准模式 | yolo 自动执行模式 */
  agentMode: 'agent' | 'yolo'
  /** 会话恢复模式 */
  isResumeMode: boolean
}

type Action = {
  setUserDecison: (isUserDecison: boolean) => void
  setUsage: (usage: number) => void
  setTotalUsage: (totalUsage: number) => void
  setUpgradeStateText: (text: string) => void
  setSessionId: (sessionId: string) => void
  /** 设置退出确认状态 */
  setExitConfirmState: (state: 'idle' | 'confirming' | 'exiting') => void
  /** 设置 StatusBar 可见性 */
  setIsStatusBarVisible: (visible: boolean) => void
  /** 循环切换思考模式: off -> high -> max -> off */
  cycleThinkingMode: () => void
  /** 切换 Agent 模式: agent <-> yolo */
  cycleAgentMode: () => void
  /** 设置会话恢复模式 */
  setResumeMode: (mode: boolean) => void
  reset: () => void
}

export type Store = {
  bar: State & Action

}

const initialValues: State = {
  isUserDecison: false,
  upgradeStateText: '',
  usage: 0,
  totalUsage: 0,
  sessionId: '',
  exitConfirmState: 'idle',
  isStatusBarVisible: true,
  thinkingMode: 'max',
  agentMode: 'agent',
  isResumeMode: false,
}


export const stateCreator: StateCreator<
  StateActions,
  [],
  [],
  Store
> = (set, get) => ({
  bar: {
    ...initialValues,
    setUserDecison(isUserDecison) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.bar.isUserDecison = isUserDecison
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
    cycleThinkingMode() {
      set((state: Store) => {
        return produce(state, (draft) => {
          const current = draft.bar.thinkingMode
          const next = current === 'off' ? 'high' : current === 'high' ? 'max' : 'off'
          draft.bar.thinkingMode = next
        })
      })
    },
    cycleAgentMode() {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.bar.agentMode = draft.bar.agentMode === 'agent' ? 'yolo' : 'agent'
        })
      })
    },
    setResumeMode(mode: boolean) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.bar.isResumeMode = mode
        })
      })
    },
    reset: () => set((state: Store) => {
      const currentThinkingMode = state.bar.thinkingMode
      const currentAgentMode = state.bar.agentMode
      return ({
        bar: {
          ...state.bar,
          ...initialValues,
          thinkingMode: currentThinkingMode, // 用户偏好，不随会话重置
          agentMode: currentAgentMode, // 用户偏好，不随会话重置
        },
      })
    }),
  },
})