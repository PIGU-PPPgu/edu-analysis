/**
 * 智能数据同步服务 (AutoSyncService)
 *
 * 核心目标：实现"一个成绩文件自动化整个系统"
 * 功能：
 * 1. 自动检测和创建新班级
 * 2. 自动检测和创建新学生
 * 3. 同步所有相关数据表
 * 4. AI智能判断和数据完善
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  warningDataIntegrationService,
  type WarningTriggerEvent,
} from "./warningDataIntegrationService";
import {
  enhancedAITagsService,
  type AITagsGenerationConfig,
} from "./enhancedAITagsService";
import {
  gradeDataValidator,
  type ValidationReport,
  type ValidationOptions,
} from "./gradeDataValidator";
import { handleError, showError } from "./errorHandler";

export interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  student_count?: number;
}

export interface StudentInfo {
  id: string;
  student_id: string;
  name: string;
  class_name: string;
  class_id?: string;
}

export interface SyncResult {
  success: boolean;
  newClasses: ClassInfo[];
  newStudents: StudentInfo[];
  updatedRecords: number;
  validationReport?: ValidationReport;
  aiTagsResult?: {
    successful: number;
    failed: number;
    skipped: number;
  };
  errors: string[];
  dataQualityPassed: boolean;
}

export class AutoSyncService {
  /**
   * 主要同步方法：处理导入的成绩数据，自动创建班级和学生
   */
  async syncImportedData(
    gradeData: any[],
    aiConfig?: AITagsGenerationConfig,
    validationOptions?: ValidationOptions
  ): Promise<SyncResult> {
    console.log(
      "🤖 [AutoSync] 开始智能数据同步，处理",
      gradeData.length,
      "条成绩记录"
    );

    const result: SyncResult = {
      success: true,
      newClasses: [],
      newStudents: [],
      updatedRecords: 0,
      errors: [],
      dataQualityPassed: false,
    };

    try {
      // 步骤0: 数据质量校验 - 在处理任何数据前先校验
      console.log("🔍 [AutoSync] 步骤0: 数据质量校验...");
      const validationReport = await this.validateGradeData(
        gradeData,
        validationOptions
      );
      result.validationReport = validationReport;

      // 根据校验结果决定是否继续
      if (!validationReport.success) {
        console.warn("⚠️ [AutoSync] 数据校验失败，存在严重错误");
        result.success = false;
        result.dataQualityPassed = false;
        result.errors.push(
          `数据校验失败: 发现 ${validationReport.summary.critical} 个严重错误`
        );

        // 如果有严重错误，直接返回，不进行后续处理
        if (validationReport.summary.critical > 0) {
          showError("数据存在严重错误，请修复后重新导入", {
            criticalErrors: validationReport.summary.critical,
            dataQuality: validationReport.dataQuality.score,
          });
          return result;
        }
      }

      result.dataQualityPassed = true;
      console.log(
        "✅ [AutoSync] 数据校验通过，质量评分:",
        validationReport.dataQuality.score
      );

      // 使用校验后的清洗数据（如果有的话）
      const processedData = validationReport.cleanedData || gradeData;

      // 步骤1: 检测和创建新班级
      console.log("📚 [AutoSync] 步骤1: 检测新班级...");
      const newClasses = await this.detectAndCreateClasses(processedData);
      result.newClasses = newClasses;

      // 步骤2: 检测和创建新学生
      console.log("👥 [AutoSync] 步骤2: 检测新学生...");
      const newStudents = await this.detectAndCreateStudents(processedData);
      result.newStudents = newStudents;

      // 步骤3: 同步学生-班级关联
      console.log("🔗 [AutoSync] 步骤3: 同步关联关系...");
      await this.syncStudentClassRelations(processedData);

      // 步骤4: 更新统计数据
      console.log("📊 [AutoSync] 步骤4: 更新统计数据...");
      result.updatedRecords = await this.updateClassStatistics();

      // 步骤5: 自动生成AI标签（如果有新学生且配置了AI）
      if (result.newStudents.length > 0 && aiConfig) {
        console.log("🧠 [AutoSync] 步骤5: 自动生成AI标签...");
        await this.generateAITagsForNewStudents(result, aiConfig);
      }

      // 步骤6: 触发预警系统更新
      console.log("🚨 [AutoSync] 步骤6: 触发预警系统更新...");
      await this.triggerWarningSystemUpdate(result);

      console.log("✅ [AutoSync] 同步完成！", {
        newClasses: result.newClasses.length,
        newStudents: result.newStudents.length,
        updatedRecords: result.updatedRecords,
        aiTagsGenerated: result.aiTagsResult?.successful || 0,
      });

      return result;
    } catch (error) {
      console.error("❌ [AutoSync] 同步失败:", error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : "未知错误");
      return result;
    }
  }

  /**
   * 检测新班级并自动创建
   */
  private async detectAndCreateClasses(gradeData: any[]): Promise<ClassInfo[]> {
    // 1. 提取所有班级名称
    const classNamesFromData = [
      ...new Set(gradeData.map((record) => record.class_name)),
    ].filter((name) => name && name !== "未知班级");

    console.log("📋 [AutoSync] 从数据中发现班级:", classNamesFromData);

    // 2. 查询现有班级
    const { data: existingClasses, error: queryError } = await supabase
      .from("classes")
      .select("name");

    if (queryError) {
      console.error("❌ 查询现有班级失败:", queryError);
      throw new Error("查询现有班级失败");
    }

    const existingClassNames = new Set(
      existingClasses?.map((c) => c.name) || []
    );
    console.log("📚 [AutoSync] 现有班级:", [...existingClassNames]);

    // 3. 识别新班级
    const newClassNames = classNamesFromData.filter(
      (name) => !existingClassNames.has(name)
    );
    console.log("🆕 [AutoSync] 需要创建的新班级:", newClassNames);

    if (newClassNames.length === 0) {
      return [];
    }

    // 4. 创建新班级记录
    const newClasses: ClassInfo[] = [];
    for (const className of newClassNames) {
      try {
        const classInfo = this.analyzeClassName(className);
        const newClass = {
          id: crypto.randomUUID(),
          name: className,
          grade: classInfo.grade,
          created_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from("classes")
          .insert(newClass);

        if (insertError) {
          console.error(`❌ 创建班级 ${className} 失败:`, insertError);
          throw new Error(`创建班级 ${className} 失败: ${insertError.message}`);
        }

        console.log(`✅ [AutoSync] 成功创建班级: ${className}`);
        newClasses.push({
          id: newClass.id,
          name: className,
          grade: classInfo.grade,
        });

        // 同时创建class_info记录（如果需要）
        await this.createClassInfoRecord(newClass, classInfo);
      } catch (error) {
        console.error(`❌ 处理班级 ${className} 时出错:`, error);
        throw error;
      }
    }

    return newClasses;
  }

  /**
   * 检测新学生并自动创建
   * 增强的重复检测机制：支持同名学生在不同班级，避免重复创建
   * 包含数据质量检查和智能合并策略
   */
  private async detectAndCreateStudents(
    gradeData: any[]
  ): Promise<StudentInfo[]> {
    // 1. 数据质量预检查和清理
    const cleanedData = this.cleanStudentData(gradeData);
    console.log("🧹 [AutoSync] 数据清理结果:", {
      原始数据: gradeData.length,
      清理后数据: cleanedData.length,
      清理掉: gradeData.length - cleanedData.length,
    });

    // 2. 提取所有学生信息（去重）- 使用更精确的组合键
    const studentsFromData = new Map<
      string,
      { name: string; class_name: string; rawRecords: any[] }
    >();

    cleanedData.forEach((record) => {
      if (record.name && record.class_name) {
        const key = `${record.name}_${record.class_name}`;
        if (!studentsFromData.has(key)) {
          studentsFromData.set(key, {
            name: record.name,
            class_name: record.class_name,
            rawRecords: [],
          });
        }
        studentsFromData.get(key)!.rawRecords.push(record);
      }
    });

    console.log("👥 [AutoSync] 从数据中发现学生:", studentsFromData.size, "名");

    // 3. 查询现有学生（优化查询，包含更多信息用于精确匹配）
    const { data: existingStudents, error: queryError } = await supabase.from(
      "students"
    ).select(`
        id,
        student_id,
        name,
        class_id,
        classes(id, name)
      `);

    if (queryError) {
      console.error("❌ 查询现有学生失败:", queryError);
      throw new Error("查询现有学生失败");
    }

    // 4. 智能重复检测和潜在合并分析
    const duplicateAnalysis = this.analyzeDuplicateStudents(
      studentsFromData,
      existingStudents
    );
    console.log("🔍 [AutoSync] 重复检测分析结果:", duplicateAnalysis.summary);

    // 5. 构建现有学生的精确匹配键（姓名+班级名）
    const existingStudentKeys = new Set();
    const existingStudentMap = new Map<string, any>();

    existingStudents?.forEach((student) => {
      if (student.name && student.classes?.name) {
        const key = `${student.name}_${student.classes.name}`;
        existingStudentKeys.add(key);
        existingStudentMap.set(key, student);
      }
    });

    console.log("📚 [AutoSync] 现有学生组合键数量:", existingStudentKeys.size);
    console.log(
      "📋 [AutoSync] 现有学生示例键:",
      [...existingStudentKeys].slice(0, 5)
    );

    // 6. 识别真正的新学生（不存在姓名+班级组合的学生）
    const newStudentsData = [...studentsFromData.entries()]
      .filter(([key]) => {
        const exists = existingStudentKeys.has(key);
        if (exists) {
          console.log(`👤 [AutoSync] 学生已存在，跳过: ${key}`);
        }
        return !exists;
      })
      .map(([key, data]) => ({
        name: data.name,
        class_name: data.class_name,
        rawRecords: data.rawRecords,
      }));

    console.log(
      "🆕 [AutoSync] 需要创建的新学生:",
      newStudentsData.length,
      "名"
    );

    // 打印需要创建的学生详情（调试用）
    if (newStudentsData.length > 0) {
      console.log(
        "🔍 [AutoSync] 新学生详情:",
        newStudentsData.map((s) => `${s.name}(${s.class_name})`)
      );
    }

    if (newStudentsData.length === 0) {
      return [];
    }

    // 4. 获取班级ID映射
    const { data: classes } = await supabase.from("classes").select("id, name");
    const classIdMap = new Map(classes?.map((c) => [c.name, c.id]) || []);

    // 5. 创建新学生记录
    const newStudents: StudentInfo[] = [];
    for (const studentData of newStudentsData) {
      try {
        const classId = classIdMap.get(studentData.class_name);
        if (!classId) {
          console.warn(
            `⚠️ 找不到班级 ${studentData.class_name} 的ID，跳过学生 ${studentData.name}`
          );
          continue;
        }

        const studentId = this.generateStudentId(
          studentData.name,
          studentData.class_name
        );
        const newStudent = {
          id: crypto.randomUUID(),
          student_id: studentId,
          name: studentData.name,
          class_id: classId,
          created_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from("students")
          .insert(newStudent);

        if (insertError) {
          console.error(`❌ 创建学生 ${studentData.name} 失败:`, insertError);
          throw new Error(
            `创建学生 ${studentData.name} 失败: ${insertError.message}`
          );
        }

        console.log(
          `✅ [AutoSync] 成功创建学生: ${studentData.name} (${studentData.class_name})`
        );
        newStudents.push({
          id: newStudent.id,
          student_id: studentId,
          name: studentData.name,
          class_name: studentData.class_name,
          class_id: classId,
        });
      } catch (error) {
        console.error(`❌ 处理学生 ${studentData.name} 时出错:`, error);
        throw error;
      }
    }

    return newStudents;
  }

  /**
   * 同步学生-班级关联关系
   * 核心功能：确保已存在的学生能正确关联到成绩数据中的班级
   */
  private async syncStudentClassRelations(gradeData: any[]): Promise<void> {
    console.log("🔗 [AutoSync] 同步学生-班级关联关系...");

    // 1. 从成绩数据中提取学生-班级关联信息
    const studentClassMap = new Map<string, string>(); // name -> class_name
    gradeData.forEach((record) => {
      if (record.name && record.class_name) {
        studentClassMap.set(record.name, record.class_name);
      }
    });

    console.log(
      "📋 [AutoSync] 需要同步关联的学生:",
      studentClassMap.size,
      "名"
    );

    // 2. 获取班级ID映射
    const { data: classes } = await supabase.from("classes").select("id, name");
    const classIdMap = new Map(classes?.map((c) => [c.name, c.id]) || []);

    // 3. 查询所有相关学生的当前状态
    const studentNames = [...studentClassMap.keys()];
    const { data: existingStudents } = await supabase
      .from("students")
      .select("id, student_id, name, class_id, classes(name)")
      .in("name", studentNames);

    if (!existingStudents) {
      console.log("⚠️ [AutoSync] 未找到需要同步的学生记录");
      return;
    }

    // 4. 检查并更新错误的关联关系
    let syncedCount = 0;
    let skippedCount = 0;

    for (const student of existingStudents) {
      const expectedClassName = studentClassMap.get(student.name);
      const currentClassName = student.classes?.name;
      const expectedClassId = expectedClassName
        ? classIdMap.get(expectedClassName)
        : null;

      // 检查是否需要更新关联
      if (
        expectedClassName &&
        expectedClassId &&
        student.class_id !== expectedClassId
      ) {
        try {
          console.log(
            `🔄 [AutoSync] 更新学生关联: ${student.name} -> ${expectedClassName} (${currentClassName || "无班级"} => ${expectedClassName})`
          );

          const { error: updateError } = await supabase
            .from("students")
            .update({
              class_id: expectedClassId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", student.id);

          if (updateError) {
            console.error(
              `❌ 更新学生 ${student.name} 班级关联失败:`,
              updateError
            );
          } else {
            console.log(
              `✅ [AutoSync] 成功更新学生关联: ${student.name} -> ${expectedClassName}`
            );
            syncedCount++;

            // 同时更新grade_data_new表中的student_id引用（确保使用正确的UUID）
            await this.updateGradeDataStudentId(
              student.name,
              expectedClassName,
              student.id
            );
          }
        } catch (error) {
          console.error(`❌ 同步学生 ${student.name} 关联时出错:`, error);
        }
      } else {
        skippedCount++;
      }
    }

    console.log(
      `✅ [AutoSync] 关联关系同步完成: ${syncedCount} 个更新, ${skippedCount} 个跳过`
    );
  }

  /**
   * 更新成绩数据表中的学生ID引用
   * 确保grade_data_new.student_id指向正确的学生UUID
   */
  private async updateGradeDataStudentId(
    studentName: string,
    className: string,
    studentUuid: string
  ): Promise<void> {
    try {
      console.log(
        `🔗 [AutoSync] 更新成绩数据中的学生ID引用: ${studentName} -> ${studentUuid}`
      );

      const { error: updateError } = await supabase
        .from("grade_data_new")
        .update({
          student_id: studentUuid,
          updated_at: new Date().toISOString(),
        })
        .eq("name", studentName)
        .eq("class_name", className);

      if (updateError) {
        console.error(
          `❌ 更新成绩数据学生ID引用失败 (${studentName}):`,
          updateError
        );
      } else {
        console.log(`✅ [AutoSync] 成功更新成绩数据学生ID引用: ${studentName}`);
      }
    } catch (error) {
      console.error(`❌ 更新成绩数据学生ID引用时出错:`, error);
    }
  }

  /**
   * 更新班级统计数据
   */
  private async updateClassStatistics(): Promise<number> {
    console.log("📊 [AutoSync] 更新班级统计数据...");

    // 获取所有班级
    const { data: classes } = await supabase.from("classes").select("id, name");
    if (!classes) return 0;

    let updatedCount = 0;

    for (const cls of classes) {
      try {
        // 统计学生数量
        const { count: studentCount } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .eq("class_id", cls.id);

        // 这里可以添加更多统计逻辑，比如平均分、优秀率等
        console.log(`📈 班级 ${cls.name}: ${studentCount} 名学生`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ 更新班级 ${cls.name} 统计失败:`, error);
      }
    }

    console.log(
      `✅ [AutoSync] 统计数据更新完成，处理了 ${updatedCount} 个班级`
    );
    return updatedCount;
  }

  /**
   * 智能分析班级名称，提取年级信息
   */
  private analyzeClassName(className: string): {
    grade: string;
    level: string;
  } {
    // 简单的智能分析逻辑
    if (className.includes("初一") || className.includes("七年级")) {
      return { grade: "初一", level: "初中" };
    } else if (className.includes("初二") || className.includes("八年级")) {
      return { grade: "初二", level: "初中" };
    } else if (className.includes("初三") || className.includes("九年级")) {
      return { grade: "初三", level: "初中" };
    } else if (className.includes("高一")) {
      return { grade: "高一", level: "高中" };
    } else if (className.includes("高二")) {
      return { grade: "高二", level: "高中" };
    } else if (className.includes("高三")) {
      return { grade: "高三", level: "高中" };
    } else {
      // 默认处理
      return { grade: "未知", level: "未知" };
    }
  }

  /**
   * 创建class_info记录（如果需要的话）
   */
  private async createClassInfoRecord(
    classData: any,
    classInfo: any
  ): Promise<void> {
    try {
      const classInfoRecord = {
        class_name: classData.name,
        grade_level: classInfo.grade,
        academic_year: new Date().getFullYear().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("class_info")
        .upsert(classInfoRecord, {
          onConflict: "class_name",
          ignoreDuplicates: false,
        });

      if (error) {
        console.warn("⚠️ 创建class_info记录失败:", error.message);
      } else {
        console.log(`✅ 创建class_info记录: ${classData.name}`);
      }
    } catch (error) {
      console.warn("⚠️ 创建class_info记录时出错:", error);
    }
  }

  /**
   * 生成学生ID（简单实现）
   */
  private generateStudentId(name: string, className: string): string {
    // 简单的学生ID生成逻辑
    // 实际项目中可以根据学校规则定制
    const timestamp = Date.now().toString().slice(-6);
    const classCode = className.replace(/[^0-9]/g, "") || "00";
    return `${classCode}${timestamp}`;
  }

  /**
   * 验证数据同步状态
   */
  async validateSyncStatus(): Promise<{
    classesCount: number;
    studentsCount: number;
    gradeDataCount: number;
    inconsistencies: string[];
  }> {
    console.log("🔍 [AutoSync] 验证数据同步状态...");

    const [
      { count: classesCount },
      { count: studentsCount },
      { count: gradeDataCount },
      { data: gradeClasses },
    ] = await Promise.all([
      supabase.from("classes").select("*", { count: "exact", head: true }),
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase
        .from("grade_data_new")
        .select("*", { count: "exact", head: true }),
      supabase.from("grade_data_new").select("class_name").limit(1000),
    ]);

    const uniqueGradeClasses = [
      ...new Set(gradeClasses?.map((g) => g.class_name) || []),
    ];
    const inconsistencies: string[] = [];

    // 检查数据一致性
    if (studentsCount === 0 && gradeDataCount > 0) {
      inconsistencies.push("成绩数据存在但学生表为空");
    }

    if (uniqueGradeClasses.length > classesCount) {
      inconsistencies.push("成绩数据中的班级数量超过班级表记录数");
    }

    return {
      classesCount: classesCount || 0,
      studentsCount: studentsCount || 0,
      gradeDataCount: gradeDataCount || 0,
      inconsistencies,
    };
  }

  /**
   * 数据质量预检查和清理
   * 过滤掉无效、重复或格式异常的学生数据
   */
  private cleanStudentData(gradeData: any[]): any[] {
    const validData: any[] = [];
    const issues: string[] = [];

    gradeData.forEach((record, index) => {
      // 基础数据完整性检查
      if (!record.name || !record.class_name) {
        issues.push(`行 ${index + 1}: 缺少学生姓名或班级信息`);
        return;
      }

      // 姓名格式检查和清理
      const cleanedName = this.cleanStudentName(record.name);
      if (!cleanedName || cleanedName.length < 2 || cleanedName.length > 10) {
        issues.push(`行 ${index + 1}: 学生姓名格式异常 "${record.name}"`);
        return;
      }

      // 班级名称清理
      const cleanedClassName = this.cleanClassName(record.class_name);
      if (!cleanedClassName) {
        issues.push(`行 ${index + 1}: 班级名称格式异常 "${record.class_name}"`);
        return;
      }

      // 创建清理后的记录
      const cleanedRecord = {
        ...record,
        name: cleanedName,
        class_name: cleanedClassName,
      };

      validData.push(cleanedRecord);
    });

    if (issues.length > 0) {
      console.warn("🚨 [AutoSync] 发现数据质量问题:", issues.slice(0, 10));
      if (issues.length > 10) {
        console.warn(`... 还有 ${issues.length - 10} 个问题`);
      }
    }

    return validData;
  }

  /**
   * 清理学生姓名，去除特殊字符和多余空格
   */
  private cleanStudentName(name: string): string {
    if (!name || typeof name !== "string") return "";

    return name
      .trim()
      .replace(/\s+/g, "") // 去除所有空格
      .replace(/[^\u4e00-\u9fa5a-zA-Z]/g, "") // 只保留中文、英文字母
      .slice(0, 10); // 限制长度
  }

  /**
   * 清理班级名称，标准化格式
   */
  private cleanClassName(className: string): string {
    if (!className || typeof className !== "string") return "";

    return className
      .trim()
      .replace(/\s+/g, "") // 去除多余空格
      .replace(/班$/, "") // 去除末尾的"班"字
      .slice(0, 20); // 限制长度
  }

  /**
   * 智能重复检测和潜在合并分析
   * 检测可能的重复学生，包括相似姓名检测
   */
  private analyzeDuplicateStudents(
    newStudentsMap: Map<
      string,
      { name: string; class_name: string; rawRecords: any[] }
    >,
    existingStudents: any[]
  ): {
    exactDuplicates: string[];
    potentialDuplicates: Array<{
      newKey: string;
      existingStudent: any;
      similarity: number;
    }>;
    crossClassDuplicates: Array<{ name: string; classes: string[] }>;
    summary: {
      totalNew: number;
      exactDuplicates: number;
      potentialDuplicates: number;
      crossClassDuplicates: number;
    };
  } {
    const exactDuplicates: string[] = [];
    const potentialDuplicates: Array<{
      newKey: string;
      existingStudent: any;
      similarity: number;
    }> = [];
    const crossClassDuplicates: Array<{ name: string; classes: string[] }> = [];

    // 构建现有学生的索引
    const existingByName = new Map<string, any[]>();
    existingStudents?.forEach((student) => {
      if (student.name) {
        if (!existingByName.has(student.name)) {
          existingByName.set(student.name, []);
        }
        existingByName.get(student.name)!.push(student);
      }
    });

    // 检测跨班级重复（同名学生在不同班级）
    existingByName.forEach((students, name) => {
      if (students.length > 1) {
        const classes = students
          .map((s) => s.classes?.name)
          .filter(Boolean)
          .filter((value, index, self) => self.indexOf(value) === index);

        if (classes.length > 1) {
          crossClassDuplicates.push({ name, classes });
        }
      }
    });

    // 检测新学生的重复情况
    [...newStudentsMap.entries()].forEach(([newKey, newStudent]) => {
      const { name, class_name } = newStudent;

      // 1. 检查完全匹配的重复
      const exactMatch = existingStudents?.find(
        (existing) =>
          existing.name === name && existing.classes?.name === class_name
      );
      if (exactMatch) {
        exactDuplicates.push(newKey);
        return;
      }

      // 2. 检查潜在重复（相似姓名或同名不同班级）
      existingStudents?.forEach((existing) => {
        if (!existing.name) return;

        // 同名但不同班级
        if (existing.name === name && existing.classes?.name !== class_name) {
          potentialDuplicates.push({
            newKey,
            existingStudent: existing,
            similarity: 1.0, // 100% 名字匹配
          });
          return;
        }

        // 相似姓名检测
        const similarity = this.calculateNameSimilarity(name, existing.name);
        if (similarity > 0.8 && similarity < 1.0) {
          // 80%以上相似度但不完全相同
          potentialDuplicates.push({
            newKey,
            existingStudent: existing,
            similarity,
          });
        }
      });
    });

    return {
      exactDuplicates,
      potentialDuplicates,
      crossClassDuplicates,
      summary: {
        totalNew: newStudentsMap.size,
        exactDuplicates: exactDuplicates.length,
        potentialDuplicates: potentialDuplicates.length,
        crossClassDuplicates: crossClassDuplicates.length,
      },
    };
  }

  /**
   * 计算两个姓名的相似度
   * 使用编辑距离算法计算字符串相似度
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0;
    if (name1 === name2) return 1.0;

    const len1 = name1.length;
    const len2 = name2.length;

    // 长度差异过大，相似度低
    if (Math.abs(len1 - len2) > Math.min(len1, len2) / 2) return 0;

    // 使用动态规划计算编辑距离
    const matrix: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (name1[i - 1] === name2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1, // 删除
            matrix[i][j - 1] + 1, // 插入
            matrix[i - 1][j - 1] + 1 // 替换
          );
        }
      }
    }

    const editDistance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return Math.max(0, 1 - editDistance / maxLen);
  }

  /**
   * 触发预警系统更新
   * 在数据同步完成后通知预警系统刷新数据
   */
  private async triggerWarningSystemUpdate(
    syncResult: SyncResult
  ): Promise<void> {
    try {
      // 收集受影响的班级名称
      const affectedClasses = new Set<string>();

      // 添加新创建的班级
      syncResult.newClasses.forEach((cls) => affectedClasses.add(cls.name));

      // 添加新创建学生所在的班级
      syncResult.newStudents.forEach((student) => {
        if (student.class_name) {
          affectedClasses.add(student.class_name);
        }
      });

      const affectedClassesArray = Array.from(affectedClasses);

      if (affectedClassesArray.length === 0) {
        console.log("⚠️ [AutoSync] 没有发现受影响的班级，跳过预警更新");
        return;
      }

      // 构建预警触发事件
      const warningEvent: WarningTriggerEvent = {
        type: "data_sync_complete",
        affectedClasses: affectedClassesArray,
        affectedStudents: syncResult.newStudents.length,
        timestamp: new Date().toISOString(),
      };

      console.log(
        "🚨 [AutoSync] 触发预警系统更新，受影响班级:",
        affectedClassesArray
      );

      // 异步触发预警更新，不阻塞主流程
      warningDataIntegrationService
        .triggerWarningUpdate(warningEvent)
        .catch((error) => {
          console.error("❌ [AutoSync] 预警系统更新失败:", error);
        });
    } catch (error) {
      console.error("❌ [AutoSync] 触发预警更新时出错:", error);
      // 不抛出异常，避免影响主同步流程
    }
  }

  /**
   * 验证学生数据完整性
   * 检查学生记录和成绩数据之间的一致性
   */
  async validateStudentDataIntegrity(classId?: string): Promise<{
    missingStudentIds: string[];
    orphanedGradeRecords: any[];
    classIdMismatches: Array<{
      studentName: string;
      expectedClass: string;
      actualClass: string;
    }>;
    summary: {
      totalStudents: number;
      totalGradeRecords: number;
      missingReferences: number;
      mismatches: number;
    };
  }> {
    console.log("🔍 [AutoSync] 开始验证学生数据完整性...");

    const missingStudentIds: string[] = [];
    const orphanedGradeRecords: any[] = [];
    const classIdMismatches: Array<{
      studentName: string;
      expectedClass: string;
      actualClass: string;
    }> = [];

    try {
      // 获取学生数据
      const studentsQuery = supabase
        .from("students")
        .select("id, student_id, name, class_id, classes(name)");
      if (classId) {
        studentsQuery.eq("class_id", classId);
      }
      const { data: students, error: studentsError } = await studentsQuery;

      if (studentsError) throw studentsError;

      // 获取成绩数据
      const gradeQuery = supabase
        .from("grade_data_new")
        .select("student_id, name, class_name");
      const { data: gradeRecords, error: gradeError } = await gradeQuery;

      if (gradeError) throw gradeError;

      // 构建学生ID映射
      const studentIdMap = new Map<string, any>();
      const studentNameClassMap = new Map<string, any>();

      students?.forEach((student) => {
        studentIdMap.set(student.id, student);
        if (student.name && student.classes?.name) {
          const key = `${student.name}_${student.classes.name}`;
          studentNameClassMap.set(key, student);
        }
      });

      // 检查成绩记录的完整性
      gradeRecords?.forEach((record) => {
        // 检查student_id引用是否存在
        if (record.student_id && !studentIdMap.has(record.student_id)) {
          if (record.name) {
            missingStudentIds.push(record.student_id);
          } else {
            orphanedGradeRecords.push(record);
          }
        }

        // 检查姓名和班级的一致性
        if (record.name && record.class_name) {
          const key = `${record.name}_${record.class_name}`;
          const expectedStudent = studentNameClassMap.get(key);

          if (expectedStudent && record.student_id !== expectedStudent.id) {
            classIdMismatches.push({
              studentName: record.name,
              expectedClass: record.class_name,
              actualClass: expectedStudent.classes?.name || "unknown",
            });
          }
        }
      });

      const result = {
        missingStudentIds: [...new Set(missingStudentIds)],
        orphanedGradeRecords,
        classIdMismatches,
        summary: {
          totalStudents: students?.length || 0,
          totalGradeRecords: gradeRecords?.length || 0,
          missingReferences: missingStudentIds.length,
          mismatches: classIdMismatches.length,
        },
      };

      console.log("✅ [AutoSync] 数据完整性验证完成:", result.summary);
      return result;
    } catch (error) {
      console.error("❌ [AutoSync] 数据完整性验证失败:", error);
      throw error;
    }
  }

  /**
   * 自动为新创建的学生生成AI标签
   * 集成增强的AI标签服务，实现真正的一键自动化
   */
  private async generateAITagsForNewStudents(
    syncResult: SyncResult,
    aiConfig: AITagsGenerationConfig
  ): Promise<void> {
    try {
      if (syncResult.newStudents.length === 0) {
        console.log("👥 [AutoSync] 没有新学生，跳过AI标签生成");
        return;
      }

      console.log(
        `🧠 [AutoSync] 开始为 ${syncResult.newStudents.length} 名新学生生成AI标签...`
      );

      // 提取新学生的ID列表
      const newStudentIds = syncResult.newStudents.map((student) => student.id);

      // 调用增强的AI标签服务
      const aiTagsResult =
        await enhancedAITagsService.generateTagsForNewStudents(
          newStudentIds,
          aiConfig
        );

      // 记录结果到syncResult中
      syncResult.aiTagsResult = {
        successful: aiTagsResult.successful.length,
        failed: aiTagsResult.failed.length,
        skipped: aiTagsResult.skipped.length,
      };

      // 输出详细日志
      console.log("🎯 [AutoSync] AI标签生成完成:", {
        总数: newStudentIds.length,
        成功: aiTagsResult.successful.length,
        失败: aiTagsResult.failed.length,
        跳过: aiTagsResult.skipped.length,
      });

      // 如果有失败的情况，记录错误但不中断主流程
      if (aiTagsResult.failed.length > 0) {
        console.warn(
          "⚠️ [AutoSync] 部分学生AI标签生成失败:",
          aiTagsResult.failed
            .map((f) => `${f.studentId}: ${f.error}`)
            .slice(0, 3)
        );

        // 将AI标签失败信息添加到错误列表中，但不影响整体成功状态
        syncResult.errors.push(
          `AI标签生成部分失败：${aiTagsResult.failed.length} 个学生`
        );
      }

      if (aiTagsResult.skipped.length > 0) {
        console.log(
          "ℹ️ [AutoSync] 部分学生因数据不足跳过AI标签生成:",
          aiTagsResult.skipped
            .map((s) => `${s.studentId}: ${s.reason}`)
            .slice(0, 3)
        );
      }

      // 显示成功的示例
      if (aiTagsResult.successful.length > 0) {
        const exampleSuccess = aiTagsResult.successful[0];
        console.log("✨ [AutoSync] AI标签生成示例:", {
          studentId: exampleSuccess.studentId,
          tags: exampleSuccess.tags,
          confidence: exampleSuccess.tags.confidence,
        });
      }
    } catch (error) {
      console.error("❌ [AutoSync] AI标签生成失败:", error);

      // 记录错误但不中断主流程
      syncResult.errors.push(
        `AI标签生成失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
      syncResult.aiTagsResult = {
        successful: 0,
        failed: syncResult.newStudents.length,
        skipped: 0,
      };
    }
  }

  /**
   * 数据质量校验
   */
  private async validateGradeData(
    gradeData: any[],
    options?: ValidationOptions
  ): Promise<ValidationReport> {
    console.log("🔍 [AutoSync] 执行成绩数据校验...");

    try {
      const validationOptions: ValidationOptions = {
        enableAutoFix: true,
        skipWarnings: false,
        skipInfo: true, // 在自动同步时跳过信息级别的提示
        enableDataCleaning: true,
        strictMode: false, // 非严格模式，允许警告通过
        maxErrors: 500,
        ...options,
      };

      const report = await gradeDataValidator.validateGradeData(
        gradeData,
        validationOptions
      );

      // 记录校验结果
      console.log(`📋 [AutoSync] 数据校验完成:`, {
        totalRecords: report.totalRecords,
        validRecords: report.validRecords,
        dataQuality: report.dataQuality.score,
        criticalErrors: report.summary.critical,
        errors: report.summary.errors,
        warnings: report.summary.warnings,
      });

      // 如果数据质量较低，给出建议
      if (report.dataQuality.score < 70) {
        console.warn(
          `⚠️ [AutoSync] 数据质量偏低 (${report.dataQuality.score}分)，建议检查数据源`
        );
        toast.warning(
          `数据质量评分: ${report.dataQuality.score}分 (${report.dataQuality.label})`,
          {
            description: "建议修复数据质量问题以获得更好的分析结果",
          }
        );
      } else {
        console.log(
          `✅ [AutoSync] 数据质量良好 (${report.dataQuality.score}分)`
        );
      }

      return report;
    } catch (error) {
      console.error("❌ [AutoSync] 数据校验失败:", error);
      const standardError = handleError(error, {
        context: "AutoSync.validateGradeData",
        dataSize: gradeData.length,
      });

      // 返回失败报告
      return {
        success: false,
        totalRecords: gradeData.length,
        validRecords: 0,
        invalidRecords: gradeData.length,
        results: [
          {
            id: `validation_error_${Date.now()}`,
            ruleId: "system_error",
            ruleName: "系统错误",
            severity: "critical" as any,
            message: standardError.message,
            suggestion: "请检查数据格式或联系技术支持",
            recordIndex: -1,
            record: {},
            value: null,
            canAutoFix: false,
          },
        ],
        summary: { critical: 1, errors: 0, warnings: 0, info: 0, total: 1 },
        dataQuality: {
          score: 0,
          level: "critical",
          color: "#dc2626",
          label: "严重",
        },
        fieldStatistics: {},
        recommendations: [standardError.userMessage],
        executionTime: 0,
      };
    }
  }

  /**
   * 快速数据质量检查
   */
  async quickDataQualityCheck(gradeData: any[]): Promise<{
    isValid: boolean;
    score: number;
    criticalIssues: number;
    recommendations: string[];
  }> {
    console.log("🚀 [AutoSync] 快速数据质量检查...");

    try {
      const quickResult = await gradeDataValidator.quickValidate(gradeData);

      // 计算简单的质量分数
      const totalRecords = gradeData.length;
      const hasRequiredFields = gradeData.every(
        (record) => record.student_id && record.name && record.class_name
      );

      let score = hasRequiredFields ? 80 : 20;
      if (quickResult.criticalErrors === 0) score += 20;

      return {
        isValid: quickResult.isValid,
        score: Math.min(100, score),
        criticalIssues: quickResult.criticalErrors,
        recommendations: quickResult.recommendations,
      };
    } catch (error) {
      console.error("❌ [AutoSync] 快速质量检查失败:", error);
      return {
        isValid: false,
        score: 0,
        criticalIssues: 1,
        recommendations: ["数据格式检查失败，请检查数据完整性"],
      };
    }
  }
}

// 导出单例实例
export const autoSyncService = new AutoSyncService();
