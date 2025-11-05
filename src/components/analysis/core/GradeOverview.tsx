import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Loader2,
  RefreshCw,
  AlertCircle,
  Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GradeOverviewProps {
  parsingError?: string | null;
  gradeData?: any[];
}

interface EnhancedGradeStats {
  avg: number;
  max: number;
  min: number;
  passing: number;
  total: number;
  totalScore: number;
  subjectScores: Array<{
    subject: string;
    avg: number;
    max: number;
    min: number;
    totalScore: number;
  }>;
  gradeDistribution: Record<string, number>;
}

const GradeOverview: React.FC<GradeOverviewProps> = ({
  parsingError,
  gradeData: propGradeData,
}) => {
  const { isDataLoaded } = useGradeAnalysis();
  const gradeData = propGradeData || [];
  const [stats, setStats] = useState<EnhancedGradeStats>({
    avg: 0,
    max: 0,
    min: 0,
    passing: 0,
    total: 0,
    totalScore: 100,
    subjectScores: [],
    gradeDistribution: {},
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const navigate = useNavigate();

  // 使用useMemo来稳定gradeData的引用，避免无限循环
  const stableGradeData = useMemo(() => {
    return JSON.stringify(gradeData);
  }, [gradeData]);

  // 使用useCallback包装计算函数
  const calculateStats = useCallback(async () => {
    const currentGradeData = JSON.parse(stableGradeData);

    if (!currentGradeData || currentGradeData.length === 0) {
      setStats({
        avg: 0,
        max: 0,
        min: 0,
        passing: 0,
        total: 0,
        totalScore: 100,
        subjectScores: [],
        gradeDistribution: {},
      });
      return;
    }

    try {
      setIsCalculating(true);
      setCalculationProgress(0);

      setCalculationProgress(20);

      // 获取有效分数
      const validGrades = currentGradeData.filter((grade) => {
        const effectiveScore = grade.score ?? grade.total_score;
        return effectiveScore !== null && !isNaN(Number(effectiveScore));
      });

      setCalculationProgress(50);

      if (validGrades.length === 0) {
        const uniqueStudents = [
          ...new Set(currentGradeData.map((grade) => grade.student_id)),
        ];
        setStats({
          avg: 0,
          max: 0,
          min: 0,
          passing: 0,
          total: uniqueStudents.length,
          totalScore: 100,
          subjectScores: [],
          gradeDistribution: {},
        });
        setIsCalculating(false);
        return;
      }

      // 计算基本统计
      const effectiveScores = validGrades.map((grade) => {
        const score = grade.score ?? grade.total_score;
        return Number(score);
      });

      const uniqueStudents = [
        ...new Set(validGrades.map((grade) => grade.student_id)),
      ];
      const totalStudents = uniqueStudents.length;

      const sum = effectiveScores.reduce((acc, score) => acc + score, 0);
      const avg = sum / effectiveScores.length;
      const max = Math.max(...effectiveScores);
      const min = Math.min(...effectiveScores);

      setCalculationProgress(70);

      // 计算及格率
      const passingCount = effectiveScores.filter(
        (score) => score >= 60
      ).length;

      setCalculationProgress(90);

      const finalStats = {
        avg,
        max,
        min,
        passing: passingCount,
        total: totalStudents,
        totalScore: 100,
        subjectScores: [],
        gradeDistribution: {},
      };

      setStats(finalStats);
      setCalculationProgress(100);
    } catch (error) {
      console.error("计算统计失败:", error);
      toast.error("计算统计失败");
    } finally {
      setTimeout(() => setIsCalculating(false), 300);
    }
  }, [stableGradeData]);

  useEffect(() => {
    if (gradeData && gradeData.length > 0) {
      calculateStats();
    }
  }, [calculateStats]);

  // 组件状态
  if (parsingError) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-red-700 mb-2">
              数据解析错误
            </p>
            <p className="text-sm text-red-500 mb-4">{parsingError}</p>
            <Button onClick={() => navigate("/upload")}>重新上传</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isDataLoaded) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-blue-700">加载数据中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isCalculating) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <RefreshCw className="h-6 w-6 text-green-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-green-700">分析数据中...</p>
            <div className="w-64 bg-green-100 rounded-full h-2 mx-auto mt-4">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${calculationProgress}%` }}
              />
            </div>
            <p className="text-xs text-green-400 mt-2">
              {calculationProgress}% 完成
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!gradeData || gradeData.length === 0) {
    return (
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-amber-700 mb-2">暂无数据</p>
            <p className="text-sm text-amber-500 mb-4">请先上传成绩数据</p>
            <Button onClick={() => navigate("/upload")}>上传数据</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 成功状态
  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-blue-600">平均分</p>
            <p className="text-3xl font-bold text-blue-900">
              {stats.avg.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-green-600">最高分</p>
            <p className="text-3xl font-bold text-green-900">{stats.max}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-orange-600">最低分</p>
            <p className="text-3xl font-bold text-orange-900">{stats.min}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-purple-600">及格人数</p>
            <p className="text-3xl font-bold text-purple-900">
              {stats.passing}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">成绩概览</CardTitle>
          <CardDescription>基本统计信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-lg">
              总计{" "}
              <span className="font-bold text-blue-600">{stats.total}</span>{" "}
              名学生
            </p>
            <p className="text-sm text-gray-500 mt-2">
              及格率:{" "}
              {stats.total > 0
                ? ((stats.passing / stats.total) * 100).toFixed(1)
                : 0}
              %
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeOverview;
