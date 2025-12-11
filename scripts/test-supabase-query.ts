import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

console.log('URL:', url);
console.log('Key length:', key.length);

const supabase = createClient(url, key);

async function test() {
  console.log('\n1. Testing basic query...');
  const { data: d1, error: e1 } = await supabase.from('students').select('*').limit(1);
  console.log('Basic query result:', { dataCount: d1?.length, error: e1?.message });

  console.log('\n2. Testing insert with .select()...');
  const testId = crypto.randomUUID();
  const { data: d2, error: e2 } = await supabase
    .from('students')
    .insert({
      id: testId,
      student_id: 'TEST_DEBUG_001',
      name: '测试',
      class_name: '测试班'
    })
    .select();

  console.log('Insert result:', { success: !e2, dataCount: d2?.length, error: e2?.message, code: e2?.code });

  if (!e2) {
    console.log('\n3. Cleaning up...');
    const { error: e3 } = await supabase.from('students').delete().eq('student_id', 'TEST_DEBUG_001');
    console.log('Delete result:', { success: !e3, error: e3?.message });
  }
}

test().catch(console.error);
