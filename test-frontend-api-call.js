/**
 * 测试前端API调用路径
 * 模拟前端组件直接调用portrait API
 */

// 模拟浏览器环境下的API调用
console.log('🔍 测试前端API调用路径...\n');

// 模拟API调用URL
const apiBaseUrl = 'http://localhost:3001';
const testClassId = 'class-初三7班';

async function testFrontendApiCall() {
  try {
    console.log('=== 1. 测试班级顶尖学生API调用 ===');

    // 构造请求URL (模拟前端组件的调用方式)
    const topStudentsUrl = `${apiBaseUrl}/api/portrait/class-top-students?classId=${encodeURIComponent(testClassId)}`;
    console.log(`请求URL: ${topStudentsUrl}`);

    // 模拟fetch调用
    try {
      const response = await fetch(topStudentsUrl);
      console.log(`响应状态: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API调用失败:', errorText);
        return;
      }

      const data = await response.json();
      console.log('✅ API调用成功');
      console.log(`返回数据: ${JSON.stringify(data, null, 2)}`);

    } catch (fetchError) {
      console.error('❌ 网络请求失败:', fetchError.message);
      console.log('💡 这可能是因为API端点不存在或者开发服务器没有运行');
    }

    console.log('\n=== 2. 测试班级学习小组API调用 ===');

    const groupsUrl = `${apiBaseUrl}/api/portrait/class-groups?classId=${encodeURIComponent(testClassId)}`;
    console.log(`请求URL: ${groupsUrl}`);

    try {
      const response = await fetch(groupsUrl);
      console.log(`响应状态: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API调用失败:', errorText);
        return;
      }

      const data = await response.json();
      console.log('✅ API调用成功');
      console.log(`返回数据: ${JSON.stringify(data, null, 2)}`);

    } catch (fetchError) {
      console.error('❌ 网络请求失败:', fetchError.message);
      console.log('💡 这可能是因为API端点不存在或者开发服务器没有运行');
    }

    console.log('\n=== 3. 诊断建议 ===');
    console.log('如果API调用失败，可能的原因:');
    console.log('1. 开发服务器没有运行 (npm run dev)');
    console.log('2. API路由不存在或路径错误');
    console.log('3. 前端组件没有正确调用API');
    console.log('4. 缓存问题导致显示旧数据');

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  }
}

// 运行测试
testFrontendApiCall()
  .then(() => {
    console.log('\n🎯 测试完成');
    console.log('请检查开发服务器是否在 http://localhost:3001 运行');
    console.log('并在浏览器中访问班级概览页面查看实际效果');
  })
  .catch(console.error);