import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExamData {
  examName: string;
  classAvg: number;
  gradeAvg: number;
}

interface ClassTrendChartProps {
  className: string;
  mockData?: ExamData[]; // 重命名参数以避免与内部状态混淆
}

// 重试函数
const fetchWithRetry = async (fetchFn: () => Promise<any>, maxRetries = 3, delay = 1000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error;
      console.log(`请求失败，${i + 1}/${maxRetries}次重试`, error);
      
      // 指数退避延迟
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw lastError;
};

const ClassTrendChart: React.FC<ClassTrendChartProps> = ({ className, mockData = [] }) => {
  const [chartData, setChartData] = useState<ExamData[]>([]);
  const [isLoading, setIsLoading] = useState(false); // 默认为false，只在需要加载时设为true
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const isLoadingRef = useRef(false); // 防止并发请求的标志
  const hasSetData = useRef(false); // 新增标志，表示是否已经设置过数据

  // 缓存数据
  const cacheKey = `classTrend_${className}`;
  const getCachedData = () => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // 缓存24小时有效
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return data;
        }
      }
    } catch (e) {
      console.warn('读取缓存失败', e);
    }
    return null;
  };

  const setCacheData = (data: ExamData[]) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('写入缓存失败', e);
    }
  };

  // 使用useMemo处理数据，避免重复计算
  const memoizedMockData = useMemo(() => mockData, [JSON.stringify(mockData)]);

  useEffect(() => {
    // 组件卸载时清理标志
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // 如果参数提供了mockData且有数据，直接使用
    if (memoizedMockData.length > 0) {
      setChartData(memoizedMockData);
      hasSetData.current = true;
      return;
    }

    // 如果已经设置过数据，不再重复加载
    if (hasSetData.current || chartData.length > 0) {
      return;
    }

    // 尝试从缓存加载
    const cachedData = getCachedData();
    if (cachedData && cachedData.length > 0) {
      setChartData(cachedData);
      hasSetData.current = true;
      return;
    }

    // 已经在加载中，防止重复请求
    if (isLoadingRef.current) {
      return;
    }

    const fetchClassTrends = async () => {
      if (!isMounted.current) return;
      
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      try {
        // 使用重试函数获取班级ID
        const classData = await fetchWithRetry(async () => {
          const { data, error } = await supabase
            .from('classes')
            .select('id')
            .eq('name', className)
            .maybeSingle();
          
          if (error) throw error;
          return data;
        });
        
        if (!classData) {
          console.log("未找到班级:", className);
          if (isMounted.current) {
            setChartData([]);
            hasSetData.current = true;
            setIsLoading(false);
          }
          return;
        }
        
        const classId = classData.id;
        
        // 使用重试函数获取班级学生ID
        const studentData = await fetchWithRetry(async () => {
          const { data, error } = await supabase
            .from('students')
            .select('id')
            .eq('class_id', classId);
          
          if (error) throw error;
          return data;
        });
        
        if (!studentData || studentData.length === 0) {
          console.log("班级没有学生:", className);
          if (isMounted.current) {
            setChartData([]);
            hasSetData.current = true;
            setIsLoading(false);
          }
          return;
        }
        
        const studentIds = studentData.map(s => s.id);
        
        // 使用重试函数获取所有考试类型和日期
        const examsData = await fetchWithRetry(async () => {
          const { data, error } = await supabase
            .from('grades')
            .select('exam_type, exam_date')
            .not('exam_type', 'is', null)
            .not('exam_date', 'is', null)
            .order('exam_date', { ascending: true });
          
          if (error) throw error;
          return data;
        });
        
        // 获取每次考试的班级平均分和年级平均分
        const uniqueExams = new Map<string, { type: string, date: string }>();
        examsData?.forEach(item => {
          if (item.exam_type && item.exam_date) {
            const key = `${item.exam_type}-${item.exam_date}`;
            uniqueExams.set(key, { type: item.exam_type, date: item.exam_date });
          }
        });
        
        // 限制同时进行的请求数量
        const batchSize = 2; // 每批次处理的请求数
        const uniqueExamsArray = Array.from(uniqueExams.values());
        const results: ExamData[] = [];
        
        // 分批处理请求
        for (let i = 0; i < uniqueExamsArray.length; i += batchSize) {
          const batch = uniqueExamsArray.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async ({ type, date }) => {
              try {
                // 获取班级平均分
                const classScores = await fetchWithRetry(async () => {
                  const { data, error } = await supabase
                    .from('grades')
                    .select('score')
                    .in('student_id', studentIds)
                    .eq('exam_type', type)
                    .eq('exam_date', date);
                  
                  if (error) throw error;
                  return data;
                });
                
                // 获取年级平均分
                const gradeScores = await fetchWithRetry(async () => {
                  const { data, error } = await supabase
                    .from('grades')
                    .select('score')
                    .eq('exam_type', type)
                    .eq('exam_date', date);
                  
                  if (error) throw error;
                  return data;
                });
                
                const classAvg = classScores?.length
                  ? classScores.reduce((sum, item) => sum + item.score, 0) / classScores.length
                  : 0;
                  
                const gradeAvg = gradeScores?.length
                  ? gradeScores.reduce((sum, item) => sum + item.score, 0) / gradeScores.length
                  : 0;
                
                return {
                  examName: type,
                  classAvg: parseFloat(classAvg.toFixed(1)),
                  gradeAvg: parseFloat(gradeAvg.toFixed(1))
                };
              } catch (error) {
                console.error(`获取${type}考试数据失败:`, error);
                // 返回空数据而非抛出错误，保证其他数据仍能显示
                return {
                  examName: type,
                  classAvg: 0,
                  gradeAvg: 0
                };
              }
            })
          );
          
          results.push(...batchResults);
          
          // 每批次请求后短暂暂停，避免资源占用过高
          if (i + batchSize < uniqueExamsArray.length) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        
        if (isMounted.current) {
          setChartData(results);
          hasSetData.current = true;
          // 缓存结果
          setCacheData(results);
        }
      } catch (error) {
        console.error("获取班级趋势数据失败:", error);
        if (isMounted.current) {
          setError("加载数据失败，请刷新页面重试");
          toast.error("加载班级趋势数据失败", {
            description: "请稍后再试或刷新页面",
            duration: 3000
          });
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
        isLoadingRef.current = false;
      }
    };
    
    // 仅在需要时获取数据
    fetchClassTrends();
    
  // 依赖数组中不再包含trendData，避免每次渲染都触发
  }, [className, memoizedMockData]);
  
  // 渲染简化版本，避免不必要的渲染
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">加载中...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-red-500">{error}</p>
        </div>
      );
    }
    
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">暂无班级考试数据</p>
        </div>
      );
    }
    
    return (
      <ChartContainer config={{
        classAvg: { color: "#B9FF66" },
        gradeAvg: { color: "#8884d8" }
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="examName" />
            <YAxis domain={[70, 100]} />
            <Tooltip 
              formatter={(value) => [`${value} 分`, ""]}
              labelFormatter={(label) => `考试: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="classAvg" 
              name={`${className}平均分`} 
              stroke="#B9FF66" 
              strokeWidth={2} 
              dot={{ r: 4 }} 
              activeDot={{ r: 6 }} 
            />
            <Line 
              type="monotone" 
              dataKey="gradeAvg" 
              name="年级平均分" 
              stroke="#8884d8" 
              strokeWidth={2} 
              dot={{ r: 4 }} 
              activeDot={{ r: 6 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  };
  
  // 不再为卡片添加额外的状态，只需复用一次内容
  return (
    <div className="h-[320px]">
      {renderContent()}
    </div>
  );
};

export default ClassTrendChart;
