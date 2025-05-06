console.log('最终安全检查 - 学生ID有效:', studentData);
} catch (finalCheckError) {
console.error('最终学生ID验证错误:', finalCheckError);
return { success: false, error: 'validation_error' };
}

// 构建提交数据对象
const submissionData = {
student_id: studentId,
homework_id: homeworkId,
score: data.score,
status: 'graded',
teacher_feedback: data.feedback || '',
updated_at: new Date().toISOString()
};

// 保存评分数据
console.log('将创建新记录，详细参数：', submissionData); 