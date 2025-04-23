
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
    setIsLoading
  };

  return (
    <GradeAnalysisContext.Provider value={value}>
      {children}
    </GradeAnalysisContext.Provider>
  );
};
