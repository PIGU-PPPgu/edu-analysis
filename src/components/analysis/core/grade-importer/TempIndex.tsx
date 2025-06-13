// 临时简化组件 - 等待修复类型问题
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Construction } from 'lucide-react';

interface GradeImporterProps {
  onDataImported: (data: any[]) => void;
}

const TempGradeImporter: React.FC<GradeImporterProps> = ({ onDataImported }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Construction className="w-5 h-5" />
          成绩导入组件重构中
        </CardTitle>
        <CardDescription>
          重构后的模块化组件正在完善中
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <Construction className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>重构进展：</strong></p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>✅ 修复了宽表格式的学生姓名重复问题</li>
                <li>✅ 完成了组件模块化拆分</li>
                <li>🔄 正在完善类型定义和组件集成</li>
                <li>⏳ 即将恢复完整功能</li>
              </ul>
              <p className="text-sm text-gray-600 mt-4">
                预期几分钟内完成，届时将提供更好的导入体验。
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default TempGradeImporter; 