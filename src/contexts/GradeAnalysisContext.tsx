
import React, { createContext, useContext, useState, ReactNode } from "react";

// Define types for our grade data
export interface GradeRecord {
  studentId: string;
  name: string;
  subject: string;
  score: number;
  examDate: string;
  examType: string;
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

  // Determine if data is loaded
  const isDataLoaded = gradeData.length > 0;

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
    isDataLoaded
  };

  return (
    <GradeAnalysisContext.Provider value={value}>
      {children}
    </GradeAnalysisContext.Provider>
  );
};
