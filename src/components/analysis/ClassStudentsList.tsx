
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Search, User } from "lucide-react";

// 模拟班级学生数据
const generateStudentData = (classId: string, className: string, count: number) => {
  const students = [];
  const subjects = ["语文", "数学", "英语", "物理", "化学", "生物"];
  
  for (let i = 1; i <= count; i++) {
    const studentId = `${classId}-${i.toString().padStart(3, '0')}`;
    const randomScore = () => Math.floor(70 + Math.random() * 30);
    
    // 为每个学生生成各科成绩
    const subjectScores = {};
    let totalScore = 0;
    
    subjects.forEach(subject => {
      const score = randomScore();
      subjectScores[subject] = score;
      totalScore += score;
    });
    
    // 计算平均分
    const averageScore = (totalScore / subjects.length).toFixed(1);
    
    // 生成成绩变化趋势 (正数表示上升，负数表示下降)
    const trend = (Math.random() * 10 - 5).toFixed(1);
    
    students.push({
      studentId,
      name: `学生${i}`,
      className,
      averageScore: parseFloat(averageScore),
      subjectScores,
      trend: parseFloat(trend)
    });
  }
  
  return students;
};

interface ClassStudentsListProps {
  classId: string;
  className: string;
  studentCount: number;
}

const ClassStudentsList: React.FC<ClassStudentsListProps> = ({ 
  classId,
  className,
  studentCount
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "averageScore">("averageScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  const students = generateStudentData(classId, className, studentCount);
  
  // 搜索和排序学生
  const filteredStudents = students
    .filter(student => 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      student.studentId.includes(searchQuery)
    )
    .sort((a, b) => {
      if (sortField === "name") {
        return sortDirection === "asc" 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        return sortDirection === "asc"
          ? a.averageScore - b.averageScore
          : b.averageScore - a.averageScore;
      }
    });
  
  const handleSort = (field: "name" | "averageScore") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{className}学生列表</CardTitle>
        <CardDescription>班级共有 {studentCount} 名学生</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索学生姓名或学号..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">学号</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                  <div className="flex items-center">
                    姓名
                    {sortField === "name" && (
                      sortDirection === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("averageScore")}>
                  <div className="flex items-center">
                    平均分
                    {sortField === "averageScore" && (
                      sortDirection === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>趋势</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell className="font-medium">{student.studentId}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>
                    <span className={student.averageScore >= 85 ? "text-green-600 font-medium" : ""}>
                      {student.averageScore}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={
                      student.trend > 0 
                        ? "text-green-600" 
                        : student.trend < 0 
                          ? "text-red-600" 
                          : ""
                    }>
                      {student.trend > 0 ? `+${student.trend}` : student.trend}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/student-profile/${student.studentId}`}>
                        <User className="h-4 w-4 mr-1" />
                        查看
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {filteredStudents.length === 0 && (
          <div className="flex justify-center items-center h-24 text-muted-foreground">
            未找到匹配的学生
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link to="/student-management">查看所有学生</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ClassStudentsList;
