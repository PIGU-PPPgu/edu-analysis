import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createWarningStatisticsTable } from '@/app/db/migrations/create_warning_statistics';
import { AlertTriangle, ArrowRight, CheckCircle2, DatabaseIcon, Loader2, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { requestCache } from '@/utils/cacheUtils';

const CreateWarningTablePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    error?: any;
  } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // 如果成功，倒计时自动返回
  useEffect(() => {
    if (result?.success && countdown === null) {
      setCountdown(5); // 5秒倒计时
    }
    
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // 倒计时结束，返回上一页
      window.history.back();
    }
  }, [result, countdown]);
  
  const handleCreateTable = async () => {
    setIsLoading(true);
    setResult(null);
    setCountdown(null);
    
    try {
      // 清除所有缓存以确保获取最新状态
      requestCache.clear();
      
      const response = await createWarningStatisticsTable();
      setResult(response);
      
      if (response.success) {
        // 无论是表已存在还是新创建，都强制清除缓存
        requestCache.invalidate('warning_statistics');
        
        // 连续多次清除缓存以确保异步操作完成后的缓存也被清理
        setTimeout(() => {
          requestCache.invalidate('warning_statistics');
          requestCache.clear(); // 再次清除全局缓存
        }, 200);
        
        setTimeout(() => {
          // 再次清除缓存，确保所有异步操作完成
          requestCache.invalidate('warning_statistics');
          requestCache.clear();
        }, 500);
        
        // 已存在与新建使用不同的提示
        if (response.message?.includes('已存在')) {
          toast.success('预警统计表已存在', {
            description: '表已经存在，无需重新创建，点击下方按钮前往预警分析'
          });
        } else {
          toast.success('预警统计表创建成功', {
            description: '表已成功创建并初始化，点击下方按钮刷新缓存并前往预警分析'
          });
        }
      } else {
        toast.error('预警统计表创建失败', {
          description: response.message || '请检查控制台获取错误详情'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      toast.error('创建预警统计表时发生错误');
    } finally {
      setIsLoading(false);
    }
  };
  
  const cancelCountdown = () => {
    setCountdown(null);
  };
  
  // 清除所有缓存并重新加载页面，确保预警分析页能获取最新数据
  const refreshPageAndCache = () => {
    // 显式删除所有缓存
    requestCache.clear();
    
    // 特别删除与预警相关的缓存
    requestCache.invalidate('warning_statistics');
    
    // 直接跳转到预警分析页面
    window.location.href = '/warning-analysis';
  };
  
  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <DatabaseIcon className="mr-2 h-6 w-6 text-[#c0ff3f]" />
            创建预警统计表
          </CardTitle>
          <CardDescription>
            该工具用于创建或重置预警统计数据表。如果表已存在，将不做任何更改。
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              预警统计表用于存储学生预警的汇总统计数据，包括风险学生数量、预警类型分布等信息。
              此操作将检查表是否存在，如不存在则创建，并填充初始数据。
            </p>
            
            {result && (
              <Alert
                variant={result.success ? "default" : "destructive"}
                className={result.success ? "bg-green-50 border-green-200 text-green-800" : ""}
              >
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                  <AlertTitle>
                    {result.success ? "操作成功" : "操作失败"}
                  </AlertTitle>
                </div>
                <AlertDescription className="mt-2">
                  {result.message || result.error || 
                    (result.success ? "预警统计表创建成功或已存在" : "创建预警统计表失败")}
                  
                  {result.success && countdown !== null && (
                    <div className="mt-2 text-sm">
                      {countdown}秒后自动返回...
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-sm ml-2" 
                        onClick={cancelCountdown}
                      >
                        取消
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-6">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
          
          {result?.success ? (
            <Button 
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={refreshPageAndCache}
            >
              刷新缓存并前往预警分析
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreateTable}
              disabled={isLoading}
              className="bg-[#c0ff3f] text-black hover:bg-[#a5e034]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  创建预警统计表
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateWarningTablePage; 