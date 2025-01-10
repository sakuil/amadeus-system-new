import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { roleToLive2dMapper } from '@/constants/live2d';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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

const ConfigPanel: React.FC<ConfigPanelProps> = ({ open, onOpenChange, onSave }) => {
  const [config, setConfig] = useState<Live2DConfig>({
    scale1: 0.42,
    x1: 550,
    y1: 50
  });

  useEffect(() => {
    const savedConfig = localStorage.getItem('live2d_config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    } else {
      const defaultConfig = roleToLive2dMapper['牧濑红莉栖'];
      setConfig({
        scale1: defaultConfig.scale1,
        x1: defaultConfig.x1,
        y1: defaultConfig.y1
      });
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('live2d_config', JSON.stringify(config));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'live2d_config',
      newValue: JSON.stringify(config)
    }));
    onOpenChange(false);
    onSave?.();
  };

  const handleReset = () => {
    const defaultConfig = roleToLive2dMapper['牧濑红莉栖'];
    const newConfig = {
      scale1: defaultConfig.scale1,
      x1: defaultConfig.x1,
      y1: defaultConfig.y1
    };
    setConfig(newConfig);
    localStorage.removeItem('live2d_config');
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'live2d_config',
      newValue: JSON.stringify(newConfig)
    }));
  };

  const handleConfigChange = (newConfig: Partial<Live2DConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'live2d_config',
      newValue: JSON.stringify(updatedConfig)
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[400px]">
        <SheetHeader>
          <SheetTitle>配置</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">虚拟形象配置</h3>
          <Alert variant="info" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              请通过调整以下参数确保虚拟形象位于屏幕可视区域内，并且位置和缩放比例调整合适后，再点击保存配置
            </AlertDescription>
          </Alert>
          <div className="grid gap-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">缩放比例:</Label>
              <Input
                type="number"
                step="0.01"
                value={config.scale1}
                onChange={(e) => handleConfigChange({ scale1: parseFloat(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">X 坐标:</Label>
              <Input
                type="number"
                value={config.x1}
                onChange={(e) => handleConfigChange({ x1: parseInt(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Y 坐标:</Label>
              <Input
                type="number"
                value={config.y1}
                onChange={(e) => handleConfigChange({ y1: parseInt(e.target.value) })}
                className="col-span-3"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-4 absolute bottom-6 right-6">
          <Button variant="outline" onClick={handleReset}>
            重置默认
          </Button>
          <Button onClick={handleSave}>
            保存配置
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ConfigPanel; 