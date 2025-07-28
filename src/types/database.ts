export type Database = {
  public: {
    Tables: {
      classes: {
        Row: {
          id: string;
          name: string;
          grade: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          grade: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          grade?: string;
          created_at?: string;
        };
      };
      grades: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          name: string;
          student_id: string;
          class_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          student_id: string;
          class_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          student_id?: string;
          class_id?: string;
          created_at?: string;
        };
      };
      homework: {
        Row: {
          id: string;
          title: string;
          description: string;
          due_date: string;
          class_id: string;
          teacher_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          due_date: string;
          class_id: string;
          teacher_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          due_date?: string;
          class_id?: string;
          teacher_id?: string;
          created_at?: string;
        };
      };
      homework_submissions: {
        Row: {
          id: string;
          student_id: string;
          homework_id: string;
          status: string;
          score: number | null;
          teacher_feedback: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          homework_id: string;
          status: string;
          score?: number | null;
          teacher_feedback?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          homework_id?: string;
          status?: string;
          score?: number | null;
          teacher_feedback?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      knowledge_points: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          homework_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          homework_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          homework_id?: string;
          created_at?: string;
        };
      };
      submission_knowledge_points: {
        Row: {
          id: string;
          submission_id: string;
          knowledge_point_id: string;
          mastery_level: number;
          created_at: string;
          updated_at: string;
          student_id: string | null;
          mastery_grade: string | null;
        };
        Insert: {
          id?: string;
          submission_id: string;
          knowledge_point_id: string;
          mastery_level: number;
          created_at?: string;
          updated_at?: string;
          student_id?: string | null;
          mastery_grade?: string | null;
        };
        Update: {
          id?: string;
          submission_id?: string;
          knowledge_point_id?: string;
          mastery_level?: number;
          created_at?: string;
          updated_at?: string;
          student_id?: string | null;
          mastery_grade?: string | null;
        };
      };
      student_knowledge_mastery: {
        Row: {
          id: string;
          student_id: string;
          knowledge_point_id: string;
          homework_id: string;
          submission_id: string;
          mastery_level: number;
          mastery_grade: string;
          assessment_count: number;
          comments: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          knowledge_point_id: string;
          homework_id: string;
          submission_id: string;
          mastery_level: number;
          mastery_grade?: string;
          assessment_count?: number;
          comments?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          knowledge_point_id?: string;
          homework_id?: string;
          submission_id?: string;
          mastery_level?: number;
          mastery_grade?: string;
          assessment_count?: number;
          comments?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // 其他表...
    };
  };
};
