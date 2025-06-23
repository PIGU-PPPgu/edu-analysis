-- 修复RLS策略，允许认证用户创建考试和学生记录
-- 这个脚本解决导入时的权限问题

-- 1. 修复exams表的RLS策略
-- 删除现有的策略
DROP POLICY IF EXISTS "允许用户访问自己创建的考试" ON public.exams;

-- 创建新的策略：分别处理SELECT和INSERT/UPDATE/DELETE
CREATE POLICY "允许认证用户创建考试" ON public.exams
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "允许用户访问自己创建的考试" ON public.exams
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "允许用户更新自己创建的考试" ON public.exams
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "允许用户删除自己创建的考试" ON public.exams
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- 2. 修复students表的RLS策略
-- 删除现有的策略
DROP POLICY IF EXISTS "Public read access" ON public.students;

-- 创建新的策略：允许认证用户读取和创建学生记录
CREATE POLICY "允许认证用户读取学生信息" ON public.students
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "允许认证用户创建学生记录" ON public.students
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "允许认证用户更新学生记录" ON public.students
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. 确保grade_data表的策略正确
-- 删除现有的策略
DROP POLICY IF EXISTS "允许用户访问自己创建的考试的成绩数据" ON public.grade_data;

-- 创建新的策略
CREATE POLICY "允许用户访问自己创建的考试的成绩数据" ON public.grade_data
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exams 
      WHERE exams.id = grade_data.exam_id 
      AND exams.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exams 
      WHERE exams.id = grade_data.exam_id 
      AND exams.created_by = auth.uid()
    )
  );

-- 4. 确保class_info表允许读取
DROP POLICY IF EXISTS "Public read access" ON public.class_info;

CREATE POLICY "允许认证用户读取班级信息" ON public.class_info
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "允许认证用户创建班级信息" ON public.class_info
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 5. 显示当前策略状态
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('exams', 'students', 'grade_data', 'class_info')
ORDER BY tablename, policyname; 