import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// 注册ChartJS组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SubjectPerformanceChartProps {
  data: any[];
  subjectName: string;
}

const SubjectPerformanceChart: React.FC<SubjectPerformanceChartProps> = ({ data, subjectName }) => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // 添加窗口大小监听
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500">暂无{subjectName}学科成绩数据</div>;
  }

  // 提取分数区间数据
  const scoreRanges = data?.[0]?.scoreDistribution || [
    { range: "0-59", count: 0 },
    { range: "60-69", count: 0 },
    { range: "70-79", count: 0 },
    { range: "80-89", count: 0 },
    { range: "90-100", count: 0 },
  ];

  // 针对不同屏幕尺寸调整图表配置
  const isMobile = windowWidth < 768;

  const chartData = {
    labels: scoreRanges.map(range => range.range),
    datasets: [
      {
        label: '学生人数',
        data: scoreRanges.map(range => range.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',   // 不及格 (红)
          'rgba(255, 159, 64, 0.6)',   // 及格 (橙)
          'rgba(255, 206, 86, 0.6)',   // 中等 (黄)
          'rgba(75, 192, 192, 0.6)',   // 良好 (青)
          'rgba(54, 162, 235, 0.6)',   // 优秀 (蓝)
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        display: !isMobile, // 在移动设备上隐藏图例
      },
      title: {
        display: true,
        text: `${subjectName}成绩分布`,
        font: {
          size: isMobile ? 14 : 16, // 移动设备上减小字体
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            const total = scoreRanges.reduce((sum, item) => sum + item.count, 0);
            const percentage = total ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: !isMobile, // 在移动设备上隐藏轴标题
          text: '学生人数'
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12, // 移动设备上减小刻度字体
          }
        }
      },
      x: {
        title: {
          display: !isMobile, // 在移动设备上隐藏轴标题
          text: '分数区间'
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12, // 移动设备上减小刻度字体
          }
        }
      }
    }
  };

  return (
    <div className="h-80 w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default SubjectPerformanceChart; 