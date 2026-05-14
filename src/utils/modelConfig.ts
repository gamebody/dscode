




export default [
  {
    provider: 'openai-compatible',
    model: 'mimo-v2-flash',
    baseURL: 'https://api.xiaomimimo.com/v1',
    maxTokens: 256_000
  },
  {
    provider: 'openai-compatible',
    model: 'deepseek-v4-flash',
    baseURL: 'https://api.deepseek.com',
    maxTokens: 1_000_000
  },
  {
    provider: 'openai-compatible',
    model: 'deepseek-v4-pro',
    baseURL: 'https://api.deepseek.com',
    maxTokens: 1_000_000
  },
]