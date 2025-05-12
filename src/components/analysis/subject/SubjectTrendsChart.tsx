import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 注册ChartJS组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrendData {
  date: string;
  examType: string;
  averageScore: number;
  medianScore: number;
  excellentRate: number;
  passRate: number;
}

interface SubjectTrendsChartProps {
  data: TrendData[];
  subjectName: string;
}

const SubjectTrendsChart: React.FC<SubjectTrendsChartProps> = ({ data, subjectName }) => {
  const [metric, setMetric] = useState<'averageScore' | 'passRate' | 'excellentRate'>('averageScore');
  
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500">暂无{subjectName}学科趋势数据</div>;
  }
  
  // 按日期排序
  const sortedData = [...data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // 提取日期标签并格式化
  const labels = sortedData.map(item => {
    try {
      return `${format(new Date(item.date), 'MM月dd日', { locale: zhCN })} ${item.examType || ''}`;
    } catch (e) {
      return item.date;
    }
  });
  
  // 根据所选指标获取标题和数据
  const metricInfo = {
    averageScore: {
      label: '平均分',
      yAxisLabel: '分数',
      color: 'rgba(54, 162, 235, 0.7)',
      borderColor: 'rgba(54, 162, 235, 1)',
    },
    passRate: {
      label: '及格率',
      yAxisLabel: '百分比',
      color: 'rgba(75, 192, 192, 0.7)',
      borderColor: 'rgba(75, 192, 192, 1)',
    },
    excellentRate: {
      label: '优秀率',
      yAxisLabel: '百分比',
      color: 'rgba(153, 102, 255, 0.7)',
      borderColor: 'rgba(153, 102, 255, 1)',
    },
  };
  
  const currentMetric = metricInfo[metric];
  
  const chartData = {
    labels,
    datasets: [
      {
        label: currentMetric.label,
        data: sortedData.map(item => {
          if (metric === 'averageScore') {
            return item.averageScore;
          } else if (metric === 'passRate') {
            return item.passRate;
          } else {
            return item.excellentRate;
          }
        }),
        borderColor: currentMetric.borderColor,
        backgroundColor: currentMetric.color,
        fill: true,
        tension: 0.4,
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${subjectName}${currentMetric.label}趋势`,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            
            if (metric === 'averageScore') {
              return `${label}: ${value.toFixed(1)}分`;
            } else {
              return `${label}: ${value.toFixed(1)}%`;
            }
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: metric !== 'averageScore',
        title: {
          display: true,
          text: currentMetric.yAxisLabel
        },
        min: metric === 'averageScore' ? Math.max(0, Math.min(...sortedData.map(item => item.averageScore)) - 10) : 0,
        max: metric === 'averageScore' ? Math.min(100, Math.max(...sortedData.map(item => item.averageScore)) + 10) : 100,
      }
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button 
          size="sm" 
          variant={metric === 'averageScore' ? 'default' : 'outline'}
          onClick={() => setMetric('averageScore')}
          className={metric === 'averageScore' ? 'bg-blue-500 hover:bg-blue-600' : ''}
        >
          平均分
        </Button>
        <Button 
          size="sm" 
          variant={metric === 'passRate' ? 'default' : 'outline'}
          onClick={() => setMetric('passRate')}
          className={metric === 'passRate' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
        >
          及格率
        </Button>
        <Button 
          size="sm" 
          variant={metric === 'excellentRate' ? 'default' : 'outline'}
          onClick={() => setMetric('excellentRate')}
          className={metric === 'excellentRate' ? 'bg-purple-500 hover:bg-purple-600' : ''}
        >
          优秀率
        </Button>
      </div>
      
      <div className="h-80 w-full">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default SubjectTrendsChart; 