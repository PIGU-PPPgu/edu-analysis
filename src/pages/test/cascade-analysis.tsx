import React from "react";
import CascadeAnalysisTest from "@/components/test/CascadeAnalysisTest";
import { Button } from "@/components/ui/button";

export default function CascadeAnalysisTestPage() {
  React.useEffect(() => {
    document.title = "硅基流动级联分析测试";
  }, []);

  return (
    <>
      <div className="container mx-auto max-w-6xl">
        <div className="my-8 text-center">
          <h1 className="text-4xl font-bold mb-2">硅基流动级联分析测试</h1>
          <p className="text-xl text-muted-foreground mb-8">
            测试Qwen视觉模型和DeepSeek模型的级联分析能力
          </p>
        </div>

        <CascadeAnalysisTest />

        <div className="mt-8 mb-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            该测试页面用于验证硅基流动API的级联分析功能，先使用千问模型分析图片，再用DeepSeek深入处理
          </p>
          <Button variant="link" asChild>
            <a href="/">返回首页</a>
          </Button>
        </div>
      </div>
    </>
  );
}
