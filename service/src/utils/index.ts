import MemoryClient from 'mem0ai'
import * as dotenv from 'dotenv'
import { normalizeUserId } from './tools'

dotenv.config()

const client = new MemoryClient({
  apiKey: process.env.MEM_KEY,
})

export function storeMemory(user_quest: { content: string; user_id: string }) {
  const normalizedUserId = normalizeUserId(user_quest.user_id)
  const messages = [{ role: 'assistant', content: user_quest.content }]
  client.add(messages, { user_id: normalizedUserId })
  return { message: '已保存', data: null, status: 'Success' }
}

export async function getUserMemories(userId: string) {
  const normalizedUserId = normalizeUserId(userId)
  const memories = await client.getAll({ user_id: normalizedUserId })
  return memories || []
}

export function getLanguageText(lang: string): string {
  switch (lang) {
    case 'ja': return '日文'
    case 'zh': return '中文'
    default: return '英文'
  }
}