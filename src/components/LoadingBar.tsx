import React, { useEffect } from "react";
import { Box, Text } from "ink";
import { useStoreContext } from "../store/index";
import { Colors } from "../utils/colors";
import Thinking from "./Thinking";

const Timer = () => {
  const [time, setTime] = React.useState(0)
  const isApprovalVisible = useStoreContext(s => s.approval.visible)

  useEffect(() => {
    const interval = setInterval(() => {
      if (isApprovalVisible) return
      setTime(prevTime => prevTime + 100)
    }, 100)
    
    return () => {
      clearInterval(interval)
    }
  }, [])

  const seconds = time / 1000

  const text = `${seconds.toFixed(1)}s`

  if (isApprovalVisible) return null
  
  return <Text color={Colors.Comment}>({text} Esc to cancel)</Text>
}

const LoadingBar: React.FC = () => {
  const isPedning = useStoreContext(s => s.bar.isPending)
  const isApprovalVisible = useStoreContext(s => s.approval.visible)

  return (
    <Box flexDirection='row'>
      {
        isPedning && (
          <>
            {!isApprovalVisible && <Thinking />}
            <Timer />
          </>
        )
      }
    </Box>
  );
};

export default React.memo(LoadingBar)
