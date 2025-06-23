#!/usr/bin/env node

// 检查数据库表结构
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTableStructure() {
  console.log('🔍 检查表结构和实际字段');
  console.log('=========================');
  
  // 检查 warning_records 表的实际字段
  console.log('\n🚨 warning_records 表结构:');
  try {
    const { data, error } = await supabase
      .from('warning_records')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ 查询失败: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log('✅ 实际字段列表:');
      Object.keys(data[0]).forEach((key, index) => {
        console.log(`  ${index + 1}. ${key}: ${typeof data[0][key]} (${data[0][key]})`);
      });
    } else {
      console.log('⚠️  表中没有数据，尝试获取表结构信息');
    }
  } catch (err) {
    console.log(`❌ 检查 warning_records 表时出错: ${err.message}`);
  }
  
  // 检查 warning_rules 表的实际字段
  console.log('\n📏 warning_rules 表结构:');
  try {
    const { data, error } = await supabase
      .from('warning_rules')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ 查询失败: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log('✅ 实际字段列表:');
      Object.keys(data[0]).forEach((key, index) => {
        console.log(`  ${index + 1}. ${key}: ${typeof data[0][key]} (${data[0][key]})`);
      });
    } else {
      console.log('⚠️  表中没有数据');
    }
  } catch (err) {
    console.log(`❌ 检查 warning_rules 表时出错: ${err.message}`);
  }
  
  // 检查 students 表的实际字段
  console.log('\n👥 students 表结构:');
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ 查询失败: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log('✅ 实际字段列表:');
      Object.keys(data[0]).forEach((key, index) => {
        console.log(`  ${index + 1}. ${key}: ${typeof data[0][key]} (${data[0][key]})`);
      });
    } else {
      console.log('⚠️  表中没有数据');
    }
  } catch (err) {
    console.log(`❌ 检查 students 表时出错: ${err.message}`);
  }
  
  // 检查 grade_data 表的实际字段
  console.log('\n📊 grade_data 表结构:');
  try {
    const { data, error } = await supabase
      .from('grade_data')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ 查询失败: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log('✅ 实际字段列表:');
      Object.keys(data[0]).forEach((key, index) => {
        console.log(`  ${index + 1}. ${key}: ${typeof data[0][key]} (${data[0][key]})`);
      });
    } else {
      console.log('⚠️  表中没有数据');
    }
  } catch (err) {
    console.log(`❌ 检查 grade_data 表时出错: ${err.message}`);
  }
}

checkTableStructure().catch(console.error);