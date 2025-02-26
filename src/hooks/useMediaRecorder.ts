import { useState, useCallback, useRef } from 'react';

interface MediaRecorderHook {
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: boolean;
  audioChunks: string[];
}

export function useMediaRecorder(): MediaRecorderHook {
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<string[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // 检查浏览器支持的 MIME 类型
  const getSupportedMimeType = useCallback(() => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
      'audio/mpeg'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`浏览器支持的音频格式: ${type}`);
        return type;
      }
    }
    
    // 如果没有找到支持的类型，返回默认值
    console.warn('浏览器不支持任何预设的音频格式，使用默认格式');
    return '';
  }, []);

  const startRecording = useCallback(() => {
    setAudioChunks([]);
    navigator.mediaDevices.getUserMedia({ 
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        sampleSize: 16,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    })
      .then(stream => {
        const options: MediaRecorderOptions = { 
          audioBitsPerSecond: 32000 
        };
        
        // 获取浏览器支持的 MIME 类型
        const mimeType = getSupportedMimeType();
        if (mimeType) {
          options.mimeType = mimeType;
        }
        
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                const base64Audio = reader.result.split(',')[1];
                setAudioChunks(chunks => [...chunks, base64Audio]);
              }
            };
            reader.readAsDataURL(event.data);
          }
        };
        mediaRecorder.start(100);
        setIsRecording(true);
      })
      .catch(error => {
        console.error('获取麦克风权限失败:', error);
      });
  }, [getSupportedMimeType]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    audioChunks,
  };
}
