import { createOpenAICompatible } from "@ai-sdk/openai-compatible";




const BASE_URL = process.env.BASE_URL as string
const API_KEY = process.env.API_KEY as string
export const CHAT_MODEL_ID = process.env.CHAT_MODEL_ID as string


export const provider = createOpenAICompatible({
  name: 'sinosig-provider',
  apiKey: API_KEY,
  baseURL: BASE_URL,
});

