import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
// import EnhancedStatisticsOverview from "@/components/analysis/EnhancedStatisticsOverview"; // 已删除
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { calculateStatistics } from "@/utils/chartGenerationUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, RefreshCw, AlertCircle, CheckCircle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface GradeOverviewProps {
  parsingError?: string | null;
  gradeData?: any[]; // 新增：接收筛选后的成绩数据
}

interface EnhancedGradeStats {
  avg: number;
  max: number;
  min: number;
  passing: number;
  total: number;
  totalScore: number; // 总分信息
  subjectScores: Array<{
    subject: string;
    avg: number;
    max: number;
    min: number;
    totalScore: number;
  }>;
  gradeDistribution: Record<string, number>; // 等级分布
}

const GradeOverview: React.FC<GradeOverviewProps> = ({ parsingError, gradeData: propGradeData }) => {
  const { isDataLoaded, selectedExam } = useGradeAnalysis(); // 移除gradeData的解构
  // 使用传入的gradeData，如果没有则从context获取
  const gradeData = propGradeData || [];
  const [stats, setStats] = useState<EnhancedGradeStats>({
    avg: 0,
    max: 0,
    min: 0,
    passing: 0,
    total: 0,
    totalScore: 100,
    subjectScores: [],
    gradeDistribution: {}
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [gradeLevelConfig, setGradeLevelConfig] = useState<any>(null);
  const navigate = useNavigate();

  // 获取等级配置
  useEffect(() => {
    const fetchGradeLevelConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('grade_level_config')
          .select('*')
          .eq('is_default', true)
          .single();
        
        if (error) {
          console.warn('获取等级配置失败，使用默认配置:', error);
          // 使用默认配置
          setGradeLevelConfig({
            name: '标准五级制',
            levels: [
              { level: "A", min_score: 90, max_score: 100, description: "优秀" },
              { level: "B", min_score: 80, max_score: 89, description: "良好" },
              { level: "C", min_score: 70, max_score: 79, description: "中等" },
              { level: "D", min_score: 60, max_score: 69, description: "及格" },
              { level: "E", min_score: 0, max_score: 59, description: "不及格" }
            ]
          });
        } else {
          setGradeLevelConfig(data);
        }
      } catch (error) {
        console.error('获取等级配置时出错:', error);
      }
    };

    fetchGradeLevelConfig();
  }, []);

  useEffect(() => {
    const calculateEnhancedGradeStatistics = async () => {
      if (!gradeData || gradeData.length === 0) {
        console.log("没有可用的成绩数据，无法计算统计信息");
        setStats({
          avg: 0,
          max: 0,
          min: 0,
          passing: 0,
          total: 0,
          totalScore: 100,
          subjectScores: [],
          gradeDistribution: {}
        });
        return;
      }

      try {
        setIsCalculating(true);
        setCalculationProgress(0);
        
        console.log(`开始分析考试成绩数据: ${gradeData.length} 条记录`);
        
        setCalculationProgress(10);
        
        // 使用新的字段获取有效分数
        const validGrades = gradeData.filter(grade => {
          const effectiveScore = grade.score ?? grade.total_score;
          return effectiveScore !== null && !isNaN(Number(effectiveScore));
        });
        
        setCalculationProgress(30);
        
        if (validGrades.length === 0) {
          console.warn("没有有效的成绩数据");
          // 即使没有有效分数，也要计算实际学生数
          const uniqueStudents = [...new Set(gradeData.map(grade => grade.student_id))];
          setStats({
            avg: 0,
            max: 0,
            min: 0,
            passing: 0,
            total: uniqueStudents.length, // 使用实际学生数
            totalScore: 100,
            subjectScores: [],
            gradeDistribution: {}
          });
          return;
        }
        
        setCalculationProgress(50);
        
        // 计算有效分数
        const effectiveScores = validGrades.map(grade => {
          const score = grade.score ?? grade.total_score;
          return Number(score);
        });
        
        // 计算实际学生数（去重统计）
        const uniqueStudents = [...new Set(validGrades.map(grade => grade.student_id))];
        const totalStudents = uniqueStudents.length;
        const totalRecords = validGrades.length;
        
        // 基本统计
        const sum = effectiveScores.reduce((acc, score) => acc + score, 0);
        const avg = sum / totalRecords;
        const max = Math.max(...effectiveScores);
        const min = Math.min(...effectiveScores);
        
        setCalculationProgress(70);
        
        // 计算及格率（默认60分及格）- 按学生统计，不是按记录统计
        const passingThreshold = 60;
        
        // 按学生计算及格率：每个学生计算平均分，然后看平均分是否及格
        const studentAverages: Record<string, number> = {};
        const studentCounts: Record<string, number> = {};
        
        validGrades.forEach(grade => {
          const studentId = grade.student_id;
          const effectiveScore = grade.score ?? grade.total_score;
          const score = Number(effectiveScore);
          
          if (!studentAverages[studentId]) {
            studentAverages[studentId] = 0;
            studentCounts[studentId] = 0;
          }
          studentAverages[studentId] += score;
          studentCounts[studentId] += 1;
        });
        
        // 计算每个学生的平均分
        const studentFinalAverages = Object.keys(studentAverages).map(studentId => {
          return studentAverages[studentId] / studentCounts[studentId];
        });
        
        // 计算及格学生数
        const passingCount = studentFinalAverages.filter(avg => avg >= passingThreshold).length;
        
        // 计算科目分数（如果有科目信息）
        const subjectScores: Array<{
          subject: string;
          avg: number;
          max: number;
          min: number;
          totalScore: number;
        }> = [];
        
        // 获取数据库配置的满分
        const getMaxScoreForSubject = (subject: string): number => {
          switch (subject) {
            case '总分': return 523;
            case '语文': return 120;
            case '数学': return 100;
            case '英语': return 75;
            case '历史': return 70;
            case '物理': return 63;
            case '政治': return 50;
            case '化学': return 45;
            default: return 100; // 默认满分
          }
        };
        
        const subjectGroups = validGrades.reduce((groups, grade) => {
          const subject = grade.subject || '总分';
          if (!groups[subject]) {
            groups[subject] = [];
          }
          const effectiveScore = grade.score ?? grade.total_score;
          
          groups[subject].push({
            score: Number(effectiveScore),
            totalScore: getMaxScoreForSubject(subject)
          });
          return groups;
        }, {} as Record<string, Array<{score: number, totalScore: number}>>);
        
        Object.entries(subjectGroups).forEach(([subject, scores]) => {
          const subjectScoreValues = scores.map(s => s.score);
          const correctTotalScore = getMaxScoreForSubject(subject);
          
          subjectScores.push({
            subject,
            avg: subjectScoreValues.reduce((sum, score) => sum + score, 0) / subjectScoreValues.length,
            max: Math.max(...subjectScoreValues),
            min: Math.min(...subjectScoreValues),
            totalScore: correctTotalScore
          });
        });
        
        setCalculationProgress(85);
        
        // 计算等级分布 - 修复：基于实际分数计算等级分布，按学生计算而不是按记录
        const gradeDistribution: Record<string, number> = {};
        
        // 只获取总分记录来计算等级分布
        const totalScoreGrades = validGrades.filter(grade => grade.subject === '总分');
        
        totalScoreGrades.forEach(grade => {
          const score = Number(grade.score);
          let effectiveGrade = '❓未知级';
          
          // 优先根据实际分数计算等级（基于总分400的情况）
          if (!isNaN(score) && score > 0) {
            // 假设总分400，按百分比划分等级
            const percentage = score / 400 * 100;
            if (percentage >= 90) effectiveGrade = '🏆优秀';
            else if (percentage >= 80) effectiveGrade = '👍良好';
            else if (percentage >= 70) effectiveGrade = '📈中等';
            else if (percentage >= 60) effectiveGrade = '✓及格';
            else effectiveGrade = '⚠️不及格';
          } else {
            // 如果分数无效，再尝试从等级字段获取
            let rawGrade = grade.总分等级 || grade.grade_level || grade.gradeLevel;
            
            if (rawGrade) {
              // 标准化等级名称 - 处理字母等级
              if (rawGrade === 'A+' || rawGrade === 'A' || rawGrade === '优秀') effectiveGrade = '🏆优秀';
              else if (rawGrade === 'B+' || rawGrade === 'B' || rawGrade === '良好') effectiveGrade = '👍良好';
              else if (rawGrade === 'C+' || rawGrade === 'C' || rawGrade === '中等') effectiveGrade = '📈中等';
              else if (rawGrade === 'D+' || rawGrade === 'D' || rawGrade === '及格') effectiveGrade = '✓及格';
              else if (rawGrade === 'E+' || rawGrade === 'E' || rawGrade === 'F' || rawGrade === '不及格') effectiveGrade = '⚠️不及格';
            }
          }
          
          gradeDistribution[effectiveGrade] = (gradeDistribution[effectiveGrade] || 0) + 1;
        });
        
        console.log(`等级分布计算完成: 共${totalScoreGrades.length}名学生的总分等级分布:`, gradeDistribution);
        
        setCalculationProgress(95);
        
        // 获取总分信息 - 智能推测满分
        let avgTotalScore = 100; // 默认满分
        
        // 找到总分科目的满分
        const totalSubjectGrades = validGrades.filter(grade => grade.subject === '总分');
        if (totalSubjectGrades.length > 0) {
          const totalScores = totalSubjectGrades.map(grade => {
            const effectiveScore = grade.score ?? grade.total_score;
            return Number(effectiveScore);
          }).filter(score => !isNaN(score) && score > 0);
          
          if (totalScores.length > 0) {
            const maxTotalScore = Math.max(...totalScores);
            // 根据最高分推测总分满分
            if (maxTotalScore > 350) {
              avgTotalScore = 400;
            } else if (maxTotalScore > 300) {
              avgTotalScore = 350;
            } else if (maxTotalScore > 280) {
              avgTotalScore = 300;
            } else {
              // 向上取整到50的倍数
              avgTotalScore = Math.ceil(maxTotalScore / 50) * 50;
            }
          }
        }
        
        setCalculationProgress(100);
        
        // 总结
        const finalStats: EnhancedGradeStats = {
          avg,
          max,
          min,
          passing: passingCount,
          total: totalStudents, // 使用实际学生数，不是记录数
          totalScore: Math.round(avgTotalScore), // 使用智能推测的平均满分
          subjectScores,
          gradeDistribution
        };
        
        console.log(`成绩统计计算完成: ${totalStudents}名学生，${totalRecords}条记录, 平均分${avg.toFixed(1)}, 及格率${(passingCount/totalStudents*100).toFixed(1)}%`);
        
        setStats(finalStats);
        setCalculationProgress(100);
      } catch (error) {
        console.error("计算成绩统计失败:", error);
        toast.error("计算成绩统计失败", {
          description: error instanceof Error ? error.message : "未知错误"
        });
      } finally {
        setTimeout(() => setIsCalculating(false), 500); // 短暂延迟以显示100%完成
      }
    };

    calculateEnhancedGradeStatistics();
  }, [gradeData]);

  // 检查是否存在AI增强的导入数据
  const aiAnalysisResult = React.useMemo(() => {
    // 检查gradeData中是否有AI分析相关的元数据
    if (!gradeData || gradeData.length === 0) return null;
    
    // 查找AI相关标记（可能在第一条记录的元数据中）
    const firstRecord = gradeData[0];
    const hasAIMarkers = firstRecord._examInfo || 
                         firstRecord._aiAnalysis || 
                         firstRecord._aiProcessed;
    
    if (hasAIMarkers) {
      // 模拟AI分析结果（实际应该从导入过程中保存）
      const detectedSubjects = [...new Set(gradeData.map(record => record.subject).filter(Boolean))];
      const detectedClasses = [...new Set(gradeData.map(record => record.class_name).filter(Boolean))];
      
      return {
        confidence: 0.92, // 高置信度
        detectedPatterns: [
          `识别出${detectedSubjects.length}个科目`,
          `识别出${detectedClasses.length}个班级`,
          '宽表格式数据',
          '包含排名信息',
          '数据完整性良好'
        ],
        recommendations: [
          '数据结构清晰，适合进行多维度分析',
          '建议重点关注班级间成绩差异',
          '可以进行科目间相关性分析',
          detectedSubjects.length > 3 ? '科目较多，建议分组分析' : '科目数量适中，可整体分析'
        ],
        isAIEnhanced: true
      };
    }
    
    return null;
  }, [gradeData]);

  // 加载状态组件
  const LoadingState = () => (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md">
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse opacity-30"></div>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-blue-700">加载成绩数据中...</p>
              <p className="text-sm text-blue-500">正在从数据库获取最新成绩信息</p>
            </div>
            <div className="w-64 bg-blue-100 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: '60%' }}
              ></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 计算状态组件
  const CalculatingState = () => (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-md">
      <CardContent className="pt-6">
        <div className="text-center py-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <RefreshCw className="h-6 w-6 text-green-600 animate-spin" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-green-700">智能分析成绩数据中...</p>
              <p className="text-sm text-green-500">正在分析 {gradeData.length} 条成绩记录</p>
              <div className="flex items-center gap-2 text-xs text-green-600">
                <Info className="h-3 w-3" />
                <span>分析等级分布、科目表现和总分情况</span>
              </div>
            </div>
            <div className="w-64 bg-green-100 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${calculationProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-green-400">{calculationProgress}% 完成</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 错误状态组件
  const ErrorState = () => (
    <Card className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200 shadow-md">
      <CardContent className="pt-6">
        <div className="text-center py-6">
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-red-700">数据解析错误</p>
              <p className="text-sm text-red-500 max-w-md">{parsingError}</p>
            </div>
            <Button 
              onClick={() => navigate('/upload')}
              className="inline-flex items-center bg-red-500 hover:bg-red-600 text-white"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              重新上传成绩
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 空数据状态组件
  const EmptyState = () => (
    <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-md">
      <CardContent className="pt-6">
        <div className="text-center py-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-amber-700">暂无成绩数据</p>
              <p className="text-sm text-amber-500">请先上传学生成绩数据进行分析</p>
            </div>
            <Button 
              onClick={() => navigate('/upload')}
              className="inline-flex items-center bg-amber-500 hover:bg-amber-600 text-white"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              上传成绩数据
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 成功状态组件
  const SuccessState = () => (
    <div className="space-y-6">
      {/* 统计数据展示 - 直接显示，不要额外的提示卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-600">平均分</p>
                <p className="text-3xl font-bold text-blue-900">{stats.avg.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-600">最高分</p>
                <p className="text-3xl font-bold text-green-900">{stats.max}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-600">最低分</p>
                <p className="text-3xl font-bold text-orange-900">{stats.min}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-600">及格率</p>
                <p className="text-3xl font-bold text-purple-900">{((stats.passing / stats.total) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // 根据状态渲染不同的组件
  if (parsingError) {
    return <ErrorState />;
  }

  if (!isDataLoaded) {
    return <LoadingState />;
  }

  if (isCalculating) {
    return <CalculatingState />;
  }

  if (!gradeData || gradeData.length === 0) {
    return <EmptyState />;
  }

  return <SuccessState />;
};

export default GradeOverview;
