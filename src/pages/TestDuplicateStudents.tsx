import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DuplicateStudent {
  name: string;
  count: number;
  student_ids: string;
  class_names: string;
}

const TestDuplicateStudents = () => {
  const [duplicates, setDuplicates] = useState<DuplicateStudent[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const checkDuplicates = async () => {
    setLoading(true);
    try {
      // 查询初三 7班的所有学生
      const { data: students, error } = await supabase
        .from("students")
        .select("id, student_id, name, class_name")
        .or(`class_name.eq.初三 7班,class_name.eq.初三7班`)
        .order("name");

      if (error) {
        console.error("查询失败:", error);
        return;
      }

      console.log("查询到的学生:", students);
      setAllStudents(students || []);

      // 在前端统计重复姓名
      const nameCount = new Map<string, any[]>();
      students?.forEach((student) => {
        if (!nameCount.has(student.name)) {
          nameCount.set(student.name, []);
        }
        nameCount.get(student.name)!.push(student);
      });

      // 过滤出重复的姓名
      const duplicateList: DuplicateStudent[] = [];
      nameCount.forEach((studentList, name) => {
        if (studentList.length > 1) {
          duplicateList.push({
            name,
            count: studentList.length,
            student_ids: studentList.map((s) => s.student_id).join(", "),
            class_names: studentList.map((s) => s.class_name).join(", "),
          });
        }
      });

      setDuplicates(duplicateList);
      console.log("发现重复学生:", duplicateList);
    } catch (error) {
      console.error("检查重复学生时出错:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkDuplicates();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>初三 7班 - 重复学生检查</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={checkDuplicates} disabled={loading} className="mb-4">
            {loading ? "检查中..." : "重新检查"}
          </Button>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">
              重复学生统计 ({duplicates.length} 组重复)
            </h3>
            {duplicates.length === 0 ? (
              <p className="text-green-600">✅ 没有发现重复的学生姓名</p>
            ) : (
              <div className="space-y-2">
                {duplicates.map((dup, index) => (
                  <div key={index} className="border p-3 rounded bg-red-50">
                    <p className="font-semibold text-red-700">
                      姓名: {dup.name} (重复 {dup.count} 次)
                    </p>
                    <p className="text-sm text-gray-600">
                      学号: {dup.student_ids}
                    </p>
                    <p className="text-sm text-gray-600">
                      班级: {dup.class_names}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              所有学生列表 (共 {allStudents.length} 人)
            </h3>
            <div className="max-h-96 overflow-y-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">姓名</th>
                    <th className="p-2 text-left">学号</th>
                    <th className="p-2 text-left">班级</th>
                    <th className="p-2 text-left">UUID</th>
                  </tr>
                </thead>
                <tbody>
                  {allStudents.map((student, index) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="p-2">{student.name}</td>
                      <td className="p-2 font-mono text-xs">
                        {student.student_id}
                      </td>
                      <td className="p-2">{student.class_name}</td>
                      <td className="p-2 font-mono text-xs">
                        {student.id.slice(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestDuplicateStudents;
