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
  dataPeriod?: string;
  scoreChangeDesc?: string;
  averageScoreTrend?: string;
  passRate?: number;
  passRateTrend?: string;
  passRateChangeDesc?: string;
  excellentRateTrend?: string;
  excellentRateChangeDesc?: string;
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
   * @param classId 班级ID
   * @returns 班级画像统计数据
   */
  async getClassPortraitStats(classId: string): Promise<ClassPortraitStats | null> {
    try {
      const cacheKey = `class_stats_${classId}`;
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)!.data;
      }
      
      console.log("从数据库获取班级画像数据:", classId);
      
      // 首先检查班级是否存在
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name, grade')
        .eq('id', classId)
        .single();
        
      if (classError || !classData) {
        console.error("获取班级信息失败:", classError);
        throw new Error("找不到班级信息");
      }
      
      console.log("班级基本信息:", classData);
      
      // 获取班级学生数量
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, gender')
        .eq('class_id', classId);
        
      if (studentsError) {
        console.error("获取班级学生列表失败:", studentsError);
        throw new Error("获取班级学生失败");
      }
      
      const studentCount = studentsData?.length || 0;
      console.log("班级学生数量:", studentCount);
      
      // 如果没有学生，返回基本模拟数据
      if (studentCount === 0) {
        const mockStats: ClassPortraitStats = {
          averageScore: 0,
          excellentRate: 0,
          progressRate: 0,
          studentCount: 0,
          dataPeriod: '无数据',
          gender: {
            male: 0,
            female: 0,
            other: 0
          },
          subjectStats: [],
          scoreChangeDesc: '模拟数据',
          averageScoreTrend: 'neutral',
          passRate: 90,
          passRateTrend: 'neutral',
          passRateChangeDesc: '模拟数据',
          excellentRateTrend: 'neutral',
          excellentRateChangeDesc: '模拟数据',
        };
        
        this.updateCache(cacheKey, mockStats);
        return mockStats;
      }
      
      // 获取学生ID列表
      const studentIds = studentsData.map(s => s.id);
      
      // 获取成绩数据
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('id, student_id, subject, score, exam_type, exam_date')
        .in('student_id', studentIds);
        
      if (gradesError) {
        console.error("获取成绩数据失败:", gradesError);
        throw new Error("获取成绩数据失败");
      }
      
      console.log("获取到成绩记录数:", gradesData?.length || 0);
      
      // 计算平均分和优秀率
      let averageScore = 0;
      let excellentCount = 0;
      
      if (gradesData && gradesData.length > 0) {
        const scores = gradesData.map(g => parseFloat(g.score));
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        averageScore = totalScore / scores.length;
        excellentCount = scores.filter(score => score >= 90).length;
      }
      
      // 计算优秀率
      const excellentRate = gradesData?.length 
        ? (excellentCount / gradesData.length) * 100 
        : 0;
      
      // 计算进步率 (简化计算，实际可能需要更复杂的逻辑)
      const progressRate = Math.round(Math.random() * 30); // 使用随机值作为示例
      
      // 统计各科成绩
      const subjectMap = new Map<string, {
        totalScore: number;
        count: number;
        excellentCount: number;
        passingCount: number;
      }>();
      
      if (gradesData) {
        gradesData.forEach(grade => {
          if (!subjectMap.has(grade.subject)) {
            subjectMap.set(grade.subject, {
              totalScore: 0,
              count: 0,
              excellentCount: 0,
              passingCount: 0
            });
          }
          
          const subjectData = subjectMap.get(grade.subject)!;
          const score = parseFloat(grade.score);
          
          subjectData.totalScore += score;
          subjectData.count++;
          
          if (score >= 90) subjectData.excellentCount++;
          if (score >= 60) subjectData.passingCount++;
        });
      }
      
      // 构建科目统计数据
      const subjectStats = Array.from(subjectMap.entries()).map(([name, data]) => {
        return {
          name,
          averageScore: data.count > 0 ? data.totalScore / data.count : 0,
          excellentCount: data.excellentCount,
          passingCount: data.passingCount
        };
      });
      
      // 统计性别数据
      const genderData = {
        male: 0,
        female: 0,
        other: 0
      };
      
      if (studentsData) {
        studentsData.forEach(student => {
          if (student.gender === 'male') {
            genderData.male++;
          } else if (student.gender === 'female') {
            genderData.female++;
          } else {
            genderData.other++;
          }
        });
      }
      
      const result: ClassPortraitStats = {
        averageScore: parseFloat(averageScore.toFixed(1)),
        excellentRate: parseFloat(excellentRate.toFixed(1)),
        progressRate,
        studentCount,
        dataPeriod: gradesData?.length ? '近三个月' : '无数据',
        gender: genderData,
        scoreChangeDesc: '与上月持平',
        averageScoreTrend: 'neutral',
        passRate: gradesData?.length ? (gradesData.filter(g => parseFloat(g.score) >= 60).length / gradesData.length * 100) : 0,
        passRateTrend: 'neutral',
        passRateChangeDesc: '与上月持平',
        excellentRateTrend: 'neutral',
        excellentRateChangeDesc: '与上月持平',
        subjectStats
      };
      
      console.log("生成的班级统计数据:", result);
      
      this.updateCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('获取班级画像统计数据失败:', error);
      
      // 出错时返回基本模拟数据
      const mockStats: ClassPortraitStats = {
        averageScore: 80,
        excellentRate: 25,
        progressRate: 15,
        studentCount: 40,
        dataPeriod: '模拟数据',
        gender: {
          male: 20,
          female: 20,
          other: 0
        },
        scoreChangeDesc: '模拟数据',
        averageScoreTrend: 'neutral',
        passRate: 90,
        passRateTrend: 'neutral',
        passRateChangeDesc: '模拟数据',
        excellentRateTrend: 'neutral',
        excellentRateChangeDesc: '模拟数据',
        subjectStats: [
          { name: '语文', averageScore: 82, excellentCount: 10, passingCount: 38 },
          { name: '数学', averageScore: 79, excellentCount: 8, passingCount: 35 },
          { name: '英语', averageScore: 84, excellentCount: 12, passingCount: 39 }
        ]
      };
      
      return mockStats;
    }
  }
  
  /**
   * 获取班级学生列表
   * @param classId 班级ID
   * @returns 学生画像数据数组
   */
  async getClassStudents(classId: string): Promise<StudentPortraitData[]> {
    try {
      const cacheKey = `class_students_${classId}`;
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)!.data;
      }
      
      console.log("从数据库获取班级学生数据:", classId);
      
      // 首先获取班级下的所有学生
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name, gender, admission_year, class_id')
        .eq('class_id', classId);
        
      if (studentsError) {
        console.error("获取班级学生失败:", studentsError);
        throw new Error(`获取班级学生失败: ${studentsError.message}`);
      }
      
      console.log(`找到 ${students?.length || 0} 个学生`);
      
      // 如果没有学生，返回空数组
      if (!students || students.length === 0) {
        this.updateCache(cacheKey, []);
        return [];
      }
      
      // 获取班级信息，用于填充班级名称
      let className = '未知班级';
      try {
        const { data: classData } = await supabase
          .from('classes')
          .select('name')
          .eq('id', classId)
          .single();
          
        if (classData) {
          className = classData.name;
        }
      } catch (e) {
        console.error("获取班级名称失败:", e);
      }
      
      // 获取这些学生的成绩
      const studentIds = students.map(s => s.id);
      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select('id, student_id, subject, score, exam_type, exam_date')
        .in('student_id', studentIds);
        
      if (gradesError) {
        console.error("获取学生成绩失败:", gradesError);
      }
      
      // 按学生ID分组处理成绩
      const studentGrades: Record<string, any[]> = {};
      grades?.forEach(grade => {
        if (!studentGrades[grade.student_id]) {
          studentGrades[grade.student_id] = [];
        }
        
        studentGrades[grade.student_id].push({
          subject: grade.subject,
          score: parseFloat(grade.score), // 确保分数是数字类型
          examDate: grade.exam_date,
          examType: grade.exam_type
        });
      });
      
      // 获取学生AI标签和自定义标签
      let portraitData: Record<string, any> = {};
      try {
        const { data: portraits } = await supabase
          .from('student_portraits')
          .select('student_id, ai_tags, custom_tags')
          .in('student_id', studentIds);
          
        if (portraits && portraits.length > 0) {
          portraits.forEach(portrait => {
            portraitData[portrait.student_id] = {
              aiTags: portrait.ai_tags,
              customTags: portrait.custom_tags
            };
          });
        }
      } catch (e) {
        console.error("获取学生画像标签失败:", e);
      }
      
      // 构建学生数据
      const studentData: StudentPortraitData[] = students.map(student => {
        const studentScores = studentGrades[student.id] || [];
        
        // 计算学生的能力数据
        const abilities = this.generateStudentAbilities(studentScores);
        
        // 生成学习习惯数据
        const learningHabits = this.generateLearningHabits();
        
        // 获取学生标签数据或生成随机标签
        const portraitInfo = portraitData[student.id] || {};
        
        return {
          id: student.id,
          student_id: student.id,
          name: student.name,
          class_id: classId,
          class_name: className,
          gender: student.gender,
          admission_year: student.admission_year,
          scores: studentScores,
          abilities,
          learningHabits,
          tags: portraitInfo.tags || this.generateTags(), // 随机生成标签
          aiTags: portraitInfo.aiTags || this.generateAITags(), // 使用存储的或模拟AI标签
          customTags: portraitInfo.customTags || []
        };
      });
      
      this.updateCache(cacheKey, studentData);
      return studentData;
    } catch (error) {
      console.error('获取班级学生列表失败:', error);
      
      // 出错时返回空数组
      return [];
    }
  }
  
  /**
   * 根据学生成绩生成能力维度
   */
  private generateStudentAbilities(scores: any[]): { name: string; score: number; isStrength: boolean }[] {
    if (!scores || scores.length === 0) {
      // 如果没有成绩数据，返回模拟数据
      return [
        { name: '语言能力', score: 70 + Math.random() * 20, isStrength: Math.random() > 0.5 },
        { name: '逻辑思维', score: 70 + Math.random() * 20, isStrength: Math.random() > 0.5 },
        { name: '记忆力', score: 70 + Math.random() * 20, isStrength: Math.random() > 0.5 },
        { name: '专注力', score: 70 + Math.random() * 20, isStrength: Math.random() > 0.5 }
      ];
    }
    
    // 按学科分组
    const subjectScores: Record<string, number[]> = {};
    scores.forEach(item => {
      if (!subjectScores[item.subject]) {
        subjectScores[item.subject] = [];
      }
      subjectScores[item.subject].push(item.score);
    });
    
    // 将学科映射到能力
    const subjectToAbility: Record<string, string> = {
      '语文': '语言能力',
      '数学': '逻辑思维',
      '英语': '语言应用',
      '物理': '科学思维',
      '化学': '分析能力',
      '生物': '观察能力',
      '历史': '记忆能力',
      '地理': '空间思维',
      '政治': '思辨能力'
    };
    
    // 计算每个能力的分数
    const abilities: { name: string; score: number; isStrength: boolean }[] = [];
    Object.entries(subjectScores).forEach(([subject, scores]) => {
      const abilityName = subjectToAbility[subject] || `${subject}能力`;
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      abilities.push({
        name: abilityName,
        score: avgScore,
        isStrength: avgScore >= 85
      });
    });
    
    // 如果能力数量不足，补充一些
    if (abilities.length < 4) {
      const existingNames = new Set(abilities.map(a => a.name));
      const possibleAbilities = ['记忆力', '专注力', '创造力', '团队协作', '自律能力', '审美能力'];
      
      for (const name of possibleAbilities) {
        if (!existingNames.has(name) && abilities.length < 4) {
          abilities.push({
            name,
            score: 70 + Math.random() * 20,
            isStrength: Math.random() > 0.5
          });
        }
      }
    }
    
    return abilities;
  }
  
  /**
   * 生成学习习惯数据
   */
  private generateLearningHabits(): { name: string; percentage: number }[] {
    return [
      { name: '课堂专注度', percentage: 60 + Math.random() * 30 },
      { name: '作业完成率', percentage: 70 + Math.random() * 25 },
      { name: '课前预习', percentage: 50 + Math.random() * 40 },
      { name: '课后复习', percentage: 55 + Math.random() * 35 }
    ];
  }
  
  /**
   * 生成随机标签
   */
  private generateTags(): string[] {
    const allTags = [
      '学习认真', '善于提问', '逻辑思维强', '需要鼓励', 
      '有创造力', '独立思考', '需要关注', '进步明显',
      '团队合作好', '领导能力强', '口头表达好', '数学思维佳'
    ];
    
    // 随机选择3-5个标签
    const count = 3 + Math.floor(Math.random() * 3);
    const tags: string[] = [];
    
    while (tags.length < count && allTags.length > 0) {
      const index = Math.floor(Math.random() * allTags.length);
      tags.push(allTags[index]);
      allTags.splice(index, 1);
    }
    
    return tags;
  }
  
  /**
   * 生成模拟AI标签
   */
  private generateAITags(): {
    learningStyle: string[];
    strengths: string[];
    improvements: string[];
    personalityTraits: string[];
  } {
    return {
      learningStyle: [
        '视觉学习者',
        '结构化学习',
        '通过实践学习'
      ],
      strengths: [
        '问题解决能力',
        '主动参与讨论',
        '细节关注'
      ],
      improvements: [
        '时间管理',
        '口头表达',
        '团队协作'
      ],
      personalityTraits: [
        '认真负责',
        '善于思考',
        '有好奇心'
      ]
    };
  }
  
  /**
   * 获取班级学习小组
   * @param classId 班级ID
   * @returns 小组数据数组
   */
  async getClassGroups(classId: string): Promise<GroupPortraitData[]> {
    try {
      const cacheKey = `class_groups_${classId}`;
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)!.data;
      }
      
      console.log("获取班级小组数据:", classId);
      
      // 尝试从数据库获取班级小组数据
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('class_id', classId);
        
      if (!groupsError && groupsData && groupsData.length > 0) {
        console.log(`找到 ${groupsData.length} 个班级小组`);
        
        // 获取每个小组的学生数量
        const groupIds = groupsData.map(g => g.id);
        const { data: groupMembers, error: membersError } = await supabase
          .from('group_members')
          .select('group_id, student_id')
          .in('group_id', groupIds);
          
        // 统计每个小组的学生数量
        const groupCounts: Record<string, number> = {};
        if (!membersError && groupMembers) {
          groupMembers.forEach(member => {
            if (!groupCounts[member.group_id]) {
              groupCounts[member.group_id] = 0;
            }
            groupCounts[member.group_id]++;
          });
        }
        
        // 获取组内学生的成绩数据以计算平均分
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .in('id', groupMembers?.map(m => m.student_id) || []);
          
        let grades: any[] = [];
        if (!studentsError && students && students.length > 0) {
          const { data: gradesData, error: gradesError } = await supabase
            .from('grades')
            .select('*')
            .in('student_id', students.map(s => s.id));
            
          if (!gradesError && gradesData) {
            grades = gradesData;
          }
        }
        
        // 按小组ID分组计算平均分
        const groupScores: Record<string, number[]> = {};
        if (grades.length > 0 && groupMembers) {
          // 先创建学生ID到小组ID的映射
          const studentToGroup: Record<string, string> = {};
          groupMembers.forEach(member => {
            studentToGroup[member.student_id] = member.group_id;
          });
          
          // 按小组分组统计成绩
          grades.forEach(grade => {
            const groupId = studentToGroup[grade.student_id];
            if (groupId) {
              if (!groupScores[groupId]) {
                groupScores[groupId] = [];
              }
              groupScores[groupId].push(grade.score);
            }
          });
        }
        
        // 构建返回数据
        const groups: GroupPortraitData[] = groupsData.map(group => {
          // 计算小组平均分
          const scores = groupScores[group.id] || [];
          const averageScore = scores.length > 0
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length
            : undefined;
            
          return {
            id: group.id,
            name: group.name,
            description: group.description,
            class_id: group.class_id,
            student_count: groupCounts[group.id] || 0,
            averageScore: averageScore ? parseFloat(averageScore.toFixed(1)) : undefined,
            stats: [
              { name: '团队协作', value: 70 + Math.random() * 20, type: '能力' },
              { name: '学习效率', value: 70 + Math.random() * 20, type: '能力' },
              { name: '知识掌握', value: 70 + Math.random() * 20, type: '能力' }
            ]
          };
        });
        
        this.updateCache(cacheKey, groups);
        return groups;
      }
      
      console.log("数据库中未找到小组数据，使用模拟数据");
      
      // 如果数据库中没有小组数据，生成模拟数据
      const mockGroups: GroupPortraitData[] = [
        { 
          id: `mock1-${classId}`, 
          name: '数学兴趣小组', 
          description: '对数学有特别兴趣的学生', 
          class_id: classId, 
          student_count: 8,
          averageScore: 88.5,
          stats: [
            { name: '问题解决能力', value: 88, type: '能力' },
            { name: '团队合作', value: 85, type: '能力' },
            { name: '创新思维', value: 90, type: '能力' },
          ]
        },
        { 
          id: `mock2-${classId}`, 
          name: '英语口语组', 
          description: '英语口语能力较强的学生', 
          class_id: classId, 
          student_count: 6,
          averageScore: 85.2,
          stats: [
            { name: '表达能力', value: 92, type: '能力' },
            { name: '听力理解', value: 88, type: '能力' },
            { name: '跨文化交流', value: 83, type: '能力' },
          ]
        },
        { 
          id: `mock3-${classId}`, 
          name: '科学探究组', 
          description: '对科学研究有浓厚兴趣的学生', 
          class_id: classId, 
          student_count: 5,
          averageScore: 86.8,
          stats: [
            { name: '实验设计', value: 87, type: '能力' },
            { name: '数据分析', value: 89, type: '能力' },
            { name: '科学思维', value: 91, type: '能力' },
          ]
        }
      ];
      
      this.updateCache(cacheKey, mockGroups);
      return mockGroups;
    } catch (error) {
      console.error('获取班级学习小组失败:', error);
      
      // 出错时返回空数组
      return [];
    }
  }
  
  /**
   * 获取班级优秀学生
   * @param classId 班级ID
   * @returns 优秀学生数据
   */
  async getClassTopStudents(classId: string): Promise<{
    id?: string;
    name: string;
    score: number;
    rank: number;
    avatarUrl?: string;
  }[]> {
    try {
      const cacheKey = `class_top_students_${classId}`;
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)!.data;
      }
      
      console.log("获取班级优秀学生数据:", classId);
      
      // 获取班级所有学生
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name')
        .eq('class_id', classId);
        
      if (studentsError) {
        console.error("获取班级学生失败:", studentsError);
        throw new Error("获取班级学生失败");
      }
      
      // 如果没有学生，返回空数组
      if (!students || students.length === 0) {
        return [];
      }
      
      // 获取学生成绩
      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select('student_id, score, exam_date')
        .in('student_id', students.map(s => s.id))
        .order('exam_date', { ascending: false });
        
      if (gradesError) {
        console.error("获取学生成绩失败:", gradesError);
        throw new Error("获取学生成绩失败");
      }
      
      // 按考试日期分组，优先使用最近的成绩
      const latestScores = new Map<string, number[]>();
      
      // 获取最近三个月的成绩记录
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      grades?.forEach(grade => {
        const studentId = grade.student_id;
        const score = parseFloat(grade.score);
        const examDate = grade.exam_date ? new Date(grade.exam_date) : null;
        
        // 只使用最近三个月的成绩
        if (examDate && examDate >= threeMonthsAgo) {
          if (!latestScores.has(studentId)) {
            latestScores.set(studentId, []);
          }
          latestScores.get(studentId)!.push(score);
        }
      });
      
      // 对于没有最近三个月成绩的学生，使用所有可用成绩
      if (latestScores.size < students.length / 2) {
        grades?.forEach(grade => {
          const studentId = grade.student_id;
          const score = parseFloat(grade.score);
          
          if (!latestScores.has(studentId)) {
            latestScores.set(studentId, []);
          }
          latestScores.get(studentId)!.push(score);
        });
      }
      
      // 计算每个学生的平均分
      const studentScores: Record<string, number> = {};
      
      latestScores.forEach((scores, studentId) => {
        if (scores.length > 0) {
          const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
          studentScores[studentId] = avgScore;
        }
      });
      
      // 计算平均分并排序
      const topStudents = students
        .filter(student => studentScores[student.id] !== undefined) // 只包含有成绩的学生
        .map(student => {
          return {
            id: student.id,
            name: student.name,
            score: studentScores[student.id] || 0,
            rank: 0, // 排名稍后填充
            avatarUrl: undefined // 暂无头像
          };
        })
        .sort((a, b) => b.score - a.score) // 按分数从高到低排序
        .slice(0, 10); // 只取前10名
      
      // 添加排名
      topStudents.forEach((student, index) => {
        student.rank = index + 1;
        student.score = parseFloat(student.score.toFixed(1));
      });
      
      this.updateCache(cacheKey, topStudents);
      return topStudents;
    } catch (error) {
      console.error('获取班级优秀学生失败:', error);
      
      // 出错时提供模拟数据
      const mockTopStudents = [
        { name: "张三", score: 95.5, rank: 1 },
        { name: "李四", score: 93.2, rank: 2 },
        { name: "王五", score: 91.8, rank: 3 },
        { name: "赵六", score: 90.4, rank: 4 },
        { name: "钱七", score: 89.7, rank: 5 }
      ];
      
      return mockTopStudents;
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
   * 获取班级学习里程碑
   * @param classId 班级ID
   * @returns 学习里程碑数据
   */
  async getClassLearningMilestones(classId: string): Promise<{
    date: string;
    title: string;
    description: string;
    isActive: boolean;
  }[]> {
    try {
      const cacheKey = `class_milestones_${classId}`;
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)!.data;
      }
      
      console.log("获取班级学习里程碑:", classId);
      
      // 尝试获取班级考试记录，用于生成里程碑
      const { data: classInfo, error: classError } = await supabase
        .from('classes')
        .select('id, name, grade, created_at')
        .eq('id', classId)
        .single();
        
      if (classError) {
        console.error("获取班级信息失败:", classError);
        throw new Error("获取班级信息失败");
      }
      
      // 获取班级学生
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', classId);
        
      if (studentsError) {
        console.error("获取班级学生失败:", studentsError);
      }
      
      const milestones: {
        date: string;
        title: string;
        description: string;
        isActive: boolean;
      }[] = [];
      
      // 获取考试记录
      if (students && students.length > 0) {
        // 获取学生考试记录，按日期分组
        const { data: examRecords, error: examError } = await supabase
          .from('grades')
          .select('exam_date, exam_type')
          .in('student_id', students.map(s => s.id))
          .order('exam_date', { ascending: false });
          
        if (!examError && examRecords && examRecords.length > 0) {
          // 按考试日期和类型分组
          const examMap = new Map<string, {date: string, type: string, count: number}>();
          
          examRecords.forEach(record => {
            if (!record.exam_date || !record.exam_type) return;
            
            const key = `${record.exam_date}-${record.exam_type}`;
            if (!examMap.has(key)) {
              examMap.set(key, {
                date: record.exam_date,
                type: record.exam_type,
                count: 0
              });
            }
            
            examMap.get(key)!.count++;
          });
          
          // 转换为数组并排序
          const exams = Array.from(examMap.values())
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          // 添加考试里程碑（最多3个）
          exams.slice(0, 3).forEach((exam, index) => {
            // 格式化日期为YYYY-MM-DD
            const date = new Date(exam.date);
            const formattedDate = date.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).replace(/\//g, '-');
            
            milestones.push({
              date: formattedDate,
              title: `${exam.type}完成`,
              description: `全班${students.length}名学生完成了${exam.type}考试`,
              isActive: index === 0 // 最新的考试是活跃的
            });
          });
        }
      }
      
      // 获取班级作业记录
      const { data: homeworks, error: homeworksError } = await supabase
        .from('homework')
        .select('id, title, description, created_at')
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (!homeworksError && homeworks && homeworks.length > 0) {
        // 添加作业里程碑
        homeworks.forEach(hw => {
          if (!hw.created_at) return;
          
          const date = new Date(hw.created_at);
          const formattedDate = date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/\//g, '-');
          
          milestones.push({
            date: formattedDate,
            title: `布置了作业: ${hw.title || '未命名作业'}`,
            description: hw.description || `${classInfo.name}班级作业`,
            isActive: false
          });
        });
      }
      
      // 添加班级创建里程碑
      if (classInfo && classInfo.created_at) {
        const createdDate = new Date(classInfo.created_at);
        const formattedDate = createdDate.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).replace(/\//g, '-');
        
        milestones.push({
          date: formattedDate,
          title: `${classInfo.name}班级创建`,
          description: `${classInfo.grade}年级${classInfo.name}班级正式创建`,
          isActive: false
        });
      }
      
      // 如果没有足够的里程碑，添加一些通用的里程碑
      if (milestones.length < 3) {
        const today = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(today.getMonth() - 1);
        
        if (milestones.length < 1) {
          milestones.push({
            date: today.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).replace(/\//g, '-'),
            title: "新学期开始",
            description: `${classInfo.name}新学期课程安排已完成`,
            isActive: true
          });
        }
        
        if (milestones.length < 2) {
          milestones.push({
            date: oneMonthAgo.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).replace(/\//g, '-'),
            title: "学习计划制定",
            description: `${classInfo.name}全班学习计划已制定完成`,
            isActive: false
          });
        }
      }
      
      // 按日期从新到旧排序
      milestones.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      // 确保只有一个活跃的里程碑
      let hasActive = false;
      milestones.forEach((milestone, index) => {
        if (milestone.isActive) {
          if (hasActive) {
            milestone.isActive = false;
          } else {
            hasActive = true;
          }
        }
      });
      
      // 如果没有活跃的里程碑，将最新的设为活跃
      if (!hasActive && milestones.length > 0) {
        milestones[0].isActive = true;
      }
      
      this.updateCache(cacheKey, milestones);
      return milestones;
    } catch (error) {
      console.error('获取班级学习里程碑失败:', error);
      
      // 出错时返回模拟数据
      const today = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(today.getMonth() - 2);
      
      const mockMilestones = [
        {
          date: today.toLocaleDateString('zh-CN').replace(/\//g, '-'),
          title: "期中考试完成",
          description: "全班同学顺利完成期中考试，平均成绩良好",
          isActive: true
        },
        {
          date: oneMonthAgo.toLocaleDateString('zh-CN').replace(/\//g, '-'),
          title: "分组项目展示",
          description: "各学习小组完成项目展示，获得老师好评",
          isActive: false
        },
        {
          date: twoMonthsAgo.toLocaleDateString('zh-CN').replace(/\//g, '-'),
          title: "新学期开始",
          description: "新学期课程安排和学习计划制定完成",
          isActive: false
        }
      ];
      
      return mockMilestones;
    }
  }
  
  /**
   * 获取班级AI分析结果
   * @param classId 班级ID
   * @returns AI分析结果
   */
  async getClassAIAnalysis(classId: string): Promise<{
    insights: string[];
    recommendations: string[];
    summary: string;
    dataCompleteness: string;
    analysisPrecision: string;
    dataTimespan: string;
    tags: string[];
  }> {
    try {
      const cacheKey = `class_ai_analysis_${classId}`;
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)!.data;
      }
      
      console.log("生成班级AI分析数据:", classId);
      
      // 获取班级信息
      let classInfo: any = null;
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('id', classId)
          .single();
          
        if (!error && data) {
          classInfo = data;
        }
      } catch (e) {
        console.error("获取班级信息失败:", e);
      }
      
      // 获取班级学生成绩数据
      let gradesInfo: any[] = [];
      let studentInfo: any[] = [];
      let examDates: string[] = [];
      try {
        // 获取学生
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id, name, gender')
          .eq('class_id', classId);
          
        if (!studentsError && students && students.length > 0) {
          studentInfo = students;
          
          // 获取成绩
          const { data: grades, error: gradesError } = await supabase
            .from('grades')
            .select('*')
            .in('student_id', students.map(s => s.id));
            
          if (!gradesError && grades) {
            gradesInfo = grades;
            
            // 提取唯一的考试日期
            const uniqueDates = new Set(grades.map(g => g.exam_date));
            examDates = Array.from(uniqueDates).sort();
          }
        }
      } catch (e) {
        console.error("获取成绩数据失败:", e);
      }
      
      // 根据实际数据生成AI分析
      const insights: string[] = [];
      const recommendations: string[] = [];
      const tags: string[] = [];
      
      // 基本信息
      const className = classInfo?.name || '未知班级';
      const studentCount = studentInfo.length;
      
      // 计算各种统计数据
      const scores = gradesInfo.map(g => parseFloat(g.score)); // 确保分数是数字类型
      const avgScore = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;
      
      const excellentCount = scores.filter(s => s >= 90).length;
      const excellentRate = scores.length > 0 
        ? (excellentCount / scores.length) * 100
        : 0;
        
      const failCount = scores.filter(s => s < 60).length;
      const failRate = scores.length > 0
        ? (failCount / scores.length) * 100
        : 0;
      
      // 按学科分组
      const subjectScores: Record<string, number[]> = {};
      gradesInfo.forEach(grade => {
        if (!subjectScores[grade.subject]) {
          subjectScores[grade.subject] = [];
        }
        subjectScores[grade.subject].push(parseFloat(grade.score));
      });
      
      // 找出优势和弱势学科
      const subjectAvgs: {subject: string, avg: number}[] = [];
      Object.entries(subjectScores).forEach(([subject, scores]) => {
        const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        subjectAvgs.push({subject, avg});
      });
      
      subjectAvgs.sort((a, b) => b.avg - a.avg);
      
      const strongSubjects = subjectAvgs.slice(0, 2).map(s => s.subject);
      const weakSubjects = subjectAvgs.slice(-2).map(s => s.subject).reverse();
      
      // 按性别分析
      const maleStudents = studentInfo.filter(s => s.gender === 'male').map(s => s.id);
      const femaleStudents = studentInfo.filter(s => s.gender === 'female').map(s => s.id);
      
      // 男生女生成绩分析
      let maleAvgScore = 0;
      let femaleAvgScore = 0;
      
      if (maleStudents.length > 0) {
        const maleScores = gradesInfo
          .filter(g => maleStudents.includes(g.student_id))
          .map(g => parseFloat(g.score));
          
        if (maleScores.length > 0) {
          maleAvgScore = maleScores.reduce((sum, s) => sum + s, 0) / maleScores.length;
        }
      }
      
      if (femaleStudents.length > 0) {
        const femaleScores = gradesInfo
          .filter(g => femaleStudents.includes(g.student_id))
          .map(g => parseFloat(g.score));
          
        if (femaleScores.length > 0) {
          femaleAvgScore = femaleScores.reduce((sum, s) => sum + s, 0) / femaleScores.length;
        }
      }
      
      // 生成洞察信息
      if (studentCount > 0) {
        insights.push(`${className}共有${studentCount}名学生，总体学习情况${avgScore >= 80 ? '良好' : avgScore >= 70 ? '一般' : '有待提高'}。`);
      } else {
        insights.push(`${className}暂无学生数据，无法进行详细分析。`);
      }
      
      if (scores.length > 0) {
        insights.push(`班级平均分为${avgScore.toFixed(1)}分，优秀率为${excellentRate.toFixed(1)}%。`);
        
        if (excellentRate >= 30) {
          insights.push(`班级优秀学生比例较高，整体成绩优秀。`);
          tags.push('成绩优秀');
        } else if (excellentRate >= 15) {
          insights.push(`班级优秀学生占比适中，成绩分布较为均衡。`);
          tags.push('成绩均衡');
        } else {
          insights.push(`班级优秀学生比例较低，需要加强学习指导。`);
          tags.push('需要提升');
        }
        
        if (failRate > 20) {
          insights.push(`不及格率偏高(${failRate.toFixed(1)}%)，需要关注后进生学习情况。`);
          tags.push('两极分化');
          recommendations.push(`建议对学习困难学生进行针对性辅导，可以考虑实施"一对一"帮扶计划。`);
        }
      }
      
      // 性别差异分析
      if (maleStudents.length > 0 && femaleStudents.length > 0) {
        const diff = Math.abs(maleAvgScore - femaleAvgScore);
        if (diff > 5) {
          const betterGender = maleAvgScore > femaleAvgScore ? '男生' : '女生';
          insights.push(`${betterGender}整体表现较好，平均分高出${diff.toFixed(1)}分。可以针对性开展学习交流活动。`);
        }
      }
      
      // 学科分析
      if (strongSubjects.length > 0) {
        insights.push(`班级在${strongSubjects.join('、')}等学科上表现突出。`);
        tags.push(`${strongSubjects[0]}优势`);
      }
      
      if (weakSubjects.length > 0) {
        insights.push(`班级在${weakSubjects.join('、')}等学科上有待加强。`);
        recommendations.push(`建议增强${weakSubjects.join('、')}等学科的教学方法和资源投入。`);
      }
      
      // 按考试类型和学科进行交叉分析
      const examTypes = new Set(gradesInfo.map(g => g.exam_type));
      if (examTypes.size > 1) {
        // 比较不同考试类型之间的差异
        const examTypeScores: Record<string, number[]> = {};
        gradesInfo.forEach(grade => {
          if (!examTypeScores[grade.exam_type]) {
            examTypeScores[grade.exam_type] = [];
          }
          examTypeScores[grade.exam_type].push(parseFloat(grade.score));
        });
        
        // 计算各类考试的平均分
        const examTypeAvgs: {type: string, avg: number}[] = [];
        Object.entries(examTypeScores).forEach(([type, scores]) => {
          const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
          examTypeAvgs.push({type, avg});
        });
        
        // 找出差异最大的考试类型
        examTypeAvgs.sort((a, b) => b.avg - a.avg);
        if (examTypeAvgs.length >= 2) {
          const highestExam = examTypeAvgs[0];
          const lowestExam = examTypeAvgs[examTypeAvgs.length - 1];
          const diff = highestExam.avg - lowestExam.avg;
          
          if (diff > 5) {
            insights.push(`班级在${highestExam.type}中表现较好，但在${lowestExam.type}中表现较差，差距${diff.toFixed(1)}分。`);
            recommendations.push(`建议分析${lowestExam.type}中的薄弱环节，加强相关知识点训练。`);
          }
        }
      }
      
      // 通用建议
      if (studentCount > 0) {
        recommendations.push(`建议针对不同学生制定个性化学习计划，发挥学生特长，提升弱势学科。`);
        
        if (avgScore < 75) {
          recommendations.push(`班级整体成绩有提升空间，建议加强基础知识点巩固和考试技巧训练。`);
        }
        
        recommendations.push(`可以通过多元化评价方式，全面了解学生发展情况，不仅关注学业成绩，也关注综合素质培养。`);
      } else {
        recommendations.push(`建议尽快录入学生信息和成绩数据，以便进行更准确的班级分析。`);
      }
      
      // 如果没有足够的洞察和建议，补充一些通用内容
      if (insights.length < 3) {
        insights.push(`该班级缺乏足够的历史数据，随着数据积累，分析将更加准确。`);
      }
      
      if (recommendations.length < 3) {
        recommendations.push(`定期组织教研活动，分享教学经验，共同提高教学质量。`);
      }
      
      // 生成标签
      if (tags.length < 3) {
        const possibleTags = ['待发展', '有潜力', '需关注', '重点班级', '进步空间'];
        while (tags.length < 3) {
          const randomTag = possibleTags[Math.floor(Math.random() * possibleTags.length)];
          if (!tags.includes(randomTag)) {
            tags.push(randomTag);
          }
        }
      }
      
      // 评估数据完整性和精度
      let dataCompleteness = '不足';
      let analysisPrecision = '低';
      let dataTimespan = '无数据';
      
      if (scores.length > 0) {
        // 评估数据完整度
        const dataPercentage = (scores.length / (studentCount * 5)) * 100; // 假设每个学生应该有5个成绩记录
        if (dataPercentage >= 80) {
          dataCompleteness = '良好';
          analysisPrecision = '高';
        } else if (dataPercentage >= 50) {
          dataCompleteness = '一般';
          analysisPrecision = '中';
        }
        
        // 评估数据时间跨度
        if (examDates.length > 0) {
          const firstDate = new Date(examDates[0]);
          const lastDate = new Date(examDates[examDates.length - 1]);
          const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                             (lastDate.getMonth() - firstDate.getMonth());
                             
          if (monthsDiff > 6) {
            dataTimespan = '近一年';
          } else if (monthsDiff > 3) {
            dataTimespan = '近六个月';
          } else {
            dataTimespan = '近三个月';
          }
        } else {
          dataTimespan = '单次数据';
        }
      }
      
      // 汇总数据
      const summary = `${className}整体${scores.length > 0 ? `平均成绩${avgScore.toFixed(1)}分，` : ''}${studentCount > 0 ? `共有${studentCount}名学生，` : ''}${strongSubjects.length > 0 ? `在${strongSubjects[0]}等学科表现较好` : '暂无明显优势学科'}。`;
      
      const result = {
        insights,
        recommendations,
        summary,
        dataCompleteness,
        analysisPrecision,
        dataTimespan,
        tags
      };
      
      this.updateCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('获取班级AI分析结果失败:', error);
      
      // 如果出错，返回基本模拟数据
      const mockResult = {
        insights: [
          '班级整体学习情况良好，但存在部分知识点掌握不牢固的情况。',
          '数学和英语科目表现较好，语文成绩有所下滑。',
          '班级学生自主学习能力有待提高，特别是在课后复习环节。'
        ],
        recommendations: [
          '建议增强语文学科的阅读理解训练，提高学生阅读速度和理解能力。',
          '可以通过小组合作学习方式，增强学生之间的互助和交流。',
          '针对不同学习风格的学生，制定个性化的学习计划和指导方案。'
        ],
        summary: '班级整体表现良好，在数学和英语方面有优势，需要加强语文和自主学习能力培养。',
        dataCompleteness: '一般',
        analysisPrecision: '中',
        dataTimespan: '近三个月',
        tags: ['数学优势', '语文待提高', '自主学习待加强']
      };
      
      return mockResult;
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