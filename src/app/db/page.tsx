import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, ArrowRight, FileText, Syringe } from "lucide-react";
import Link from "next/link";

export default function DatabasePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">数据库管理</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              数据库迁移
            </CardTitle>
            <CardDescription>
              管理和执行数据库迁移脚本
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              执行必要的数据库结构变更，如添加AI生成知识点标记字段。
            </p>
            <Link href="/db/migrations">
              <Button className="w-full">
                管理迁移
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              知识点管理指南
            </CardTitle>
            <CardDescription>
              如何管理和清除AI创建的知识点
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              提供清除和管理AI创建知识点的步骤和指导。
            </p>
            <Link href="/docs/manage-ai-knowledge-points">
              <Button variant="outline" className="w-full">
                查看文档
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Syringe className="mr-2 h-5 w-5" />
              执行清理知识点操作
            </CardTitle>
            <CardDescription>
              执行一次性数据清理操作
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              运行自动化脚本，清理重复知识点或修复未保存的知识点。
            </p>
            <Button variant="outline" disabled className="w-full">
              清理操作
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 