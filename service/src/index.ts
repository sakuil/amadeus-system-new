import http from 'http'
import express from 'express'
import cors from 'cors' // 引入 cors
import { createProxyMiddleware } from 'http-proxy-middleware'
import { setupWebSocket } from './websocket'

const app = express()
app.use(cors())

app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true }))
app.set('trust proxy', true)

const filter = function (pathname, req) {
  // 如果是 WebSocket 升级请求，不进行代理
  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket')
    return false
  // 排除 API 路由
  return !pathname.startsWith('/api')
}
app.use('/', createProxyMiddleware(filter, {
  target: 'http://127.0.0.1:4173',
  changeOrigin: true,
  ws: true,
  onError: (err) => {
    console.error('代理错误:', err)
  },
}))

// 创建 HTTP 服务器
const server = http.createServer(app)

// 设置 WebSocket
setupWebSocket(server)

const port = process.env.PORT || 3002
server.listen(port, () => console.log(`HTTP 和 WebSocket 服务器运行在端口 ${port}`))
