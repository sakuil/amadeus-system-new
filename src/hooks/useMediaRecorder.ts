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

  const startRecording = useCallback(() => {
    setAudioChunks([]);
    navigator.mediaDevices.getUserMedia({ 
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        sampleSize: 8,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
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
        mediaRecorder.start(150);
        setIsRecording(true);
      })
      .catch(error => {
        console.error('获取麦克风权限失败:', error);
      });
  }, []);

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
