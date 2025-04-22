
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StudentList from "@/components/analysis/StudentList";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import Navbar from "@/components/analysis/Navbar";
import { toast } from "sonner";

interface Student {
  studentId: string;
  name: string;
  className: string;
  averageScore: number;
}

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        
        // Mock student data for development
        const mockStudents: Student[] = [
          { studentId: "S001", name: "张三", className: "高三一班", averageScore: 85.5 },
          { studentId: "S002", name: "李四", className: "高三一班", averageScore: 92.0 },
          { studentId: "S003", name: "王五", className: "高三二班", averageScore: 78.5 },
          { studentId: "S004", name: "赵六", className: "高三二班", averageScore: 88.0 },
          { studentId: "S005", name: "钱七", className: "高三三班", averageScore: 91.5 },
        ];
        
        setStudents(mockStudents);
        
        // In production, this would use:
        // const data = await db.getStudents();
        // if (data) {
        //   const formattedData = data.map((student) => ({
        //     studentId: student.student_id,
        //     name: student.name,
        //     className: student.class_name,
        //     averageScore: student.average_score || 0,
        //   }));
        //   setStudents(formattedData);
        // }
      } catch (error) {
        console.error('获取学生数据失败:', error);
        toast.error('获取学生数据失败');
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">学生管理</h1>
          <Button asChild>
            <Link to="/class-management">
              <Users className="mr-2 h-4 w-4" />
              查看班级管理
            </Link>
          </Button>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>学生列表</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">正在加载学生数据...</div>
            ) : students.length > 0 ? (
              <StudentList students={students} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                暂无学生数据。请先添加学生信息或导入Excel文件。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentManagement;
