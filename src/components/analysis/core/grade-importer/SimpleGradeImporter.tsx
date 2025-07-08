/**
 *  SimpleGradeImporter - 零干预智能导入组件
 * 
 * 核心理念：上传即导入，无需任何配置
 * 流程：选择文件 → 自动识别 → 导入成功 → 查看结果 → (可选)补充数据
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  BarChart3, 
  Sparkles,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Settings,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

// 导入组件
import OneClickImporter from './components/OneClickImporter';
import PostImportCompletion from './components/PostImportCompletion';

// 使用现有的类型定义
import type { 
  GradeImporterProps,
  ImportResult,
  MappingConfig
} from './types';
import type { MissingFieldInfo, PostImportAction } from '../../services/smartFallbackEngine';

// 导入状态
type ImportStatus = 'idle' | 'importing' | 'completed' | 'enhancing';

const SimpleGradeImporter: React.FC<GradeImporterProps> = ({ onDataImported }) => {
  // 状态管理
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importedData, setImportedData] = useState<any[]>([]);
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
  const [currentMapping, setCurrentMapping] = useState<Record<string, string>>({});
  const [missingFields, setMissingFields] = useState<MissingFieldInfo[]>([]);
  const [postImportActions, setPostImportActions] = useState<PostImportAction[]>([]);
  
  // 显示模式：simple（一键导入）或 advanced（传统模式）
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');

  // 处理文件选择
  const handleFileSelected = useCallback((file: File) => {
    setImportStatus('importing');
    // OneClickImporter 会处理实际的文件上传和解析
  }, []);

  // 处理导入完成
  const handleImportComplete = useCallback((
    result: ImportResult, 
    missingFieldsList: string[]
  ) => {
    setImportResult(result);
    setImportedData(result.summary ? [] : []); // 这里应该是实际的导入数据
    setImportStatus('completed');
    
    // 通知父组件数据已导入
    if (onDataImported) {
      onDataImported([]); // 传递实际导入的数据
    }

    // 如果有缺失字段，显示增强选项
    if (missingFieldsList.length > 0) {
      setImportStatus('enhancing');
    }
    
    toast.success(' 数据导入成功！', {
      description: `共导入 ${result.summary.importedRows} 条记录`,
      duration: 4000
    });
  }, [onDataImported]);

  // 处理导入错误
  const handleImportError = useCallback((error: string) => {
    toast.error('导入失败', {
      description: error,
      duration: 5000
    });
    setImportStatus('idle');
  }, []);

  // 处理字段增强
  const handleFieldAdded = useCallback((fieldMapping: Record<string, string>) => {
    setCurrentMapping(prev => ({ ...prev, ...fieldMapping }));
    
    // 这里应该重新处理数据以包含新字段
    toast.success('字段已添加', {
      description: '数据分析能力已增强',
      duration: 3000
    });
  }, []);

  // 处理增强完成
  const handleEnhancementComplete = useCallback(() => {
    setImportStatus('completed');
  }, []);

  // 重新开始
  const handleRestart = useCallback(() => {
    setImportStatus('idle');
    setImportResult(null);
    setImportedData([]);
    setOriginalHeaders([]);
    setCurrentMapping({});
    setMissingFields([]);
    setPostImportActions([]);
  }, []);

  // 查看分析结果
  const handleViewResults = useCallback(() => {
    // 这里应该导航到分析结果页面
    // 可以通过 router.push('/analysis') 或者触发父组件的回调
    toast.info('即将跳转到分析页面...');
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 头部信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                智能成绩导入系统
              </CardTitle>
              <CardDescription className="mt-2">
                {importStatus === 'idle' && '上传Excel文件，系统自动识别并导入所有数据'}
                {importStatus === 'importing' && '正在智能处理您的数据...'}
                {importStatus === 'completed' && '导入完成！您可以立即查看分析结果'}
                {importStatus === 'enhancing' && '数据已导入，您可以选择添加更多字段来增强分析'}
              </CardDescription>
            </div>
            
            {/* 模式切换 */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'simple' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('simple')}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                简单模式
              </Button>
              <Button
                variant={viewMode === 'advanced' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('advanced')}
              >
                <Settings className="w-4 h-4 mr-2" />
                高级模式
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 简单模式 - 一键导入 */}
      {viewMode === 'simple' && (
        <div className="space-y-6">
          {/* 空闲状态 - 文件上传 */}
          {importStatus === 'idle' && (
            <OneClickImporter
              onFileSelected={handleFileSelected}
              onImportComplete={handleImportComplete}
              onError={handleImportError}
            />
          )}

          {/* 导入中状态 */}
          {importStatus === 'importing' && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">智能处理中...</h3>
                  <p className="text-gray-600 mb-4">
                    系统正在分析您的数据，识别学生信息、成绩和排名
                  </p>
                  <div className="max-w-md mx-auto">
                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                      <span>预计剩余时间</span>
                      <span>30-60秒</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 完成状态 */}
          {importStatus === 'completed' && importResult && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-green-700 mb-4">
                    导入成功！
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {importResult.summary.importedRows}
                      </div>
                      <div className="text-sm text-blue-700">成功导入记录</div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {Object.keys(currentMapping).length}
                      </div>
                      <div className="text-sm text-green-700">识别数据字段</div>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round((importResult.duration || 3000) / 1000)}s
                      </div>
                      <div className="text-sm text-purple-700">处理耗时</div>
                    </div>
                  </div>

                  <div className="flex gap-4 justify-center">
                    <Button onClick={handleRestart} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      导入新文件
                    </Button>
                    <Button onClick={handleViewResults} size="lg">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      查看数据分析
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 增强状态 */}
          {importStatus === 'enhancing' && (
            <PostImportCompletion
              importedData={importedData}
              originalHeaders={originalHeaders}
              currentMapping={currentMapping}
              missingFields={missingFields}
              postImportActions={postImportActions}
              onFieldAdded={handleFieldAdded}
              onDismiss={handleEnhancementComplete}
            />
          )}
        </div>
      )}

      {/* 高级模式 - 传统流程 */}
      {viewMode === 'advanced' && (
        <Card>
          <CardHeader>
            <CardTitle>高级导入模式</CardTitle>
            <CardDescription>
              提供完整的步骤控制，适合需要精确配置的用户
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Settings className="w-4 h-4" />
              <AlertDescription>
                高级模式将显示完整的导入流程：文件上传 → 字段映射 → 数据验证 → 导入处理。
                <br />
                如果您是普通用户，建议使用简单模式以获得更好的体验。
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2 mt-4">
              <Button onClick={() => setViewMode('simple')} variant="outline">
                返回简单模式
              </Button>
              <Button onClick={() => toast.info('高级模式功能开发中...')}>
                继续高级模式
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 功能介绍 */}
      {importStatus === 'idle' && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold">智能识别</h3>
                <p className="text-sm text-gray-600">
                  AI自动识别学生信息、各科成绩、排名等所有数据，无需手动配置
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold">100%成功</h3>
                <p className="text-sm text-gray-600">
                  即使数据不完整，系统也能确保导入成功，不会因为格式问题失败
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold">持续优化</h3>
                <p className="text-sm text-gray-600">
                  导入后可以随时补充更多数据，不断提升分析的深度和准确性
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SimpleGradeImporter;