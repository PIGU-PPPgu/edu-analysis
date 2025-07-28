import React from "react";
import { Container, Box, Typography } from "@mui/material";
import CascadeAnalysisTest from "@/components/test/CascadeAnalysisTest";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CascadeAnalysisTestPage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, textAlign: "center" }}>
        <Typography variant="h4" component="h1" gutterBottom>
          硅基流动级联分析测试
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          测试Qwen视觉模型和DeepSeek模型的级联分析能力
        </Typography>
      </Box>

      <CascadeAnalysisTest />

      <Box sx={{ mt: 6, mb: 4, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          该测试页面用于验证硅基流动API的级联分析功能，先使用千问模型分析图片，再用DeepSeek深入处理
        </Typography>
        <Button variant="link" className="mt-2">
          <a href="/">返回首页</a>
        </Button>
      </Box>
    </Container>
  );
}
