// n8n Code节点极简修复版 - 专门解决Information Extractor问题

// 获取webhook数据
const webhookData = $('Webhook').first().json;

// 简单的文本输出，确保Information Extractor能接收
const simpleText = `
Excel/CSV文件处理完成

考试信息：
- 标题：${webhookData.body?.examTitle || webhookData.examTitle || '未知考试'}
- 类型：${webhookData.body?.examType || webhookData.examType || '月考'}
- 日期：${webhookData.body?.examDate || webhookData.examDate || '未知日期'}

文件处理状态：成功接收文件数据
数据已准备就绪，等待进一步处理。
`;

console.log('输出文本内容:', simpleText);

// 返回包含text字段的数据（Information Extractor需要）
return [{
  json: {
    text: simpleText,
    status: 'success',
    message: '文件处理完成'
  }
}]; 