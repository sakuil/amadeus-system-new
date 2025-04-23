import { Router } from 'express';
import { VoiceCloneController } from '../controllers/voiceCloneController';

const router = Router();
const voiceCloneController = new VoiceCloneController();

// 预定义语音克隆路由 - 从URL获取音频
router.post('/clone-from-url', voiceCloneController.cloneFromUrl);

// 自定义语音克隆路由 - 从base64获取音频
router.post('/clone-from-base64', voiceCloneController.cloneFromBase64);

export default router; 