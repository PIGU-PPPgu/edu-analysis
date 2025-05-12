import React, { useMemo } from 'react';
import { HeatMapGrid } from 'react-grid-heatmap';

interface KnowledgePoint {
  id: string;
  name: string;
  category: string;
  masteryRate: number;
}

interface KnowledgePointsHeatmapProps {
  data: KnowledgePoint[];
  subjectName: string;
}

const KnowledgePointsHeatmap: React.FC<KnowledgePointsHeatmapProps> = ({ data, subjectName }) => {
  const { categories, points, heatmapData } = useMemo(() => {
    if (!data || data.length === 0) {
      return { categories: [], points: [], heatmapData: [] };
    }
    
    // 提取所有类别
    const uniqueCategories = Array.from(new Set(data.map(point => point.category)));
    
    // 按类别分组知识点
    const pointsByCategory = uniqueCategories.map(category => 
      data.filter(point => point.category === category)
    );
    
    // 获取每个类别中的最大知识点数量
    const maxPointsInCategory = Math.max(...pointsByCategory.map(points => points.length));
    
    // 构建热力图数据
    const heatmapData = uniqueCategories.map(category => {
      const categoryPoints = data.filter(point => point.category === category);
      // 填充数组以确保每行长度一致
      const row = Array(maxPointsInCategory).fill(0).map((_, index) => {
        if (index < categoryPoints.length) {
          return categoryPoints[index].masteryRate / 100; // 归一化到0-1
        }
        return null; // 空白单元格
      });
      return row;
    });
    
    // 提取所有知识点名称，按类别分组
    const pointNames = pointsByCategory.map(categoryPoints => 
      categoryPoints.map(point => point.name)
    );
    
    // 填充知识点名称数组，使每行长度一致
    const normalizedPointNames = pointNames.map(row => {
      if (row.length < maxPointsInCategory) {
        return [...row, ...Array(maxPointsInCategory - row.length).fill('')];
      }
      return row;
    });
    
    // 展平为单一数组
    const allPointNames = normalizedPointNames.reduce((acc, val) => acc.concat(val), []);
    
    return { 
      categories: uniqueCategories, 
      points: allPointNames,
      heatmapData
    };
  }, [data]);
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        暂无{subjectName}学科知识点掌握数据
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">掌握度</span>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500">低</span>
            <div className="w-24 h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded"></div>
            <span className="text-xs text-gray-500">高</span>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <HeatMapGrid
            data={heatmapData}
            xLabels={points.filter(p => p !== '')}
            yLabels={categories}
            cellHeight="40px"
            cellRender={(x, y, value) => {
              // 处理空单元格
              if (value === null) return <div></div>;
              
              // 根据掌握度设置颜色
              const bgColor = getColorByValue(value);
              
              return (
                <div
                  className="w-full h-full flex items-center justify-center text-xs font-medium"
                  style={{ 
                    backgroundColor: bgColor,
                    color: value > 0.6 ? '#1a2e05' : '#fff'
                  }}
                >
                  {Math.round(value * 100)}%
                </div>
              );
            }}
            xLabelsStyle={() => ({
              fontSize: '0.75rem',
              lineHeight: '1rem',
              padding: '0.5rem 0.25rem',
              textAlign: 'center',
              wordBreak: 'break-word',
              maxWidth: '120px',
              whiteSpace: 'normal'
            })}
            yLabelsStyle={() => ({
              fontSize: '0.75rem',
              fontWeight: '600',
              textAlign: 'right',
              paddingRight: '0.5rem'
            })}
            cellStyle={() => ({
              border: '1px solid #ddd'
            })}
          />
        </div>
      </div>
    </div>
  );
};

// 根据掌握度值获取颜色
const getColorByValue = (value: number): string => {
  if (value < 0.3) {
    return '#ef4444'; // red-500
  } else if (value < 0.6) {
    return '#f59e0b'; // amber-500
  } else if (value < 0.8) {
    return '#84cc16'; // lime-500
  } else {
    return '#22c55e'; // green-500
  }
};

export default KnowledgePointsHeatmap; 