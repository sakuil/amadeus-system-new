import http from 'http'
import express from 'express'
import cors from 'cors'
import * as dotenv from 'dotenv'
import { createProxyMiddleware, Filter } from 'http-proxy-middleware'

const app = express()
app.use(cors())
dotenv.config()
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true }))
app.set('trust proxy', true)

// 配置WebRTC API服务地址，从环境变量中获取
const WEBRTC_API_URL = process.env.WEBRTC_API_URL
console.log(`WebRTC API代理目标: ${WEBRTC_API_URL}`)

// 添加代理配置，将/api前缀的请求统一转发到Python FastAPI服务
app.use('/api', createProxyMiddleware({
  target: WEBRTC_API_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': ''  // 删除路径中的/api前缀
  },
  ws: true,  // 支持WebSocket
  onProxyReq: (proxyReq, req, res) => {
    // 确保请求体被正确传递
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err) => {
    console.error('WebRTC API代理错误:', err)
  },
}))

// 只在生产环境下代理前端请求
if (process.env.NODE_ENV === 'production') {
  const filter: Filter = (pathname: string) => {
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
}

// 创建 HTTP 服务器
const server = http.createServer(app)

const port = process.env.PORT || 3002
server.listen(port, () => console.log(`服务器运行在端口 ${port}`))
