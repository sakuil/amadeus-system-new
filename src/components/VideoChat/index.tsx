import { useEffect, useRef, useState } from 'react'
import styles from './index.module.less'
import { WebSocketMessageTypes } from '../../constants'

interface VideoChatProps {
  sendMessage: (message: { type: WebSocketMessageTypes; data?: string | string[] }) => void
}

const VideoChat = ({ sendMessage }: VideoChatProps) => {
  const videoElement = useRef<HTMLVideoElement | null>(null)
  const videoContainer = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [stream, setStream] = useState<MediaStream | null>(null)

  const captureAndSendFrame = () => {
    if (!videoElement.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return

    canvas.width = 512
    canvas.height = 512
    context.drawImage(videoElement.current, 0, 0, 512, 512)
    
    const base64Frame = canvas.toDataURL('image/jpeg', 0.8).replace(/^data:image\/jpeg;base64,/, '')
    
    sendMessage({
      type: WebSocketMessageTypes.VIDEO_FRAME,
      data: base64Frame,
    })
  }

  const getCameraStream = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      })
      setStream(newStream)
      if (videoElement.current)
        videoElement.current.srcObject = newStream
    }
    catch (error) {
      console.error('Error accessing media devices:', error)
    }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const onMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      setPosition({ x: newX, y: newY })
    }
  }

  const onMouseUp = () => {
    setIsDragging(false)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y
    })
  }

  const onTouchMove = (e: TouchEvent) => {
    if (isDragging) {
      const newX = e.touches[0].clientX - dragStart.x
      const newY = e.touches[0].clientY - dragStart.y
      setPosition({ x: newX, y: newY })
    }
  }

  useEffect(() => {
    getCameraStream()
    
    // 发送视频开启状态
    sendMessage({
      type: WebSocketMessageTypes.VIDEO_STATE,
      data: 'on'
    })
    
    const frameInterval = setInterval(captureAndSendFrame, 2000)

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onMouseUp)

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      // 发送视频关闭状态
      sendMessage({
        type: WebSocketMessageTypes.VIDEO_STATE,
        data: 'off'
      })
      clearInterval(frameInterval)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onMouseUp)
    }
  }, [isDragging, dragStart])

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div
        ref={videoContainer}
        className={styles.videoContainer}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <video ref={videoElement} autoPlay muted playsInline />
      </div>
    </>
  )
}

export default VideoChat