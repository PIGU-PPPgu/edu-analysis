export interface StudentData {
  studentId: string;
  name: string;
  className?: string;
  age?: number;
  scores: {
    subject: string;
    score: number;
    examDate?: string;
    examType?: string;
  }[];
}

export interface ScoreSummaryProps {
  student: StudentData;
}
