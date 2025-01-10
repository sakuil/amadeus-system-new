import type http from 'http'
import { URL } from 'url'
import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'
import { ChatService } from 'src/services/chatService'
import type { WebSocketMessage } from '../constants'
import { WebSocketMessageTypes } from '../constants'

const PING_INTERVAL = 30000

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean
  isRecording?: boolean
  audioChunks?: string[]
  videoFrames?: string[]
  isVideoOn?: boolean
  chatService?: ChatService
}

export function setupWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server })

  function heartbeat(this: ExtendedWebSocket) {
    this.isAlive = true
  }

  function base64ToBuffer(base64Chunks: string[]): Buffer {
    const buffers = base64Chunks.map((chunk) => {
      return Buffer.from(chunk, 'base64')
    })
    return Buffer.concat(buffers)
  }

  server.on('upgrade', async (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`)
    const token = url.searchParams.get('token')
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }
    if (token !== process.env.AUTH_API_TOKEN) {
      console.error('Token验证失败')
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
    }
  })

  wss.on('connection', (ws: ExtendedWebSocket) => {
    ws.isAlive = true
    ws.isRecording = false
    ws.audioChunks = []
    ws.videoFrames = []
    ws.isVideoOn = false
    ws.chatService = new ChatService()

    ws.on('pong', heartbeat)

    ws.on('message', async (message) => {
      try {
        const parsedMessage: WebSocketMessage = JSON.parse(message.toString())
        switch (parsedMessage.type) {
          case WebSocketMessageTypes.LOGIN: {
            const username = parsedMessage.data as string
            const selfMotivatedMessage = {
              message_type: 'ai_self_motivated',
            }
            ws.chatService.updateCurrentUserName(username)
            ws.chatService.handleChat(JSON.stringify(selfMotivatedMessage), ws)
            break
          }
          case WebSocketMessageTypes.START_SPEECH: {
            ws.isRecording = true
            ws.audioChunks = []
            ws.chatService.stopAudioStream()
            ws.send(JSON.stringify({
              type: WebSocketMessageTypes.RESPONSE,
              data: '开始接收音频数据',
            }))
            break
          }
          case WebSocketMessageTypes.END_SPEECH: {
            ws.isRecording = false
            if (ws.audioChunks && ws.audioChunks.length > 0) {
              try {
                ws.send(JSON.stringify({
                  type: WebSocketMessageTypes.LOADING,
                  data: 'true',
                }))
                const audioBuffer = base64ToBuffer(ws.audioChunks)
                const text = await ws.chatService.audio2Text(audioBuffer)
                ws.send(JSON.stringify({
                  type: WebSocketMessageTypes.SPEECH_TEXT,
                  data: text,
                }))
                if (ws.isVideoOn && ws.videoFrames && ws.videoFrames.length > 0)
                  await ws.chatService.handleChat(text, ws, ws.videoFrames)
                else
                  await ws.chatService.handleChat(text, ws)
              }
              catch (error) {
                ws.send(JSON.stringify({
                  type: WebSocketMessageTypes.ERROR,
                  data: '处理音频时出错',
                }))
              }
            }
            ws.audioChunks = []
            ws.send(JSON.stringify({
              type: WebSocketMessageTypes.RESPONSE,
              data: '音频接收完成',
            }))
            break
          }
          case WebSocketMessageTypes.AUDIO_CHUNK: {
            if (ws.isRecording && parsedMessage.data) {
              ws.audioChunks?.push(parsedMessage.data)
              ws.send(JSON.stringify({
                type: WebSocketMessageTypes.RESPONSE,
                data: '音频块已接收',
              }))
            }
            else {
              ws.send(JSON.stringify({
                type: WebSocketMessageTypes.ERROR,
                data: '未在录音状态或数据为空',
              }))
            }
            break
          }
          case WebSocketMessageTypes.PING: {
            ws.send(JSON.stringify({ type: WebSocketMessageTypes.PONG }))
            break
          }
          case WebSocketMessageTypes.SELF_MOTIVATED: {
            if (ws.isRecording)
              break

            ws.audioChunks = []

            const selfMotivatedMessage = {
              message_type: 'ai_self_motivated',
              visualContext: ws.isVideoOn ? '同时通过摄像头观察屏幕前的外界' : '摄像头已被关闭',
            }
            if (ws.isVideoOn && ws.videoFrames?.length > 0)
              ws.chatService.handleChat(JSON.stringify(selfMotivatedMessage), ws, ws.videoFrames)
            else
              ws.chatService.handleChat(JSON.stringify(selfMotivatedMessage), ws)
            ws.send(JSON.stringify({
              type: WebSocketMessageTypes.SELF_MOTIVATED,
              data: 'true',
            }))
            break
          }
          case WebSocketMessageTypes.VIDEO_FRAME: {
            if (parsedMessage.data) {
              if (ws.videoFrames.length >= 2)
                ws.videoFrames.shift()
              ws.videoFrames.push(parsedMessage.data)
              ws.send(JSON.stringify({
                type: WebSocketMessageTypes.RESPONSE,
                data: '视频帧已接收',
              }))
            }
            break
          }
          case WebSocketMessageTypes.VIDEO_STATE: {
            ws.isVideoOn = parsedMessage.data === 'on'
            ws.send(JSON.stringify({
              type: WebSocketMessageTypes.RESPONSE,
              data: `视频状态已更新: ${ws.isVideoOn ? '开启' : '关闭'}`,
            }))
            break
          }
          case WebSocketMessageTypes.LOGOUT: {
            ws.isRecording = false
            ws.audioChunks = []
            ws.videoFrames = []
            ws.isVideoOn = false
            if (ws.chatService)
              ws.chatService.clearQueue()
            break
          }
          default: {
            ws.send(JSON.stringify({
              type: WebSocketMessageTypes.RESPONSE,
              data: `服务器收到了你的消息：${JSON.stringify(parsedMessage)}`,
            }))
          }
        }
      }
      catch (error) {
        ws.send(JSON.stringify({
          type: WebSocketMessageTypes.ERROR,
          data: '无效的消息格式',
        }))
      }
    })
  })

  const interval = setInterval(() => {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
      if (ws.isAlive === false)
        return ws.terminate()
      ws.isAlive = false
      ws.ping()
    })
  }, PING_INTERVAL)

  wss.on('close', () => {
    clearInterval(interval)
  })

  return wss
}
