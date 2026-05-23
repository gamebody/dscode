import React, { useEffect, useState, useMemo } from 'react'
import { Box, Text, useInput } from 'ink'
import Spinner from 'ink-spinner'
import { useStoreContext } from '../store/index'
import { codeAgent } from '../agent'
import { SessionManager, DateGroup } from '../session/SessionManager'
import { Colors } from '../utils/colors'

export const ResumeFlow: React.FC = () => {
  const logsDir = useStoreContext(s => s.base.logs)
  const base = useStoreContext(s => s.base)
  const setAgent = useStoreContext(s => s.agent.setAgent)
  const setUIMessage = useStoreContext(s => s.agent.setUIMessage)
  const setSessionApproved = useStoreContext(s => s.agent.setSessionApproved)
  const refreshStaticKey = useStoreContext(s => s.history.refreshStaticKey)
  const setResumeMode = useStoreContext(s => s.bar.setResumeMode)
  const setSessionId = useStoreContext(s => s.bar.setSessionId)
  const setResumeInputText = useStoreContext(s => s.bar.setResumeInputText)
  const modelConfig = useStoreContext(s => s.userConfig.modelConfig)
  const thinkingMode = useStoreContext(s => s.bar.thinkingMode)

  const [dateGroups, setDateGroups] = useState<DateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)

  const sessionMgr = useMemo(() => new SessionManager(logsDir), [logsDir])

  useEffect(() => {
    sessionMgr.scanSessions().then(groups => {
      setDateGroups(groups)
      setLoading(false)
    })
  }, [sessionMgr])

  const MAX_VISIBLE = 5

  const allSessions = useMemo(() => {
    const list: { session: { sessionId: string; date: string; filePath: string; firstMessage: string; messageCount: number; firstTime: string; lastTime: string }; date: string }[] = []
    for (const group of dateGroups) {
      for (const session of group.sessions) {
        list.push({ session, date: group.date })
      }
    }
    return list
  }, [dateGroups])

  useEffect(() => {
    const newScrollOffset = Math.max(
      0,
      Math.min(activeIndex - MAX_VISIBLE + 1, allSessions.length - MAX_VISIBLE),
    )
    if (activeIndex < scrollOffset) {
      setScrollOffset(activeIndex)
    } else if (activeIndex >= scrollOffset + MAX_VISIBLE) {
      setScrollOffset(newScrollOffset)
    }
  }, [activeIndex, allSessions.length, scrollOffset])

  const visibleSessions = allSessions.slice(scrollOffset, scrollOffset + MAX_VISIBLE)

  const displayGroups = useMemo(() => {
    const map = new Map<string, typeof allSessions[0]['session'][]>()
    for (const { session, date } of visibleSessions) {
      const list = map.get(date)
      if (list) list.push(session)
      else map.set(date, [session])
    }
    const result: DateGroup[] = []
    for (const group of dateGroups) {
      const sessions = map.get(group.date)
      if (sessions && sessions.length > 0) result.push({ date: group.date, sessions })
    }
    return result
  }, [visibleSessions, dateGroups])

  const handleRestore = async (filePath: string, sessionId: string) => {
    const parsed = await sessionMgr.loadSession(filePath)
    const agent = codeAgent(
      { cwd: base.cwd, productName: base.productName, todosDir: base.todosDir },
      {
        model: modelConfig.apiKey && modelConfig.baseURL && modelConfig.model
          ? { name: modelConfig.model, apiKey: modelConfig.apiKey, baseURL: modelConfig.baseURL }
          : undefined,
        thinkingMode,
        logsDir: base.logs,
      },
    )
    agent.setSessionId(parsed.sessionId)
    setSessionId(parsed.sessionId)
    agent.appendMessage(parsed.messages, false)
    setAgent(agent)
    setUIMessage(parsed.uiMessages)
    setSessionApproved(false)
    refreshStaticKey()
    setResumeMode(false)
  }

  useEffect(() => {
    if (allSessions.length > 0 && allSessions[activeIndex]) {
      setResumeInputText(`/resume ${allSessions[activeIndex].session.sessionId}`)
    }
  }, [activeIndex, allSessions])

  useInput(
    (input, key) => {
      if (key.upArrow) {
        const newIndex = activeIndex > 0 ? activeIndex - 1 : allSessions.length - 1
        setActiveIndex(newIndex)
      } else if (key.downArrow) {
        const newIndex = activeIndex < allSessions.length - 1 ? activeIndex + 1 : 0
        setActiveIndex(newIndex)
      } else if (key.return && allSessions.length > 0) {
        const item = allSessions[activeIndex]
        if (item) {
          handleRestore(item.session.filePath, item.session.sessionId)
          setResumeInputText('')
        }
      } else if (key.escape) {
        setResumeInputText(null)
        setResumeMode(false)
      }
    },
    { isActive: true },
  )

  if (loading) {
    return (
      <Box paddingY={1}>
        <Spinner type="dots" />
        <Text color={Colors.Gray}> 正在扫描会话记录...</Text>
      </Box>
    )
  }

  if (dateGroups.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={Colors.Foreground}>没有找到历史会话记录</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" >
      <Box flexDirection="column">
        {displayGroups.map((group, gi) => {
          const rows: React.ReactNode[] = [
            <Box key={`h-${group.date}`}>
              <Text color={Colors.AccentCyan} bold>
                {group.date}
              </Text>
            </Box>,
          ]
          for (const session of group.sessions) {
            const itemIndex = allSessions.findIndex(s => s.session.sessionId === session.sessionId)
            const isActive = itemIndex === activeIndex
            const color = isActive ? Colors.AccentGreen : Colors.Foreground
            const time = session.firstTime.slice(-8)
            const msg = (session.firstMessage || '(无消息)')
              .replace(/[\r\n]+/g, ' ')
              .replace(/@?[^\s'"`,;]*[\\\/][^\s'"`,;]*/g, m => {
                const prefix = m.startsWith('@') ? '@' : '@'
                const path = m.startsWith('@') ? m.slice(1) : m
                const last = path.replace(/\\/g, '/').split('/').pop() || m
                return prefix + last
              })
            rows.push(
              <Box key={session.sessionId} marginX={1}>
                <Text color={color} wrap="truncate">
                  <Text color={isActive ? Colors.AccentGreen : Colors.Gray}>
                    {time}{' '}{session.sessionId}{' '}
                  </Text>
                  <Text color={color}>{msg}</Text>
                </Text>
              </Box>,
            )
          }
          if (gi < displayGroups.length - 1) {
            rows.push(<Box key={`gap-${group.date}`} />)
          }
          return rows
        })}
      </Box>
      <Text color={Colors.AccentGreen}>
        - {activeIndex + 1}/{allSessions.length} -
      </Text>
    </Box>
  )
}

export default ResumeFlow
