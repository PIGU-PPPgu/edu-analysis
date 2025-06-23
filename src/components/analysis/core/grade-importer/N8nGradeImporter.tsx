import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileSpreadsheet,
  Brain,
  Database,
  Settings
} from 'lucide-react';
import { n8nGradeParser, type N8nParseResult, type N8nParseOptions } from '@/services/n8nGradeParser';
import { supabase } from '@/integrations/supabase/client';

interface N8nGradeImporterProps {
  onImportComplete?: (result: N8nParseResult) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function N8nGradeImporter({ 
  onImportComplete, 
  onError, 
  className = '' 
}: N8nGradeImporterProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseOptions, setParseOptions] = useState<N8nParseOptions>({
    ai_provider: 'openai',
    batch_size: 50,
    enable_validation: true
  });
  const [parseResult, setParseResult] = useState<N8nParseResult | null>(null);
  
  const queryClient = useQueryClient();

  // 检查n8n健康状态
  const { data: n8nHealthy, isLoading: checkingHealth } = useQuery({
    queryKey: ['n8n-health'],
    queryFn: () => n8nGradeParser.checkHealth(),
    refetchInterval: 30000, // 每30秒检查一次
    staleTime: 10000
  });

  // 文件解析mutation
  const parseFileMutation = useMutation({
    mutationFn: async (file: File) => {
      return await n8nGradeParser.parseGradeFile(file, parseOptions);
    },
    onSuccess: (result) => {
      setParseResult(result);
      if (result.success) {
        toast.success(`✅ 解析完成！处理了 ${result.summary.processedRows} 条记录`);
        onImportComplete?.(result);
        queryClient.invalidateQueries({ queryKey: ['grade-data'] });
      } else {
        toast.error(`❌ 解析失败: ${result.message}`);
        onError?.(result.message);
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : '解析过程中发生未知错误';
      toast.error(`❌ 解析失败: ${errorMessage}`);
      onError?.(errorMessage);
    }
  });

  // 文件选择处理
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件
    const validation = n8nGradeParser.validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setSelectedFile(file);
    setParseResult(null); // 清除之前的结果
    
    toast.success(`📁 已选择文件: ${file.name}`);
  }, []);

  // 开始解析
  const handleStartParse = useCallback(() => {
    if (!selectedFile) {
      toast.error('请先选择文件');
      return;
    }

    if (!n8nHealthy) {
      toast.error('n8n服务不可用，请检查连接');
      return;
    }

    parseFileMutation.mutate(selectedFile);
  }, [selectedFile, n8nHealthy, parseFileMutation]);

  // 重置状态
  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setParseResult(null);
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* n8n服务状态 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              n8n智能解析服务
            </CardTitle>
            <Badge variant={n8nHealthy ? "default" : "destructive"}>
              {checkingHealth ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : n8nHealthy ? (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              ) : (
                <AlertCircle className="w-3 h-3 mr-1" />
              )}
              {checkingHealth ? '检查中...' : n8nHealthy ? '在线' : '离线'}
            </Badge>
          </div>
          <CardDescription>
            基于n8n工作流的智能成绩文件解析，支持AI字段映射和数据验证
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 文件上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            文件上传
          </CardTitle>
          <CardDescription>
            支持格式: {n8nGradeParser.getSupportedFormats().join(', ')} | 最大10MB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">选择成绩文件</Label>
            <Input
              id="file-upload"
              type="file"
              accept={n8nGradeParser.getSupportedFormats().join(',')}
              onChange={handleFileSelect}
              disabled={parseFileMutation.isPending}
            />
          </div>

          {selectedFile && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900">{selectedFile.name}</p>
                  <p className="text-sm text-blue-600">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 解析选项 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            解析选项
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>AI提供商</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={parseOptions.ai_provider}
                onChange={(e) => setParseOptions(prev => ({ 
                  ...prev, 
                  ai_provider: e.target.value as any 
                }))}
                disabled={parseFileMutation.isPending}
              >
                <option value="openai">OpenAI</option>
                <option value="doubao">豆包</option>
                <option value="deepseek">DeepSeek</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>批处理大小</Label>
              <Input
                type="number"
                min="10"
                max="200"
                value={parseOptions.batch_size}
                onChange={(e) => setParseOptions(prev => ({ 
                  ...prev, 
                  batch_size: parseInt(e.target.value) || 50 
                }))}
                disabled={parseFileMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={parseOptions.enable_validation}
                  onChange={(e) => setParseOptions(prev => ({ 
                    ...prev, 
                    enable_validation: e.target.checked 
                  }))}
                  disabled={parseFileMutation.isPending}
                />
                启用数据验证
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <Button
          onClick={handleStartParse}
          disabled={!selectedFile || !n8nHealthy || parseFileMutation.isPending}
          className="flex-1"
        >
          {parseFileMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              AI解析中...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              开始智能解析
            </>
          )}
        </Button>

        <Button variant="outline" onClick={handleReset} disabled={parseFileMutation.isPending}>
          重置
        </Button>
      </div>

      {/* 解析进度 */}
      {parseFileMutation.isPending && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>🔄 正在处理...</span>
                <span>请稍候</span>
              </div>
              <Progress value={undefined} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 解析结果 */}
      {parseResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              解析结果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parseResult.success ? (
              <Alert>
                <CheckCircle2 className="w-4 h-4" />
                <AlertDescription>
                  ✅ {parseResult.message}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  ❌ {parseResult.message}
                </AlertDescription>
              </Alert>
            )}

            {/* 统计信息 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {parseResult.summary.totalRows}
                </div>
                <div className="text-sm text-gray-600">总行数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {parseResult.summary.processedRows}
                </div>
                <div className="text-sm text-gray-600">成功处理</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {parseResult.summary.errorRows}
                </div>
                <div className="text-sm text-gray-600">错误行数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(parseResult.summary.confidence * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">识别准确度</div>
              </div>
            </div>

            {/* 识别的科目 */}
            {parseResult.summary.subjects.length > 0 && (
              <div>
                <Label className="text-sm font-medium">识别的科目</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {parseResult.summary.subjects.map((subject, index) => (
                    <Badge key={index} variant="secondary">
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 错误信息 */}
            {parseResult.errors.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-red-600">错误信息</Label>
                <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200 max-h-40 overflow-y-auto">
                  {parseResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default N8nGradeImporter; 