import styles from './index.module.less'
import { useMicVAD } from '@ricky0123/vad-react'
import { usePlayer } from '@/hooks/usePlayer'
import { useEffect, useRef, useState } from 'react'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { useWebSocket } from '@/hooks/useWebSocket'
import { WebSocketMessage, WebSocketMessageTypes } from '../../constants'
import ParticleBackground from './components/ParticleBackground'
import Live2dModel from '@/components/Live2dModel'
import { observer } from 'mobx-react'
import { useStore } from '@/store/storeProvider'
import VideoChat from '@/components/VideoChat'
import ChatHistory from '@/components/ChatHistory'
import Toolbar from '@/components/Toolbar'
import LoginOverlay from '@/components/LoginOverlay'
import ConfigPanel from '@/components/ConfigPanel'
import StartDialog from '@/components/StartDialog'

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AudioChunk {
  timestamp: number;
  data: string; // base64 音频数据
}

const VoiceAssistant = observer(() => {
  const player = usePlayer({
    onAllAudioEnd: () => {
      console.log('所有音频播放完成')
      player.stop()
      if (!isSpeaking) {
        sendMessage({
          type: WebSocketMessageTypes.SELF_MOTIVATED,
          data: 'true',
        })
      }
    },
  })
  const { startRecording, stopRecording, audioChunks } = useMediaRecorder()
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)
  const { live2dStore } = useStore();
  const [isVideoOn, setIsVideoOn] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [prevAiResponse, setPrevAiResponse] = useState<string>('');
  const [latestAiMessage, setLatestAiMessage] = useState<string>('');
  const [isModelReady, setIsModelReady] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);

  const handleWebSocketMessage = useRef((message: WebSocketMessage) => {
    console.log('收到消息类型:', message.type)
    switch (message.type) {
      case WebSocketMessageTypes.AI_AUDIO_CHUNK: {
        if (message.data && typeof message.data === 'string')
          player.addChunk(message.data)
        break
      }
      case WebSocketMessageTypes.AI_AUDIO_END: {
        setIsLoading(false)
        break
      }
      case WebSocketMessageTypes.SPEECH_TEXT: {
        const text = message.data as string;
        setChatHistory(prevHistory => {
          const newMessage: ChatMessage = {
            role: 'user',
            content: text,
            timestamp: Date.now()
          };
          const updatedHistory = [...prevHistory, newMessage];
          localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
          return updatedHistory;
        });
        break
      }
      case WebSocketMessageTypes.LOADING: {
        setAiResponse('')
        setIsLoading(true)
        live2dStore.setEmotion('neutral')
        live2dStore.setMotion('thinking')
        break
      }
      case WebSocketMessageTypes.SELF_MOTIVATED: {
        setAiResponse('')
        break
      }
      case WebSocketMessageTypes.AI_TEXT_RESPONSE: {
        const newText = message.data as string;
        if (newText) {
          setChatHistory(prevHistory => {
            const newMessage: ChatMessage = {
              role: 'assistant',
              content: newText,
              timestamp: Date.now()
            };
            const updatedHistory = [...prevHistory, newMessage];
            localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
            return updatedHistory;
          });
          setLatestAiMessage(newText);
        }
        break;
      }
      default:
        console.log('收到其他类型消息:', message)
    }
  }).current

  const {
    sendMessage,
    aiResponse,
    isConnected,
    startSpeech: originalStartSpeech,
    endSpeech: originalEndSpeech,
    connect,
    disconnect,
    setAiResponse,
  } = useWebSocket({
    url: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`,
    onMessage: handleWebSocketMessage
  })

  const startSpeech = () => {
    setPrevAiResponse("")
    setIsSpeaking(true)
    live2dStore.setEmotion('neutral')
    live2dStore.setMotion('speaking')
    originalStartSpeech()
  }

  const endSpeech = () => {
    setIsSpeaking(false)
    originalEndSpeech()
  }

  const vad = useMicVAD({
    positiveSpeechThreshold: 0.9,
    minSpeechFrames: 4,
    redemptionFrames: 10,
    preSpeechPadFrames: 10,
    onSpeechStart: () => {
      startRecording()
      player.stop()
      startSpeech()
    },
    onSpeechEnd: () => {
      stopRecording()
      endSpeech()
    },
  })

  useEffect(() => {
    if (audioChunks?.length > 0) {
      const latestChunk = audioChunks[audioChunks.length - 1]
      sendMessage({
        type: WebSocketMessageTypes.AUDIO_CHUNK,
        data: {
          timestamp: Date.now(),
          data: latestChunk
        } as AudioChunk
      })
    }
  }, [audioChunks, sendMessage])

  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      const history: ChatMessage[] = JSON.parse(savedHistory);
      setChatHistory(history);
      const latestAi = history.reverse().find(msg => msg.role === 'assistant');
      if (latestAi) {
        setLatestAiMessage(latestAi.content);
      }
    }
  }, []);

  useEffect(() => {
    if (aiResponse && aiResponse !== prevAiResponse) {
      setPrevAiResponse(aiResponse);
    }
  }, [aiResponse]);

  const startVAD = () => {
    if (!vad.listening)
      vad.start()
  }

  const stopVAD = () => {
    if (vad.listening)
      vad.pause()
  }

  const handleDeleteHistory = () => {
    setChatHistory([]);
    localStorage.removeItem('chatHistory');
    setLatestAiMessage('');
  };

  const handleLogout = () => {
    player?.stop?.();
    if (vad.listening) {
      vad.pause();
    }
    localStorage.removeItem('amadeus_username');
    if (isConnected) {
      sendMessage({
        type: WebSocketMessageTypes.LOGOUT,
        data: 'user_logout'
      });
      disconnect();
    }
    setShowOverlay(true);
    setIsSpeaking(false);
    setIsLoading(false);
    setLatestAiMessage('');
  };

  const handleLogin = (username: string) => {
    const savedConfig = localStorage.getItem('live2d_config');
    if (!savedConfig) {
      setIsFirstLogin(true);
      setShowOverlay(false);
      setShowConfig(true);
      localStorage.setItem('amadeus_username', username);
    } else {
      setShowOverlay(false);
      setShowStartDialog(true);
      localStorage.setItem('amadeus_username', username);
    }
  };

  const handleConfigSave = () => {
    setShowConfig(false);
    if (isFirstLogin) {
      setShowStartDialog(true);
      setIsFirstLogin(false);
    }
  };

  const handleStartDialog = () => {
    setShowStartDialog(false);
    const username = localStorage.getItem('amadeus_username');
    if (username) {
      if (!isConnected) {
        connect().then(() => {
          sendMessage({
            type: WebSocketMessageTypes.LOGIN,
            data: username,
          });
        });
      } else {
        sendMessage({
          type: WebSocketMessageTypes.LOGIN,
          data: username,
        });
      }
    }
  };

  useEffect(() => {
    const savedUsername = localStorage.getItem('amadeus_username');
    const savedConfig = localStorage.getItem('live2d_config');
    
    if (savedUsername && savedConfig) {
      setShowOverlay(false);
      setShowStartDialog(true);
    }
  }, []);

  return (
    <>
      <ParticleBackground />
      <Live2dModel role="牧濑红莉栖" onModelReady={() => setIsModelReady(true)} />
      {showOverlay && (
        <LoginOverlay 
          onLogin={handleLogin}
          isModelReady={isModelReady}
        />
      )}
      {showStartDialog && (
        <StartDialog 
          onStart={handleStartDialog} 
          isFirstConfig={isFirstLogin}
        />
      )}
      {isVideoOn && <VideoChat sendMessage={sendMessage} />}
      <div className={styles.dialogBox}>
        <div className={styles.dialogHeader} />
        <div className={styles.content}>
          {isLoading ? (
            <span className={styles.loadingDot} />
          ) : isSpeaking ? (
            <span>倾听中...</span>
          ) : (
            <span>{aiResponse || latestAiMessage || '等待中...'}</span>
          )}
        </div>
      </div>
      <Toolbar
        isListening={vad.listening}
        isVideoOn={isVideoOn}
        onToggleListening={vad.listening ? stopVAD : startVAD}
        onToggleVideo={() => setIsVideoOn(!isVideoOn)}
        onShowHistory={() => setShowHistory(true)}
        onLogout={handleLogout}
        onShowConfig={() => setShowConfig(true)}
      />
      <ConfigPanel 
        open={showConfig}
        onOpenChange={setShowConfig}
        onSave={handleConfigSave}
      />
      <ChatHistory 
        open={showHistory}
        onOpenChange={setShowHistory}
        chatHistory={chatHistory}
        onDeleteHistory={handleDeleteHistory}
      />
    </>
  )
})

export default VoiceAssistant
