export enum WebSocketMessageTypes {
    PING = 'ping',
    PONG = 'pong',
    START_SPEECH = 'startSpeech',
    END_SPEECH = 'endSpeech',
    AUDIO_CHUNK = 'audioChunk',
    AI_TEXT_RESPONSE = 'text',
    AI_AUDIO_CHUNK = 'audio',
    AI_AUDIO_END = 'audioEnd',
    RESPONSE = 'response',
    ERROR = 'error',
    LOADING = 'loading',
    TEXT = 'text',
    EMOTION = 'emotion',
    SPEECH_TEXT = 'speechText',
    VIDEO_FRAME = 'videoFrame',
    VIDEO_STATE = 'videoState',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    SELF_MOTIVATED = 'selfMotivated',
  }
  
export interface WebSocketMessage {
  type: WebSocketMessageTypes
  data?: string | string[]
}
