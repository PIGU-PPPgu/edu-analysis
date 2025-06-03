-- 修复grade_data表的唯一约束问题
-- 问题：当前约束UNIQUE(exam_id, student_id)不允许同一学生在同一考试中有多个科目成绩
-- 解决：将约束改为UNIQUE(exam_id, student_id, subject)

-- 1. 删除现有的错误约束
ALTER TABLE grade_data DROP CONSTRAINT IF EXISTS grade_data_exam_id_student_id_key;

-- 2. 添加正确的唯一约束（包含subject字段）
ALTER TABLE grade_data ADD CONSTRAINT grade_data_exam_student_subject_key 
UNIQUE(exam_id, student_id, subject);

-- 3. 添加注释说明
COMMENT ON CONSTRAINT grade_data_exam_student_subject_key ON grade_data IS 
'确保同一考试中同一学生的同一科目只有一条成绩记录';

-- 4. 验证约束是否正确创建
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'grade_data'::regclass 
AND contype = 'u';

-- 5. 显示修复结果
DO $$
BEGIN
    RAISE NOTICE '✅ 成功修复grade_data表的唯一约束';
    RAISE NOTICE '   - 删除了错误的约束: UNIQUE(exam_id, student_id)';
    RAISE NOTICE '   - 添加了正确的约束: UNIQUE(exam_id, student_id, subject)';
    RAISE NOTICE '   - 现在同一学生在同一考试中可以有多个科目的成绩记录';
END $$; 