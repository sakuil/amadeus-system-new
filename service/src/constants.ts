export const nameMapper = { steinsGate: '牧濑红莉栖(kurisu)，冈部伦太郎(okabe)，椎名真由理(mayuri)，比屋定真帆(maho)，阿万音铃羽(suzuha)，漆原琉华(Urushibara Ruka),桶子(daru)，雷斯吉宁(Leskinen)，桐生萌郁(Kiriyu Moeka),菲利斯(Faris NyanNyan)，天王寺裕吾(Mr.Braun)，椎名篝(Kagari)，绹(Tennouji nae)，阿万音由季(Yuki)，牧濑章一(Shouichi Makise)' }

export const voiceToVoiceMapper: any = {
  '4c0b21b2ddb247d8ba45a1c1e84afe64': '11',
  'ca597fbfabaa496c8419e4e7c3ca95ef': '13',
  '3e9fbf19ee114896ad0e8f38f6bd14e5': '12',
  '6e51b1bfbd2f46689b37005ad50147ac': '10',
  '354ac66e06614a0aa89626b0c8fc8797': '7',
}

export const filteredNames = ['蒋介石', '希特勒']

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
