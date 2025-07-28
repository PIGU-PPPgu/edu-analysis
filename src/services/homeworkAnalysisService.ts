import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * 获取作业成绩等级分布
 * @returns 作业分数等级分布数据
 */
export async function getGradeDistribution() {
  try {
    // 从数据库获取所有作业提交记录的分数
    const { data, error } = await supabase
      .from("homework_submissions")
      .select("score")
      .not("score", "is", null);

    if (error) {
      console.error("获取作业分数失败:", error);
      toast.error(`获取作业分数失败: ${error.message}`);
      return null;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 按等级统计分数
    const grades = {
      优秀: 0,
      良好: 0,
      及格: 0,
      不及格: 0,
    };

    data.forEach((submission) => {
      const score = submission.score;
      if (score >= 90) {
        grades["优秀"]++;
      } else if (score >= 80) {
        grades["良好"]++;
      } else if (score >= 60) {
        grades["及格"]++;
      } else {
        grades["不及格"]++;
      }
    });

    // 转换为图表需要的格式
    return [
      {
        name: "优秀",
        数量: grades["优秀"],
        颜色: "#4ade80",
      },
      {
        name: "良好",
        数量: grades["良好"],
        颜色: "#60a5fa",
      },
      {
        name: "及格",
        数量: grades["及格"],
        颜色: "#facc15",
      },
      {
        name: "不及格",
        数量: grades["不及格"],
        颜色: "#f87171",
      },
    ];
  } catch (error) {
    console.error("获取作业分数分布异常:", error);
    toast.error(`获取作业分数分布失败: ${error.message || "未知错误"}`);
    return null;
  }
}

/**
 * 获取作业成绩和提交率趋势
 * @returns 各次作业的平均分和提交率趋势数据
 */
export async function getGradeTrend() {
  try {
    // 获取所有作业
    const { data: homeworks, error: homeworksError } = await supabase
      .from("homework")
      .select("id, title, due_date")
      .order("due_date", { ascending: true });

    if (homeworksError) {
      console.error("获取作业列表失败:", homeworksError);
      toast.error(`获取作业列表失败: ${homeworksError.message}`);
      return null;
    }

    if (!homeworks || homeworks.length === 0) {
      return [];
    }

    // 限制只显示最近的5个作业
    const recentHomeworks = homeworks.slice(-5);

    const result = [];

    // 为每个作业获取提交情况
    for (const homework of recentHomeworks) {
      // 获取该作业的提交记录
      const { data: submissions, error: submissionsError } = await supabase
        .from("homework_submissions")
        .select("score, status")
        .eq("homework_id", homework.id);

      if (submissionsError) {
        console.error(
          `获取作业 ${homework.id} 提交记录失败:`,
          submissionsError
        );
        continue;
      }

      if (!submissions || submissions.length === 0) {
        // 如果没有提交记录，添加默认数据
        result.push({
          name:
            homework.title.length > 6
              ? homework.title.substring(0, 6) + "..."
              : homework.title,
          平均分: 0,
          提交率: 0,
        });
        continue;
      }

      // 计算平均分
      const scoresWithValues = submissions.filter(
        (s) => s.score !== null && s.score !== undefined
      );
      const avgScore =
        scoresWithValues.length > 0
          ? scoresWithValues.reduce((sum, s) => sum + s.score, 0) /
            scoresWithValues.length
          : 0;

      // 计算提交率 (把已提交和已批改的都算作已提交)
      const submittedCount = submissions.filter(
        (s) => s.status === "submitted" || s.status === "graded"
      ).length;
      const submissionRate = (submittedCount / submissions.length) * 100;

      result.push({
        name:
          homework.title.length > 6
            ? homework.title.substring(0, 6) + "..."
            : homework.title,
        平均分: Math.round(avgScore * 10) / 10, // 保留一位小数
        提交率: Math.round(submissionRate),
      });
    }

    return result;
  } catch (error) {
    console.error("获取作业趋势异常:", error);
    toast.error(`获取作业趋势失败: ${error.message || "未知错误"}`);
    return null;
  }
}

/**
 * 获取作业质量分析数据
 * @returns 作业质量雷达图数据
 */
export async function getHomeworkQualityData() {
  try {
    // 获取所有作业的知识点评估数据
    const { data: masteryData, error: masteryError } = await supabase.from(
      "student_knowledge_mastery"
    ).select(`
        mastery_level,
        knowledge_points (
          id,
          name
        )
      `);

    if (masteryError) {
      console.error("获取知识点掌握度失败:", masteryError);
      toast.error(`获取知识点掌握度失败: ${masteryError.message}`);
      return null;
    }

    if (!masteryData || masteryData.length === 0) {
      return [];
    }

    // 按知识点分类并计算平均分和最高分
    const knowledgePointsMap = new Map();

    masteryData.forEach((item) => {
      if (!item.knowledge_points) return;

      const kpName = item.knowledge_points.name;
      const level = item.mastery_level;

      if (!knowledgePointsMap.has(kpName)) {
        knowledgePointsMap.set(kpName, {
          levels: [level],
          maxLevel: level,
        });
      } else {
        const data = knowledgePointsMap.get(kpName);
        data.levels.push(level);
        data.maxLevel = Math.max(data.maxLevel, level);
        knowledgePointsMap.set(kpName, data);
      }
    });

    // 生成雷达图数据（最多取5个知识点）
    const result = Array.from(knowledgePointsMap.entries())
      .slice(0, 5)
      .map(([kpName, data]) => {
        // 计算平均分
        const avgLevel =
          data.levels.reduce((sum, level) => sum + level, 0) /
          data.levels.length;

        return {
          subject: kpName.length > 6 ? kpName.substring(0, 6) + "..." : kpName,
          A: data.maxLevel, // 最高水平
          B: Math.round(avgLevel), // 平均水平
          fullMark: 100,
        };
      });

    return result;
  } catch (error) {
    console.error("获取作业质量数据异常:", error);
    toast.error(`获取作业质量数据失败: ${error.message || "未知错误"}`);
    return null;
  }
}
