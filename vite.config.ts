import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resumeChatApiPlugin } from './vite-plugin-resume-chat.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.OPENAI_API_KEY ?? ''
  const model = env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'

  return {
    plugins: [react(), resumeChatApiPlugin(apiKey, model)],
  }
})
