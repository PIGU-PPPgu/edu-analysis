import React from "react";
import { Helmet } from "react-helmet";
import Navbar from "@/components/shared/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Database, Server, RefreshCw, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import MaterializedViewsStatus from "@/components/settings/MaterializedViewsStatus";

const DatabaseSettings: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Helmet>
        <title>数据库设置 | 教学管理系统</title>
      </Helmet>

      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            数据库设置
          </h1>
        </div>

        <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900">
          <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle>重要提示</AlertTitle>
          <AlertDescription className="text-sm text-gray-600 dark:text-gray-300">
            此页面包含高级数据库设置，只有系统管理员应该访问。
            不正确的操作可能会导致系统性能问题或数据不一致。
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="materialized-views" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg shadow-inner mb-6">
            <TabsTrigger
              value="materialized-views"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              物化视图管理
            </TabsTrigger>
            <TabsTrigger
              value="database-status"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400"
            >
              <Database className="mr-2 h-4 w-4" />
              数据库状态
            </TabsTrigger>
            <TabsTrigger
              value="server-settings"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400"
            >
              <Server className="mr-2 h-4 w-4" />
              服务器设置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="materialized-views" className="mt-4 p-0">
            <div className="space-y-6">
              <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                    物化视图管理
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                    管理系统的物化视图，这些视图用于提高查询性能和加速数据分析。物化视图是预计算的结果集，定期刷新以保持数据最新。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MaterializedViewsStatus />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                      物化视图使用指南
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p>
                      物化视图是提高数据查询性能的重要工具，特别是对于复杂的聚合查询。
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>刷新操作可能需要一些时间，具体取决于数据量大小</li>
                      <li>建议在非高峰时段手动刷新物化视图</li>
                      <li>系统配置了在数据变更后自动刷新相关物化视图</li>
                      <li>如果遇到性能问题，请先检查物化视图状态</li>
                    </ul>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md mt-2">
                      <p className="font-medium">详细文档:</p>
                      <p>
                        完整的物化视图文档可在{" "}
                        <a
                          href="/docs/MATERIALIZED_VIEWS.md"
                          className="text-blue-500 hover:underline"
                          target="_blank"
                        >
                          这里
                        </a>{" "}
                        找到。
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                      常见问题
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-1">
                          为什么需要物化视图？
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          物化视图预先计算复杂查询的结果，显著减少复杂查询的响应时间和服务器负载。
                        </p>
                      </div>

                      <div>
                        <h3 className="font-medium mb-1">
                          刷新物化视图需要多长时间？
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          取决于数据量，通常从几秒到几分钟不等。大型数据集可能需要更长时间。
                        </p>
                      </div>

                      <div>
                        <h3 className="font-medium mb-1">
                          如果物化视图刷新失败怎么办？
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          系统会自动降级使用原始查询。请联系系统管理员检查数据库日志以排除故障。
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="database-status" className="mt-4 p-0">
            <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                  数据库状态
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                  查看数据库当前状态、连接数和表空间使用情况。
                </CardDescription>
              </CardHeader>
              <CardContent className="py-6">
                <p className="text-center text-gray-500 dark:text-gray-400">
                  此功能需要管理员权限，请联系系统管理员。
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="server-settings" className="mt-4 p-0">
            <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                  服务器设置
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                  管理数据库服务器配置，包括连接池和缓存设置。
                </CardDescription>
              </CardHeader>
              <CardContent className="py-6">
                <p className="text-center text-gray-500 dark:text-gray-400">
                  此功能需要管理员权限，请联系系统管理员。
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DatabaseSettings;
