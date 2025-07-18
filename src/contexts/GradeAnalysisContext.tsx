import React, { createContext, useContext, useState, ReactNode } from "react";
import { 
  GradeRecord, 
  ExamInfo, 
  GradeStatistics, 
  GradeFilter,
  Subject 
} from "@/types/grade";
import { supabase } from "@/integrations/supabase/client";

// 图表数据接口
export interface ChartData {
  id: string;
  data: any[];
}

// 解析文件信息接口
export interface ParsedFileInfo {
  headers: string[];
  mappings: Record<string, string>;
}

// Context接口定义
interface GradeAnalysisContextType {
  // 基础数据
  gradeData: GradeRecord[];
  setGradeData: (data: GradeRecord[]) => void;
  
  // 过滤后的数据
  filteredGradeData: GradeRecord[];
  
  // 当前筛选条件
  filter: GradeFilter;
  setFilter: (filter: GradeFilter) => void;
  
  // 图表相关
  customCharts: ChartData[];
  setCustomCharts: (charts: ChartData[]) => void;
  selectedCharts: string[];
  setSelectedCharts: (chartIds: string[]) => void;
  
  // 错误和文件信息
  parsingError: string | null;
  setParsingError: (error: string | null) => void;
  fileInfo: ParsedFileInfo | null;
  setFileInfo: (info: ParsedFileInfo | null) => void;
  
  // 状态
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isDataLoaded: boolean;
  
  // 考试相关
  examList: ExamInfo[];
  currentExam: ExamInfo | null;
  selectedExam: ExamInfo | null;
  examData: GradeRecord[];
  analysisResult: any | null;
  loading: boolean;
  examInfo?: ExamInfo;
  
  // 操作方法
  setCurrentExam: (exam: ExamInfo) => void;
  setSelectedExam: (exam: ExamInfo | null) => void;
  loadExamList: () => Promise<void>;
  loadExamData: (examId: string) => Promise<void>;
  analyzeCurrentExam: () => Promise<void>;
  calculateStatistics: (data: GradeRecord[]) => GradeStatistics;
  
  // 筛选方法
  filterBySubject: (subject: Subject | string) => GradeRecord[];
  filterByClass: (className: string) => GradeRecord[];
  filterByGradeLevel: (gradeLevel: string) => GradeRecord[];
}

const GradeAnalysisContext = createContext<GradeAnalysisContextType | undefined>(undefined);

export const useGradeAnalysis = () => {
  const context = useContext(GradeAnalysisContext);
  if (context === undefined) {
    throw new Error("useGradeAnalysis must be used within a GradeAnalysisProvider");
  }
  return context;
};

export const GradeAnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 基础状态
  const [gradeData, setGradeData] = useState<GradeRecord[]>([]);
  const [filter, setFilter] = useState<GradeFilter>({});
  const [customCharts, setCustomCharts] = useState<ChartData[]>([]);
  const [selectedCharts, setSelectedCharts] = useState<string[]>(["distribution", "subject"]);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<ParsedFileInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // 考试相关状态
  const [examList, setExamList] = useState<ExamInfo[]>([]);
  const [currentExam, setCurrentExam] = useState<ExamInfo | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamInfo | null>(null);
  const [examData, setExamData] = useState<GradeRecord[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // 计算过滤后的数据
  const filteredGradeData = React.useMemo(() => {
    let filtered = [...gradeData];
    
    if (filter.subject) {
      filtered = filtered.filter(record => 
        record.subject === filter.subject || 
        (record.subject === undefined && filter.subject === Subject.TOTAL)
      );
    }
    
    if (filter.class) {
      filtered = filtered.filter(record => 
        record.class_name === filter.class
      );
    }
    
    if (filter.examId) {
      filtered = filtered.filter(record => 
        record.exam_id === filter.examId
      );
    }
    
    if (filter.gradeLevel) {
      filtered = filtered.filter(record => 
        record.grade_level === filter.gradeLevel
      );
    }
    
    if (filter.scoreRange) {
      filtered = filtered.filter(record => 
        record.score >= (filter.scoreRange?.min || 0) && 
        record.score <= (filter.scoreRange?.max || Infinity)
      );
    }
    
    return filtered;
  }, [gradeData, filter]);

  // 判断数据是否加载
  const isDataLoaded = gradeData.length > 0;

  // 计算统计数据
  const calculateStatistics = (data: GradeRecord[]): GradeStatistics => {
    if (!data || data.length === 0) {
      return { 
        total: 0, 
        average: 0, 
        max: 0, 
        min: 0, 
        median: 0,
        standardDeviation: 0,
        passRate: 0, 
        excellentRate: 0,
        distribution: []
      };
    }

    const scores = data.map(item => item.score).filter(score => !isNaN(Number(score)));
    
    if (scores.length === 0) {
      return { 
        total: 0, 
        average: 0, 
        max: 0, 
        min: 0, 
        median: 0,
        standardDeviation: 0,
        passRate: 0, 
        excellentRate: 0,
        distribution: []
      };
    }
    
    // 基础统计
    const total = scores.length;
    const sum = scores.reduce((a, b) => a + Number(b), 0);
    const average = sum / total;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    
    // 中位数
    const sortedScores = [...scores].sort((a, b) => a - b);
    const median = total % 2 === 0 
      ? (sortedScores[total / 2 - 1] + sortedScores[total / 2]) / 2
      : sortedScores[Math.floor(total / 2)];
    
    // 标准差
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - average, 2), 0) / total;
    const standardDeviation = Math.sqrt(variance);
    
    // 及格率和优秀率（简化计算）
    const passCount = scores.filter(score => Number(score) >= 60).length;
    const excellentCount = scores.filter(score => Number(score) >= 90).length;
    const passRate = (passCount / total) * 100;
    const excellentRate = (excellentCount / total) * 100;
    
    return {
      total,
      average: parseFloat(average.toFixed(2)),
      max,
      min,
      median: parseFloat(median.toFixed(2)),
      standardDeviation: parseFloat(standardDeviation.toFixed(2)),
      passRate: parseFloat(passRate.toFixed(2)),
      excellentRate: parseFloat(excellentRate.toFixed(2)),
      distribution: [] // 这里可以后续添加等级分布
    };
  };

  // 筛选方法
  const filterBySubject = (subject: Subject | string): GradeRecord[] => {
    return gradeData.filter(record => record.subject === subject);
  };

  const filterByClass = (className: string): GradeRecord[] => {
    return gradeData.filter(record => record.class_name === className);
  };

  const filterByGradeLevel = (gradeLevel: string): GradeRecord[] => {
    return gradeData.filter(record => record.grade_level === gradeLevel);
  };

  // 考试相关操作
  const loadExamList = async () => {
    setLoading(true);
    try {
      // 从 Supabase 获取真实考试数据
      const { data: examData, error } = await supabase
        .from('exams')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('获取考试列表失败:', error);
        throw error;
      }

      const exams: ExamInfo[] = examData?.map(exam => ({
        id: exam.id,
        name: exam.title,
        type: exam.type,
        date: exam.date,
        subjects: [Subject.TOTAL, Subject.CHINESE, Subject.MATH] // 根据实际需要调整
      })) || [];
      
      setExamList(exams);
      if (exams.length > 0) {
        setCurrentExam(exams[0]);
        // 自动加载第一个考试的数据
        await loadExamData(exams[0].id);
      }
    } catch (error) {
      console.error('获取考试列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExamData = async (examId: string) => {
    setLoading(true);
    try {
      console.log('正在加载考试数据, examId:', examId);
      
      // 从 Supabase 获取真实成绩数据
      const { data: gradeDataFromDB, error } = await supabase
        .from('grade_data')
        .select('*')
        .eq('exam_id', examId);

      if (error) {
        console.error('获取成绩数据失败:', error);
        throw error;
      }

      console.log('获取到的成绩数据:', gradeDataFromDB);

      // 转换数据格式以匹配 GradeRecord 接口
      const gradeRecords: GradeRecord[] = gradeDataFromDB?.map(record => ({
        id: record.id,
        student_id: record.student_id,
        student_name: record.name,
        class_name: record.class_name || '未分班',
        subject: record.subject || Subject.TOTAL,
        score: record.score || 0,
        exam_id: record.exam_id,
        grade_level: record.grade_level,
        rank_in_class: record.rank_in_class,
        rank_in_grade: record.rank_in_grade
      })) || [];
      
      console.log('转换后的成绩记录:', gradeRecords);
      setExamData(gradeRecords);
      setGradeData(gradeRecords); // 同时更新主要的成绩数据
    } catch (error) {
      console.error('获取成绩数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeCurrentExam = async () => {
    if (!currentExam) return;
    
    setLoading(true);
    try {
      // 模拟API调用，需要替换为实际后端调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟统计数据
      const mockAnalysisResult = {
        scoreDistribution: [
          { range: '90-100', count: 5 },
          { range: '80-89', count: 10 },
          { range: '70-79', count: 8 },
          { range: '60-69', count: 4 },
          { range: '0-59', count: 3 }
        ],
        classPerformance: [
          { className: '班级1', average: 85.6, max: 98, min: 67, passRate: 1.0 },
          { className: '班级2', average: 76.2, max: 95, min: 58, passRate: 0.9 },
          { className: '班级3', average: 81.4, max: 97, min: 62, passRate: 0.95 }
        ],
        subjectAverages: {
          [Subject.CHINESE]: 82.3,
          [Subject.MATH]: 78.6,
          [Subject.ENGLISH]: 84.1
        }
      };
      
      setAnalysisResult(mockAnalysisResult);
    } catch (error) {
      console.error('分析成绩数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // Context值
  const value: GradeAnalysisContextType = {
    // 基础数据
    gradeData,
    setGradeData,
    filteredGradeData,
    
    // 筛选条件
    filter,
    setFilter,
    
    // 图表相关
    customCharts,
    setCustomCharts,
    selectedCharts,
    setSelectedCharts,
    
    // 错误和文件信息
    parsingError,
    setParsingError,
    fileInfo,
    setFileInfo,
    
    // 状态
    isLoading,
    setIsLoading,
    isDataLoaded,
    
    // 考试相关
    examList,
    currentExam,
    selectedExam,
    examData,
    analysisResult,
    loading,
    
    // 操作方法
    setCurrentExam,
    setSelectedExam,
    loadExamList,
    loadExamData,
    analyzeCurrentExam,
    calculateStatistics,
    
    // 筛选方法
    filterBySubject,
    filterByClass,
    filterByGradeLevel
  };

  return (
    <GradeAnalysisContext.Provider value={value}>
      {children}
    </GradeAnalysisContext.Provider>
  );
};


