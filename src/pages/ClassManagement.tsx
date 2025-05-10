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
  Users,
  ChartPieIcon,
  FileBarChart,
  Eye
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
        if (!selectedClass || !classesData.find(c => c.id === selectedClass.id)) {
          setSelectedClass(classesData[0]);
        }
        
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
        if (selectedClass?.id === classToDelete.id) {
          setSelectedClass(null); // 如果删除的是当前选中的班级，则清空选择
        }
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

  const handleViewStudents = (classId: string, className: string) => {
    navigate(`/student-management?classId=${classId}&className=${encodeURIComponent(className)}`);
  };

  const handleViewClassProfile = (classId: string) => {
    navigate(`/class-profile/${classId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-black">班级管理</h1>
          <Button 
            onClick={() => {
              setClassToEdit(null);
              setCreateDialogOpen(true);
            }}
            className="bg-[#9cff57] hover:bg-[#84d64a] text-black border-none"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            新建班级
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-[#9cff57] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">加载班级数据中...</p>
            </div>
          </div>
        ) : classes.length === 0 ? (
          <Card className="bg-white border border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-xl font-medium text-black mb-2">暂无班级数据</p>
              <p className="text-gray-600 mb-6">点击下方按钮，开始创建您的第一个班级吧！</p>
              <Button 
                onClick={() => {
                  setClassToEdit(null);
                  setCreateDialogOpen(true);
                }}
                className="bg-[#9cff57] hover:bg-[#84d64a] text-black border-none"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                新建班级
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {classes.map((classData) => (
                <Card 
                  key={classData.id} 
                  className={`bg-white border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden ${selectedClass?.id === classData.id ? 'border-[#9cff57] border-2' : ''}`}
                >
                  <div className={`h-1 w-full ${selectedClass?.id === classData.id ? 'bg-[#9cff57]' : 'bg-gray-300'}`}></div>
                  <CardHeader className="pt-5 pb-3">
                    <CardTitle className="text-xl font-bold text-black">{classData.name}</CardTitle>
                    <CardDescription className="text-gray-500">{classData.grade}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">学生人数:</span>
                      <span className="font-semibold text-black">{studentsCount[classData.id] || 0}人</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">作业数量:</span>
                      <span className="font-semibold text-black">{homeworksCount[classData.id] || 0}个</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col items-stretch gap-2 pt-3 border-t border-gray-100 p-4">
                    <Button 
                      variant={selectedClass?.id === classData.id ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setSelectedClass(classData)}
                      className={`w-full ${selectedClass?.id === classData.id ? 'bg-[#9cff57] hover:bg-[#84d64a] text-black border-none' : 'border-black text-black hover:bg-gray-100'}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {selectedClass?.id === classData.id ? '当前查看' : '查看详情'}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewStudents(classData.id, classData.name)}
                        className="flex items-center gap-1 border-black text-black hover:bg-gray-100 w-full"
                      >
                        <Users className="h-4 w-4" />
                        学生
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewClassProfile(classData.id)}
                        className="flex items-center gap-1 border-black text-black hover:bg-gray-100 w-full"
                      >
                        <FileBarChart className="h-4 w-4" />
                        画像
                      </Button>
                    </div>
                  </CardFooter>
                  <div className="absolute top-3 right-3 flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClass(classData)} className="text-gray-500 hover:text-black h-7 w-7">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClass(classData)} className="text-red-500 hover:text-red-700 h-7 w-7">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                </Card>
              ))}
            </div>

            {selectedClass && (
              <Tabs defaultValue="overview" className="space-y-6" value={selectedTab} onValueChange={setSelectedTab}>
                <div className="flex justify-between items-center mb-4">
                  <TabsList className="bg-white border border-gray-200 p-1 rounded-lg">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-[#9cff57] data-[state=active]:text-black rounded-md px-6 py-2">班级总览</TabsTrigger>
                    <TabsTrigger value="comparison" className="data-[state=active]:bg-[#9cff57] data-[state=active]:text-black rounded-md px-6 py-2">班级对比</TabsTrigger>
                    <TabsTrigger value="detail" className="data-[state=active]:bg-[#9cff57] data-[state=active]:text-black rounded-md px-6 py-2">班级详情</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="overview">
                  <Card className="bg-white border border-gray-200">
                    <div className="h-1 w-full bg-[#9cff57]"></div>
                    <CardHeader>
                      <CardTitle className="text-xl text-black">总览: {selectedClass.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <OverviewTab mockClasses={classes.filter(c => c.id === selectedClass.id)} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="comparison">
                  <Card className="bg-white border border-gray-200">
                    <div className="h-1 w-full bg-[#9cff57]"></div>
                    <CardHeader>
                      <CardTitle className="text-xl text-black">对比: {selectedClass.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ComparisonTab />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="detail">
                  <Card className="bg-white border border-gray-200">
                    <div className="h-1 w-full bg-[#9cff57]"></div>
                    <CardHeader>
                      <CardTitle className="text-xl text-black">详情: {selectedClass.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                          ],
                          competencies: [
                            { name: "知识掌握", value: 85 },
                            { name: "解题能力", value: 83 },
                          ]
                        }}
                        competencyData={competencyData}
                        correlationData={correlationData}
                        scoreDistributionData={scoreDistributionData}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </>
        )}

        <CreateClassDialog 
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onClassCreated={() => {
            fetchClasses();
            // 如果是编辑后创建，保持当前选中班级不变(如果它还存在)
            // 如果是全新创建，则新班级会在 fetchClasses 后被自动选中 (如果有班级的话)
          }}
          classToEdit={classToEdit}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="border border-gray-200">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-black">确认删除班级</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                此操作不可撤销。班级及其所有关联数据（学生、作业等）将从系统中永久删除。
                {classToDelete && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
                    <p><strong>班级名称:</strong> <span className="font-semibold text-red-700">{classToDelete.name}</span></p>
                    <p><strong>年级:</strong> <span className="font-semibold text-red-700">{classToDelete.grade}</span></p>
                    {(studentsCount[classToDelete.id] > 0 || homeworksCount[classToDelete.id] > 0) && (
                      <p className="text-red-700 mt-2">
                        <AlertCircle className="inline h-4 w-4 mr-1" />
                        警告：该班级当前有 {studentsCount[classToDelete.id] || 0} 名学生和 {homeworksCount[classToDelete.id] || 0} 个作业记录，这些数据也将被一并永久删除。
                      </p>
                    )}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-black text-black hover:bg-gray-100">取消</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete} 
                className="bg-red-600 text-white hover:bg-red-700"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default ClassManagement;
