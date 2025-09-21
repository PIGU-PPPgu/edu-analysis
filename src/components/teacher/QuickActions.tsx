import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Upload, 
  Users, 
  BarChart3, 
  FileSpreadsheet, 
  BookOpen,
  ArrowRight,
  Plus
} from 'lucide-react';

const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: '导入成绩',
      description: '快速批量导入Excel成绩单',
      icon: Upload,
      path: '/dashboard',
      color: 'bg-blue-50 hover:bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      title: '查看学生',
      description: '管理学生基本信息',
      icon: Users,
      path: '/student-management',
      color: 'bg-green-50 hover:bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      title: '成绩分析',
      description: '深度分析班级表现',
      icon: BarChart3,
      path: '/grade-analysis',
      color: 'bg-purple-50 hover:bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      title: '班级管理',
      description: '查看班级详细数据',
      icon: BookOpen,
      path: '/class-management',
      color: 'bg-orange-50 hover:bg-orange-100',
      iconColor: 'text-orange-600'
    }
  ];

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">快速操作</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Card 
            key={action.title}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${action.color}`}
            onClick={() => navigate(action.path)}
          >
            <CardContent className="p-6 text-center">
              <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center mx-auto mb-3`}>
                <action.icon className={`h-6 w-6 ${action.iconColor}`} />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">{action.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{action.description}</p>
              <Button variant="ghost" size="sm" className="group">
                开始
                <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;