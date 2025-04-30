import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import OverviewTab from "@/components/class/OverviewTab";
import ComparisonTab from "@/components/class/ComparisonTab";
import DetailTab from "@/components/class/DetailTab";
import { 
  getAllClasses, 
  getClassById, 
  deleteClass,
  getClassStudents,
  getClassHomeworks 
} from "@/services/classService";
import { toast } from "sonner";
import { 
  PlusCircle,
  Pencil,
  Trash2, 
  AlertCircle,
  Users
} from "lucide-react";
import CreateClassDialog from "@/components/class/CreateClassDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface Class {
  id: string;
  name: string;
  grade: string;
  created_at?: string;
}

const ClassManagement: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = React.useState("overview");
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = React.useState<Class | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [studentsCount, setStudentsCount] = React.useState<Record<string, number>>({});
  const [homeworksCount, setHomeworksCount] = React.useState<Record<string, number>>({});
  
  // 对话框状态
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [classToEdit, setClassToEdit] = React.useState<Class | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [classToDelete, setClassToDelete] = React.useState<Class | null>(null);

  const competencyData = [
    { name: "知识理解", current: 85, average: 78, fullScore: 100 },
    { name: "应用能力", current: 76, average: 70, fullScore: 100 },
    { name: "分析能力", current: 68, average: 65, fullScore: 100 },
    { name: "创新思维", current: 72, average: 62, fullScore: 100 },
    { name: "表达能力", current: 80, average: 75, fullScore: 100 },
    { name: "合作学习", current: 88, average: 82, fullScore: 100 },
  ];

  const correlationData = [
    { name: "学生A", xValue: 85, yValue: 90, zValue: 75, subject: "语文" },
    { name: "学生B", xValue: 78, yValue: 82, zValue: 85, subject: "语文" },
    { name: "学生C", xValue: 92, yValue: 85, zValue: 65, subject: "语文" },
    { name: "学生D", xValue: 65, yValue: 75, zValue: 90, subject: "数学" },
    { name: "学生E", xValue: 72, yValue: 68, zValue: 78, subject: "数学" },
    { name: "学生F", xValue: 83, yValue: 77, zValue: 82, subject: "数学" },
  ];

  const scoreDistributionData = [
    { range: "90-100分", count: 12, color: "#8884d8" },
    { range: "80-89分", count: 18, color: "#82ca9d" },
    { range: "70-79分", count: 15, color: "#ffc658" },
    { range: "60-69分", count: 8, color: "#ff8042" },
    { range: "60分以下", count: 3, color: "#ff6347" }
  ];

  // 获取班级列表
  const fetchClasses = async () => {
    setLoading(true);
    try {
      const classesData = await getAllClasses();
      setClasses(classesData);
      
      if (classesData.length > 0) {
        // 如果当前没有选中班级，则选中第一个
        if (!selectedClass) {
          setSelectedClass(classesData[0]);
        } else {
          // 如果有选中班级，找到更新后的版本
          const updated = classesData.find(c => c.id === selectedClass.id);
          if (updated) {
            setSelectedClass(updated);
          } else {
            setSelectedClass(classesData[0]);
          }
        }
        
        // 获取每个班级的学生和作业数量
        const studentCountsData: Record<string, number> = {};
        const homeworkCountsData: Record<string, number> = {};
        
        for (const classItem of classesData) {
          const students = await getClassStudents(classItem.id);
          const homeworks = await getClassHomeworks(classItem.id);
          
          studentCountsData[classItem.id] = students.length;
          homeworkCountsData[classItem.id] = homeworks.length;
        }
        
        setStudentsCount(studentCountsData);
        setHomeworksCount(homeworkCountsData);
      }
    } catch (error) {
      console.error('获取班级列表失败:', error);
      toast.error('获取班级列表失败');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchClasses();
  }, []);

  // 编辑班级
  const handleEditClass = (classData: Class) => {
    setClassToEdit(classData);
    setCreateDialogOpen(true);
  };

  // 删除班级
  const handleDeleteClass = (classData: Class) => {
    setClassToDelete(classData);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!classToDelete) return;
    
    try {
      const success = await deleteClass(classToDelete.id);
      if (success) {
        toast.success('班级删除成功');
        fetchClasses();
      }
    } catch (error) {
      console.error('删除班级失败:', error);
      toast.error('删除班级失败');
    } finally {
      setDeleteDialogOpen(false);
      setClassToDelete(null);
    }
  };

  // 添加跳转到学生管理的函数
  const handleViewStudents = (classId: string, className: string) => {
    navigate(`/student-management?classId=${classId}&className=${encodeURIComponent(className)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">班级管理</h1>
          <Button onClick={() => {
            setClassToEdit(null);
            setCreateDialogOpen(true);
          }}>
            <PlusCircle className="h-4 w-4 mr-2" />
            新建班级
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-muted-foreground">加载班级数据中...</p>
            </div>
          </div>
        ) : classes.length === 0 ? (
          <Card className="bg-muted/50">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">还没有班级数据</p>
              <p className="text-muted-foreground mb-4">点击"新建班级"按钮创建你的第一个班级</p>
              <Button onClick={() => {
                setClassToEdit(null);
                setCreateDialogOpen(true);
              }}>
                <PlusCircle className="h-4 w-4 mr-2" />
                新建班级
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {classes.map((classData) => (
                <Card key={classData.id} className={`hover:shadow-md transition-shadow ${selectedClass?.id === classData.id ? 'border-primary' : ''}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{classData.name}</CardTitle>
                    <CardDescription>{classData.grade}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">学生人数:</span>
                        <span className="font-medium">{studentsCount[classData.id] || 0}人</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">作业数量:</span>
                        <span className="font-medium">{homeworksCount[classData.id] || 0}个</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedClass(classData)}
                      >
                        {selectedClass?.id === classData.id ? '当前选中' : '查看详情'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewStudents(classData.id, classData.name)}
                        className="flex items-center gap-1"
                      >
                        <Users className="h-3 w-3" />
                        学生管理
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClass(classData)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClass(classData)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {selectedClass && (
              <Tabs defaultValue="overview" className="space-y-6" value={selectedTab} onValueChange={setSelectedTab}>
                <div className="flex justify-between items-center mb-2">
                  <TabsList className="grid w-full max-w-[600px] grid-cols-3 gap-4">
                    <TabsTrigger value="overview">班级总览</TabsTrigger>
                    <TabsTrigger value="comparison">班级对比</TabsTrigger>
                    <TabsTrigger value="detail">班级详情</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="overview">
                  <OverviewTab mockClasses={classes} />
                </TabsContent>

                <TabsContent value="comparison">
                  <ComparisonTab />
                </TabsContent>

                <TabsContent value="detail">
                  <DetailTab 
                    selectedClass={{
                      id: selectedClass.id,
                      className: selectedClass.name,
                      studentCount: studentsCount[selectedClass.id] || 0,
                      avgScore: 85.7,
                      passRate: 97.6,
                      topStudents: ["张三", "李四", "王五"],
                      subjectScores: [
                        { subject: "语文", score: 87.5, fullmarks: 5 },
                        { subject: "数学", score: 84.2, fullmarks: 8 },
                        { subject: "英语", score: 88.1, fullmarks: 6 },
                        { subject: "物理", score: 82.6, fullmarks: 3 },
                        { subject: "化学", score: 86.3, fullmarks: 4 },
                        { subject: "生物", score: 85.4, fullmarks: 2 }
                      ],
                      competencies: [
                        { name: "知识掌握", value: 85 },
                        { name: "解题能力", value: 83 },
                        { name: "创新思维", value: 75 },
                        { name: "团队协作", value: 90 },
                        { name: "学习态度", value: 88 }
                      ]
                    }}
                    competencyData={competencyData}
                    correlationData={correlationData}
                    scoreDistributionData={scoreDistributionData}
                  />
                </TabsContent>
              </Tabs>
            )}
          </>
        )}

        {/* 创建/编辑班级对话框 */}
        <CreateClassDialog 
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onClassCreated={fetchClasses}
          classToEdit={classToEdit}
        />

        {/* 删除确认对话框 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除班级</AlertDialogTitle>
              <AlertDialogDescription>
                此操作不可撤销。班级将从系统中永久删除。
                {classToDelete && (
                  <div className="mt-2 p-2 bg-muted rounded-md">
                    <p><strong>班级名称:</strong> {classToDelete.name}</p>
                    <p><strong>年级:</strong> {classToDelete.grade}</p>
                    {studentsCount[classToDelete.id] > 0 && (
                      <p className="text-destructive mt-2">
                        警告：该班级有 {studentsCount[classToDelete.id]} 名学生和 {homeworksCount[classToDelete.id]} 个作业记录将一并删除。
                      </p>
                    )}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default ClassManagement;
