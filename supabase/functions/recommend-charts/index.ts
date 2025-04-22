
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChartGenerationConfig {
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'boxplot';
  dataFields: {
    xAxis?: string;
    yAxis?: string[];
    groupBy?: string;
  };
  options?: Record<string, any>;
}

serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data } = await req.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('无效的数据格式或空数据');
    }

    // 分析数据并生成图表推荐
    const chartConfigs = analyzeDataForCharts(data);

    return new Response(JSON.stringify(chartConfigs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('图表推荐生成过程中出错:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || '未知错误'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * 分析数据并生成图表推荐
 */
function analyzeDataForCharts(data: any[]): ChartGenerationConfig[] {
  const configs: ChartGenerationConfig[] = [];
  const firstRecord = data[0];
  const fields = Object.keys(firstRecord);
  
  // 数据类型分析
  const fieldTypes: Record<string, string> = {};
  const numericFields: string[] = [];
  const temporalFields: string[] = [];
  const categoricalFields: string[] = [];
  
  fields.forEach(field => {
    const values = data.map(record => record[field]).filter(v => v !== null && v !== undefined);
    
    // 判断字段类型
    if (values.length === 0) {
      fieldTypes[field] = 'unknown';
    } else if (values.every(v => !isNaN(Number(v)))) {
      fieldTypes[field] = 'numeric';
      numericFields.push(field);
    } else if (values.every(v => !isNaN(Date.parse(String(v))))) {
      fieldTypes[field] = 'temporal';
      temporalFields.push(field);
    } else {
      fieldTypes[field] = 'categorical';
      categoricalFields.push(field);
    }
  });
  
  // 识别特殊字段
  const scoreField = numericFields.find(f => 
    f.toLowerCase().includes('score') || 
    f.toLowerCase().includes('分数') || 
    f.toLowerCase().includes('成绩')
  ) || numericFields[0];
  
  const subjectField = categoricalFields.find(f => 
    f.toLowerCase().includes('subject') || 
    f.toLowerCase().includes('科目') || 
    f.toLowerCase().includes('学科')
  ) || (categoricalFields.length > 0 ? categoricalFields[0] : undefined);
  
  const dateField = temporalFields.find(f => 
    f.toLowerCase().includes('date') || 
    f.toLowerCase().includes('日期') || 
    f.toLowerCase().includes('time') || 
    f.toLowerCase().includes('时间') ||
    f.toLowerCase().includes('exam')
  ) || (temporalFields.length > 0 ? temporalFields[0] : undefined);
  
  const nameField = categoricalFields.find(f => 
    f.toLowerCase().includes('name') || 
    f.toLowerCase().includes('姓名') || 
    f.toLowerCase().includes('student')
  );
  
  // 生成图表配置
  
  // 1. 如果有学科和分数字段，添加各科目平均分柱状图
  if (subjectField && scoreField) {
    configs.push({
      chartType: 'bar',
      dataFields: {
        xAxis: subjectField,
        yAxis: [scoreField]
      },
      options: {
        title: '各科目平均分'
      }
    });
  }
  
  // 2. 如果有日期和分数字段，添加成绩趋势折线图
  if (dateField && scoreField) {
    configs.push({
      chartType: 'line',
      dataFields: {
        xAxis: dateField,
        yAxis: [scoreField],
        groupBy: subjectField
      },
      options: {
        title: '成绩趋势变化'
      }
    });
  }
  
  // 3. 如果有分数字段，添加分数分布饼图
  if (scoreField) {
    configs.push({
      chartType: 'pie',
      dataFields: {
        groupBy: scoreField
      },
      options: {
        title: '分数段分布'
      }
    });
  }
  
  // 4. 如果有多个数值字段，添加散点图
  if (numericFields.length >= 2) {
    configs.push({
      chartType: 'scatter',
      dataFields: {
        xAxis: numericFields[0],
        yAxis: [numericFields[1]]
      },
      options: {
        title: '相关性分析'
      }
    });
  }
  
  // 5. 如果有分数和学生，添加箱线图
  if (scoreField && (subjectField || nameField)) {
    configs.push({
      chartType: 'boxplot',
      dataFields: {
        xAxis: subjectField || nameField,
        yAxis: [scoreField]
      },
      options: {
        title: '成绩分布箱线图'
      }
    });
  }
  
  return configs;
}
