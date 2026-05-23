import React, { useEffect } from 'react';
import { Box, Static, useInput, useStdout } from 'ink';
import History from './components/History'
import TextInputWithPrompts from './components/TextInputWithPrompts';
import Approval from './components/approval/index';
import ExitHandler from './components/ExitHandler';
import ResumeFlow from './components/ResumeFlow';
import { useStoreContext } from './store/index';
import { fileURLToPath } from 'url';
import path from 'path';
import { checkAndUpdate } from './utils/versionCheck';
import StatusBar from './components/StatusBar';
import LoadingBar from './components/LoadingBar';

const App = () => {

  const setUpgradeStateText = useStoreContext(s => s.bar.setUpgradeStateText)
  const version = useStoreContext(s => s.base.version)
  const isResumeMode = useStoreContext(s => s.bar.isResumeMode)


  useEffect(() => {
    const __dirname = fileURLToPath(import.meta.url);
    const installDir = path.resolve(__dirname, '../../');

    const registryBase = ''
    if (registryBase) {
      checkAndUpdate(installDir, registryBase, version, setUpgradeStateText).catch(() => {});
    }
  }, [])


  return (
    <Box flexDirection="column">
      <History />
      <Approval />
      <TextInputWithPrompts />
      {
        isResumeMode && <ResumeFlow />
      }
      <LoadingBar />
      <StatusBar />
      <ExitHandler />
      <Box height={2}></Box>
    </Box>
  );
};

export default App;