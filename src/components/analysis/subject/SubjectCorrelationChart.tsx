import React, { useMemo } from 'react';
import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';

// 注册ChartJS组件
ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

interface SubjectCorrelationChartProps {
  data: Record<string, number>;
  subjects: Array<{
    id: string;
    name: string;
  }>;
  highlightSubject: string;
}

const SubjectCorrelationChart: React.FC<SubjectCorrelationChartProps> = ({ 
  data, 
  subjects,
  highlightSubject
}) => {
  // 处理相关性数据
  const correlationData = useMemo(() => {
    if (!data || Object.keys(data).length === 0 || !subjects || subjects.length === 0) {
      return [];
    }

    // 获取高亮学科的名称
    const highlightSubjectName = subjects.find(s => s.id === highlightSubject)?.name || '';
    
    // 构建数据集
    const datasets = [];
    
    // 从数据中提取与高亮学科相关的相关性数据
    const relevantCorrelations = Object.entries(data)
      .filter(([key]) => key.includes(highlightSubjectName))
      .map(([key, value]) => {
        // 从键中提取两个学科名称 (格式: "学科A-学科B")
        const [subjectA, subjectB] = key.split('-');
        
        // 确定是哪个学科与高亮学科相关联
        const relatedSubject = subjectA === highlightSubjectName ? subjectB : subjectA;
        
        return {
          subject: relatedSubject,
          correlation: value
        };
      });
    
    // 排序相关性数据
    const sortedCorrelations = [...relevantCorrelations].sort((a, b) => 
      b.correlation - a.correlation
    );
    
    // 创建数据点
    const dataPoints = sortedCorrelations.map((item, index) => ({
      x: index + 1, // 横坐标为序号
      y: item.correlation, // 纵坐标为相关系数
      subject: item.subject // 附加学科名称用于工具提示
    }));
    
    datasets.push({
      label: `与${highlightSubjectName}的相关性`,
      data: dataPoints,
      backgroundColor: 'rgba(54, 162, 235, 0.7)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
      pointRadius: 6,
      pointHoverRadius: 8,
    });
    
    return {
      datasets,
      subjectLabels: sortedCorrelations.map(item => item.subject)
    };
  }, [data, subjects, highlightSubject]);

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        暂无学科相关性数据
      </div>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: '学科'
        },
        type: 'category' as const,
        labels: correlationData.subjectLabels || [],
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        max: 1,
        title: {
          display: true,
          text: '相关系数'
        }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const point = context.raw;
            return `${point.subject}: 相关系数 ${point.y.toFixed(2)}`;
          }
        }
      },
      legend: {
        display: true,
        position: 'top' as const,
      }
    }
  };

  return (
    <div className="h-80 w-full">
      <Scatter 
        data={{
          datasets: correlationData.datasets || []
        }} 
        options={options} 
      />
    </div>
  );
};

export default SubjectCorrelationChart; 