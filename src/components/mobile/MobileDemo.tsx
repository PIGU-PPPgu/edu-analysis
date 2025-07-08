/**
 * 📱 移动端组件演示页面
 * 展示所有移动端优化组件的功能和效果
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useViewport } from '@/hooks/use-viewport';
import { useTouch, TouchEventData } from '@/hooks/use-touch';
import { 
  MobileButton, 
  MobilePrimaryButton, 
  MobileSecondaryButton,
  MobileFloatingActionButton,
  MobileIconButton,
  MobileButtonGroup,
  MobileDataCard,
  GradeDataCard,
  MobileCardList,
  ResponsiveDataTable,
  TableColumn
} from './index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Heart,
  Star,
  Share,
  Download,
  Settings,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Smartphone,
  Tablet,
  Monitor,
  Wifi,
  Battery,
  Signal
} from 'lucide-react';

// 模拟成绩数据
const mockGradeData = [
  {
    id: '1',
    name: '张三',
    student_id: 'S001',
    class_name: '高三(1)班',
    subject: '数学',
    score: 95,
    exam_name: '期中考试',
    exam_date: '2024-01-15'
  },
  {
    id: '2',
    name: '李四',
    student_id: 'S002',
    class_name: '高三(1)班',
    subject: '数学',
    score: 87,
    exam_name: '期中考试',
    exam_date: '2024-01-15'
  },
  {
    id: '3',
    name: '王五',
    student_id: 'S003',
    class_name: '高三(2)班',
    subject: '数学',
    score: 76,
    exam_name: '期中考试',
    exam_date: '2024-01-15'
  },
  {
    id: '4',
    name: '赵六',
    student_id: 'S004',
    class_name: '高三(2)班',
    subject: '数学',
    score: 92,
    exam_name: '期中考试',
    exam_date: '2024-01-15'
  },
  {
    id: '5',
    name: '钱七',
    student_id: 'S005',
    class_name: '高三(1)班',
    subject: '数学',
    score: 68,
    exam_name: '期中考试',
    exam_date: '2024-01-15'
  }
];

// 表格列定义
const tableColumns: TableColumn[] = [
  {
    key: 'name',
    label: '姓名',
    priority: 'high',
    sortable: true
  },
  {
    key: 'student_id',
    label: '学号',
    priority: 'medium',
    mobileHidden: true
  },
  {
    key: 'class_name',
    label: '班级',
    priority: 'medium'
  },
  {
    key: 'subject',
    label: '科目',
    priority: 'high'
  },
  {
    key: 'score',
    label: '分数',
    priority: 'high',
    sortable: true,
    render: (value: number) => (
      <Badge variant={value >= 90 ? 'default' : value >= 80 ? 'secondary' : 'destructive'}>
        {value}分
      </Badge>
    )
  },
  {
    key: 'exam_date',
    label: '考试日期',
    priority: 'low',
    mobileHidden: true
  }
];

export const MobileDemo: React.FC = () => {
  const { isMobile, isTablet, width, height, orientation, deviceType } = useViewport();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [gestureLog, setGestureLog] = useState<TouchEventData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 触摸手势检测演示
  const { touchHandlers, currentGesture } = useTouch(
    {
      longPressDelay: 600,
      swipeThreshold: 80
    },
    (gestureData) => {
      setGestureLog(prev => [...prev.slice(-4), gestureData]);
    }
  );

  // 模拟加载
  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  // 设备信息组件
  const DeviceInfo = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {deviceType === 'mobile' && <Smartphone className="w-5 h-5" />}
          {deviceType === 'tablet' && <Tablet className="w-5 h-5" />}
          {deviceType === 'desktop' && <Monitor className="w-5 h-5" />}
          <span>设备信息</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">设备类型:</span>
            <div className="font-medium">{deviceType}</div>
          </div>
          <div>
            <span className="text-gray-600">屏幕方向:</span>
            <div className="font-medium">{orientation}</div>
          </div>
          <div>
            <span className="text-gray-600">屏幕尺寸:</span>
            <div className="font-medium">{width} × {height}</div>
          </div>
          <div>
            <span className="text-gray-600">是否移动端:</span>
            <div className="font-medium">{isMobile ? '是' : '否'}</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Wifi className="w-4 h-4" />
            <span>WiFi</span>
          </div>
          <div className="flex items-center space-x-1">
            <Signal className="w-4 h-4" />
            <span>4G</span>
          </div>
          <div className="flex items-center space-x-1">
            <Battery className="w-4 h-4" />
            <span>85%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 手势检测演示
  const GestureDemo = () => (
    <Card>
      <CardHeader>
        <CardTitle>触摸手势检测</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="h-32 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-blue-300 flex flex-col items-center justify-center text-center p-4"
          {...touchHandlers}
        >
          <div className="text-sm text-gray-600 mb-2">
            在此区域尝试各种手势
          </div>
          {currentGesture && (
            <Badge variant="default" className="mb-2">
              {currentGesture}
            </Badge>
          )}
          <div className="text-xs text-gray-500">
            点击、长按、滑动、双指缩放
          </div>
        </div>
        
        {gestureLog.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">手势记录:</div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {gestureLog.map((gesture, index) => (
                <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                  <Badge variant="outline" className="mr-2 text-xs">
                    {gesture.gesture}
                  </Badge>
                  <span className="text-gray-600">
                    耗时: {gesture.duration}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 按钮演示
  const ButtonDemo = () => (
    <Card>
      <CardHeader>
        <CardTitle>移动端按钮组件</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 基本按钮 */}
        <div>
          <div className="text-sm font-medium mb-2">基本按钮</div>
          <MobileButtonGroup orientation="horizontal">
            <MobilePrimaryButton>主要按钮</MobilePrimaryButton>
            <MobileSecondaryButton>次要按钮</MobileSecondaryButton>
            <MobileButton variant="outline">轮廓按钮</MobileButton>
          </MobileButtonGroup>
        </div>

        {/* 尺寸演示 */}
        <div>
          <div className="text-sm font-medium mb-2">不同尺寸</div>
          <MobileButtonGroup orientation="vertical">
            <MobileButton size="xs">超小按钮</MobileButton>
            <MobileButton size="sm">小按钮</MobileButton>
            <MobileButton size="default">默认按钮</MobileButton>
            <MobileButton size="lg">大按钮</MobileButton>
          </MobileButtonGroup>
        </div>

        {/* 带图标的按钮 */}
        <div>
          <div className="text-sm font-medium mb-2">图标按钮</div>
          <MobileButtonGroup orientation="horizontal">
            <MobileButton
              iconLeft={<Heart className="w-4 h-4" />}
              variant="outline"
            >
              点赞
            </MobileButton>
            <MobileButton
              iconRight={<Download className="w-4 h-4" />}
              variant="secondary"
            >
              下载
            </MobileButton>
            <MobileIconButton variant="ghost">
              <Settings className="w-5 h-5" />
            </MobileIconButton>
          </MobileButtonGroup>
        </div>

        {/* 特殊按钮 */}
        <div>
          <div className="text-sm font-medium mb-2">特殊按钮</div>
          <div className="flex items-center space-x-3">
            <MobileButton
              variant="pill"
              iconLeft={<Star className="w-4 h-4" />}
            >
              胶囊按钮
            </MobileButton>
            <MobileButton
              isLoading={isLoading}
              loadingText="处理中..."
              onClick={handleLoadingDemo}
            >
              加载演示
            </MobileButton>
            <MobileButton
              badge="99+"
              variant="outline"
            >
              通知
            </MobileButton>
          </div>
        </div>

        {/* 悬浮按钮 */}
        <div className="relative h-16">
          <MobileFloatingActionButton
            className="absolute bottom-0 right-0"
            onClick={() => console.log('FAB clicked')}
          >
            <Plus className="w-6 h-6" />
          </MobileFloatingActionButton>
        </div>
      </CardContent>
    </Card>
  );

  // 数据卡片演示
  const DataCardDemo = () => (
    <Card>
      <CardHeader>
        <CardTitle>数据卡片组件</CardTitle>
      </CardHeader>
      <CardContent>
        <MobileCardList spacing="normal">
          {mockGradeData.slice(0, 3).map((grade) => (
            <GradeDataCard
              key={grade.id}
              gradeData={grade}
              selected={selectedCards.includes(grade.id)}
              onSelect={(selected) => {
                setSelectedCards(prev => 
                  selected 
                    ? [...prev, grade.id]
                    : prev.filter(id => id !== grade.id)
                );
              }}
            />
          ))}
        </MobileCardList>
        
        {selectedCards.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800">
              已选择 {selectedCards.length} 个项目
            </div>
            <MobileButton
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => setSelectedCards([])}
            >
              清除选择
            </MobileButton>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 响应式表格演示
  const TableDemo = () => (
    <Card>
      <CardHeader>
        <CardTitle>响应式数据表格</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveDataTable
          data={mockGradeData}
          columns={tableColumns}
          pagination={{
            current: 1,
            pageSize: 10,
            total: mockGradeData.length,
            onChange: (page, pageSize) => {
              console.log('Page changed:', page, pageSize);
            }
          }}
          filters={[
            {
              key: 'class_name',
              label: '班级',
              type: 'select',
              options: [
                { label: '高三(1)班', value: '高三(1)班' },
                { label: '高三(2)班', value: '高三(2)班' }
              ]
            },
            {
              key: 'subject',
              label: '科目',
              type: 'select',
              options: [
                { label: '数学', value: '数学' },
                { label: '语文', value: '语文' },
                { label: '英语', value: '英语' }
              ]
            }
          ]}
          selectable
          mobileViewToggle
          onRowClick={(row) => {
            console.log('Row clicked:', row);
          }}
          actions={[
            {
              label: '查看详情',
              icon: <MoreVertical className="w-4 h-4" />,
              onClick: (row) => console.log('View details:', row)
            }
          ]}
        />
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            移动端组件演示
          </h1>
          <p className="text-gray-600">
            展示针对移动端优化的UI组件和交互效果
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className={cn(
            "grid w-full",
            isMobile ? "grid-cols-2" : "grid-cols-4"
          )}>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="buttons">按钮</TabsTrigger>
            <TabsTrigger value="cards">卡片</TabsTrigger>
            <TabsTrigger value="table">表格</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <DeviceInfo />
            <GestureDemo />
          </TabsContent>

          <TabsContent value="buttons" className="space-y-4">
            <ButtonDemo />
          </TabsContent>

          <TabsContent value="cards" className="space-y-4">
            <DataCardDemo />
          </TabsContent>

          <TabsContent value="table" className="space-y-4">
            <TableDemo />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};