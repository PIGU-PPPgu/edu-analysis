import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('🔍 Checking database data...\n');
  console.log(`📍 Database: ${supabaseUrl}\n`);

  // Check students
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  console.log(`👥 Students: ${students?.length ?? 0} rows`);
  if (studentsError) console.error('  Error:', studentsError.message);

  // Check grade_data
  const { data: grades, error: gradesError, count: gradeCount } = await supabase
    .from('grade_data')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Grade Data: ${gradeCount ?? 0} rows`);
  if (gradesError) console.error('  Error:', gradesError.message);

  // Check exams with student_id prefix
  const { data: testExams, count: testExamCount } = await supabase
    .from('exams')
    .select('*', { count: 'exact' })
    .like('student_id', 'TEST_%');

  console.log(`🧪 TEST exams: ${testExamCount ?? 0} rows`);

  // Check real exams (non-TEST)
  const { data: realExams, count: realExamCount } = await supabase
    .from('exams')
    .select('*', { count: 'exact' })
    .not('student_id', 'like', 'TEST_%');

  console.log(`📝 Real exams: ${realExamCount ?? 0} rows`);

  // Sample some data
  const { data: sampleGrades } = await supabase
    .from('grade_data')
    .select('student_id, exam_title, total_score')
    .limit(5);

  console.log('\n📋 Sample grade data:');
  sampleGrades?.forEach(g => {
    console.log(`  ${g.student_id}: ${g.exam_title} - ${g.total_score}分`);
  });
}

checkData().catch(console.error);
