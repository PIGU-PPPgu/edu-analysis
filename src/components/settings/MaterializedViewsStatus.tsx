import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ViewStatus {
  view_name: string;
  exists: boolean;
  last_refresh: string | null;
  row_count: number;
}

// 视图名称映射表
const viewNameMapping: Record<string, string> = {
  'class_statistics': '班级统计数据',
  'mv_class_subject_stats': '学科统计数据',
  'mv_class_exam_trends': '考试趋势数据',
  'mv_class_subject_competency': '学科能力数据',
  'mv_class_subject_correlation': '学科相关性数据'
};

// 视图描述
const viewDescriptions: Record<string, string> = {
  'class_statistics': '包含班级的学生数量、作业数量、平均分和优秀率等基本统计信息',
  'mv_class_subject_stats': '按学科分组的班级成绩统计，包括平均分、中位数、及格率等',
  'mv_class_exam_trends': '班级考试成绩趋势数据，按时间和考试类型分组',
  'mv_class_subject_competency': '班级学科能力掌握情况，基于知识点的掌握度',
  'mv_class_subject_correlation': '不同学科之间的成绩相关性系数'
};

const MaterializedViewsStatus: React.FC = () => {
  const [viewStatus, setViewStatus] = useState<ViewStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 获取物化视图状态
  const fetchViewStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_materialized_views_status');
      
      if (error) {
        console.error('获取物化视图状态失败:', error);
        toast.error(`获取物化视图状态失败: ${error.message}`);
      } else {
        setViewStatus(data || []);
      }
    } catch (e: any) {
      console.error('获取物化视图状态异常:', e);
      toast.error(`获取物化视图状态失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 刷新所有物化视图
  const refreshAllViews = async () => {
    if (!confirm('确定要刷新所有物化视图吗？根据数据量大小，这可能需要一些时间。')) {
      return;
    }
    
    setRefreshing(true);
    try {
      const { data, error } = await supabase.rpc('rpc_refresh_materialized_views');
      
      if (error) {
        console.error('刷新物化视图失败:', error);
        toast.error(`刷新物化视图失败: ${error.message}`);
      } else {
        toast.success(data || '物化视图刷新成功');
        // 刷新状态
        fetchViewStatus();
      }
    } catch (e: any) {
      console.error('刷新物化视图异常:', e);
      toast.error(`刷新物化视图失败: ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchViewStatus();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">物化视图状态</CardTitle>
        <CardDescription>
          物化视图缓存了复杂查询的结果，提高了系统性能。查看所有物化视图的状态，管理刷新时间。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-lime-500 mr-2" />
            <p>正在加载物化视图状态...</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">物化视图</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>行数</TableHead>
                <TableHead className="text-right">最后刷新时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewStatus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    没有找到物化视图信息
                  </TableCell>
                </TableRow>
              ) : (
                viewStatus.map((view) => (
                  <TableRow key={view.view_name}>
                    <TableCell className="font-medium">
                      {viewNameMapping[view.view_name] || view.view_name}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-sm">
                      {viewDescriptions[view.view_name] || '无描述'}
                    </TableCell>
                    <TableCell>
                      {view.exists ? (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> 已创建
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                          <XCircle className="h-3.5 w-3.5 mr-1" /> 未创建
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{view.row_count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {view.last_refresh ? (
                        <div className="flex flex-col items-end text-sm">
                          <span>{format(new Date(view.last_refresh), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}</span>
                          <span className="text-xs text-gray-500">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDistanceToNow(new Date(view.last_refresh), { locale: zhCN, addSuffix: true })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">从未刷新</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchViewStatus}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新状态
        </Button>
        <Button 
          onClick={refreshAllViews}
          disabled={loading || refreshing}
          className="bg-lime-600 hover:bg-lime-700"
        >
          {refreshing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              正在刷新...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新所有物化视图
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MaterializedViewsStatus; 