import { useState, useEffect, useCallback, useRef } from 'react'
import { WebSocketMessage, WebSocketMessageTypes } from '../constants'
import { useStore } from '@/store/storeProvider'

const RECONNECT_INTERVAL = 5000
const PING_INTERVAL = 5000

interface UseWebSocketOptions {
  url: string
  onMessage: (message: WebSocketMessage) => void
  autoConnect?: boolean
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
}

export function useWebSocket({ url, onMessage, onOpen, onClose, onError }: UseWebSocketOptions) {
  const { live2dStore } = useStore();
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [aiResponse, setAiResponse] = useState<string>('')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const pingIntervalRef = useRef<NodeJS.Timeout>()

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket 已连接，无需重新建立连接')
      return Promise.resolve(wsRef.current)
    }

    return new Promise<WebSocket>((resolve) => {
      const wsUrl = new URL(url)
      wsUrl.searchParams.append('token', import.meta.env.VITE_AUTH_API_TOKEN)
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = (event) => {
        console.log('WebSocket 连接已建立')
        setIsConnected(true)
        onOpen?.(event)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: 'ping' }))
        }, PING_INTERVAL)
        resolve(ws)
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          if (message.type === WebSocketMessageTypes.PONG) {
            console.log('收到服务器 pong')
          }
          else if (message.type === WebSocketMessageTypes.AI_TEXT_RESPONSE) {
            const newText = message.data || ''
            setAiResponse(prev => prev + newText)
            onMessage({
              type: WebSocketMessageTypes.AI_TEXT_RESPONSE,
              data: newText
            })
          }
          else if(message.type === WebSocketMessageTypes.EMOTION){
            live2dStore.setEmotion((message.data as string) || '')
            live2dStore.setMotion((message.data as string) || '')
          }
          else {
            onMessage(message)
          }
        }
        catch (error) {
          console.error('解析消息时出错:', error)
        }
      }

      ws.onclose = (event) => {
        console.log('WebSocket 连接已关闭')
        setIsConnected(false)
        setIsRecording(false)
        clearInterval(pingIntervalRef.current)
        onClose?.(event)
        reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_INTERVAL)
      }

      ws.onerror = (event) => {
        console.error('WebSocket 错误:', event)
        onError?.(event)
      }
    })
  }, [url, onMessage, onOpen, onClose, onError])

  useEffect(() => {
    return () => {
      wsRef.current?.close()
      clearTimeout(reconnectTimeoutRef.current)
      clearInterval(pingIntervalRef.current)
    }
  }, [])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify(message))
    else
      console.warn('WebSocket 未连接,无法发送消息')
  }, [])

  const startSpeech = useCallback(() => {
    sendMessage({ type: WebSocketMessageTypes.START_SPEECH })
    setIsRecording(true)
    setAiResponse('')
  }, [sendMessage])

  const endSpeech = useCallback(() => {
    sendMessage({ type: WebSocketMessageTypes.END_SPEECH })
    setIsRecording(false)
  }, [sendMessage])

  const sendAudioChunk = useCallback((base64AudioData: string) => {
    if (isRecording)
      sendMessage({ type: WebSocketMessageTypes.AUDIO_CHUNK, data: base64AudioData })
    else
      console.warn('未在录音状态,无法发送音频数据')
  }, [isRecording, sendMessage])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      clearTimeout(reconnectTimeoutRef.current)
      clearInterval(pingIntervalRef.current)
      setIsConnected(false)
      setIsRecording(false)
    }
  }, [])

  return {
    isConnected,
    isRecording,
    aiResponse,
    sendMessage,
    startSpeech,
    endSpeech,
    sendAudioChunk,
    connect,
    setAiResponse,
    disconnect,
  }
}