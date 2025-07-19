import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

/**
 * UI组件测试页面
 * 用于检查shadcn/ui组件是否正常工作
 */
export const UITest: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">UI组件测试</h1>
          <p className="text-gray-600">检查shadcn/ui组件是否正常显示</p>
        </div>

        {/* 卡片测试 */}
        <Card>
          <CardHeader>
            <CardTitle>卡片组件测试</CardTitle>
            <CardDescription>
              这是一个测试用的卡片组件，检查样式是否正常
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 按钮测试 */}
              <div className="flex gap-2">
                <Button>默认按钮</Button>
                <Button variant="outline">边框按钮</Button>
                <Button variant="secondary">次要按钮</Button>
                <Button variant="destructive">危险按钮</Button>
              </div>

              {/* 徽章测试 */}
              <div className="flex gap-2">
                <Badge>默认徽章</Badge>
                <Badge variant="secondary">次要徽章</Badge>
                <Badge variant="outline">边框徽章</Badge>
                <Badge variant="destructive">危险徽章</Badge>
              </div>

              {/* 开关测试 */}
              <div className="flex items-center space-x-2">
                <Switch id="test-switch" />
                <label htmlFor="test-switch" className="text-sm font-medium">
                  开关组件测试
                </label>
              </div>

              {/* 网格布局测试 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900">网格项目 1</h3>
                  <p className="text-sm text-blue-700">这是第一个网格项目</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-900">网格项目 2</h3>
                  <p className="text-sm text-green-700">这是第二个网格项目</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 多卡片测试 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-blue-200">
            <CardHeader className="text-center">
              <CardTitle className="text-lg text-blue-600">功能 1</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600">这是第一个功能的描述</p>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardHeader className="text-center">
              <CardTitle className="text-lg text-green-600">功能 2</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600">这是第二个功能的描述</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardHeader className="text-center">
              <CardTitle className="text-lg text-purple-600">功能 3</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600">这是第三个功能的描述</p>
            </CardContent>
          </Card>
        </div>

        {/* 状态检查 */}
        <Card>
          <CardHeader>
            <CardTitle>状态检查</CardTitle>
            <CardDescription>检查各种状态显示是否正常</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-800 font-medium">成功状态</span>
                </div>
                <p className="text-sm text-green-700 mt-1">所有组件加载正常</p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-blue-800 font-medium">信息状态</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">Tailwind CSS 样式正常</p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-yellow-800 font-medium">警告状态</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">如果这里没有样式，说明CSS有问题</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 测试说明 */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>测试说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• 如果您能看到完整的UI样式和布局，说明组件工作正常</p>
              <p>• 如果只看到文字没有样式，可能是CSS加载问题</p>
              <p>• 如果页面空白，可能是JavaScript错误</p>
              <p>• 检查浏览器控制台是否有错误信息</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UITest;