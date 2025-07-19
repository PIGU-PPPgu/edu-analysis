import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  MessageSquare, 
  Bot, 
  Trash2, 
  TestTube, 
  Star,
  StarOff,
  Settings
} from 'lucide-react';
import { 
  botSettingsService, 
  type BotSettings, 
  type BotType 
} from '@/services/botSettingsService';

interface BotManagementProps {
  className?: string;
}

const BotManagement: React.FC<BotManagementProps> = ({ className }) => {
  const [botSettings, setBotSettings] = useState<BotSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBot, setEditingBot] = useState<BotSettings | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [testingBotId, setTestingBotId] = useState<string | null>(null);
  
  // 新增机器人表单状态
  const [newBot, setNewBot] = useState<Partial<BotSettings>>({
    bot_type: 'wechat',
    bot_name: '',
    webhook_url: '',
    is_enabled: true,
    is_default: false
  });

  const botTypeLabels = {
    wechat: '企业微信',
    dingtalk: '钉钉'
  };

  const botTypeIcons = {
    wechat: MessageSquare,
    dingtalk: Bot
  };

  useEffect(() => {
    loadBotSettings();
  }, []);

  const loadBotSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await botSettingsService.getUserBotSettings();
      setBotSettings(settings);
    } catch (error) {
      console.error('加载机器人设置失败:', error);
      toast.error('加载机器人设置失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBot = async (bot: Partial<BotSettings>) => {
    try {
      if (!bot.bot_name?.trim()) {
        toast.error('请输入机器人名称');
        return;
      }
      
      if (!bot.webhook_url?.trim()) {
        toast.error('请输入Webhook URL');
        return;
      }

      // 验证URL格式
      const urlPatterns = {
        wechat: /^https:\/\/qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send\?key=[\w-]+$/,
        dingtalk: /^https:\/\/oapi\.dingtalk\.com\/robot\/send\?access_token=[\w-]+$/
      };

      if (!urlPatterns[bot.bot_type as BotType]?.test(bot.webhook_url)) {
        toast.error(`请输入有效的${botTypeLabels[bot.bot_type as BotType]}Webhook URL`);
        return;
      }

      await botSettingsService.saveBotSettings(bot as Omit<BotSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>);
      
      toast.success('机器人设置保存成功');
      setIsAddingNew(false);
      setEditingBot(null);
      setNewBot({
        bot_type: 'wechat',
        bot_name: '',
        webhook_url: '',
        is_enabled: true,
        is_default: false
      });
      
      await loadBotSettings();
    } catch (error) {
      console.error('保存机器人设置失败:', error);
      toast.error('保存失败');
    }
  };

  const handleDeleteBot = async (id: string) => {
    if (!confirm('确定要删除这个机器人设置吗？')) {
      return;
    }

    try {
      await botSettingsService.deleteBotSettings(id);
      toast.success('机器人设置已删除');
      await loadBotSettings();
    } catch (error) {
      console.error('删除机器人设置失败:', error);
      toast.error('删除失败');
    }
  };

  const handleTestBot = async (bot: BotSettings) => {
    try {
      setTestingBotId(bot.id);
      const result = await botSettingsService.testBotConnection(bot.bot_type, bot.webhook_url);
      
      if (result.success) {
        toast.success(`${botTypeLabels[bot.bot_type]}机器人测试成功！请检查群聊中的测试消息`);
      } else {
        toast.error(`测试失败: ${result.message}`);
      }
    } catch (error) {
      toast.error('测试失败');
    } finally {
      setTestingBotId(null);
    }
  };

  const handleToggleEnabled = async (bot: BotSettings) => {
    try {
      await botSettingsService.toggleBotEnabled(bot.id!, !bot.is_enabled);
      toast.success(`机器人已${!bot.is_enabled ? '启用' : '禁用'}`);
      await loadBotSettings();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleSetDefault = async (bot: BotSettings) => {
    try {
      await botSettingsService.setDefaultBot(bot.id!, bot.bot_type);
      toast.success(`已设为默认${botTypeLabels[bot.bot_type]}机器人`);
      await loadBotSettings();
    } catch (error) {
      toast.error('设置失败');
    }
  };

  const renderBotCard = (bot: BotSettings) => {
    const Icon = botTypeIcons[bot.bot_type];
    const isEditing = editingBot?.id === bot.id;
    
    return (
      <Card key={bot.id} className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <CardTitle className="text-lg">{bot.bot_name}</CardTitle>
              <Badge variant={bot.bot_type === 'wechat' ? 'default' : 'secondary'}>
                {botTypeLabels[bot.bot_type]}
              </Badge>
              {bot.is_default && (
                <Badge variant="outline" className="border-yellow-400 text-yellow-600">
                  <Star className="h-3 w-3 mr-1" />
                  默认
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={bot.is_enabled}
                onCheckedChange={() => handleToggleEnabled(bot)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingBot(bot)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteBot(bot.id!)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-600">
            Webhook: {bot.webhook_url.substring(0, 50)}...
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestBot(bot)}
              disabled={testingBotId === bot.id}
            >
              <TestTube className="h-4 w-4 mr-1" />
              {testingBotId === bot.id ? '测试中...' : '测试连接'}
            </Button>
            
            {!bot.is_default && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetDefault(bot)}
              >
                <Star className="h-4 w-4 mr-1" />
                设为默认
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEditForm = (bot: BotSettings | Partial<BotSettings>, isNew: boolean = false) => {
    const updateBot = (field: keyof BotSettings, value: any) => {
      if (isNew) {
        setNewBot(prev => ({ ...prev, [field]: value }));
      } else {
        setEditingBot(prev => prev ? { ...prev, [field]: value } : null);
      }
    };

    const currentBot = isNew ? newBot : (editingBot as BotSettings);

    return (
      <Card>
        <CardHeader>
          <CardTitle>{isNew ? '添加新机器人' : '编辑机器人'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>机器人类型</Label>
              <Select
                value={currentBot.bot_type}
                onValueChange={(value) => updateBot('bot_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wechat">企业微信</SelectItem>
                  <SelectItem value="dingtalk">钉钉</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>机器人名称</Label>
              <Input
                value={currentBot.bot_name || ''}
                onChange={(e) => updateBot('bot_name', e.target.value)}
                placeholder="如：财务群机器人"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input
              value={currentBot.webhook_url || ''}
              onChange={(e) => updateBot('webhook_url', e.target.value)}
              placeholder={
                currentBot.bot_type === 'wechat' 
                  ? "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                  : "https://oapi.dingtalk.com/robot/send?access_token=..."
              }
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={currentBot.is_enabled}
                onCheckedChange={(checked) => updateBot('is_enabled', checked)}
              />
              <Label>启用推送</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={currentBot.is_default}
                onCheckedChange={(checked) => updateBot('is_default', checked)}
              />
              <Label>设为默认</Label>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => handleSaveBot(currentBot)}>
              保存
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingNew(false);
                setEditingBot(null);
                setNewBot({
                  bot_type: 'wechat',
                  bot_name: '',
                  webhook_url: '',
                  is_enabled: true,
                  is_default: false
                });
              }}
            >
              取消
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  // 检查是否在父组件的Card中（通过className判断）
  const isEmbedded = className?.includes('border-0') || className?.includes('p-0');

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 只在独立使用时显示说明卡片和标题 */}
      {!isEmbedded && (
        <>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">关于自动推送</h4>
                  <p className="text-sm text-blue-800">
                    当上方"启用自动分析推送"开启时，系统会按照您设置的分析复杂度自动生成AI分析报告，
                    并推送到下方配置的机器人中。您可以配置多个机器人同时接收分析报告。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">机器人推送设置</h3>
            <Button
              onClick={() => setIsAddingNew(true)}
              disabled={isAddingNew || editingBot !== null}
            >
              <Plus className="h-4 w-4 mr-2" />
              添加机器人
            </Button>
          </div>
        </>
      )}

      {/* 在嵌入模式下只显示添加按钮 */}
      {isEmbedded && (
        <div className="flex justify-end">
          <Button
            onClick={() => setIsAddingNew(true)}
            disabled={isAddingNew || editingBot !== null}
          >
            <Plus className="h-4 w-4 mr-2" />
            添加机器人
          </Button>
        </div>
      )}

      {(isAddingNew || editingBot) && (
        <div className="mb-4">
          {renderEditForm(isAddingNew ? newBot : editingBot!, isAddingNew)}
        </div>
      )}

      <div className="grid gap-4">
        {botSettings.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              暂未配置任何机器人推送
            </CardContent>
          </Card>
        ) : (
          botSettings.map(bot => renderBotCard(bot))
        )}
      </div>

      <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
        <p><strong>使用说明：</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>企业微信：在群聊中添加机器人，复制Webhook地址</li>
          <li>钉钉：在群聊中添加自定义机器人，复制Webhook地址</li>
          <li>可以同时配置多个机器人，系统会向所有启用的机器人推送消息</li>
          <li>设置为默认的机器人会优先使用</li>
        </ul>
      </div>
    </div>
  );
};

export default BotManagement;