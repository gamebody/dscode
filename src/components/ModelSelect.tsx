import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useStoreContext } from "../store/index";
import { Colors } from "../utils/colors";
import { RadioButtonSelect } from "./RadioButtonSelect";
import modelConfigList from "../utils/modelConfig";
import TextInput from "./InkTextInput";
import { useLatest } from "../hooks/useLatest";

export type ModelSelectProps = {
  onSubmit: () => void
  onCancel: () => void
};

export const name = 'ModelSelect' as const

const ModelSelect: React.FC<ModelSelectProps> = ({ onSubmit, onCancel }) => {
  const modelConfig = useStoreContext(s => s.userConfig.modelConfig)
  const setModelName = useStoreContext(s => s.userConfigActions.setModelName)
  const setApiKey = useStoreContext(s => s.userConfigActions.setApiKey)
  const setBaseURL = useStoreContext(s => s.userConfigActions.setBaseURL)
  const setMaxTokens = useStoreContext(s => s.userConfigActions.setMaxTokens)

  const [step, setStep] = useState<'model' | 'apiKey' | 'confirm'>('model')
  const [selectedModel, setSelectedModel] = useState(modelConfig.model)
  const [apiKey, setApiKeyLocal] = useState(modelConfig.apiKey || '')
  const [selectedConfig, setSelectedConfig] = useState<typeof modelConfigList[0] | null>(null)

  const latest = useLatest({ step, selectedModel, apiKey, selectedConfig, onSubmit, onCancel })

  useInput((_input, key) => {
    const s = latest.current

    if (key.escape) {
      if (s.step === 'model') {
        s.onCancel()
      } else if (s.step === 'apiKey') {
        setStep('model')
      } else if (s.step === 'confirm') {
        setStep('apiKey')
      }
    }

    if (key.return) {
      if (s.step === 'model' && s.selectedConfig) {
        setStep('apiKey')
      } else if (s.step === 'apiKey') {
        setStep('confirm')
      } else if (s.step === 'confirm') {
        setModelName(s.selectedModel)
        setApiKey(s.apiKey)
        setBaseURL(s.selectedConfig?.baseURL || '')
        setMaxTokens(s.selectedConfig?.maxTokens || 30000)
        s.onSubmit()
      }
    }
  });

  const renderStep = () => {
    switch (step) {
      case 'model':
        return (
          <Box flexDirection="column">
            <Text color={Colors.Gray}>请选择模型：</Text>
            <RadioButtonSelect
              items={modelConfigList.map(config => ({
                label: `${config.model} (${config.provider})`,
                value: config
              }))}
              onSelect={(config) => {
                setSelectedConfig(config)
                setSelectedModel(config.model)
                setStep('apiKey')
              }}
              onHighlight={(config) => {
                setSelectedConfig(config)
                setSelectedModel(config.model)
              }}
              isFocused={true}
              filterable={true}
              placeholder="搜索模型..."
            />
          </Box>
        )
      case 'apiKey':
        return (
          <Box flexDirection="column">
            <Text color={Colors.Gray}>请输入API Key</Text>
            <Text color={Colors.AccentCyan}>模型: {selectedModel}</Text>
            <Text color={Colors.Gray}>Base URL: {selectedConfig?.baseURL}</Text>
            <Text color={Colors.Gray}>最大Token数: {selectedConfig?.maxTokens}</Text>
            <Box height={1} />
            <Text color={Colors.Gray}>请输入API Key（按Enter继续）</Text>
            <TextInput
              placeholder="sk-..."
              value={apiKey}
              onChange={setApiKeyLocal}
              onSubmit={() => setStep('confirm')}
            />
          </Box>
        )
      case 'confirm':
        return (
          <Box flexDirection="column">
            <Text color={Colors.AccentGreen}>确认配置：</Text>
            <Text>模型: <Text color={Colors.AccentCyan}>{selectedModel}</Text></Text>
            <Text>API Key: <Text color={Colors.AccentCyan}>{apiKey ? '已设置' : '未设置'}</Text></Text>
            <Text>Base URL: <Text color={Colors.AccentCyan}>{selectedConfig?.baseURL}</Text></Text>
            <Text>最大Token数: <Text color={Colors.AccentCyan}>{selectedConfig?.maxTokens}</Text></Text>
            <Box height={1} />
            <Text>
              <Text color={Colors.AccentGreen}>Enter</Text> 确认配置
            </Text>
          </Box>
        )
    }
  }

  return (
    <>
      <Text>
        ← <Text color={Colors.AccentGreen}>Esc</Text> 返回
      </Text>
      <Box flexDirection={'column'} borderStyle={'round'} borderColor={Colors.AccentBlue} paddingX={1}>
        {renderStep()}
      </Box>
    </>
  );
};

export default React.memo(ModelSelect)
