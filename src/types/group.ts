/**
 * 小组相关类型定义
 */

/**
 * 小组基本信息
 */
export interface Group {
  id: string;
  class_name: string;
  group_name: string;
  description?: string;
  leader_student_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 小组成员
 */
export interface GroupMember {
  id: string;
  group_id: string;
  student_id: string;
  role: "leader" | "member";
  joined_at: string;

  // 关联学生信息（从students表join）
  student_name?: string;
  student_number?: string;
}

/**
 * 小组完整信息（包含成员）
 */
export interface GroupWithMembers extends Group {
  members: GroupMember[];
  member_count: number;
  leader_name?: string;
}

/**
 * 创建小组参数
 */
export interface CreateGroupParams {
  class_name: string;
  group_name: string;
  description?: string;
  leader_student_id?: string;
}

/**
 * 更新小组参数
 */
export interface UpdateGroupParams {
  group_name?: string;
  description?: string;
  leader_student_id?: string;
}

/**
 * 小组统计信息
 */
export interface GroupStats {
  group_id: string;
  group_name: string;
  member_count: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  grade_distribution: {
    grade: string;
    count: number;
  }[];
}

/**
 * 小组成绩表现
 */
export interface GroupPerformance {
  group_id: string;
  group_name: string;

  // 整体表现
  overall_rank: number; // 在班级中的排名
  average_score: number;
  improvement_rate: number; // 进步率

  // 科目表现
  subject_performance: {
    subject: string;
    average_score: number;
    rank_in_class: number;
  }[];

  // 成员表现
  top_performers: {
    student_id: string;
    student_name: string;
    score: number;
  }[];

  struggling_students: {
    student_id: string;
    student_name: string;
    score: number;
  }[];
}
