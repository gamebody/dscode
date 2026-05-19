import React, { useEffect, useRef } from "react";
import { Box, Static, Text } from "ink";
import { useStoreContext } from "../store/index";
import Gradient from "ink-gradient";
import Tips from "./Tips";
import TextItem from "./TextItem/index";
import { useTerminalSize } from "../utils/useTerminalSize";
import { oneCoderAsciiLogo } from "./AsciiArt";



type HistoryProps = {

};

const History: React.FC<HistoryProps> = () => {

  const staticKey = useStoreContext(s => s.history.staticKey)
  const refreshStaticKey = useStoreContext(s => s.history.refreshStaticKey)
  const version = useStoreContext(s => s.base.version)
  const productName = useStoreContext(s => s.base.productName)
  const messages = useStoreContext(s => s.agent.UIMessage)
  const loading = useStoreContext(s => s.agent.loading)

  // When streaming finishes (loading: true -> false), refresh staticKey
  // so the completed message is absorbed into the Static zone.
  const prevLoading = useRef(loading)
  useEffect(() => {
    if (prevLoading.current && !loading) {
      refreshStaticKey()
    }
    prevLoading.current = loading
  }, [loading, refreshStaticKey])

  // The last message is being streamed when loading is true.
  // It must render outside <Static> so Ink can re-render it on every frame.
  const streamingMessage = loading && messages.length > 0
    ? messages[messages.length - 1]
    : null
  const staticMessages = streamingMessage
    ? messages.slice(0, -1)
    : messages
  
  const { columns: terminalWidth, rows: terminalHeight } = useTerminalSize();

  return (
    <Box flexDirection='column'>
      <Static
        key={staticKey}
        items={[
          <Box key='Title'>
            <Gradient name="rainbow">
              <Text>
                {oneCoderAsciiLogo}
              </Text>
            </Gradient>
          </Box>,
          <Box key='Version'>
            <Gradient name="rainbow">
              <Text>欢迎使用 {productName} {version}</Text>
            </Gradient>
          </Box>,
          <Tips key='Tips' />,
          ...staticMessages.map((item, index) => {
            return <TextItem key={`static-msg-${index}`} {...item} terminalWidth={terminalWidth} />
          })
        ]}
      >
        {
          (item) => item
        }
      </Static>
      {
        streamingMessage && (
          <Box>
            <TextItem
              {...streamingMessage}
              isStreaming={true}
              terminalWidth={terminalWidth}
              terminalHeight={terminalHeight}
            />
          </Box>
        )
      }
    </Box>
  );
};

export default React.memo(History)