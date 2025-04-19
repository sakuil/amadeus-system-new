import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { roleToLive2dMapper } from '@/constants/live2d';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, HelpCircle, Brain, Mic, Speaker, Database, Settings, RotateCcw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface ConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

interface Live2DConfig {
  scale1: number;
  x1: number;
  y1: number;
}

interface AIConfig {
  useBuiltinService: boolean;
  llm_api_key: string;
  whisper_api_key: string;
  siliconflow_api_key: string;
  llm_base_url: string;
  llm_base_url_type: string;
  whisper_base_url: string;
  whisper_base_url_type: string;
  whisper_model: string;
  custom_whisper_model: string;
  siliconflow_voice: string;
  ai_model: string;
  custom_model_name: string;
  voice_output_language: string;
  text_output_language: string;
  system_prompt: string;
  user_name: string;
  max_context_length: number;
  mem0_api_key: string;
}

// 默认提示词
const DEFAULT_SYSTEM_PROMPT = "命运石之门(steins gate)的牧濑红莉栖(kurisu),一个天才少女,性格傲娇,不喜欢被叫克里斯蒂娜";

const ConfigPanel = ({ open, onOpenChange, onSave }: ConfigPanelProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState('avatar');
  const [live2dConfig, setLive2dConfig] = useState<Live2DConfig>({
    scale1: 0.42,
    x1: 550,
    y1: 50
  });
  
  // 添加错误状态
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    useBuiltinService: true,
    llm_api_key: '',
    whisper_api_key: '',
    siliconflow_api_key: '',
    llm_base_url: '',
    llm_base_url_type: 'aihubmix',
    whisper_base_url: '',
    whisper_base_url_type: 'aihubmix',
    whisper_model: 'whisper-large-v3',
    custom_whisper_model: '',
    siliconflow_voice: '',
    ai_model: '',
    custom_model_name: '',
    voice_output_language: 'ja',
    text_output_language: 'zh',
    system_prompt: DEFAULT_SYSTEM_PROMPT,
    user_name: localStorage.getItem('amadeus_username') || '',
    max_context_length: 20,
    mem0_api_key: ''
  });
  
  useEffect(() => {
    const savedLive2dConfig = localStorage.getItem('live2d_config');
    if (savedLive2dConfig) {
      setLive2dConfig(JSON.parse(savedLive2dConfig));
    } else {
      const defaultConfig = roleToLive2dMapper['牧濑红莉栖'];
      setLive2dConfig({
        scale1: defaultConfig.scale1,
        x1: defaultConfig.x1,
        y1: defaultConfig.y1
      });
    }
    
    const savedAiConfig = localStorage.getItem('ai_config');
    const userName = localStorage.getItem('amadeus_username') || '';
    
    if (savedAiConfig) {
      const parsedConfig = JSON.parse(savedAiConfig);
      // 确保用户名称被正确设置，如果保存的配置中没有用户名或为空，则使用localStorage中的用户名
      setAiConfig({
        ...parsedConfig,
        user_name: parsedConfig.user_name || userName
      });
    } else {
      // 如果没有保存的配置，则设置默认系统提示词和用户名
      setAiConfig(prev => ({
        ...prev,
        system_prompt: DEFAULT_SYSTEM_PROMPT,
        user_name: userName
      }));
    }
  }, [open]);

  // 监听 localStorage 变化
  useEffect(() => {
    // 处理 storage 事件，当其他页面修改 localStorage 时触发
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'amadeus_username' && event.newValue) {
        setAiConfig(prev => ({
          ...prev,
          user_name: event.newValue || ''
        }));
      } else if (event.key === 'ai_config' && event.newValue) {
        const newConfig = JSON.parse(event.newValue);
        setAiConfig(newConfig);
      }
    };

    // 添加监听器
    window.addEventListener('storage', handleStorageChange);

    // 处理自定义事件 - 用于同一页面内的更新
    const handleSamePageStorageChange = () => {
      const userName = localStorage.getItem('amadeus_username') || '';
      const savedAiConfig = localStorage.getItem('ai_config');
      
      if (savedAiConfig) {
        try {
          const parsedConfig = JSON.parse(savedAiConfig);
          setAiConfig({
            ...parsedConfig,
            user_name: parsedConfig.user_name || userName
          });
        } catch (e) {
          console.error('解析 AI 配置失败:', e);
        }
      } else {
        setAiConfig(prev => ({
          ...prev,
          user_name: userName
        }));
      }
    };

    window.addEventListener('amadeus_storage_updated', handleSamePageStorageChange);

    // 清理监听器
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('amadeus_storage_updated', handleSamePageStorageChange);
    };
  }, []);

  const handleSave = () => {
    // 重置错误状态
    setErrors({});
    
    const newErrors: {[key: string]: string} = {};
    
    // 先验证通用设置 - 无论是否使用内置服务都必须填写
    if (!aiConfig.voice_output_language) {
      newErrors.voice_output_language = '请选择语音输出语言';
    }
    
    if (!aiConfig.text_output_language) {
      newErrors.text_output_language = '请选择文本输出语言';
    }
    
    if (!aiConfig.user_name) {
      newErrors.user_name = '请填写用户名称';
    }
    
    if (!aiConfig.system_prompt) {
      newErrors.system_prompt = '请填写系统提示词';
    }
    
    // 非内置服务模式下进行更多字段校验
    if (!aiConfig.useBuiltinService) {
      // 校验 LLM 配置
      if (!aiConfig.llm_api_key) {
        newErrors.llm_api_key = '请填写 LLM API 密钥';
      }
      
      if (aiConfig.llm_base_url_type === 'custom' && !aiConfig.llm_base_url) {
        newErrors.llm_base_url = '请填写自定义 LLM 基础 URL';
      }
      
      // 校验 ASR 配置 
      if (!aiConfig.whisper_api_key) {
        newErrors.whisper_api_key = '请填写 ASR API 密钥';
      }
      
      if (aiConfig.whisper_base_url_type === 'custom' && !aiConfig.whisper_base_url) {
        newErrors.whisper_base_url = '请填写自定义 ASR 基础 URL';
      }
      
      if (aiConfig.whisper_model === 'custom' && !aiConfig.custom_whisper_model) {
        newErrors.custom_whisper_model = '请填写自定义 ASR 模型名称';
      }
      
      // 校验 TTS 配置
      if (!aiConfig.siliconflow_api_key) {
        newErrors.siliconflow_api_key = '请填写语音合成 API 密钥';
      }
      
      // 校验语音ID
      if (!aiConfig.siliconflow_voice) {
        newErrors.siliconflow_voice = '请填写语音 ID';
      }
      
      // 校验 AI 模型
      if (!aiConfig.ai_model) {
        newErrors.ai_model = '请选择 AI 模型';
      }
      
      if (aiConfig.ai_model === 'custom' && !aiConfig.custom_model_name) {
        newErrors.custom_model_name = '请填写自定义模型名称';
      }
      
      // 校验上下文消息数量
      if (!aiConfig.max_context_length || aiConfig.max_context_length < 5) {
        newErrors.max_context_length = '请填写有效的上下文消息数量(至少5)';
      }
      
      // 校验MEM0 API密钥
      if (!aiConfig.mem0_api_key) {
        newErrors.mem0_api_key = '请填写 MEM0 API 密钥';
      }
    }
    
    // 如果有错误，阻止保存并显示错误
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // 判断显示哪个tab
      const aiSettingsErrors = ['llm_api_key', 'llm_base_url', 'whisper_api_key', 
                              'whisper_base_url', 'custom_whisper_model', 'siliconflow_api_key',
                              'siliconflow_voice', 'ai_model', 'custom_model_name', 'max_context_length',
                              'voice_output_language', 'text_output_language', 'user_name', 'system_prompt',
                              'mem0_api_key'];
                              
      if (Object.keys(newErrors).some(key => aiSettingsErrors.includes(key))) {
        setActiveTab('ai');
      }
      return;
    }
    
    // 处理自定义模型名称和基础URL
    let finalConfig = {...aiConfig};
    if (aiConfig.ai_model === 'custom' && aiConfig.custom_model_name) {
      finalConfig = {
        ...finalConfig,
        ai_model: aiConfig.custom_model_name
      };
    }
    
    // 处理ASR模型名称
    if (aiConfig.whisper_model === 'custom' && aiConfig.custom_whisper_model) {
      finalConfig = {
        ...finalConfig,
        whisper_model: aiConfig.custom_whisper_model
      };
    }
    
    // 确保LLM基础URL与选择的类型相匹配
    if (aiConfig.llm_base_url_type === 'aihubmix') {
      finalConfig = {
        ...finalConfig,
        llm_base_url: 'https://aihubmix.com/v1'
      };
    } else if (aiConfig.llm_base_url_type === 'amadeus-web') {
      finalConfig = {
        ...finalConfig,
        llm_base_url: 'https://api.amadeus-web.top/v1'
      };
    }
    // 自定义LLM类型的URL保持不变
    
    // 确保ASR基础URL与选择的类型相匹配
    if (aiConfig.whisper_base_url_type === 'aihubmix') {
      finalConfig = {
        ...finalConfig,
        whisper_base_url: 'https://aihubmix.com/v1'
      };
    } else if (aiConfig.whisper_base_url_type === 'groq') {
      finalConfig = {
        ...finalConfig,
        whisper_base_url: 'https://api.groq.com/openai/v1'
      };
    }
    // 自定义ASR类型的URL保持不变
    
    // 只在本地保存配置，不发送到后端
    // 配置会在用户点击"开始对话"时发送到后端
    localStorage.setItem('live2d_config', JSON.stringify(live2dConfig));
    localStorage.setItem('ai_config', JSON.stringify(finalConfig));
    // 单独保存用户名称，使其在其他地方可以轻松获取
    localStorage.setItem('amadeus_username', finalConfig.user_name);
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'live2d_config',
      newValue: JSON.stringify(live2dConfig)
    }));
    
    // 触发自定义事件，通知同一页面内的其他组件
    window.dispatchEvent(new Event('amadeus_storage_updated'));
    
    onOpenChange(false);
    onSave?.();
  };

  const handleLive2dReset = () => {
    const defaultConfig = roleToLive2dMapper['牧濑红莉栖'];
    const newConfig = {
      scale1: defaultConfig.scale1,
      x1: defaultConfig.x1,
      y1: defaultConfig.y1
    };
    setLive2dConfig(newConfig);
    localStorage.removeItem('live2d_config');
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'live2d_config',
      newValue: JSON.stringify(newConfig)
    }));
  };

  const handleLive2dConfigChange = (newConfig: Partial<Live2DConfig>) => {
    const updatedConfig = { ...live2dConfig, ...newConfig };
    setLive2dConfig(updatedConfig);
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'live2d_config',
      newValue: JSON.stringify(updatedConfig)
    }));
  };
  
  const handleAiConfigChange = (key: keyof AIConfig, value: string | boolean | number) => {
    if (key === 'useBuiltinService' && value === true) {
      setAiConfig(prev => ({ 
        ...prev, 
        [key]: value,
        ai_model: '',
        custom_model_name: ''
      }));
      // 切换到内置服务模式时清除错误状态
      setErrors({});
    } else if (key === 'llm_base_url_type') {
      const baseUrlValue = value as string;
      let actualBaseUrl = '';
      
      // 根据选择的类型设置实际的基础URL
      if (baseUrlValue === 'aihubmix') {
        actualBaseUrl = 'https://aihubmix.com/v1';
      } else if (baseUrlValue === 'amadeus-web') {
        actualBaseUrl = 'https://api.amadeus-web.top/v1';
      } else if (baseUrlValue === 'custom') {
        // 保持当前的自定义URL
        actualBaseUrl = aiConfig.llm_base_url;
      }
      
      setAiConfig(prev => ({ 
        ...prev, 
        llm_base_url_type: baseUrlValue,
        llm_base_url: actualBaseUrl
      }));
      
      // 清除相关字段的错误
      if (baseUrlValue !== 'custom') {
        setErrors(prev => {
          const newErrors = {...prev};
          delete newErrors.llm_base_url;
          return newErrors;
        });
      }
    } else if (key === 'whisper_base_url_type') {
      const baseUrlValue = value as string;
      let actualBaseUrl = '';
      
      // 根据选择的类型设置实际的基础URL
      if (baseUrlValue === 'aihubmix') {
        actualBaseUrl = 'https://aihubmix.com/v1';
      } else if (baseUrlValue === 'groq') {
        actualBaseUrl = 'https://api.groq.com/openai/v1';
      } else if (baseUrlValue === 'custom') {
        // 保持当前的自定义URL
        actualBaseUrl = aiConfig.whisper_base_url;
      }
      
      setAiConfig(prev => ({ 
        ...prev, 
        whisper_base_url_type: baseUrlValue,
        whisper_base_url: actualBaseUrl
      }));
      
      // 清除相关字段的错误
      if (baseUrlValue !== 'custom') {
        setErrors(prev => {
          const newErrors = {...prev};
          delete newErrors.whisper_base_url;
          return newErrors;
        });
      }
    } else if (key === 'whisper_model') {
      const modelValue = value as string;
      
      // 如果不是自定义选项，清空自定义模型名称
      if (modelValue !== 'custom') {
        setAiConfig(prev => ({
          ...prev,
          whisper_model: modelValue,
          custom_whisper_model: ''
        }));
        
        // 清除相关字段的错误
        setErrors(prev => {
          const newErrors = {...prev};
          delete newErrors.custom_whisper_model;
          return newErrors;
        });
      } else {
        setAiConfig(prev => ({
          ...prev,
          whisper_model: modelValue
        }));
      }
    } else {
      setAiConfig(prev => ({ ...prev, [key]: value }));
      
      // 清除当前字段的错误（如果有）
      if (errors[key]) {
        setErrors(prev => {
          const newErrors = {...prev};
          delete newErrors[key];
          return newErrors;
        });
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[95%] sm:w-[450px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>配置</SheetTitle>
        </SheetHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="avatar">虚拟形象</TabsTrigger>
            <TabsTrigger value="ai">AI 设置</TabsTrigger>
          </TabsList>
          
          <TabsContent value="avatar" className="mt-4">
            <h3 className="text-lg font-medium mb-4">虚拟形象配置</h3>
            <Alert variant="info" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                请通过调整以下参数确保虚拟形象位于屏幕可视区域内，并且位置和缩放比例调整合适后，再点击保存配置
              </AlertDescription>
            </Alert>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label className="sm:text-right">缩放比例:</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={live2dConfig.scale1}
                  onChange={(e) => handleLive2dConfigChange({ scale1: parseFloat(e.target.value) })}
                  className="sm:col-span-3"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label className="sm:text-right">X 坐标:</Label>
                <Input
                  type="number"
                  value={live2dConfig.x1}
                  onChange={(e) => handleLive2dConfigChange({ x1: parseInt(e.target.value) })}
                  className="sm:col-span-3"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label className="sm:text-right">Y 坐标:</Label>
                <Input
                  type="number"
                  value={live2dConfig.y1}
                  onChange={(e) => handleLive2dConfigChange({ y1: parseInt(e.target.value) })}
                  className="sm:col-span-3"
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button variant="outline" onClick={handleLive2dReset} size="sm">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  重置默认
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="ai" className="mt-4">
            <h3 className="text-lg font-medium mb-4">AI 设置</h3>
            
            <div className="flex items-center space-x-2 mb-6">
              <Switch 
                checked={aiConfig.useBuiltinService}
                onCheckedChange={(checked: boolean) => handleAiConfigChange('useBuiltinService', checked)}
              />
              <Label>公有WebRTC服务器内置AI服务</Label>
            </div>
            
            {aiConfig.useBuiltinService ? (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  当前开启使用了公有WebRTC服务器里内置的各种AI服务的API地址和密钥，不保证内置AI服务的稳定性。建议自定义AI服务，把上面的开关关闭即可进行配置。
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-6">
                {/* LLM 配置 */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-5 w-5 text-primary" />
                    <h4 className="text-md font-medium">LLM 配置</h4>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label className="sm:text-right">LLM API 密钥:</Label>
                      <Input
                        type="password"
                        value={aiConfig.llm_api_key}
                        onChange={(e) => handleAiConfigChange('llm_api_key', e.target.value)}
                        className={`sm:col-span-3 ${errors.llm_api_key ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.llm_api_key && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <div className="sm:col-span-1"></div>
                        <div className="text-red-500 text-xs sm:col-span-3">{errors.llm_api_key}</div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label className="sm:text-right">LLM 基础 URL:</Label>
                      <Select 
                        value={aiConfig.llm_base_url_type} 
                        onValueChange={(value: string) => handleAiConfigChange('llm_base_url_type', value)}
                      >
                        <SelectTrigger className="sm:col-span-3">
                          <SelectValue placeholder="选择LLM基础URL类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amadeus-web">https://api.amadeus-web.top/v1</SelectItem>
                          <SelectItem value="aihubmix">https://aihubmix.com/v1</SelectItem>
                          <SelectItem value="custom">自定义</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {aiConfig.llm_base_url_type === 'custom' && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4 mt-2">
                        <Label className="sm:text-right">自定义 URL:</Label>
                        <Input
                          value={aiConfig.llm_base_url}
                          onChange={(e) => handleAiConfigChange('llm_base_url', e.target.value)}
                          className={`sm:col-span-3 ${errors.llm_base_url ? 'border-red-500' : ''}`}
                          placeholder="请输入自定义基础URL"
                        />
                      </div>
                    )}
                    {errors.llm_base_url && aiConfig.llm_base_url_type === 'custom' && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <div className="sm:col-span-1"></div>
                        <div className="text-red-500 text-xs sm:col-span-3">{errors.llm_base_url}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* ASR 设置 */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Mic className="h-5 w-5 text-primary" />
                    <h4 className="text-md font-medium">ASR 语音识别设置</h4>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label className="sm:text-right">ASR API 密钥:</Label>
                      <Input
                        type="password"
                        value={aiConfig.whisper_api_key}
                        onChange={(e) => handleAiConfigChange('whisper_api_key', e.target.value)}
                        className={`sm:col-span-3 ${errors.whisper_api_key ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.whisper_api_key && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <div className="sm:col-span-1"></div>
                        <div className="text-red-500 text-xs sm:col-span-3">{errors.whisper_api_key}</div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label className="sm:text-right">ASR 基础 URL:</Label>
                      <Select 
                        value={aiConfig.whisper_base_url_type} 
                        onValueChange={(value: string) => handleAiConfigChange('whisper_base_url_type', value)}
                      >
                        <SelectTrigger className="sm:col-span-3">
                          <SelectValue placeholder="选择ASR基础URL类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aihubmix">https://aihubmix.com/v1</SelectItem>
                          <SelectItem value="groq">https://api.groq.com/openai/v1</SelectItem>
                          <SelectItem value="custom">自定义</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {aiConfig.whisper_base_url_type === 'custom' && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4 mt-2">
                        <Label className="sm:text-right">自定义 URL:</Label>
                        <Input
                          value={aiConfig.whisper_base_url}
                          onChange={(e) => handleAiConfigChange('whisper_base_url', e.target.value)}
                          className={`sm:col-span-3 ${errors.whisper_base_url ? 'border-red-500' : ''}`}
                          placeholder="请输入自定义基础URL"
                        />
                      </div>
                    )}
                    {errors.whisper_base_url && aiConfig.whisper_base_url_type === 'custom' && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <div className="sm:col-span-1"></div>
                        <div className="text-red-500 text-xs sm:col-span-3">{errors.whisper_base_url}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label className="sm:text-right">ASR 模型:</Label>
                      <Select 
                        value={aiConfig.whisper_model} 
                        onValueChange={(value: string) => handleAiConfigChange('whisper_model', value)}
                      >
                        <SelectTrigger className="sm:col-span-3">
                          <SelectValue placeholder="选择ASR模型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whisper-large-v3">whisper-large-v3</SelectItem>
                          <SelectItem value="whisper-large-v3-turbo">whisper-large-v3-turbo</SelectItem>
                          <SelectItem value="custom">自定义</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {aiConfig.whisper_model === 'custom' && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4 mt-2">
                        <Label className="sm:text-right">自定义模型:</Label>
                        <Input
                          value={aiConfig.custom_whisper_model}
                          onChange={(e) => handleAiConfigChange('custom_whisper_model', e.target.value)}
                          className={`sm:col-span-3 ${errors.custom_whisper_model ? 'border-red-500' : ''}`}
                          placeholder="请输入自定义模型名称"
                        />
                      </div>
                    )}
                    {errors.custom_whisper_model && aiConfig.whisper_model === 'custom' && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <div className="sm:col-span-1"></div>
                        <div className="text-red-500 text-xs sm:col-span-3">{errors.custom_whisper_model}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* TTS 设置 */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Speaker className="h-5 w-5 text-primary" />
                    <h4 className="text-md font-medium">TTS 语音合成设置</h4>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label className="sm:text-right">服务提供商:</Label>
                      <Select 
                        value="siliconflow" 
                        onValueChange={(value) => {
                          // 目前只支持硅基流动，未来可以扩展其他提供商
                          console.log("TTS provider selected:", value);
                        }}
                      >
                        <SelectTrigger className="sm:col-span-3">
                          <SelectValue placeholder="选择语音服务提供商" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="siliconflow">硅基流动</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label className="sm:text-right">硅基流动 API 密钥:</Label>
                      <Input
                        type="password"
                        value={aiConfig.siliconflow_api_key}
                        onChange={(e) => handleAiConfigChange('siliconflow_api_key', e.target.value)}
                        className={`sm:col-span-3 ${errors.siliconflow_api_key ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.siliconflow_api_key && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <div className="sm:col-span-1"></div>
                        <div className="text-red-500 text-xs sm:col-span-3">{errors.siliconflow_api_key}</div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label className="sm:text-right">语音 ID:</Label>
                      <Input
                        value={aiConfig.siliconflow_voice}
                        onChange={(e) => handleAiConfigChange('siliconflow_voice', e.target.value)}
                        className={`sm:col-span-3 ${errors.siliconflow_voice ? 'border-red-500' : ''}`}
                        placeholder="请输入语音合成服务的语音ID"
                      />
                    </div>
                    {errors.siliconflow_voice && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <div className="sm:col-span-1"></div>
                        <div className="text-red-500 text-xs sm:col-span-3">{errors.siliconflow_voice}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* MEM0 记忆配置 */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="h-5 w-5 text-primary" />
                    <h4 className="text-md font-medium">MEM0 记忆配置</h4>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <div className="sm:text-right flex items-center sm:justify-end">
                        <Label>MEM0 API 密钥:</Label>
                        <div className="relative inline-block ml-1 group">
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          <div className="absolute invisible group-hover:visible w-64 bg-popover text-popover-foreground text-xs rounded p-2 -left-8 -top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                            长期记忆服务的密钥，不设置则使用系统默认值
                          </div>
                        </div>
                      </div>
                      <Input
                        type="password"
                        value={aiConfig.mem0_api_key}
                        onChange={(e) => handleAiConfigChange('mem0_api_key', e.target.value)}
                        className={`sm:col-span-3 ${errors.mem0_api_key ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.mem0_api_key && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <div className="sm:col-span-1"></div>
                        <div className="text-red-500 text-xs sm:col-span-3">{errors.mem0_api_key}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="rounded-lg border p-4 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5 text-primary" />
                <h4 className="text-md font-medium">通用设置</h4>
              </div>
              <div className="grid gap-4">
                {!aiConfig.useBuiltinService && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                    <Label className="sm:text-right">AI 模型:</Label>
                    <Select 
                      value={aiConfig.ai_model} 
                      onValueChange={(value: string) => {
                        handleAiConfigChange('ai_model', value);
                        // 如果不是自定义选项，清空自定义模型名称
                        if (value !== 'custom') {
                          handleAiConfigChange('custom_model_name', '');
                        }
                      }}
                    >
                      <SelectTrigger className={`sm:col-span-3 ${errors.ai_model ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="选择 AI 模型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4.1-mini">gpt-4.1-mini</SelectItem>
                        <SelectItem value="gemini-2.0-flash">gemini-2.0-flash</SelectItem>
                        <SelectItem value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</SelectItem>
                        <SelectItem value="claude-3-7-sonnet-20250219">claude-3-7-sonnet-20250219</SelectItem>
                        <SelectItem value="custom">自定义模型ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {errors.ai_model && !aiConfig.useBuiltinService && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                    <div className="sm:col-span-1"></div>
                    <div className="text-red-500 text-xs sm:col-span-3">{errors.ai_model}</div>
                  </div>
                )}
                
                {aiConfig.ai_model === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4 mt-2">
                    <Label className="sm:text-right">自定义模型ID:</Label>
                    <Input
                      value={aiConfig.custom_model_name}
                      onChange={(e) => {
                        const customName = e.target.value;
                        handleAiConfigChange('custom_model_name', customName);
                      }}
                      className={`sm:col-span-3 ${errors.custom_model_name ? 'border-red-500' : ''}`}
                      placeholder="请输入自定义模型ID"
                    />
                  </div>
                )}
                {errors.custom_model_name && aiConfig.ai_model === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                    <div className="sm:col-span-1"></div>
                    <div className="text-red-500 text-xs sm:col-span-3">{errors.custom_model_name}</div>
                  </div>
                )}
                
                {!aiConfig.useBuiltinService && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                    <div className="sm:text-right flex items-center sm:justify-end">
                      <Label>上下文消息数量:</Label>
                      <div className="relative inline-block ml-1 group">
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        <div className="absolute invisible group-hover:visible w-64 bg-popover text-popover-foreground text-xs rounded p-2 -left-8 -top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                          控制发送给AI模型的上下文消息数量，数值越大效果越好但消耗更多资源。推荐值：20-50
                        </div>
                      </div>
                    </div>
                    <Input
                      type="number"
                      value={aiConfig.max_context_length}
                      onChange={(e) => handleAiConfigChange('max_context_length', parseInt(e.target.value) || 20)}
                      className={`sm:col-span-3 ${errors.max_context_length ? 'border-red-500' : ''}`}
                      placeholder="20"
                      min="5"
                      max="100"
                    />
                  </div>
                )}
                {errors.max_context_length && !aiConfig.useBuiltinService && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                    <div className="sm:col-span-1"></div>
                    <div className="text-red-500 text-xs sm:col-span-3">{errors.max_context_length}</div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label className="sm:text-right">语音输出语言:</Label>
                  <Select 
                    value={aiConfig.voice_output_language} 
                    onValueChange={(value: string) => handleAiConfigChange('voice_output_language', value)}
                  >
                    <SelectTrigger className={`sm:col-span-3 ${errors.voice_output_language ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="选择语音输出语言" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">中文</SelectItem>
                      <SelectItem value="en">英文</SelectItem>
                      <SelectItem value="ja">日文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.voice_output_language && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                    <div className="sm:col-span-1"></div>
                    <div className="text-red-500 text-xs sm:col-span-3">{errors.voice_output_language}</div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label className="sm:text-right">文本输出语言:</Label>
                  <Select 
                    value={aiConfig.text_output_language} 
                    onValueChange={(value: string) => handleAiConfigChange('text_output_language', value)}
                  >
                    <SelectTrigger className={`sm:col-span-3 ${errors.text_output_language ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="选择文本输出语言" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">中文</SelectItem>
                      <SelectItem value="en">英文</SelectItem>
                      <SelectItem value="ja">日文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.text_output_language && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                    <div className="sm:col-span-1"></div>
                    <div className="text-red-500 text-xs sm:col-span-3">{errors.text_output_language}</div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label className="sm:text-right">用户名称:</Label>
                  <Input
                    value={aiConfig.user_name}
                    onChange={(e) => handleAiConfigChange('user_name', e.target.value)}
                    className={`sm:col-span-3 ${errors.user_name ? 'border-red-500' : ''}`}
                    placeholder="您的名称"
                  />
                </div>
                {errors.user_name && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                    <div className="sm:col-span-1"></div>
                    <div className="text-red-500 text-xs sm:col-span-3">{errors.user_name}</div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4 mt-2">
                  <Label className="sm:text-right mt-2">系统提示词:</Label>
                  <Textarea
                    value={aiConfig.system_prompt}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleAiConfigChange('system_prompt', e.target.value)}
                    className={`sm:col-span-3 min-h-[100px] ${errors.system_prompt ? 'border-red-500' : ''}`}
                    placeholder="输入系统提示词，定义AI的角色和行为..."
                  />
                </div>
                {errors.system_prompt && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                    <div className="sm:col-span-1"></div>
                    <div className="text-red-500 text-xs sm:col-span-3">{errors.system_prompt}</div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* 错误摘要提示 */}
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive" className="mt-4 mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              请完善必填字段后再保存配置
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-end gap-4 mt-8 mb-12">
          <Button onClick={handleSave}>
            <Settings className="h-4 w-4 mr-1" />
            保存配置
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ConfigPanel; 
