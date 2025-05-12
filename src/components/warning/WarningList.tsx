import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Filter, AlertTriangle } from "lucide-react";

// 导入学生画像组件
import StudentWarningProfile from "./StudentWarningProfile";

// 模拟数据 - 在实际应用中应从API获取
const students = [
  {
    uuid: "student-uuid-001",
    name: "张三",
    avatarUrl: "",
    class: "高一(3)班",
    warningLevel: "high",
    warningTypes: ["成绩", "出勤"],
    latestWarningDate: "2023-11-12",
    details: "语文、数学成绩下降超过20%，连续缺勤3次"
  },
  {
    uuid: "student-uuid-002",
    name: "李四",
    avatarUrl: "",
    class: "高一(2)班",
    warningLevel: "medium",
    warningTypes: ["作业"],
    latestWarningDate: "2023-11-14",
    details: "上周作业完成率低于60%"
  },
  {
    uuid: "student-uuid-003",
    name: "王五",
    avatarUrl: "",
    class: "高一(1)班",
    warningLevel: "medium",
    warningTypes: ["成绩"],
    latestWarningDate: "2023-11-10",
    details: "数学月考成绩下降超过15%"
  },
  {
    uuid: "student-uuid-004",
    name: "赵六",
    avatarUrl: "",
    class: "高一(3)班",
    warningLevel: "low",
    warningTypes: ["出勤"],
    latestWarningDate: "2023-11-09",
    details: "本月迟到3次"
  },
  {
    uuid: "student-uuid-005",
    name: "孙七",
    avatarUrl: "",
    class: "高一(2)班",
    warningLevel: "high",
    warningTypes: ["成绩", "作业", "行为"],
    latestWarningDate: "2023-11-15",
    details: "本学期成绩持续下降，作业完成率低，课堂参与度低"
  }
];

const WarningBadge = ({ level }: { level: string }) => {
  const colorMap: Record<string, string> = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-blue-100 text-blue-800 border-blue-200"
  };
  
  const textMap: Record<string, string> = {
    high: "高风险",
    medium: "中风险",
    low: "低风险"
  };
  
  return (
    <Badge variant="outline" className={`${colorMap[level]} border`}>
      {textMap[level]}
    </Badge>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const colorMap: Record<string, string> = {
    "成绩": "bg-purple-100 text-purple-800 border-purple-200",
    "出勤": "bg-blue-100 text-blue-800 border-blue-200",
    "作业": "bg-green-100 text-green-800 border-green-200",
    "行为": "bg-orange-100 text-orange-800 border-orange-200"
  };
  
  return (
    <Badge variant="outline" className={`${colorMap[type]} border mr-1`}>
      {type}
    </Badge>
  );
};

const WarningList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  
  // 新增状态用于学生画像模态框
  const [selectedStudentUuid, setSelectedStudentUuid] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleOpenProfileModal = (studentUuid: string) => {
    setSelectedStudentUuid(studentUuid);
    setIsProfileModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedStudentUuid(null); // 清理选中的学生
  };
  
  // 过滤逻辑
  const filteredStudents = students.filter(student => {
    // 搜索名字
    const matchesSearch = student.name.includes(searchTerm);
    
    // 过滤班级
    const matchesClass = filterClass === "all" || student.class === filterClass;
    
    // 过滤风险等级
    const matchesLevel = filterLevel === "all" || student.warningLevel === filterLevel;
    
    return matchesSearch && matchesClass && matchesLevel;
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center">
          <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
          学生预警列表
        </CardTitle>
        <CardDescription>
          显示所有具有预警状态的学生，可根据班级、风险等级和姓名进行筛选
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索学生姓名..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="班级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有班级</SelectItem>
                <SelectItem value="高一(1)班">高一(1)班</SelectItem>
                <SelectItem value="高一(2)班">高一(2)班</SelectItem>
                <SelectItem value="高一(3)班">高一(3)班</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[160px]">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <SelectValue placeholder="风险等级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有等级</SelectItem>
                <SelectItem value="high">高风险</SelectItem>
                <SelectItem value="medium">中风险</SelectItem>
                <SelectItem value="low">低风险</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>学生</TableHead>
                <TableHead>班级</TableHead>
                <TableHead>风险等级</TableHead>
                <TableHead>预警类型</TableHead>
                <TableHead>最近预警日期</TableHead>
                <TableHead>详情</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow 
                    key={student.uuid}
                    onClick={() => handleOpenProfileModal(student.uuid)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={student.avatarUrl} />
                          <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {student.name}
                      </div>
                    </TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>
                      <WarningBadge level={student.warningLevel} />
                    </TableCell>
                    <TableCell>
                      {student.warningTypes.map((type, index) => (
                        <TypeBadge key={index} type={type} />
                      ))}
                    </TableCell>
                    <TableCell>{student.latestWarningDate}</TableCell>
                    <TableCell className="max-w-[250px] truncate" title={student.details}>
                      {student.details}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">查看</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    没有找到符合条件的学生
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <StudentWarningProfile 
        studentUuid={selectedStudentUuid}
        isOpen={isProfileModalOpen}
        onOpenChange={handleCloseProfileModal}
      />
    </Card>
  );
};

export default WarningList;
