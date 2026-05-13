import { StateCreator, } from 'zustand'
import { produce, } from 'immer'
import { StateActions } from './index'


export type ApprovalDecision = 'agree_once' | 'agree_all_session' | 'agree_edit_session' | 'disagree'

export type QA = {
  q: string
  a: string
}

type State = {
  visible: boolean
  pendingApproval: any | null
  resolveCallback: ((decision: ApprovalDecision) => void) | null
  pendingAnswer: any | null
  answerResolveCallback: ((answer: QA[] | null) => void) | null
}

type Action = {
  setVisible: (visible: boolean) => void
  requestApproval: (input: any) => Promise<ApprovalDecision>
  requestAnswer: (input: any) => Promise<QA[] | null>
  reset: () => void
}

export type Store = {
  approval: State & Action
}

const initialValues: State = {
  visible: false,
  pendingApproval: null,
  resolveCallback: null,
  pendingAnswer: null,
  answerResolveCallback: null
}


export const stateCreator: StateCreator<
  StateActions,
  [],
  [],
  Store
> = (set, get) => ({
  approval: {
    ...initialValues,
    setVisible: (visible: boolean) => set((state: Store) => {
      return produce(state, (draft) => {
        draft.approval.visible = visible
      })
    }),
    requestApproval: (input: any): Promise<ApprovalDecision> => {
      return new Promise((resolve) => {
        set((state: Store) => {
          return produce(state, (draft) => {
            draft.approval.pendingAnswer = null
            draft.approval.pendingApproval = input
            draft.approval.resolveCallback = resolve
            draft.approval.visible = true
          })
        })
      })
    },
    requestAnswer: (input: any): Promise<QA[] | null> => {
      return new Promise((resolve) => {
        set((state: Store) => {
          return produce(state, (draft) => {
            draft.approval.pendingApproval = null
            draft.approval.pendingAnswer = input
            draft.approval.answerResolveCallback = resolve
            draft.approval.visible = true
          })
        })
      })
    },
    reset: () => set((state: Store) => {
      return produce(state, (draft) => {
        draft.approval.pendingApproval = null
        draft.approval.resolveCallback = null
        draft.approval.pendingAnswer = null
        draft.approval.answerResolveCallback = null
        draft.approval.visible = false
      })
    }),
  },
})