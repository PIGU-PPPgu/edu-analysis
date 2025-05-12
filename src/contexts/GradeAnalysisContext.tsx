import React, { createContext, useContext, useState, ReactNode } from "react";

// Define types for our grade data
export interface GradeRecord {
  id?: string;
  studentId: string;
  name: string;
  subject: string;
  score: number;
  examDate: string;
  examType: string;
  studentName?: string;
  className?: string;
  [key: string]: any; // Allow for flexible additional fields
}

export interface ChartData {
  id: string;
  data: any[];
}

export interface ParsedFileInfo {
  headers: string[];
  mappings: Record<string, string>;
}

interface ExamInfo {
  id: string;
  title: string;
  type: string;
  date: string;
  subject?: string;
}

interface GradeAnalysisContextType {
  gradeData: GradeRecord[];
  setGradeData: (data: GradeRecord[]) => void;
  customCharts: ChartData[];
  setCustomCharts: (charts: ChartData[]) => void;
  selectedCharts: string[];
  setSelectedCharts: (chartIds: string[]) => void;
  parsingError: string | null;
  setParsingError: (error: string | null) => void;
  fileInfo: ParsedFileInfo | null;
  setFileInfo: (info: ParsedFileInfo | null) => void;
  isDataLoaded: boolean;
  calculateStatistics: (data: GradeRecord[]) => any;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  examList: ExamInfo[];
  currentExam: ExamInfo | null;
  examData: any[];
  analysisResult: any | null;
  loading: boolean;
  setCurrentExam: (exam: ExamInfo) => void;
  loadExamList: () => Promise<void>;
  loadExamData: (examId: string) => Promise<void>;
  analyzeCurrentExam: () => Promise<void>;
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
  const [gradeData, setGradeData] = useState<GradeRecord[]>([]);
  const [customCharts, setCustomCharts] = useState<ChartData[]>([]);
  const [selectedCharts, setSelectedCharts] = useState<string[]>(["distribution", "subject"]);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<ParsedFileInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [examList, setExamList] = useState<ExamInfo[]>([]);
  const [currentExam, setCurrentExam] = useState<ExamInfo | null>(null);
  const [examData, setExamData] = useState<any[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Determine if data is loaded
  const isDataLoaded = gradeData.length > 0;

  // Calculate statistics from grade data
  const calculateStatistics = (data: GradeRecord[]) => {
    if (!data || data.length === 0) {
      return { avg: 0, max: 0, min: 0, passing: 0, total: 0 };
    }

    const scores = data.map(item => item.score).filter(score => !isNaN(Number(score)));
    
    if (scores.length === 0) {
      return { avg: 0, max: 0, min: 0, passing: 0, total: 0 };
    }
    
    const avg = scores.reduce((sum, score) => sum + Number(score), 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passing = scores.filter(score => Number(score) >= 60).length;
    
    return {
      avg: parseFloat(avg.toFixed(2)),
      max,
      min,
      passing,
      total: scores.length
    };
  };

  const loadExamList = async () => {
    setLoading(true);
    try {
      // 模拟API调用，需要替换为实际后端调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟数据
      const mockExams = [
        { id: '1', title: '期中考试', type: '期中', date: '2023-10-15', subject: '综合' },
        { id: '2', title: '月考', type: '月考', date: '2023-09-20', subject: '综合' },
        { id: '3', title: '单元测试', type: '单元', date: '2023-08-25', subject: '语文' }
      ];
      
      setExamList(mockExams);
      if (mockExams.length > 0) {
        setCurrentExam(mockExams[0]);
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
      // 模拟API调用，需要替换为实际后端调用
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 模拟数据
      const mockGradeData = Array(30).fill(null).map((_, index) => ({
        id: `s${index + 1}`,
        student_id: `S${10000 + index}`,
        name: `学生${index + 1}`,
        class_name: `班级${Math.floor(index / 10) + 1}`,
        total_score: Math.floor(60 + Math.random() * 40),
        chinese_score: Math.floor(60 + Math.random() * 40),
        math_score: Math.floor(60 + Math.random() * 40),
        english_score: Math.floor(60 + Math.random() * 40),
        rank_in_class: index % 10 + 1,
        exam_id: examId
      }));
      
      setExamData(mockGradeData);
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
          chinese: 82.3,
          math: 78.6,
          english: 84.1
        }
      };
      
      setAnalysisResult(mockAnalysisResult);
    } catch (error) {
      console.error('分析成绩数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    gradeData,
    setGradeData,
    customCharts,
    setCustomCharts,
    selectedCharts,
    setSelectedCharts,
    parsingError,
    setParsingError,
    fileInfo,
    setFileInfo,
    isDataLoaded,
    calculateStatistics,
    isLoading,
    setIsLoading,
    examList,
    currentExam,
    examData,
    analysisResult,
    loading,
    setCurrentExam,
    loadExamList,
    loadExamData,
    analyzeCurrentExam
  };

  return (
    <GradeAnalysisContext.Provider value={value}>
      {children}
    </GradeAnalysisContext.Provider>
  );
};
