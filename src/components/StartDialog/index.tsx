import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import styles from './index.module.less';

interface StartDialogProps {
  onStart: () => void;
  isFirstConfig?: boolean;
  isConnecting?: boolean;
}

const StartDialog: React.FC<StartDialogProps> = ({ onStart, isFirstConfig, isConnecting = false }) => {
  return (
    <div className={styles.overlay}>
      <Card className={styles.card}>
        <h2 className="text-lg font-semibold mb-4">准备就绪</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {isConnecting
            ? "正在建立连接，请稍候..."
            : isFirstConfig 
              ? "虚拟形象初始配置已完成，请确认虚拟形象位置合适后点击下方按钮开始对话"
              : "已就绪，点击下方按钮开始对话"}
        </p>
        <Button 
          onClick={onStart} 
          className="w-full"
          disabled={isConnecting}
        >
          {isConnecting ? "连接中..." : "开始对话"}
        </Button>
      </Card>
    </div>
  );
};

export default StartDialog; 