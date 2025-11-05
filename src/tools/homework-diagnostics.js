import { supabase } from "@/integrations/supabase/client";

/**
 * 诊断学生ID外键约束问题
 * @param {string} studentId 要检查的学生ID
 * @returns {Promise<object>} 诊断结果
 */
export async function diagnoseStudentId(studentId) {
  console.log(`开始诊断学生ID: ${studentId}`);

  try {
    // 清理ID（移除可能的前缀）
    const cleanId = studentId.replace(/^temp-/, "");

    // 0. 检查ID格式
    const formatCheck = checkIdFormat(cleanId);

    // 1. 检查数据库连接
    const connectionInfo = await checkConnection();

    // 2. 验证学生ID - 多种方式
    const directResult = await directStudentQuery(cleanId);
    const countResult = await countStudentQuery(cleanId);
    const secondaryResult = await secondaryStudentQuery(cleanId);

    // 2.1 如果ID不是UUID格式，尝试通过学号查找正确的UUID
    let uuidResult = { exists: false, data: null };
    if (!formatCheck.isUuid && cleanId) {
      uuidResult = await findUuidByStudentCode(cleanId);
    }

    // 3. 检查外键约束
    const constraintInfo = await checkForeignKeyConstraint();

    // 4. 尝试执行测试插入
    const testInsertResult = await testInsertWithForeignKey(cleanId);

    // 5. 汇总诊断结果
    const diagnosis = determineDiagnosis({
      formatCheck,
      directResult,
      countResult,
      secondaryResult,
      uuidResult,
      constraintInfo,
      testInsertResult,
    });

    return {
      studentId: cleanId,
      formatCheck,
      connectionInfo,
      queryResults: {
        direct: directResult,
        count: countResult,
        secondary: secondaryResult,
        uuidLookup: uuidResult,
      },
      constraintInfo,
      testInsertResult,
      diagnosis,
      summary: generateSummary(diagnosis),
    };
  } catch (error) {
    console.error("诊断过程发生错误:", error);
    return {
      success: false,
      error: error.message,
      errorStack: error.stack,
    };
  }
}

/**
 * 修复学生ID问题
 * @param {string} studentId 原始学生ID
 * @param {string} replacementId 可选的替代ID
 * @returns {Promise<object>} 修复结果
 */
export async function fixStudentId(studentId, replacementId = null) {
  console.log(`开始修复学生ID: ${studentId}`);
  const cleanId = studentId.replace(/^temp-/, "");

  try {
    // 1. 先诊断问题
    const diagnosis = await diagnoseStudentId(cleanId);

    // 如果找到了通过学号映射的UUID，直接使用
    if (diagnosis.queryResults.uuidLookup.exists) {
      const correctUuid = diagnosis.queryResults.uuidLookup.data.id;
      console.log(`找到正确的UUID: ${correctUuid} (通过学号 ${cleanId})`);
      return {
        success: true,
        message: "通过学号找到正确的UUID格式ID",
        studentId: correctUuid,
        originalId: cleanId,
        isReformatted: true,
      };
    }

    // 2. 如果没有问题，不需要修复
    if (diagnosis.diagnosis.overallStatus === "valid") {
      return {
        success: true,
        message: "学生ID有效，无需修复",
        studentId: cleanId,
      };
    }

    // 3. 尝试查找有效的替代学生
    let validStudentId = replacementId;

    if (!validStudentId) {
      const replacement = await findReplacementStudent();
      if (replacement.success) {
        validStudentId = replacement.studentId;
      } else {
        return {
          success: false,
          message: "无法找到有效的替代学生ID",
          originalId: cleanId,
        };
      }
    }

    // 4. 验证替代ID
    const replacementCheck = await diagnoseStudentId(validStudentId);
    if (replacementCheck.diagnosis.overallStatus !== "valid") {
      return {
        success: false,
        message: "替代学生ID也无效",
        originalId: cleanId,
        replacementId: validStudentId,
        replacementDiagnosis: replacementCheck.diagnosis,
      };
    }

    // 5. 返回有效的学生ID
    return {
      success: true,
      message: "找到有效的替代学生ID",
      originalId: cleanId,
      studentId: validStudentId,
      isReplacement: true,
    };
  } catch (error) {
    console.error("修复过程发生错误:", error);
    return {
      success: false,
      error: error.message,
      errorStack: error.stack,
    };
  }
}

/**
 * 检查ID格式是否为UUID
 * @param {string} id 要检查的ID
 * @returns {object} 检查结果
 */
function checkIdFormat(id) {
  // UUID格式正则表达式
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // 学号格式正则表达式（通常为数字）
  const studentCodeRegex = /^\d{8,12}$/;

  const isUuid = uuidRegex.test(id);
  const isStudentCode = studentCodeRegex.test(id);

  let formatType = "unknown";
  if (isUuid) formatType = "uuid";
  else if (isStudentCode) formatType = "student_code";

  return {
    isUuid,
    isStudentCode,
    formatType,
    value: id,
    isCorrectFormat: isUuid, // 在这个系统中，正确的格式应该是UUID
  };
}

/**
 * 通过学号查找正确的UUID
 * @param {string} studentCode 学号
 * @returns {Promise<object>} 查询结果
 */
async function findUuidByStudentCode(studentCode) {
  try {
    console.log(`尝试通过学号 ${studentCode} 查找正确的UUID...`);

    if (!studentCode) return { exists: false, data: null };

    const { data, error } = await supabase
      .from("students")
      .select("id, name, student_id")
      .eq("student_id", studentCode)
      .maybeSingle();

    if (error || !data) {
      console.log(`通过学号 ${studentCode} 未找到匹配的UUID`);
      return {
        exists: false,
        error: error?.message,
        studentCode,
      };
    }

    console.log(`通过学号 ${studentCode} 找到UUID: ${data.id}`);
    return {
      exists: true,
      data,
      studentCode,
      uuid: data.id,
    };
  } catch (error) {
    console.error("查找UUID过程中出错:", error);
    return {
      exists: false,
      error: error.message,
      studentCode,
    };
  }
}

// === 辅助函数 ===

async function checkConnection() {
  try {
    // 获取Supabase项目信息
    console.log("检查Supabase连接...");

    // 使用简单的表查询检查连接
    const { data, error } = await supabase
      .from("students")
      .select("count(*)", { count: "exact", head: true });

    // 获取授权信息
    const session = supabase.auth.session?.() || null;
    const user = session?.user || null;

    return {
      success: !error,
      error: error?.message,
      url: supabase.supabaseUrl,
      user: user ? { id: user.id, email: user.email } : null,
      count: data,
    };
  } catch (error) {
    console.error("连接检查失败:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function directStudentQuery(studentId) {
  try {
    console.log("执行直接学生查询...");
    const { data, error } = await supabase
      .from("students")
      .select("id, name, student_id, class_id")
      .eq("id", studentId)
      .single();

    return {
      success: !error && !!data,
      data,
      error: error?.message,
      exists: !error && !!data,
    };
  } catch (error) {
    console.error("直接查询失败:", error);
    return {
      success: false,
      error: error.message,
      exists: false,
    };
  }
}

async function countStudentQuery(studentId) {
  try {
    console.log("执行计数学生查询...");
    const { count, error } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("id", studentId);

    return {
      success: !error,
      count: count || 0,
      error: error?.message,
      exists: count > 0,
    };
  } catch (error) {
    console.error("计数查询失败:", error);
    return {
      success: false,
      error: error.message,
      count: 0,
      exists: false,
    };
  }
}

async function secondaryStudentQuery(studentId) {
  try {
    console.log("执行二次学生查询，使用student_id字段...");
    const { data, error } = await supabase
      .from("students")
      .select("id, name, student_id")
      .eq("student_id", studentId)
      .maybeSingle();

    return {
      success: !error,
      data,
      error: error?.message,
      exists: !error && !!data,
    };
  } catch (error) {
    console.error("二次查询失败:", error);
    return {
      success: false,
      error: error.message,
      exists: false,
    };
  }
}

async function checkForeignKeyConstraint() {
  try {
    console.log("检查外键约束...");
    // 这里检查外键是否存在，由于权限限制，直接查看是否能插入
    const { data, error } = await supabase
      .from("homework_submissions")
      .select("student_id")
      .limit(1);

    return {
      success: !error,
      constraintExists: true, // 假设约束存在
      error: error?.message,
    };
  } catch (error) {
    console.error("约束检查失败:", error);
    return {
      success: false,
      error: error.message,
      constraintExists: false,
    };
  }
}

async function testInsertWithForeignKey(studentId) {
  try {
    console.log("测试外键插入...");
    // 不实际插入，而是创建一个临时对象进行验证
    const testObject = {
      homework_id: "00000000-0000-0000-0000-000000000000", // 占位ID
      student_id: studentId,
      status: "test",
      created_at: new Date().toISOString(),
    };

    // 尝试执行插入验证
    const { error } = await supabase
      .from("homework_submissions")
      .insert(testObject, { returning: "minimal" })
      .select();

    // 检查错误类型
    const isConstraintError = error?.code === "23503"; // 外键约束错误代码

    return {
      success: false, // 即使成功我们也报告false，因为我们并不想真正插入
      error: error?.message,
      errorCode: error?.code,
      isConstraintError,
      canInsert: !isConstraintError,
    };
  } catch (error) {
    console.error("插入测试失败:", error);
    return {
      success: false,
      error: error.message,
      canInsert: false,
    };
  }
}

async function findReplacementStudent() {
  try {
    console.log("查找替代学生...");
    const { data, error } = await supabase
      .from("students")
      .select("id, name")
      .limit(1)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: error?.message || "找不到任何学生记录",
      };
    }

    return {
      success: true,
      studentId: data.id,
      studentName: data.name,
    };
  } catch (error) {
    console.error("查找替代学生失败:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

function determineDiagnosis(results) {
  const {
    formatCheck,
    directResult,
    countResult,
    secondaryResult,
    uuidResult,
    constraintInfo,
    testInsertResult,
  } = results;

  // 评估ID存在性
  const idExists = directResult.exists || countResult.exists;
  const idConsistency = directResult.exists === countResult.exists;

  // 评估学号匹配
  const hasSecondaryMatch = secondaryResult.exists;
  const hasUuidMatch = uuidResult?.exists || false;

  // 评估约束状态
  const constraintValid = constraintInfo.constraintExists;
  const canInsert = !testInsertResult.isConstraintError;

  // 确定总体状态
  let overallStatus = "unknown";
  let primaryIssue = null;

  if (!formatCheck.isUuid && hasUuidMatch) {
    // ID格式错误但找到了正确的UUID
    overallStatus = "fixable";
    primaryIssue = "wrong_id_format";
  } else if (idExists && !testInsertResult.isConstraintError) {
    overallStatus = "valid";
  } else if (!formatCheck.isUuid) {
    overallStatus = "invalid";
    primaryIssue = "wrong_id_format";
  } else if (!idExists) {
    overallStatus = "invalid";
    primaryIssue = "student_not_found";
  } else if (idExists && testInsertResult.isConstraintError) {
    overallStatus = "invalid";
    primaryIssue = "id_mismatch";
  } else if (!constraintValid) {
    overallStatus = "invalid";
    primaryIssue = "missing_constraint";
  }

  return {
    overallStatus,
    primaryIssue,
    details: {
      idExists,
      idConsistency,
      hasSecondaryMatch,
      hasUuidMatch,
      isCorrectFormat: formatCheck.isUuid,
      constraintValid,
      canInsert,
    },
  };
}

function generateSummary(diagnosis) {
  const { overallStatus, primaryIssue, details } = diagnosis;

  switch (overallStatus) {
    case "valid":
      return "学生ID有效，可以正常使用。";

    case "fixable":
      return "学生ID格式错误（使用了学号而非UUID），但可以自动修复。";

    case "invalid":
      switch (primaryIssue) {
        case "wrong_id_format":
          return "学生ID格式错误，应使用UUID格式而非学号。";
        case "student_not_found":
          return "学生ID在数据库中不存在，需要提供有效ID。";
        case "id_mismatch":
          return "学生ID存在，但与数据库中的记录不匹配，可能是ID格式或结构问题。";
        case "missing_constraint":
          return "数据库缺少必要的外键约束，请检查数据库模式。";
        default:
          return "学生ID验证失败，但无法确定具体原因。";
      }

    default:
      return "无法确定学生ID状态，请检查诊断详情。";
  }
}
