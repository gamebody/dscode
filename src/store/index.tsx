import React from 'react'
import { createStore, useStore, } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useRef, } from 'react'
import { FC, PropsWithChildren, createContext, useContext, } from 'react'
import { Store as barSlice, stateCreator as barStateCreator, } from './bar'
import { Store as historySlice, stateCreator as historyStateCreator, } from './history'
import { Store as agentSlice, stateCreator as agentStateCreator, } from './agent'
import { Store as configSlice, stateCreator as configStateCreator, } from './config'
import { Store as userConfigSlice, stateCreator as userConfigStateCreator, } from './userConfig'
import { Store as approvalSlice, stateCreator as approvalStateCreator, } from './approval'
import { Store as messageHistorySlice, stateCreator as messageHistoryStateCreator, } from './messageHistory'
import { isCLI } from '../utils/platform'
import path from 'path'


type AppStore = ReturnType<typeof createAppStore>

export type Base = {
  cwd: string
  productName: string
  version: string
  storageDir: string
  todosDir: string
  userConfigPath: string
  logs: string
}


export type StateActions =
  {
    base: Base
  } &
  barSlice &
  historySlice &
  agentSlice &
  configSlice &
  userConfigSlice &
  approvalSlice &
  messageHistorySlice
  
  
const StoreContext = createContext<AppStore | null>(null)



export const createAppStore = (base: Base) => {
  const userConfigPath = base.userConfigPath

  let initialMessages: string[] = []
  try {
    const fs = require('fs')
    const historyPath = path.join(base.storageDir, '.message-history.json')
    const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'))
    if (Array.isArray(data.messages)) initialMessages = data.messages
  } catch {}

  const partialize = (state: StateActions) => ({
    userConfig: state.userConfig,
    bar: {
      thinkingMode: state.bar.thinkingMode,
      agentMode: state.bar.agentMode,
    },
  })

  const merge = (persisted: any, current: StateActions) => ({
    ...current,
    ...persisted,
    bar: {
      ...current.bar,
      ...(persisted.bar ? { thinkingMode: persisted.bar.thinkingMode, agentMode: persisted.bar.agentMode } : {}),
    },
    messageHistory: current.messageHistory,
  })
  
  // 创建存储配置的函数
  const createStorageConfig = () => {
    if (isCLI()) {
      try {
        // 动态导入 fs 模块
        const fs = require('fs');
        return {
          name: 'one-coder-cli-store',
          storage: createJSONStorage(() => ({
            getItem: (name) => {
              try {
                const data = fs.readFileSync(userConfigPath, 'utf8')
                return JSON.parse(data)
              } catch {
                return null
              }
            },
            setItem: (name, value) => {
              fs.writeFileSync(userConfigPath, JSON.stringify(value, null, 2))
            },
            removeItem: (name) => {
              try {
                fs.unlinkSync(userConfigPath)
              } catch {}
            }
          })),
          partialize,
          merge,
        }
      } catch (error) {
        console.warn('Failed to load fs module, falling back to localStorage:', error)
        // 如果加载 fs 失败，回退到 localStorage
      }
    }
    
    // Web 端或回退情况使用 localStorage
    return {
      name: 'one-coder-web-store',
      storage: createJSONStorage(() => localStorage),
      partialize,
      merge,
    }
  }
  
  return createStore<StateActions>()(
    persist(
      (...a) => ({
        base,
        ...barStateCreator(...a),
        ...historyStateCreator(...a),
        ...agentStateCreator(...a),
        ...configStateCreator(...a),
        ...userConfigStateCreator(...a),
        ...approvalStateCreator(...a),
        ...messageHistoryStateCreator(initialMessages)(...a),
      }),
      createStorageConfig()
    )
  )
}

export const AppStoreProvider: FC<PropsWithChildren<{ base: Base }>> = ({ children, base, }) => {
  const storeRef = useRef<AppStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = createAppStore(base)
  }

  return (
    <StoreContext.Provider value={storeRef.current}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStoreContext<T>(selector: (state: StateActions) => T): T {
  const store = useContext(StoreContext)
  if (!store) throw new Error('Missing AppStoreProvider in the tree')
  return useStore(store, selector)
}
