import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";

// 引入热图库
import { ResponsiveHeatMapCanvas } from "@nivo/heatmap";

interface KnowledgePointHeatmapProps {
  className?: string;
  title?: string;
  description?: string;
}

interface Student {
  id: string;
  name: string;
  class_id?: string;
  class_name?: string;
}

interface KnowledgePoint {
  id: string;
  name: string;
}

interface ClassInfo {
  id: string;
  name: string;
}

interface MasteryData {
  student_id: string;
  knowledge_point_id: string;
  mastery_level: number;
}

export default function KnowledgePointHeatmap({
  className,
  title = "知识点掌握度热图",
  description = "学生对各知识点的掌握程度",
}: KnowledgePointHeatmapProps) {
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allKnowledgePoints, setAllKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [masteryData, setMasteryData] = useState<MasteryData[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 分页和筛选状态
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState("10");
  const [classFilter, setClassFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  // 获取所有数据
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // 1. 获取知识点列表
        const { data: knowledgePoints, error: kpError } = await supabase
          .from("knowledge_points")
          .select("id, name")
          .order("name");
        
        if (kpError) throw kpError;
        
        if (!knowledgePoints || knowledgePoints.length === 0) {
          setData([]);
          setError("暂无知识点数据");
          return;
        }
        setAllKnowledgePoints(knowledgePoints);
        
        // 2. 获取班级列表
        const { data: classesData, error: classesError } = await supabase
          .from("classes")
          .select("id, name")
          .order("name");
          
        if (classesError) throw classesError;
        setClasses(classesData || []);
        
        // 3. 获取学生列表（包含班级信息）
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("id, name, class_id, classes(name)")
          .order("name");
          
        if (studentsError) throw studentsError;
        
        if (!students || students.length === 0) {
          setData([]);
          setError("暂无学生数据");
          return;
        }
        
        // 处理学生数据，提取班级名称
        const processedStudents = students.map(student => ({
          id: student.id,
          name: student.name,
          class_id: student.class_id,
          class_name: student.classes?.name
        }));
        
        setAllStudents(processedStudents);
        
        // 4. 获取知识点掌握度数据
        const { data: masteryDataResult, error: masteryError } = await supabase
          .from('student_knowledge_mastery')
          .select(`
            student_id,
            knowledge_point_id,
            mastery_level
          `);
          
        if (masteryError) throw masteryError;
        setMasteryData(masteryDataResult || []);
        
      } catch (err: any) {
        console.error("获取知识点热图数据失败:", err);
        setError(`加载失败: ${err.message || "未知错误"}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // 根据筛选条件过滤学生
  useEffect(() => {
    if (allStudents.length === 0) return;
    
    let filtered = [...allStudents];
    
    // 按班级筛选
    if (classFilter !== "all") {
      filtered = filtered.filter(student => student.class_id === classFilter);
    }
    
    // 按名称搜索
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(query)
      );
    }
    
    setFilteredStudents(filtered);
    // 重置到第一页
    setCurrentPage(0);
  }, [allStudents, classFilter, searchQuery]);

  // 根据过滤后的学生和当前页码生成热图数据
  useEffect(() => {
    if (filteredStudents.length === 0 || allKnowledgePoints.length === 0) return;
    
    const pageSizeNumber = parseInt(pageSize, 10);
    const start = currentPage * pageSizeNumber;
    const end = start + pageSizeNumber;
    const pageStudents = filteredStudents.slice(start, end);
    
    // 限制知识点数量为最多10个，避免图表过于拥挤
    const displayKnowledgePoints = allKnowledgePoints.slice(0, 10);
    
    // 为每个学生创建一行数据
    const heatmapData = [];
    for (const student of pageStudents) {
      const rowData = {
        id: student.name + (student.class_name ? ` (${student.class_name})` : ''),
        data: []
      };
      
      // 为每个知识点创建一个单元格
      for (const kp of displayKnowledgePoints) {
        // 查找该学生对该知识点的掌握度
        const mastery = masteryData.find(m => 
          m.student_id === student.id && 
          m.knowledge_point_id === kp.id
        );
        
        rowData.data.push({
          x: kp.name.length > 8 ? kp.name.substring(0, 8) + '...' : kp.name,
          y: mastery ? mastery.mastery_level : 0
        });
      }
      
      heatmapData.push(rowData);
    }
    
    setData(heatmapData);
  }, [filteredStudents, allKnowledgePoints, masteryData, currentPage, pageSize]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {error ? (
            <span className="text-yellow-500">{error}</span>
          ) : (
            description
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        {loading ? (
          <div className="flex flex-col h-[350px] w-full space-y-4 justify-center items-center">
            <Skeleton className="h-[300px] w-full rounded-md" />
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        ) : !allStudents || allStudents.length === 0 || !allKnowledgePoints || allKnowledgePoints.length === 0 ? (
          <div className="flex flex-col h-[350px] w-full space-y-4 justify-center items-center">
            <div className="text-center text-muted-foreground">
              <p>暂无足够数据生成热图</p>
              <p className="text-sm mt-2">请先批改含知识点的作业</p>
            </div>
          </div>
        ) : (
          <>
            {/* 控制面板：筛选器和分页 */}
            <div className="px-6 mb-4 space-y-2">
              {/* 筛选和搜索 */}
              <div className="flex flex-wrap gap-2">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索学生姓名..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9"
                    />
                  </div>
                </div>
                
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="选择班级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有班级</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={pageSize} onValueChange={setPageSize}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="每页显示" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5名学生</SelectItem>
                    <SelectItem value="10">10名学生</SelectItem>
                    <SelectItem value="15">15名学生</SelectItem>
                    <SelectItem value="20">20名学生</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 分页导航 */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {filteredStudents.length > 0 ? 
                    `共 ${filteredStudents.length} 名学生` : 
                    '没有符合条件的学生'
                  }
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(0, p-1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>
                  
                  <span className="text-sm">
                    第 {currentPage+1} / {Math.max(1, Math.ceil(filteredStudents.length / parseInt(pageSize, 10)))} 页
                  </span>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => p+1)}
                    disabled={currentPage >= Math.ceil(filteredStudents.length / parseInt(pageSize, 10))-1 || filteredStudents.length === 0}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* 热图 */}
            <div className="h-[350px] w-full">
              {data.length > 0 ? (
                <ResponsiveHeatMapCanvas
                  data={data}
                  margin={{ top: 60, right: 90, bottom: 60, left: 90 }}
                  valueFormat=">-.2s"
                  axisTop={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: "知识点",
                    legendOffset: -45,
                  }}
                  axisRight={null}
                  axisBottom={null}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "学生",
                    legendPosition: "middle",
                    legendOffset: -72,
                  }}
                  colors={{
                    type: "sequential",
                    scheme: "blues",
                    minValue: 0,
                    maxValue: 100,
                  }}
                  emptyColor="#eeeeee"
                  legends={[
                    {
                      anchor: "right",
                      translateX: 30,
                      translateY: 0,
                      length: 200,
                      thickness: 10,
                      direction: "column",
                      tickPosition: "after",
                      tickSize: 3,
                      tickSpacing: 4,
                      tickOverlap: false,
                      tickFormat: ">-.2s",
                      title: "掌握度",
                      titleAlign: "start",
                      titleOffset: 4,
                    },
                  ]}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">当前筛选条件下没有学生数据</p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 