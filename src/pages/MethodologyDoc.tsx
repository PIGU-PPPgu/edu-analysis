/**
 * 增值评价方法论文档页
 * 公开可访问，可在学术会议等场合分享
 */

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import docContent from "../../docs/增值评价计算方法与理论依据.md?raw";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MethodologyDoc() {
  const navigate = useNavigate();

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>增值评价计算方法与理论依据</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-1"
          >
            <Share2 className="h-4 w-4" />
            复制链接
          </Button>
        </div>
      </div>

      {/* 文档正文 */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div
          className="prose prose-slate dark:prose-invert max-w-none
          prose-headings:font-bold prose-headings:tracking-tight
          prose-h1:text-3xl prose-h1:border-b prose-h1:pb-3 prose-h1:mb-6
          prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-6
          prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
          prose-pre:bg-muted prose-pre:rounded-lg
          prose-table:text-sm
          prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2
          prose-td:px-3 prose-td:py-2
          prose-blockquote:border-l-4 prose-blockquote:border-primary/40 prose-blockquote:bg-muted/30 prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r
        "
        >
          <ReactMarkdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
          >
            {docContent}
          </ReactMarkdown>
        </div>

        {/* 底部版权声明 */}
        <div className="mt-16 pt-8 border-t text-xs text-muted-foreground text-center space-y-1">
          <p>本文档由系统自动维护 · 仅供学术参考</p>
          <p>数学公式与方法论基于公开学术文献，版权归原论文作者所有</p>
        </div>
      </div>
    </div>
  );
}
