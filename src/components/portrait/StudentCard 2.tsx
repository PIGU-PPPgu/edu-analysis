import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CircleUser, UserCircle } from "lucide-react";
import { StudentPortraitData } from "@/lib/api/portrait";

interface StudentCardProps {
  student: StudentPortraitData;
  onView: (studentId: string) => void;
}

/**
 * 学生卡片组件
 * 使用memo优化渲染性能，避免不必要的重渲染
 */
const StudentCard: React.FC<StudentCardProps> = memo(({ student, onView }) => {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center mr-2">
              <CircleUser className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{student.name}</CardTitle>
              <CardDescription>学号: {student.student_id}</CardDescription>
            </div>
          </div>
          <Badge variant="outline">
            {student.gender || '未知'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-2">
        <div className="flex justify-end">
          <Button 
            size="sm" 
            onClick={() => onView(student.id)}
          >
            <UserCircle className="h-4 w-4 mr-2" />
            查看学生画像
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

StudentCard.displayName = "StudentCard";

export default StudentCard; 