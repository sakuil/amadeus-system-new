import { Request, Response } from 'express';
import { VoiceCloneService } from '../services/voiceCloneService';

export class VoiceCloneController {
  private voiceCloneService: VoiceCloneService;

  constructor() {
    this.voiceCloneService = new VoiceCloneService();
  }

  // 处理预定义语音克隆
  public cloneFromUrl = async (req: Request, res: Response): Promise<void> => {
    try {
      const { audioUrl, text, customName, model } = req.body;
      const apiKey = req.headers.authorization?.split(' ')[1];

      if (!apiKey) {
        res.status(401).json({ error: { message: '未提供API密钥' } });
        return;
      }

      if (!audioUrl || !text || !customName || !model) {
        res.status(400).json({ error: { message: '缺少必要参数' } });
        return;
      }

      const result = await this.voiceCloneService.cloneVoiceFromUrl(audioUrl, text, customName, model, apiKey);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('语音克隆失败:', error);
      res.status(500).json({ error: { message: error.message || '语音克隆失败' } });
    }
  };

  // 处理自定义上传的语音克隆
  public cloneFromBase64 = async (req: Request, res: Response): Promise<void> => {
    try {
      const { audio, text, customName, model } = req.body;
      const apiKey = req.headers.authorization?.split(' ')[1];

      if (!apiKey) {
        res.status(401).json({ error: { message: '未提供API密钥' } });
        return;
      }

      if (!audio || !text || !customName || !model) {
        res.status(400).json({ error: { message: '缺少必要参数' } });
        return;
      }
      const result = await this.voiceCloneService.cloneVoiceFromBase64(audio, text, customName, model, apiKey);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('语音克隆失败:', error);
      res.status(500).json({ error: { message: error.message || '语音克隆失败' } });
    }
  };
} 