#!/usr/bin/env node

// 检查Supabase数据库中的测试数据
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 检查Supabase数据库中的测试数据');

async function checkData() {
  try {
    // 检查最近的成绩数据
    console.log('\n📊 查询最近的成绩数据...');
    
    const { data: gradeData, error: gradeError } = await supabase
      .from('grade_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (gradeError) {
      console.error('❌ 查询grade_data失败:', gradeError);
    } else {
      console.log('✅ grade_data表最近10条记录:');
      console.log(`找到 ${gradeData.length} 条记录`);
      
      if (gradeData.length > 0) {
        console.log('\n📋 最新记录详情:');
        gradeData.forEach((record, index) => {
          console.log(`${index + 1}. 学号: ${record.student_id}, 姓名: ${record.name}, 班级: ${record.class_name}`);
          console.log(`   考试: ${record.exam_title}, 创建时间: ${record.created_at}`);
          if (record.chinese) console.log(`   语文: ${record.chinese}, 数学: ${record.math}, 英语: ${record.english}`);
          console.log('');
        });
      }
    }
    
    // 检查考试表
    console.log('\n📝 查询最近的考试记录...');
    
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (examError) {
      console.error('❌ 查询exams失败:', examError);
    } else {
      console.log('✅ exams表最近5条记录:');
      console.log(`找到 ${examData.length} 条记录`);
      
      examData.forEach((exam, index) => {
        console.log(`${index + 1}. 标题: ${exam.title}, 类型: ${exam.type}, 日期: ${exam.date}`);
      });
    }
    
    // 查找今天的测试数据
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n🎯 查找今天(${today})的测试数据...`);
    
    const { data: todayData, error: todayError } = await supabase
      .from('grade_data')
      .select('*')
      .gte('created_at', today)
      .eq('exam_title', '期中考试');
    
    if (todayError) {
      console.error('❌ 查询今天数据失败:', todayError);
    } else {
      console.log(`✅ 找到今天的期中考试数据: ${todayData.length} 条`);
      
      if (todayData.length > 0) {
        console.log('\n🎉 测试数据确认保存成功！');
        console.log('学生列表:');
        todayData.forEach((record, index) => {
          console.log(`${index + 1}. ${record.student_id} - ${record.name} (${record.class_name})`);
        });
      } else {
        console.log('⚠️  没有找到今天的测试数据，可能保存失败或字段不匹配');
      }
    }
    
  } catch (error) {
    console.error('❌ 检查数据时出错:', error);
  }
}

// 运行检查
checkData(); 