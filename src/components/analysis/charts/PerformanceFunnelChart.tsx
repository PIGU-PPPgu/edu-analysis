/**
 * 📉 绩效漏斗图
 * 显示从优秀到待提高的学生分布
 */

import React, { useMemo } from "react";
import {
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export interface FunnelLevel {
  level: string;
  count: number;
  percentage: number;
  scoreRange?: string;
}

interface PerformanceFunnelChartProps {
  data: FunnelLevel[];
  title?: string;
  height?: number;
}

const PerformanceFunnelChart: React.FC<PerformanceFunnelChartProps> = ({
  data,
  title,
  height = 600,
}) => {
  // 系统Neobrutalism配色 - 严格按照数据顺序（优秀、良好、中等、待提高）
  const colors = [
    "#B9FF66", // data[0] 优秀 - 荧光绿
    "#4ECDC4", // data[1] 良好 - 青色
    "#FFD93D", // data[2] 中等 - 黄色
    "#FF6B6B", // data[3] 待提高 - 红色
  ];

  // 计算总人数
  const totalCount = useMemo(() => {
    return data.reduce((sum, item) => sum + item.count, 0);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#191A23]/50">
        暂无数据
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="font-bold text-lg text-[#191A23] mb-4">{title}</h3>
      )}

      <div className="flex gap-8 items-center justify-center">
        {/* 漏斗图 */}
        <div style={{ width: "40%", minWidth: "300px", maxWidth: "450px" }}>
          <ResponsiveContainer width="100%" height={height}>
            <FunnelChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "2px solid #191A23",
                  borderRadius: "8px",
                  boxShadow: "4px 4px 0px 0px #191A23",
                }}
                labelStyle={{ fontWeight: "bold", color: "#191A23" }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const data = payload[0].payload;
                  return (
                    <div
                      className="bg-white border-2 border-[#191A23] rounded-lg p-3"
                      style={{ boxShadow: "4px 4px 0px 0px #191A23" }}
                    >
                      <p className="font-bold text-[#191A23] mb-1">
                        {data.level}
                      </p>
                      {data.scoreRange && (
                        <p className="text-sm text-[#191A23]/70 mb-1">
                          分数段: {data.scoreRange}
                        </p>
                      )}
                      <p className="text-sm">
                        <span className="font-semibold">人数:</span>{" "}
                        {data.count} 人
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">占比:</span>{" "}
                        {data.percentage.toFixed(1)}%
                      </p>
                    </div>
                  );
                }}
              />

              <Funnel
                dataKey="count"
                data={data}
                isAnimationActive
                stroke="#191A23"
                strokeWidth={3}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        {/* 右侧数据面板 */}
        <div
          className="flex flex-col"
          style={{ height: height, position: "relative" }}
        >
          {data.map((item, index) => {
            // 根据漏斗形状计算每层的垂直中心位置（百分比）
            // 漏斗从上到下：优秀(小)、良好、中等、待提高(大)
            const positions = [
              15, // 优秀 - 顶部15%
              35, // 良好 - 35%
              58, // 中等 - 58%
              80, // 待提高 - 80%
            ];

            return (
              <div
                key={index}
                className="flex items-center absolute"
                style={{
                  top: `${positions[index]}%`,
                  transform: "translateY(-50%)",
                }}
              >
                {/* 连接线 */}
                <div
                  className="h-0.5 bg-[#191A23]"
                  style={{
                    width: "56px",
                    marginRight: "16px",
                  }}
                />
                {/* 数据卡片 */}
                <div
                  className="p-2.5 rounded-lg border-2 border-[#191A23] shadow-[4px_4px_0px_0px_#191A23]"
                  style={{
                    backgroundColor: colors[index],
                    minWidth: "160px",
                    maxWidth: "160px",
                  }}
                >
                  <div className="text-sm font-black text-[#191A23]">
                    {item.level}
                  </div>
                  {item.scoreRange && (
                    <div className="text-[10px] text-[#191A23]/70 font-bold leading-tight">
                      {item.scoreRange}
                    </div>
                  )}
                  <div className="text-3xl font-black text-[#191A23] mt-1 leading-none">
                    {item.count}
                    <span className="text-base ml-0.5">人</span>
                  </div>
                  <div className="text-sm text-[#191A23]/80 font-black leading-tight">
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部总计 */}
      <div className="flex justify-center mt-10 mb-8">
        <div className="p-3 border-2 border-[#191A23] rounded-lg shadow-[4px_4px_0px_0px_#191A23] bg-white">
          <span className="text-sm font-bold text-[#191A23]/70">总计: </span>
          <span className="text-2xl font-black text-[#191A23]">
            {totalCount}
          </span>
          <span className="text-sm font-bold text-[#191A23]/70 ml-1">人</span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceFunnelChart;
