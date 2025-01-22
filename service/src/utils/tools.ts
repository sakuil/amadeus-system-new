import axios from 'axios'

export async function getWeather(user_quest) {
  const params = {
    key: 'SCYrvkytJze9qyzOh',
    location: user_quest.city,
    language: 'zh-Hans',
  }
  try {
    const response = await axios.get('https://api.seniverse.com/v3/weather/daily.json', { params })
    return response.data
  }
  catch (err) {
    return err
  }
}

export async function getWebContent(user_quest) {
  const data = {
    query: user_quest.keyword,
    page_size: 3,
  }
  try {
    const response = await axios.post('https://api.tigerbot.com/v1/search/web', data, { headers: { Authorization: `Bearer ${process.env.WebSearchKey}` } })
    return response.data
  }
  catch (err) {
    return err
  }
}

export function normalizeUserId(userName: string): string {
  return encodeURIComponent(userName)
    .toLowerCase() // 转换为小写
    .trim() // 移除首尾空格
    .replace(/\s+/g, '_') // 将空格替换为下划线
    .replace(/[^a-z0-9_\-]/g, '') // 只保留英文字母、数字、下划线和连字符
}
