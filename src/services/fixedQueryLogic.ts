// 🚑 修复的查询逻辑 - 避免406错误

// 修复exams查询（移除有问题的字段）
const checkExamDuplicate = async (examInfo) => {
  try {
    const { data, error } = await supabase
      .from("exams")
      .select("id, title, type, date, created_at") // 移除subject和grade_data(count)
      .eq("title", examInfo.title)
      .eq("type", examInfo.type)
      .eq("date", examInfo.date);

    return { data, error };
  } catch (err) {
    console.error("Exam查询错误:", err);
    return { data: null, error: err };
  }
};

// 修复grade_data查询（使用实际存在的字段）
const checkGradeDataDuplicate = async (examId, studentId) => {
  try {
    const { data, error } = await supabase
      .from("grade_data_new")
      .select("id")
      .eq("exam_id", examId)
      .eq("student_id", studentId);

    return { data, error };
  } catch (err) {
    console.error("GradeData查询错误:", err);
    return { data: null, error: err };
  }
};

// 安全的grade_data插入（使用现有字段）
const insertGradeData = async (gradeRecord) => {
  const safeRecord = {
    exam_id: gradeRecord.exam_id,
    student_id: gradeRecord.student_id,
    name: gradeRecord.name,
    class_name: gradeRecord.class_name,
    total_score: gradeRecord.total_score,
    score: gradeRecord.score || gradeRecord.total_score, // 使用通用字段
    grade: gradeRecord.grade,
    rank_in_class: gradeRecord.rank_in_class,
    rank_in_grade: gradeRecord.rank_in_grade,
    exam_title: gradeRecord.exam_title,
    exam_type: gradeRecord.exam_type,
    exam_date: gradeRecord.exam_date,
    subject: gradeRecord.subject || "",
    metadata: gradeRecord.metadata || {},
  };

  try {
    const { data, error } = await supabase
      .from("grade_data_new")
      .insert(safeRecord)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error("插入错误:", err);
    return { data: null, error: err };
  }
};

export { checkExamDuplicate, checkGradeDataDuplicate, insertGradeData };
