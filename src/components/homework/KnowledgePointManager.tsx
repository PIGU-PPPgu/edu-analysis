import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  getKnowledgePointsByHomeworkId, 
  deleteAllKnowledgePoints,
  deleteKnowledgePoint
} from '@/services/knowledgePointService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Trash2, AlertCircle, BrainCircuit } from 'lucide-react';

interface KnowledgePointManagerProps {
  homeworkId: string;
  onKnowledgePointsChanged?: () => void;
}

export function KnowledgePointManager({ homeworkId, onKnowledgePointsChanged }: KnowledgePointManagerProps) {
  const [knowledgePoints, setKnowledgePoints] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [selectedPointName, setSelectedPointName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  useEffect(() => {
    if (homeworkId) {
      loadKnowledgePoints();
    }
  }, [homeworkId]);
  
  const loadKnowledgePoints = async () => {
    try {
      setIsLoading(true);
      const points = await getKnowledgePointsByHomeworkId(homeworkId);
      setKnowledgePoints(points);
      setIsLoading(false);
    } catch (error) {
      console.error("加载知识点失败:", error);
      toast.error("无法加载知识点数据");
      setIsLoading(false);
    }
  };
  
  const handleClearKnowledgePoints = async () => {
    try {
      setIsLoading(true);
      const result = await deleteAllKnowledgePoints(homeworkId);
      
      if (result.success) {
        toast.success(result.message);
        await loadKnowledgePoints(); // 重新加载知识点列表
        if (onKnowledgePointsChanged) {
          onKnowledgePointsChanged(); // 通知父组件知识点已更改
        }
      } else {
        toast.error(result.message);
      }
      
      setIsLoading(false);
      setShowConfirmDialog(false);
    } catch (error) {
      console.error("清除知识点失败:", error);
      toast.error("清除知识点时发生错误");
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };
  
  const handleDeletePoint = async () => {
    if (!selectedPointId) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteKnowledgePoint(selectedPointId);
      
      if (result.success) {
        setKnowledgePoints(prev => prev.filter(point => point.id !== selectedPointId));
        
        toast.success(`知识点 "${selectedPointName}" 已删除`);
        
        if (onKnowledgePointsChanged) {
          await onKnowledgePointsChanged();
        }
      } else {
        toast.error(result.message || "删除知识点失败");
      }
    } catch (error) {
      console.error("删除知识点失败:", error);
      toast.error("删除知识点失败，可能该知识点已被用于评分");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedPointId(null);
      setSelectedPointName("");
    }
  };
  
  // 手动刷新知识点列表
  const handleRefresh = async () => {
    await loadKnowledgePoints();
    if (onKnowledgePointsChanged) {
      await onKnowledgePointsChanged();
    }
    toast.success("知识点列表已刷新");
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge className="px-2 py-1">
            共 {knowledgePoints.length} 个知识点
          </Badge>
          {knowledgePoints.some(p => p.is_ai_generated) && (
            <Badge variant="outline" className="px-2 py-1 bg-blue-50">
              包含AI生成知识点
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button 
            variant="destructive"
            size="sm"
            onClick={() => setShowConfirmDialog(true)}
            disabled={knowledgePoints.length === 0 || isLoading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            清除所有知识点
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : knowledgePoints.length === 0 ? (
        <div className="bg-muted py-8 rounded-md text-center">
          <p className="text-muted-foreground">暂无知识点数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {knowledgePoints.map(point => (
            <Card key={point.id} className={`${point.is_ai_generated ? 'border-blue-200 bg-blue-50/30' : ''}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{point.name}</h4>
                    {point.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {point.description}
                      </p>
                    )}
                    {point.is_ai_generated && (
                      <Badge variant="outline" className="mt-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
                        <BrainCircuit className="mr-1 h-3 w-3" />
                        AI生成
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setSelectedPointId(point.id);
                      setSelectedPointName(point.name);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 删除单个知识点确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除知识点?</AlertDialogTitle>
            <AlertDialogDescription>
              您正在删除知识点 "{selectedPointName}"。此操作不可撤销，且如果该知识点已用于评分，则无法删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePoint}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除所有知识点确认对话框 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              确定删除所有知识点?
            </AlertDialogTitle>
            <AlertDialogDescription>
              您正在删除此作业的所有知识点。此操作不可撤销，且已用于评分的知识点将无法删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearKnowledgePoints}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "删除中..." : "确认删除所有知识点"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 