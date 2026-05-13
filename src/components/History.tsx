import React, { useCallback, useEffect, useState } from "react";
import { Box, Static, Text } from "ink";
import { useStoreContext } from "../store/index";
import Gradient from "ink-gradient";
import Tips from "./Tips";
import TextItem from "./TextItem/index";
import { oneCoderAsciiLogo } from "./AsciiArt";



type HistoryProps = {

};

const History: React.FC<HistoryProps> = () => {

  const staticKey = useStoreContext(s => s.history.staticKey)
  const version = useStoreContext(s => s.base.version)
  const productName = useStoreContext(s => s.base.productName)
  const messages = useStoreContext(s => s.agent.UIMessage)


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
              <Text>{productName} v{version}</Text>
            </Gradient>
          </Box>,
          <Tips key='Tips' />,
          ...messages.map((item, index) => {
            return <TextItem key={index} {...item} />
          })
      ]}>
        {
          (item) => item
        }
      </Static>
    </Box>
  );
};

export default React.memo(History)
