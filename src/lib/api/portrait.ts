import { supabase } from "@/integrations/supabase/client";

export interface ClassPortraitStats {
  averageScore: number;
  excellentRate: number;
  progressRate: number;
  studentCount: number;
  gender: {
    male: number;
    female: number;
    other: number;
  };
  subjectStats: {
    name: string;
    averageScore: number;
    excellentCount: number;
    passingCount: number;
  }[];
}

export interface StudentPortraitData {
  id: string;
  student_id: string;
  name: string;
  class_id: string;
  class_name?: string;
  gender?: string | null;
  admission_year?: string | null;
  scores?: {
    subject: string;
    score: number;
    examDate: string;
    examType: string;
  }[];
  abilities?: {
    name: string;
    score: number;
    isStrength: boolean;
  }[];
  learningHabits?: {
    name: string;
    percentage: number;
  }[];
  tags?: string[];
  aiTags?: {
    learningStyle: string[];
    strengths: string[];
    improvements: string[];
    personalityTraits: string[];
  };
  customTags?: string[];
}

export interface GroupPortraitData {
  id: string;
  name: string;
  description?: string;
  class_id?: string;
  student_count: number;
  averageScore?: number;
  stats?: {
    name: string;
    value: number;
    type: string;
  }[];
  students?: { id: string; name: string }[];
}

class PortraitAPI {
  private cache: Map<string, {data: any, timestamp: number}> = new Map();
  private CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟缓存有效期
  
  /**
   * 检查缓存是否有效
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    return now - cached.timestamp < this.CACHE_EXPIRY;
  }
  
  /**
   * 更新缓存
   */
  private updateCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * 获取班级画像统计数据
   */
  async getClassPortraitStats(classId: string): Promise<ClassPortraitStats | null> {
    try {
      const cacheKey = `class_stats_${classId}`;
      
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)!.data;
      }
      
      // 获取班级学生数量
      const { count: studentCount, error: countError } = await supabase
        .from('students')
        .select('*', { count: true })
        .eq('class_id', classId);
        
      if (countError) throw countError;
      
      // 这里实际项目中会从数据库获取更多数据
      // 目前使用模拟数据
      const stats: ClassPortraitStats = {
        averageScore: 85.6,
        excellentRate: 32,
        progressRate: 92,
        studentCount: studentCount || 0,
        gender: {
          male: Math.floor((studentCount || 0) * 0.52),
          female: Math.floor((studentCount || 0) * 0.48),
          other: 0
        },
        subjectStats: [
          { name: '语文', averageScore: 87.2, excellentCount: 8, passingCount: 22 },
          { name: '数学', averageScore: 82.5, excellentCount: 6, passingCount: 21 },
          { name: '英语', averageScore: 79.8, excellentCount: 5, passingCount: 20 },
          { name: '科学', averageScore: 88.3, excellentCount: 9, passingCount: 23 }
        ]
      };
      
      this.updateCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('获取班级画像统计数据失败:', error);
      return null;
    }
  }
  
  /**
   * 获取班级所有学生基本信息
   */
  async getClassStudents(classId: string): Promise<StudentPortraitData[]> {
    try {
      const cacheKey = `class_students_${classId}`;
      
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)!.data;
      }
      
      const { data, error } = await supabase
        .from('students')
        .select('*, class:class_id (name)')
        .eq('class_id', classId)
        .order('name', { ascending: true });
        
      if (error) throw error;
      
      const formattedStudents = (data || []).map(student => ({
        ...student,
        class_name: student.class?.name || '未知班级'
      }));
      
      this.updateCache(cacheKey, formattedStudents);
      return formattedStudents;
    } catch (error) {
      console.error('获取班级学生列表失败:', error);
      return [];
    }
  }
  
  /**
   * 获取班级所有学习小组
   */
  async getClassGroups(classId: string): Promise<GroupPortraitData[]> {
    try {
      const cacheKey = `class_groups_${classId}`;
      
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)!.data;
      }
      
      // 实际项目中从数据库获取小组数据
      // 目前使用模拟数据
      const mockGroups: GroupPortraitData[] = [
        { 
          id: '1', 
          name: '数学兴趣小组', 
          description: '对数学有特别兴趣的学生', 
          class_id: classId, 
          student_count: 8,
          averageScore: 92.5,
          stats: [
            { name: '问题解决能力', value: 88, type: '能力' },
            { name: '团队合作', value: 85, type: '能力' },
            { name: '创新思维', value: 90, type: '能力' },
          ]
        },
        { 
          id: '2', 
          name: '英语口语组', 
          description: '英语口语能力较强的学生', 
          class_id: classId, 
          student_count: 6,
          averageScore: 89.2,
          stats: [
            { name: '表达能力', value: 92, type: '能力' },
            { name: '听力理解', value: 88, type: '能力' },
            { name: '跨文化交流', value: 83, type: '能力' },
          ]
        },
        { 
          id: '3', 
          name: '科学探索组', 
          description: '对科学实验感兴趣的学生', 
          class_id: classId, 
          student_count: 10,
          averageScore: 87.8,
          stats: [
            { name: '实验设计', value: 86, type: '能力' },
            { name: '数据分析', value: 84, type: '能力' },
            { name: '科学思维', value: 91, type: '能力' },
          ]
        },
        { 
          id: '4', 
          name: '特长生组', 
          description: '有艺术或体育特长的学生', 
          class_id: classId, 
          student_count: 12,
          averageScore: 88.3,
          stats: [
            { name: '艺术表现', value: 94, type: '能力' },
            { name: '体育能力', value: 93, type: '能力' },
            { name: '创造力', value: 89, type: '能力' },
          ]
        },
      ];
      
      this.updateCache(cacheKey, mockGroups);
      return mockGroups;
    } catch (error) {
      console.error('获取班级小组列表失败:', error);
      return [];
    }
  }
  
  /**
   * 获取学生详细画像信息
   */
  async getStudentPortrait(studentId: string): Promise<StudentPortraitData | null> {
    try {
      const cacheKey = `student_portrait_${studentId}`;
      
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)!.data;
      }
      
      // 获取学生基本信息
      const { data, error } = await supabase
        .from('students')
        .select('*, class:class_id (name)')
        .eq('id', studentId)
        .single();
        
      if (error) throw error;
      if (!data) return null;
      
      // 实际项目中还需查询其他相关表获取完整学生画像数据
      // 这里使用模拟数据补充
      const studentPortrait: StudentPortraitData = {
        ...data,
        class_name: data.class?.name || '未知班级',
        scores: [
          { subject: "语文", score: 92, examDate: "2023-09-01", examType: "期中考试" },
          { subject: "数学", score: 88, examDate: "2023-09-01", examType: "期中考试" },
          { subject: "英语", score: 76, examDate: "2023-09-01", examType: "期中考试" },
          { subject: "科学", score: 85, examDate: "2023-09-01", examType: "期中考试" },
          { subject: "音乐", score: 96, examDate: "2023-09-01", examType: "期中考试" },
          { subject: "体育", score: 90, examDate: "2023-09-01", examType: "期中考试" },
        ],
        abilities: [
          { name: "记忆能力", score: 95, isStrength: true },
          { name: "数学运算", score: 90, isStrength: true },
          { name: "阅读理解", score: 85, isStrength: true },
          { name: "创新思维", score: 65, isStrength: false },
          { name: "逻辑思维", score: 75, isStrength: false },
          { name: "沟通表达", score: 80, isStrength: false },
        ],
        learningHabits: [
          { name: "专注度", percentage: 85 },
          { name: "作业完成质量", percentage: 78 },
          { name: "课堂参与度", percentage: 92 },
        ],
        tags: ["学习积极", "有责任心", "需要提升创新能力", "数学能力强", "阅读理解佳"]
      };
      
      this.updateCache(cacheKey, studentPortrait);
      return studentPortrait;
    } catch (error) {
      console.error('获取学生画像数据失败:', error);
      return null;
    }
  }
  
  /**
   * 获取小组详细画像信息
   */
  async getGroupPortrait(groupId: string): Promise<GroupPortraitData | null> {
    try {
      const cacheKey = `group_portrait_${groupId}`;
      
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)!.data;
      }
      
      // 实际项目中从数据库获取小组画像数据
      // (groups表、group_members表等)
      // 目前使用模拟数据
      
      // 查找模拟小组数据
      const mockGroups = [
        { 
          id: '1', 
          name: '数学兴趣小组', 
          description: '对数学有特别兴趣的学生', 
          class_id: 'class1', 
          student_count: 8,
          averageScore: 92.5,
          stats: [
            { name: '问题解决能力', value: 88, type: '能力' },
            { name: '团队合作', value: 85, type: '能力' },
            { name: '创新思维', value: 90, type: '能力' },
          ],
          students: [
            { id: 'student1', name: '张三' },
            { id: 'student2', name: '李四' },
            { id: 'student3', name: '王五' }
          ]
        },
        { 
          id: '2', 
          name: '英语口语组', 
          description: '英语口语能力较强的学生', 
          class_id: 'class1', 
          student_count: 6,
          averageScore: 89.2,
          stats: [
            { name: '表达能力', value: 92, type: '能力' },
            { name: '听力理解', value: 88, type: '能力' },
            { name: '跨文化交流', value: 83, type: '能力' },
          ],
          students: [
            { id: 'student4', name: '赵六' },
            { id: 'student5', name: '钱七' }
          ]
        }
      ];
      
      const group = mockGroups.find(g => g.id === groupId) || null;
      
      this.updateCache(cacheKey, group);
      return group;
    } catch (error) {
      console.error('获取小组画像数据失败:', error);
      return null;
    }
  }
  
  /**
   * 使用AI生成学生画像标签
   * @param studentId 学生ID
   * @param aiConfig AI配置
   * @returns 生成的标签数据
   */
  async generateAIPortraitTags(
    studentId: string, 
    aiConfig: {
      provider: string;
      version: string;
      apiKey: string;
      customProviders?: string;
    }
  ): Promise<{
    learningStyle: string[];
    strengths: string[];
    improvements: string[];
    personalityTraits: string[];
  } | null> {
    try {
      // 先获取学生详细信息和成绩
      const student = await this.getStudentPortrait(studentId);
      
      if (!student) {
        throw new Error("找不到学生数据");
      }
      
      // 调用边缘函数生成标签
      const { data, error } = await supabase.functions.invoke('generate-student-profile', {
        body: JSON.stringify({
          studentName: student.name,
          studentId: student.student_id,
          scores: student.scores || [],
          aiConfig
        })
      });

      if (error) {
        throw error;
      }

      const aiTags = data?.tags || null;
      
      // 如果成功生成标签，更新学生数据中的aiTags字段
      if (aiTags) {
        await this.updateStudentAITags(studentId, aiTags);
      }
      
      return aiTags;
    } catch (error) {
      console.error("生成AI标签失败:", error);
      throw error;
    }
  }
  
  /**
   * 更新学生的AI生成标签
   * @param studentId 学生ID
   * @param aiTags AI生成的标签
   */
  private async updateStudentAITags(
    studentId: string, 
    aiTags: {
      learningStyle: string[];
      strengths: string[];
      improvements: string[];
      personalityTraits: string[];
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('student_portraits')
        .upsert({
          student_id: studentId,
          ai_tags: aiTags,
          last_updated: new Date().toISOString()
        }, { 
          onConflict: 'student_id' 
        });

      if (error) throw error;
      
      // 更新缓存
      const cacheKey = `student_portrait_${studentId}`;
      if (this.isCacheValid(cacheKey)) {
        const cachedData = this.cache.get(cacheKey)!.data;
        this.updateCache(cacheKey, {
          ...cachedData,
          aiTags
        });
      }
    } catch (error) {
      console.error("更新学生AI标签失败:", error);
    }
  }
  
  /**
   * 保存教师自定义标签
   * @param studentId 学生ID
   * @param customTags 自定义标签数组
   */
  async saveCustomTags(studentId: string, customTags: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('student_portraits')
        .upsert({
          student_id: studentId,
          custom_tags: customTags,
          last_updated: new Date().toISOString()
        }, { 
          onConflict: 'student_id' 
        });

      if (error) throw error;
      
      // 更新缓存
      const cacheKey = `student_portrait_${studentId}`;
      if (this.isCacheValid(cacheKey)) {
        const cachedData = this.cache.get(cacheKey)!.data;
        this.updateCache(cacheKey, {
          ...cachedData,
          customTags
        });
      }
    } catch (error) {
      console.error("保存自定义标签失败:", error);
      throw error;
    }
  }
  
  /**
   * 清除指定缓存
   */
  clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }
}

// 导出单例实例
export const portraitAPI = new PortraitAPI(); 