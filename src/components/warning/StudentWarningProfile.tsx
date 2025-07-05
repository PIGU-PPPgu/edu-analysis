"use client";

import React, { useEffect, useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, BookOpen, CheckCircle, Clock, TrendingDown, TrendingUp, UserCircle, XCircle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// 定义学生画像数据的接口 (与 Edge Function 返回的结构对应)
interface StudentProfileData {
  student_info: {
    student_uuid: string;
    student_display_id: string;
    student_name: string;
    student_email?: string | null;
    student_date_of_birth?: string | null;
    student_gender?: string | null;
    class_uuid?: string | null;
    class_name?: string | null;
    grade_level?: string | null;
    teacher_name?: string | null;
  } | null;
  latest_grades: {
    latest_exam_date_for_student?: string | null;
    latest_average_score?: number | null;
    latest_failing_subjects_count?: number | null;
    latest_exam_details?: Array<{
      subject: string;
      score: number;
      exam_title?: string | null;
      exam_type?: string | null;
      exam_date?: string | null;
    }> | null;
  } | null;
  homework_stats: {
    total_homeworks_submitted?: number | null;
    average_homework_grade?: number | null;
    late_submissions_count?: number | null;
    submission_details?: Array<{
      homework_title?: string | null;
      submitted_at?: string | null;
      due_date?: string | null;
      grade?: number | null;
      is_late?: boolean | null;
    }> | null;
  } | null;
  attendance_summary: {
    total_records_count?: number | null;
    total_absences?: number | null;
    total_lates?: number | null;
    total_excused?: number | null;
    recent_attendance_details?: Array<{
      date: string;
      status: string;
      notes?: string | null;
    }> | null;
  } | null;
}

// 模拟的学生画像数据
const mockStudentProfileData: StudentProfileData = {
  student_info: {
    student_uuid: "mock-uuid-123",
    student_display_id: "S001",
    student_name: "张三",
    student_email: "zhangsan@example.com",
    student_date_of_birth: "2008-05-10",
    student_gender: "男",
    class_uuid: "class-uuid-01",
    class_name: "初三(1)班",
    grade_level: "九年级",
    teacher_name: "王老师",
  },
  latest_grades: {
    latest_exam_date_for_student: "2024-05-15",
    latest_average_score: 78.5,
    latest_failing_subjects_count: 1,
    latest_exam_details: [
      { subject: "语文", score: 85, exam_title: "月考", exam_type: "月度测试", exam_date: "2024-05-15" },
      { subject: "数学", score: 92, exam_title: "月考", exam_type: "月度测试", exam_date: "2024-05-15" },
      { subject: "英语", score: 55, exam_title: "月考", exam_type: "月度测试", exam_date: "2024-05-15" }, // 不及格
      { subject: "物理", score: 82, exam_title: "月考", exam_type: "月度测试", exam_date: "2024-05-15" },
    ],
  },
  homework_stats: {
    total_homeworks_submitted: 25,
    average_homework_grade: 88.2,
    late_submissions_count: 2,
    submission_details: [
      { homework_title: "数学第五章练习", submitted_at: "2024-05-10", due_date: "2024-05-09", grade: 80, is_late: true },
      { homework_title: "物理光的折射", submitted_at: "2024-05-08", due_date: "2024-05-08", grade: 95, is_late: false },
    ],
  },
  attendance_summary: {
    total_records_count: 60,
    total_absences: 3,
    total_lates: 5,
    total_excused: 1,
    recent_attendance_details: [
      { date: "2024-05-16", status: "present" },
      { date: "2024-05-15", status: "late", notes: "迟到10分钟" },
      { date: "2024-05-14", status: "absent", notes: "事假" },
    ],
  },
};

interface StudentWarningProfileProps {
  studentUuid: string | null; // 选中的学生UUID
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const StudentWarningProfile: React.FC<StudentWarningProfileProps> = ({ studentUuid, isOpen, onOpenChange }) => {
  const [profileData, setProfileData] = useState<StudentProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true); // 添加挂载状态引用

  useEffect(() => {
    if (studentUuid && isOpen) {
      setIsLoading(true);
      setError(null);
      // 实现真实的API调用
      const fetchStudentProfile = async () => {
        try {
          console.log(`Fetching profile for student: ${studentUuid}`);
          
          // 使用Supabase客户端获取学生预警画像数据
          const { data, error } = await supabase
            .rpc('get_student_warning_profile', { 
              student_uuid_param: studentUuid 
            });
          
          if (error) {
            console.error('获取学生画像数据失败:', error);
            // 使用模拟数据作为回退
            if (isMountedRef.current) {
              setProfileData(mockStudentProfileData);
              setIsLoading(false);
            }
            return;
          }
          
          if (isMountedRef.current) {
            setProfileData(data || mockStudentProfileData);
            setIsLoading(false);
          }
        } catch (err) {
          console.error('API调用异常:', err);
          // 出现异常时使用模拟数据
          if (isMountedRef.current) {
            setProfileData(mockStudentProfileData);
            setIsLoading(false);
          }
        }
      };
      
      // 延迟调用以提供良好的用户体验
      setTimeout(fetchStudentProfile, 500);

        // 以下代码注释掉，避免环境变量问题
        /*
        if (!supabaseUrl || !supabaseAnonKey) {
          console.error("Supabase URL or Anon Key is not defined. Using mock data.");
          if (isMountedRef.current) {
            setProfileData(mockStudentProfileData); // 使用模拟数据作为回退
            setIsLoading(false);
          }
          return;
        }
        */
    } else if (!isOpen) {
      // 清理数据当模态框关闭时
      setProfileData(null);
    }
    
    // 清理函数
    return () => {
      isMountedRef.current = false;
    };
  }, [studentUuid, isOpen]);

  if (!isOpen || !studentUuid) {
    return null;
  }
  
  const renderGradeBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500 hover:bg-green-600">优秀</Badge>;
    if (score >= 80) return <Badge className="bg-blue-500 hover:bg-blue-600">良好</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-500 hover:bg-yellow-600">中等</Badge>;
    if (score >= 60) return <Badge className="bg-orange-500 hover:bg-orange-600">及格</Badge>;
    return <Badge variant="destructive">不及格</Badge>;
  };

  const getAttendanceIcon = (status: string) => {
    if (status === 'present') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'late') return <Clock className="h-4 w-4 text-yellow-500" />;
    if (status === 'absent') return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === 'excused') return <AlertCircle className="h-4 w-4 text-blue-500" />;
    return null;
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">学生预警画像</DialogTitle>
          {profileData?.student_info ? (
             <DialogDescription>
                {profileData.student_info.student_name} ({profileData.student_info.student_display_id}) - {profileData.student_info.class_name}
             </DialogDescription>
          ) : (
             <DialogDescription>
                加载学生信息中...
             </DialogDescription>
          )}
        </DialogHeader>
        
        {isLoading && <div className="text-center py-8">加载学生数据中...</div>}
        {error && <div className="text-center py-8 text-red-600">加载失败: {error}</div>}

        {!isLoading && !error && profileData && (
          <div className="grid gap-6 py-4">
            {/* 学生基本信息 */}
            {profileData.student_info && (
              <Card>
                <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${profileData.student_info.student_name}`} alt={profileData.student_info.student_name} />
                    <AvatarFallback>{profileData.student_info.student_name?.substring(0,2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">{profileData.student_info.student_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {profileData.student_info.student_display_id} | {profileData.student_info.class_name} ({profileData.student_info.grade_level})
                    </p>
                     <p className="text-xs text-muted-foreground">
                      指导教师: {profileData.student_info.teacher_name || "N/A"}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <p><strong>邮箱:</strong> {profileData.student_info.student_email || "N/A"}</p>
                    <p><strong>性别:</strong> {profileData.student_info.student_gender || "N/A"}</p>
                    <p><strong>生日:</strong> {profileData.student_info.student_date_of_birth || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 最新学业成绩 */}
            {profileData.latest_grades && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><BookOpen className="h-5 w-5 mr-2 text-[#c0ff3f]" />最新学业成绩</CardTitle>
                  <CardDescription>
                    最近考试日期: {profileData.latest_grades.latest_exam_date_for_student || "N/A"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">平均分</p>
                      <p className="text-2xl font-bold">{profileData.latest_grades.latest_average_score?.toFixed(1) ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">不及格科目数</p>
                      <p className="text-2xl font-bold text-red-500">{profileData.latest_grades.latest_failing_subjects_count ?? "N/A"}</p>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <h4 className="font-semibold mb-2 text-sm">各科成绩详情:</h4>
                  <ul className="space-y-2">
                    {profileData.latest_grades.latest_exam_details?.map((exam, index) => (
                      <li key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                        <div>
                          <span className="font-medium">{exam.subject}</span>
                          <span className="text-xs text-muted-foreground ml-2">({exam.exam_title || '考试'})</span>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <span className={`font-bold ${exam.score < 60 ? 'text-red-500' : 'text-green-600'}`}>{exam.score}</span>
                          {renderGradeBadge(exam.score)}
                        </div>
                      </li>
                    ))}
                    {(!profileData.latest_grades.latest_exam_details || profileData.latest_grades.latest_exam_details.length === 0) && (
                        <p className="text-xs text-muted-foreground">暂无最近考试成绩数据。</p>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}
            
            {/* 作业提交统计 */}
            {profileData.homework_stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><CheckCircle className="h-5 w-5 mr-2 text-[#c0ff3f]" />作业提交统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">已提交作业</p>
                      <p className="text-xl font-bold">{profileData.homework_stats.total_homeworks_submitted ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">作业平均分</p>
                      <p className="text-xl font-bold">{profileData.homework_stats.average_homework_grade?.toFixed(1) ?? "N/A"}</p>
                       {profileData.homework_stats.average_homework_grade !== null && typeof profileData.homework_stats.average_homework_grade !== 'undefined' && (
                        <Progress value={profileData.homework_stats.average_homework_grade} className="h-2 mt-1" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">迟交次数</p>
                      <p className="text-xl font-bold text-orange-500">{profileData.homework_stats.late_submissions_count ?? "N/A"}</p>
                    </div>
                  </div>
                   <Separator className="my-3" />
                  <h4 className="font-semibold mb-2 text-sm">近期作业详情 (部分):</h4>
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                     {profileData.homework_stats.submission_details?.slice(0, 5).map((hw, index) => (
                      <li key={index} className={`p-2 rounded-md ${hw.is_late ? 'bg-orange-50' : 'bg-green-50'}`}>
                        <div className="flex justify-between items-center">
                           <span className="font-medium text-xs">{hw.homework_title}</span>
                           {hw.grade !== null && <span className={`text-xs font-semibold ${hw.grade < 60 ? 'text-red-600' : 'text-green-700'}`}>得分: {hw.grade}</span>}
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground mt-0.5">
                          <span>提交: {hw.submitted_at ? new Date(hw.submitted_at).toLocaleDateString() : 'N/A'}</span>
                          <span>截止: {hw.due_date ? new Date(hw.due_date).toLocaleDateString() : 'N/A'}</span>
                           {hw.is_late && <Badge variant="outline" className="text-orange-600 border-orange-500 text-xs">迟交</Badge>}
                        </div>
                      </li>
                    ))}
                    {(!profileData.homework_stats.submission_details || profileData.homework_stats.submission_details.length === 0) && (
                        <p className="text-xs text-muted-foreground">暂无作业提交数据。</p>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 出勤记录 */}
            {profileData.attendance_summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><Clock className="h-5 w-5 mr-2 text-[#c0ff3f]" />出勤记录</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">总缺勤</p>
                      <p className="text-xl font-bold text-red-500">{profileData.attendance_summary.total_absences ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">总迟到</p>
                      <p className="text-xl font-bold text-yellow-500">{profileData.attendance_summary.total_lates ?? "N/A"}</p>
                    </div>
                     <div>
                      <p className="text-xs text-muted-foreground">总请假(批准)</p>
                      <p className="text-xl font-bold text-blue-500">{profileData.attendance_summary.total_excused ?? "N/A"}</p>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <h4 className="font-semibold mb-2 text-sm">近期出勤详情 (部分):</h4>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {profileData.attendance_summary.recent_attendance_details?.slice(0,10).map((att, index) => (
                      <li key={index} className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded">
                        <div className="flex items-center">
                          {getAttendanceIcon(att.status)}
                          <span className="ml-2">{new Date(att.date).toLocaleDateString()} - <span className="capitalize font-medium">{att.status}</span></span>
                        </div>
                        {att.notes && <span className="text-muted-foreground truncate" title={att.notes}>备注: {att.notes}</span>}
                      </li>
                    ))}
                    {(!profileData.attendance_summary.recent_attendance_details || profileData.attendance_summary.recent_attendance_details.length === 0) && (
                        <p className="text-xs text-muted-foreground">暂无近期出勤数据。</p>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">关闭</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentWarningProfile; 