/**
 * 科目满分设置组件
 * 允许用户设置和管理各个科目的满分，以便正确计算及格率和等级
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Settings2,
  BookOpen,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit3,
  Award,
  Calculator,
  Target,
  Info
} from 'lucide-react';
import { SUBJECT_MAX_SCORES } from '@/utils/gradeUtils';
import { Subject } from '@/types/grade';
import { passRateCalculator } from '@/services/passRateCalculator';

// 科目配置接口
interface SubjectConfig {
  name: string;
  displayName: string;
  maxScore: number;
  passScore: number;
  excellentScore: number;
  isCustom: boolean;
}

// 组件属性接口
interface SubjectMaxScoreSettingsProps {
  onSave?: (configs: SubjectConfig[]) => void;
  onCancel?: () => void;
  initialConfigs?: SubjectConfig[];
  className?: string;
}

const SubjectMaxScoreSettings: React.FC<SubjectMaxScoreSettingsProps> = ({
  onSave,
  onCancel,
  initialConfigs,
  className
}) => {
  const { toast } = useToast();
  
  // 默认科目配置
  const getDefaultConfigs = (): SubjectConfig[] => {
    const defaultSubjects = [
      { key: Subject.TOTAL, name: '总分', maxScore: 523 },
      { key: Subject.CHINESE, name: '语文', maxScore: 120 },
      { key: Subject.MATH, name: '数学', maxScore: 100 },
      { key: Subject.ENGLISH, name: '英语', maxScore: 75 },
      { key: Subject.PHYSICS, name: '物理', maxScore: 63 },
      { key: Subject.CHEMISTRY, name: '化学', maxScore: 45 },
      { key: Subject.POLITICS, name: '道法', maxScore: 50 },
      { key: Subject.HISTORY, name: '历史', maxScore: 70 }
    ];
    
    return defaultSubjects.map(subject => ({
      name: subject.key,
      displayName: subject.name,
      maxScore: subject.maxScore,
      passScore: Math.round(subject.maxScore * 0.6), // 60%及格
      excellentScore: Math.round(subject.maxScore * 0.85), // 85%优秀
      isCustom: false
    }));
  };

  const [configs, setConfigs] = useState<SubjectConfig[]>(
    initialConfigs || getDefaultConfigs()
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newSubject, setNewSubject] = useState({
    name: '',
    displayName: '',
    maxScore: 100,
    passScore: 60,
    excellentScore: 85
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [autoCalculateRates, setAutoCalculateRates] = useState(true);

  // 自动计算及格分和优秀分
  const calculateScores = useCallback((maxScore: number) => ({
    passScore: Math.round(maxScore * 0.6),
    excellentScore: Math.round(maxScore * 0.85)
  }), []);

  // 更新科目配置
  const updateConfig = useCallback((index: number, updates: Partial<SubjectConfig>) => {
    setConfigs(prev => prev.map((config, i) => {
      if (i === index) {
        const updated = { ...config, ...updates };
        
        // 如果启用自动计算且修改了满分，自动更新及格分和优秀分
        if (autoCalculateRates && updates.maxScore !== undefined) {
          const calculated = calculateScores(updated.maxScore);
          updated.passScore = calculated.passScore;
          updated.excellentScore = calculated.excellentScore;
        }
        
        return updated;
      }
      return config;
    }));
  }, [autoCalculateRates, calculateScores]);

  // 添加自定义科目
  const addCustomSubject = useCallback(() => {
    if (!newSubject.name.trim() || !newSubject.displayName.trim()) {
      toast({
        title: "输入错误",
        description: "请填写科目名称和显示名称",
        variant: "destructive"
      });
      return;
    }

    const config: SubjectConfig = {
      ...newSubject,
      name: newSubject.name.trim(),
      displayName: newSubject.displayName.trim(),
      isCustom: true
    };

    if (autoCalculateRates) {
      const calculated = calculateScores(newSubject.maxScore);
      config.passScore = calculated.passScore;
      config.excellentScore = calculated.excellentScore;
    }

    setConfigs(prev => [...prev, config]);
    setNewSubject({
      name: '',
      displayName: '',
      maxScore: 100,
      passScore: 60,
      excellentScore: 85
    });
    setShowAddDialog(false);

    toast({
      title: "添加成功",
      description: `科目 "${config.displayName}" 已添加`,
    });
  }, [newSubject, autoCalculateRates, calculateScores, toast]);

  // 删除科目
  const deleteSubject = useCallback((index: number) => {
    const config = configs[index];
    setConfigs(prev => prev.filter((_, i) => i !== index));
    
    toast({
      title: "删除成功",
      description: `科目 "${config.displayName}" 已删除`,
    });
  }, [configs, toast]);

  // 重置为默认值
  const resetToDefaults = useCallback(() => {
    setConfigs(getDefaultConfigs());
    toast({
      title: "重置成功",
      description: "科目配置已重置为默认值",
    });
  }, [toast]);

  // 保存配置
  const handleSave = useCallback(() => {
    // 验证配置
    const hasInvalidConfig = configs.some(config => 
      config.maxScore <= 0 || 
      config.passScore < 0 || 
      config.excellentScore < 0 ||
      config.passScore > config.maxScore ||
      config.excellentScore > config.maxScore
    );

    if (hasInvalidConfig) {
      toast({
        title: "配置错误",
        description: "请检查配置，确保分数合理",
        variant: "destructive"
      });
      return;
    }

    // 保存到及格率计算器
    passRateCalculator.updateSubjectConfigs(configs);
    passRateCalculator.saveConfigsToStorage();

    onSave?.(configs);
    toast({
      title: "保存成功",
      description: "科目满分配置已保存，及格率计算将自动更新",
    });
  }, [configs, onSave, toast]);

  return (
    <Card className={cn(
      "bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all",
      className
    )}>
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-black text-[#191A23] uppercase tracking-wide">
                科目满分设置
              </CardTitle>
              <p className="text-sm text-[#191A23]/80 font-medium mt-1">
                设置各科目满分以正确计算及格率和等级分布
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Label htmlFor="auto-calculate" className="font-medium text-[#191A23]">
                自动计算比例
              </Label>
              <Switch
                id="auto-calculate"
                checked={autoCalculateRates}
                onCheckedChange={setAutoCalculateRates}
                className="data-[state=checked]:bg-[#191A23]"
              />
            </div>
            <Badge className="bg-[#F7931E] text-white border border-black font-bold">
              {configs.length} 科目
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* 配置说明 */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">配置说明：</p>
              <ul className="space-y-1 text-xs">
                <li>• 满分：科目的最高分数</li>
                <li>• 及格分：通常为满分的60%</li>
                <li>• 优秀分：通常为满分的85%</li>
                <li>• 自动计算：开启后修改满分将自动更新及格分和优秀分</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 科目配置列表 */}
        <div className="space-y-4">
          {configs.map((config, index) => (
            <Card key={`${config.name}-${index}`} className="border-2 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-[#191A23]" />
                    <div>
                      <h3 className="font-bold text-[#191A23]">{config.displayName}</h3>
                      <p className="text-sm text-gray-600">{config.name}</p>
                    </div>
                    {config.isCustom && (
                      <Badge className="bg-[#9C88FF] text-white border border-black text-xs">
                        自定义
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                      className="border-2 border-black bg-[#F7931E] text-white font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    
                    {config.isCustom && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-2 border-black bg-[#FF6B6B] text-white font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                            <AlertDialogDescription>
                              确定要删除科目 "{config.displayName}" 吗？此操作无法撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteSubject(index)}>
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>

                {editingIndex === index ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">满分</Label>
                      <Input
                        type="number"
                        min={1}
                        value={config.maxScore}
                        onChange={(e) => updateConfig(index, { maxScore: Number(e.target.value) })}
                        className="border-2 border-gray-300 focus:border-[#B9FF66]"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">及格分</Label>
                      <Input
                        type="number"
                        min={0}
                        max={config.maxScore}
                        value={config.passScore}
                        onChange={(e) => updateConfig(index, { passScore: Number(e.target.value) })}
                        className="border-2 border-gray-300 focus:border-[#F7931E]"
                        disabled={autoCalculateRates}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">优秀分</Label>
                      <Input
                        type="number"
                        min={0}
                        max={config.maxScore}
                        value={config.excellentScore}
                        onChange={(e) => updateConfig(index, { excellentScore: Number(e.target.value) })}
                        className="border-2 border-gray-300 focus:border-[#9C88FF]"
                        disabled={autoCalculateRates}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-[#B9FF66] rounded-lg border-2 border-black">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-[#191A23]" />
                        <span className="text-sm font-medium text-[#191A23]">满分</span>
                      </div>
                      <div className="text-xl font-black text-[#191A23]">{config.maxScore}</div>
                    </div>
                    <div className="text-center p-3 bg-[#F7931E] rounded-lg border-2 border-black">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Calculator className="w-4 h-4 text-white" />
                        <span className="text-sm font-medium text-white">及格</span>
                      </div>
                      <div className="text-xl font-black text-white">{config.passScore}</div>
                      <div className="text-xs text-white/80">
                        {Math.round((config.passScore / config.maxScore) * 100)}%
                      </div>
                    </div>
                    <div className="text-center p-3 bg-[#9C88FF] rounded-lg border-2 border-black">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Award className="w-4 h-4 text-white" />
                        <span className="text-sm font-medium text-white">优秀</span>
                      </div>
                      <div className="text-xl font-black text-white">{config.excellentScore}</div>
                      <div className="text-xs text-white/80">
                        {Math.round((config.excellentScore / config.maxScore) * 100)}%
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* 添加自定义科目 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#191A23]">添加自定义科目</h3>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="border-2 border-black bg-[#B9FF66] text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加科目
            </Button>
          </div>

          {showAddDialog && (
            <Card className="border-2 border-[#B9FF66]">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">科目名称</Label>
                    <Input
                      value={newSubject.name}
                      onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="如：geography"
                      className="border-2 border-gray-300 focus:border-[#B9FF66]"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">显示名称</Label>
                    <Input
                      value={newSubject.displayName}
                      onChange={(e) => setNewSubject(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="如：地理"
                      className="border-2 border-gray-300 focus:border-[#B9FF66]"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">满分</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newSubject.maxScore}
                      onChange={(e) => {
                        const maxScore = Number(e.target.value);
                        setNewSubject(prev => {
                          const updated = { ...prev, maxScore };
                          if (autoCalculateRates) {
                            const calculated = calculateScores(maxScore);
                            updated.passScore = calculated.passScore;
                            updated.excellentScore = calculated.excellentScore;
                          }
                          return updated;
                        });
                      }}
                      className="border-2 border-gray-300 focus:border-[#B9FF66]"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">及格分</Label>
                    <Input
                      type="number"
                      min={0}
                      max={newSubject.maxScore}
                      value={newSubject.passScore}
                      onChange={(e) => setNewSubject(prev => ({ ...prev, passScore: Number(e.target.value) }))}
                      className="border-2 border-gray-300 focus:border-[#F7931E]"
                      disabled={autoCalculateRates}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">优秀分</Label>
                    <Input
                      type="number"
                      min={0}
                      max={newSubject.maxScore}
                      value={newSubject.excellentScore}
                      onChange={(e) => setNewSubject(prev => ({ ...prev, excellentScore: Number(e.target.value) }))}
                      className="border-2 border-gray-300 focus:border-[#9C88FF]"
                      disabled={autoCalculateRates}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                    className="border-2 border-gray-300"
                  >
                    取消
                  </Button>
                  <Button
                    onClick={addCustomSubject}
                    className="border-2 border-black bg-[#B9FF66] text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
                  >
                    添加
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        {/* 操作按钮 */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            重置默认
          </Button>

          <div className="flex gap-3">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="border-2 border-gray-300"
              >
                取消
              </Button>
            )}
            <Button
              onClick={handleSave}
              className="border-2 border-black bg-[#B9FF66] text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
            >
              <Save className="w-4 h-4 mr-2" />
              保存配置
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubjectMaxScoreSettings; 