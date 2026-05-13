




export default [
  {
    provider: 'openai-compatible',
    model: 'mimo-v2-flash',
    baseURL: 'https://api.xiaomimimo.com/v1',
    maxTokens: 256_000
  },
  {
    provider: 'openai-compatible',
    model: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com/v1',
    maxTokens: 128_000
  },
  {
    provider: 'openai-compatible',
    model: 'deepseek-v3-com',
    baseURL: 'https://zhengyan.sinosig.com/ai/ability/gpt/v2/',
    maxTokens: 30_000
  },
]