export interface KnowledgePoint {
  id?: string;
  name: string;
  description?: string;
  importance?: number;
  masteryLevel?: number;
  isNew?: boolean;
  confidence?: number;
  homework_id?: string;
}

export interface HomeworkQuestion {
  id: string;
  content: string;
  type: "multiple_choice" | "short_answer" | "essay" | "file_upload";
  options?: string[];
  correctOption?: number;
  points: number;
  knowledgePoints?: KnowledgePoint[];
}

export interface HomeworkAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: Date | string;
  status: "draft" | "published" | "closed";
  questions: HomeworkQuestion[];
  totalPoints: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface StudentSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  status: "in_progress" | "submitted" | "graded";
  answers: {
    questionId: string;
    answer: string | number | string[];
    files?: string[];
    score?: number;
    feedback?: string;
  }[];
  submittedAt?: Date | string;
  gradedAt?: Date | string;
  totalScore?: number;
}

export interface GradingScale {
  id: string;
  name: string;
  description?: string;
  levels: {
    id: string;
    name: string;
    minScore: number;
    color: string;
  }[];
  isDefault?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface KnowledgePointThreshold {
  id: string;
  knowledgePointId: string;
  knowledgePointName?: string;
  thresholds: {
    level: number;
    description: string;
  }[];
  userId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface SubmissionKnowledgePoint {
  id: string;
  submission_id: string;
  knowledge_point_id: string;
  mastery_level: number;
  created_at?: string;
  updated_at?: string;
  knowledge_point?: KnowledgePoint;
}
