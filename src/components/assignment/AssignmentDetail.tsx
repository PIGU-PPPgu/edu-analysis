import React, { useState, useEffect } from "react";
import { toast } from "sonner";
// 创建一个Rating组件
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { knowledgePointService } from "@/services/knowledgePointService";
import { getKnowledgePointsByHomeworkId } from "@/services/knowledgePointService";
import { 
  getHomeworkScore, 
  saveHomeworkScore,
  getStudentKnowledgePointScores 
} from "@/services/homeworkService";
import { supabase } from '@/integrations/supabase/client';  // 使用正确的导入路径

// 简单的Rating组件
const Rating = ({ value, onChange }) => {
  return (
    <div className="w-32">
      <Slider
        defaultValue={[value]}
        max={5}
        step={1}
        onValueChange={(values) => onChange(values[0])}
      />
      <div className="text-center text-sm">{value}/5</div>
    </div>
  );
};

interface AssignmentDetailProps {
  assignmentId: string;
  studentId: string;
}

export function AssignmentDetail({ assignmentId, studentId }: AssignmentDetailProps) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [knowledgePoints, setKnowledgePoints] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  
  // 加载作业数据
  useEffect(() => {
    if (assignmentId && studentId) {
      loadAssignmentData();
    }
  }, [assignmentId, studentId]);

  // 加载作业数据
  const loadAssignmentData = async () => {
    setIsLoading(true);
    try {
      // 并行加载所有数据
      const [knowledgePointsResult, existingScoresResult, homeworkScoreResult] = await Promise.all([
        getKnowledgePointsByHomeworkId(assignmentId),
        getStudentKnowledgePointScores(assignmentId),
        getHomeworkScore(assignmentId)
      ]);
      
      // 设置知识点
      setKnowledgePoints(knowledgePointsResult || []);
      
      // 初始化分数对象
      const initialScores: Record<string, number> = {};
      
      // 如果成功获取到已有评分，填充到分数对象中
      if (existingScoresResult?.success && existingScoresResult.data.length > 0) {
        existingScoresResult.data.forEach((item) => {
          initialScores[item.knowledgePointId] = item.masteryLevel;
        });
      } else {
        // 否则初始化为0
        knowledgePointsResult.forEach((point) => {
          initialScores[point.id] = 0;
        });
      }
      
      setScores(initialScores);
      
      // 设置作业整体评分
      if (homeworkScoreResult?.success && homeworkScoreResult.data) {
        setOverallScore(homeworkScoreResult.data.score || null);
        setGrade(homeworkScoreResult.data.grade || '');
        setFeedback(homeworkScoreResult.data.feedback || '');
      }
    } catch (error) {
      console.error("加载作业数据失败:", error);
      toast.error("无法加载作业数据");
    } finally {
      setIsLoading(false);
    }
  };
  
  // 处理知识点评分变更
  const handleKnowledgePointScoreChange = (pointId: string, score: number) => {
    setScores((prevScores) => ({
      ...prevScores,
      [pointId]: score
    }));
  };

  // 保存知识点评分
  const saveKnowledgePointScores = async () => {
    if (!assignmentId || !studentId) return false;
    
    try {
      // 准备数据
      const knowledgePointScores = Object.entries(scores).map(([pointId, score]) => ({
        knowledge_point_id: pointId,
        submission_id: assignmentId,
        mastery_level: score
      }));
      
      console.log('保存知识点评分:', knowledgePointScores);
      
      // 使用Supabase直接保存评分
      const { error } = await supabase
        .from('submission_knowledge_points')
        .upsert(knowledgePointScores, {
          onConflict: 'submission_id,knowledge_point_id'
        });
      
      if (error) {
        console.error('保存知识点评分失败:', error);
        toast.error(`保存知识点评分失败: ${error.message}`);
        return false;
      }
      
      toast.success('知识点评分已保存');
      return true;
    } catch (error) {
      console.error('保存知识点评分时发生错误:', error);
      toast.error(`保存知识点评分失败: ${error.message}`);
      return false;
    }
  };
  
  // 保存整体评分
  const saveOverallScore = async () => {
    if (!assignmentId) return false;
    
    try {
      const result = await saveHomeworkScore(
        assignmentId,
        overallScore,
        grade,
        feedback
      );
      
      return result.success;
    } catch (error) {
      console.error('保存整体评分时发生错误:', error);
      return false;
    }
  };
  
  // 保存所有评分数据
  const handleSaveAll = async () => {
    if (!assignmentId || !studentId) {
      toast.error('无效的作业或学生ID');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // 保存知识点评分
      const knowledgePointResult = await saveKnowledgePointScores();
      
      // 保存整体评分
      const overallScoreResult = await saveOverallScore();
      
      if (knowledgePointResult && overallScoreResult) {
        toast.success('所有评分已保存');
      } else if (knowledgePointResult) {
        toast.warning('知识点评分已保存，但整体评分保存失败');
      } else if (overallScoreResult) {
        toast.warning('整体评分已保存，但知识点评分保存失败');
      } else {
        toast.error('评分保存失败');
      }
    } catch (error) {
      console.error('保存评分时发生错误:', error);
      toast.error('保存评分失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 计算知识点评分的平均值作为建议的总分
  const calculateAverageScore = () => {
    const values = Object.values(scores);
    
    if (values.length === 0) return 0;
    
    const sum = values.reduce((acc, score) => acc + score, 0);
    return Math.round((sum / values.length) * 20); // 乘以20转换到0-100的比例
  };
  
  // 自动设置建议分数
  const setSuggestedScore = () => {
    setOverallScore(calculateAverageScore());
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">作业详情</h2>
      
      {isLoading ? (
        <div className="flex justify-center p-4">
          <p>正在加载数据...</p>
        </div>
      ) : (
        <>
          {/* 知识点评分部分 */}
          <div className="bg-card rounded-lg p-4 border">
            <h3 className="text-lg font-semibold mb-4">知识点掌握度评分</h3>
            
            {knowledgePoints.length === 0 ? (
              <p className="text-muted-foreground">没有知识点数据</p>
            ) : (
              <div className="space-y-3">
                {knowledgePoints.map(point => (
                  <div key={point.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">{point.name}</p>
                      {point.description && (
                        <p className="text-sm text-muted-foreground">{point.description}</p>
                      )}
                    </div>
                    <Rating
                      value={scores[point.id] || 0}
                      onChange={(value) => handleKnowledgePointScoreChange(point.id, value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 整体评分部分 */}
          <div className="bg-card rounded-lg p-4 border">
            <h3 className="text-lg font-semibold mb-4">整体评分</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">
                    分数 (0-100)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={overallScore === null ? '' : overallScore}
                      onChange={(e) => setOverallScore(parseInt(e.target.value) || null)}
                      className="w-24"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={setSuggestedScore}
                      title="根据知识点评分计算建议分数"
                    >
                      使用建议分数
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">
                    等级评分 (可选)
                  </label>
                  <Input
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="A/B/C 或其他等级"
                    className="w-full"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">
                  反馈意见 (可选)
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="输入对学生的反馈意见..."
                  rows={4}
                />
              </div>
            </div>
          </div>
          
          {/* 保存按钮 */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveAll} 
              disabled={isSaving || isLoading}
              className="w-32"
            >
              {isSaving ? '保存中...' : '保存所有评分'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
} 