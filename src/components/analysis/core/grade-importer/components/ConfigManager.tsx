import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Settings,
  Save,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit,
  Copy,
  Star,
  StarOff,
  FileText,
  Info,
  Clock,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImportOptions, MappingConfig, ExamInfo } from '../types';

// 配置模板接口
export interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isFavorite: boolean;
  config: ImportOptions;
  mappingConfig?: Partial<MappingConfig>;
  examInfo?: Partial<ExamInfo>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags: string[];
  usage: number;
}

// ConfigManager 组件属性
interface ConfigManagerProps {
  currentConfig: ImportOptions;
  currentMappingConfig?: MappingConfig;
  currentExamInfo?: ExamInfo;
  onConfigChange: (config: ImportOptions) => void;
  onMappingConfigChange?: (config: MappingConfig) => void;
  onExamInfoChange?: (info: ExamInfo) => void;
  className?: string;
}

const ConfigManager: React.FC<ConfigManagerProps> = ({
  currentConfig,
  currentMappingConfig,
  currentExamInfo,
  onConfigChange,
  onMappingConfigChange,
  onExamInfoChange,
  className
}) => {
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ConfigTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('__all_tags__');
  
  // 新模板表单状态
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    tags: [] as string[],
    isDefault: false,
    isFavorite: false
  });

  // 加载配置模板
  useEffect(() => {
    loadTemplates();
  }, []);

  // 加载模板
  const loadTemplates = () => {
    const savedTemplates = localStorage.getItem('gradeImporter_configTemplates');
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates);
        setTemplates(parsed);
      } catch (error) {
        console.error('加载配置模板失败:', error);
        setTemplates(getDefaultTemplates());
      }
    } else {
      setTemplates(getDefaultTemplates());
    }
  };

  // 保存模板到本地存储
  const saveTemplates = (templates: ConfigTemplate[]) => {
    localStorage.setItem('gradeImporter_configTemplates', JSON.stringify(templates));
    setTemplates(templates);
  };

  // 获取默认模板
  const getDefaultTemplates = (): ConfigTemplate[] => {
    return [
      {
        id: 'default_basic',
        name: '基础导入',
        description: '适用于基本成绩数据导入，包含必要的验证和默认配置',
        isDefault: true,
        isFavorite: false,
        config: {
          batchSize: 50,
          createMissingStudents: true,
          updateExistingData: false,
          skipDuplicates: true,
          enableBackup: true,
          enableRollback: true,
          parallelImport: false,
          strictMode: false,
          validateDuplicates: true,
          validateStudentMatch: true,
          requireScores: false,
          maxErrors: 100
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        tags: ['基础', '推荐'],
        usage: 0
      },
      {
        id: 'default_strict',
        name: '严格模式',
        description: '严格验证模式，确保数据质量，适用于重要考试成绩导入',
        isDefault: false,
        isFavorite: false,
        config: {
          batchSize: 25,
          createMissingStudents: false,
          updateExistingData: false,
          skipDuplicates: false,
          enableBackup: true,
          enableRollback: true,
          parallelImport: false,
          strictMode: true,
          validateDuplicates: true,
          validateStudentMatch: true,
          requireScores: true,
          maxErrors: 10
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        tags: ['严格', '考试'],
        usage: 0
      },
      {
        id: 'default_fast',
        name: '快速导入',
        description: '高性能批量导入，适用于大量数据的快速处理',
        isDefault: false,
        isFavorite: false,
        config: {
          batchSize: 200,
          createMissingStudents: true,
          updateExistingData: true,
          skipDuplicates: true,
          enableBackup: false,
          enableRollback: false,
          parallelImport: true,
          strictMode: false,
          validateDuplicates: false,
          validateStudentMatch: false,
          requireScores: false,
          maxErrors: 1000
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        tags: ['快速', '批量'],
        usage: 0
      }
    ];
  };

  // 应用模板
  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // 应用导入配置
    onConfigChange(template.config);

    // 应用映射配置（如果有）
    if (template.mappingConfig && onMappingConfigChange) {
      onMappingConfigChange({
        ...currentMappingConfig,
        ...template.mappingConfig
      } as MappingConfig);
    }

    // 应用考试信息（如果有）
    if (template.examInfo && onExamInfoChange) {
      onExamInfoChange({
        ...currentExamInfo,
        ...template.examInfo
      } as ExamInfo);
    }

    // 更新使用次数
    const updatedTemplates = templates.map(t => 
      t.id === templateId ? { ...t, usage: t.usage + 1 } : t
    );
    saveTemplates(updatedTemplates);

    setSelectedTemplate(templateId);
    toast.success(`已应用配置模板：${template.name}`);
  };

  // 保存当前配置为模板
  const saveCurrentAsTemplate = () => {
    if (!newTemplate.name.trim()) {
      toast.error('请输入模板名称');
      return;
    }

    const template: ConfigTemplate = {
      id: `custom_${Date.now()}`,
      name: newTemplate.name.trim(),
      description: newTemplate.description.trim(),
      isDefault: false,
      isFavorite: newTemplate.isFavorite,
      config: currentConfig,
      mappingConfig: currentMappingConfig,
      examInfo: currentExamInfo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user',
      tags: newTemplate.tags,
      usage: 0
    };

    const updatedTemplates = [...templates, template];
    saveTemplates(updatedTemplates);

    setNewTemplate({
      name: '',
      description: '',
      tags: [],
      isDefault: false,
      isFavorite: false
    });
    setShowSaveDialog(false);
    toast.success('配置模板保存成功');
  };

  // 删除模板
  const deleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template?.isDefault) {
      toast.error('默认模板不能删除');
      return;
    }

    const updatedTemplates = templates.filter(t => t.id !== templateId);
    saveTemplates(updatedTemplates);
    
    if (selectedTemplate === templateId) {
      setSelectedTemplate('');
    }
    
    toast.success('模板删除成功');
  };

  // 复制模板
  const duplicateTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const duplicatedTemplate: ConfigTemplate = {
      ...template,
      id: `copy_${Date.now()}`,
      name: `${template.name} - 副本`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usage: 0
    };

    const updatedTemplates = [...templates, duplicatedTemplate];
    saveTemplates(updatedTemplates);
    toast.success('模板复制成功');
  };

  // 切换收藏状态
  const toggleFavorite = (templateId: string) => {
    const updatedTemplates = templates.map(t => 
      t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
    );
    saveTemplates(updatedTemplates);
  };

  // 更新模板
  const updateTemplate = () => {
    if (!editingTemplate) return;

    const updatedTemplates = templates.map(t => 
      t.id === editingTemplate.id ? {
        ...editingTemplate,
        updatedAt: new Date().toISOString()
      } : t
    );
    saveTemplates(updatedTemplates);
    setEditingTemplate(null);
    setShowEditDialog(false);
    toast.success('模板更新成功');
  };

  // 导出配置
  const exportConfig = () => {
    const exportData = {
      config: currentConfig,
      mappingConfig: currentMappingConfig,
      examInfo: currentExamInfo,
      exportTime: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `grade_import_config_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('配置导出成功');
  };

  // 导入配置
  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        
        if (importData.config) {
          onConfigChange(importData.config);
        }
        if (importData.mappingConfig && onMappingConfigChange) {
          onMappingConfigChange(importData.mappingConfig);
        }
        if (importData.examInfo && onExamInfoChange) {
          onExamInfoChange(importData.examInfo);
        }
        
        toast.success('配置导入成功');
      } catch (error) {
        toast.error('配置文件格式错误');
      }
    };
    reader.readAsText(file);
    
    // 重置文件输入
    event.target.value = '';
  };

  // 过滤模板
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = filterTag === '__all_tags__' || template.tags.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  // 获取所有标签
  const allTags = Array.from(new Set(templates.flatMap(t => t.tags)));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          配置管理
        </CardTitle>
        <CardDescription>
          管理导入配置模板，保存和应用预设配置
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 搜索和筛选 */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索配置模板..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="筛选标签" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all_tags__">全部标签</SelectItem>
              {allTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 配置模板列表 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">配置模板</h4>
            <div className="flex gap-2">
              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    保存当前配置
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>保存配置模板</DialogTitle>
                    <DialogDescription>
                      将当前配置保存为模板，方便后续使用
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>模板名称</Label>
                      <Input
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="输入模板名称"
                      />
                    </div>
                    <div>
                      <Label>模板描述</Label>
                      <Textarea
                        value={newTemplate.description}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="输入模板描述"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>标签 (用逗号分隔)</Label>
                      <Input
                        value={newTemplate.tags.join(', ')}
                        onChange={(e) => setNewTemplate(prev => ({ 
                          ...prev, 
                          tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                        }))}
                        placeholder="输入标签，如：基础, 考试"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newTemplate.isFavorite}
                        onCheckedChange={(checked) => 
                          setNewTemplate(prev => ({ ...prev, isFavorite: checked }))
                        }
                      />
                      <Label>设为收藏</Label>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setShowSaveDialog(false)}
                      >
                        取消
                      </Button>
                      <Button onClick={saveCurrentAsTemplate}>
                        保存模板
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" size="sm" onClick={exportConfig}>
                <Download className="w-4 h-4 mr-2" />
                导出配置
              </Button>
              
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    导入配置
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={importConfig}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <ScrollArea className="h-96">
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className={cn(
                    "p-4 cursor-pointer border transition-colors",
                    selectedTemplate === template.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                  )}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="space-y-3">
                    {/* 模板头部 */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium">{template.name}</h5>
                          {template.isDefault && (
                            <Badge variant="outline" className="text-xs">
                              默认
                            </Badge>
                          )}
                          {template.isFavorite && (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(template.id);
                          }}
                        >
                          {template.isFavorite ? (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          ) : (
                            <StarOff className="w-4 h-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTemplate(template);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateTemplate(template.id);
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        
                        {!template.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTemplate(template.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 模板标签 */}
                    <div className="flex gap-2 flex-wrap">
                      {template.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* 模板信息 */}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {template.createdBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(template.updatedAt).toLocaleDateString()}
                        </span>
                        <span>使用 {template.usage} 次</span>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          applyTemplate(template.id);
                        }}
                        disabled={selectedTemplate === template.id}
                      >
                        {selectedTemplate === template.id ? '已应用' : '应用'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              
              {filteredTemplates.length === 0 && (
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    没有找到匹配的配置模板
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 编辑模板对话框 */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑配置模板</DialogTitle>
              <DialogDescription>
                修改模板信息和配置参数
              </DialogDescription>
            </DialogHeader>
            {editingTemplate && (
              <div className="space-y-4">
                <div>
                  <Label>模板名称</Label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate(prev => 
                      prev ? { ...prev, name: e.target.value } : null
                    )}
                  />
                </div>
                <div>
                  <Label>模板描述</Label>
                  <Textarea
                    value={editingTemplate.description}
                    onChange={(e) => setEditingTemplate(prev => 
                      prev ? { ...prev, description: e.target.value } : null
                    )}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>标签</Label>
                  <Input
                    value={editingTemplate.tags.join(', ')}
                    onChange={(e) => setEditingTemplate(prev => 
                      prev ? { 
                        ...prev, 
                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                      } : null
                    )}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingTemplate.isFavorite}
                    onCheckedChange={(checked) => setEditingTemplate(prev => 
                      prev ? { ...prev, isFavorite: checked } : null
                    )}
                  />
                  <Label>设为收藏</Label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditDialog(false)}
                  >
                    取消
                  </Button>
                  <Button onClick={updateTemplate}>
                    保存修改
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 当前配置摘要 */}
        <Card className="p-4 bg-gray-50">
          <h5 className="font-medium mb-2">当前配置摘要</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">批次大小:</span>
              <span className="ml-2 font-medium">{currentConfig.batchSize}</span>
            </div>
            <div>
              <span className="text-gray-600">创建学生:</span>
              <span className="ml-2 font-medium">
                {currentConfig.createMissingStudents ? '是' : '否'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">更新数据:</span>
              <span className="ml-2 font-medium">
                {currentConfig.updateExistingData ? '是' : '否'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">严格模式:</span>
              <span className="ml-2 font-medium">
                {currentConfig.strictMode ? '是' : '否'}
              </span>
            </div>
          </div>
        </Card>
      </CardContent>
    </Card>
  );
};

export default ConfigManager; 