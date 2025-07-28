import React, { useState, useRef, ChangeEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { KnowledgePoint } from "@/types/homework";
import { performSingleModelAnalysis } from "@/services/apiService";
import { VISION_MODELS_FOR_TEST } from "@/services/providers";
import { saveUserAPIKey, getUserAPIKey } from "@/utils/userAuth";
import { toast } from "sonner";

// 只保留豆包视觉模型
const DOUBAO_VISION_MODEL = VISION_MODELS_FOR_TEST.find(
  (m) => m.provider === "doubao" && m.type === "vision"
);

if (!DOUBAO_VISION_MODEL) {
  console.error("豆包视觉模型配置未找到!");
  // 可以在这里抛出错误或设置一个默认值，以防万一
}

const DOUBAO_PROVIDER_ID = "doubao";

export default function CascadeAnalysisTest() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [currentApiKey, setCurrentApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchKey = async () => {
      setLoadingKey(true);
      const key = await getUserAPIKey(DOUBAO_PROVIDER_ID);
      setCurrentApiKey(key);
      setApiKeyInput(key || "");
      setLoadingKey(false);
    };
    fetchKey();
  }, []);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.match("image.*")) {
      setError("请上传图片文件");
      return;
    }
    setImage(file);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setApiKeyInput(event.target.value);
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput) {
      toast.error("请输入 API 密钥");
      return;
    }
    try {
      await saveUserAPIKey(DOUBAO_PROVIDER_ID, apiKeyInput);
      setCurrentApiKey(apiKeyInput);
      toast.success("豆包 API 密钥已保存");
    } catch (err) {
      toast.error("保存密钥失败");
      console.error(err);
    }
  };

  const handleTest = async () => {
    if (!DOUBAO_VISION_MODEL) {
      setError("豆包视觉模型配置错误");
      return;
    }
    if (!image || !imagePreview) {
      setError("请先上传图片");
      return;
    }
    if (!currentApiKey) {
      setError("请先保存豆包 API 密钥");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const analysisResult = await performSingleModelAnalysis(
        imagePreview,
        [],
        DOUBAO_VISION_MODEL.id
      );
      setResult(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto my-8">
      <CardHeader>
        <CardTitle className="text-2xl">豆包视觉模型分析测试</CardTitle>
        <p className="text-muted-foreground">
          使用模型: {DOUBAO_VISION_MODEL?.name || "N/A"} (
          {DOUBAO_VISION_MODEL?.id || "N/A"})
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Card className="border p-4">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg">API 密钥管理 (临时)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div className="flex gap-2 items-center">
              <Input
                type="password"
                value={apiKeyInput}
                onChange={handleApiKeyChange}
                placeholder="输入豆包 API 密钥"
                disabled={loadingKey}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleSaveApiKey}
                disabled={
                  loadingKey || !apiKeyInput || apiKeyInput === currentApiKey
                }
              >
                保存密钥
              </Button>
            </div>
            {loadingKey && (
              <p className="text-sm text-muted-foreground">正在加载密钥...</p>
            )}
            {currentApiKey && (
              <p className="text-sm text-green-600">当前已保存密钥。</p>
            )}
            {!loadingKey && !currentApiKey && (
              <p className="text-sm text-orange-600">尚未保存密钥。</p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col items-center space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: "none" }}
            ref={fileInputRef}
          />

          {imagePreview ? (
            <div className="text-center space-y-2">
              <img
                src={imagePreview}
                alt="作业图片预览"
                className="max-w-full max-h-80 object-contain border border-border rounded"
              />
              <p className="text-sm text-muted-foreground">
                {image?.name} ({image ? Math.round(image.size / 1024) : 0} KB)
              </p>
            </div>
          ) : (
            <div
              className="w-full h-48 border-2 border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
              onClick={handleUploadClick}
            >
              <p className="text-muted-foreground">点击上传作业图片</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleUploadClick}>
              {imagePreview ? "更换图片" : "上传图片"}
            </Button>

            <Button
              onClick={handleTest}
              disabled={loading || !imagePreview || !currentApiKey}
            >
              {loading ? "分析中..." : "开始分析"}
            </Button>
          </div>
        </div>

        {error && (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-6">
            <Card className="border">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-3">分析元数据</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    分析时间: {result.meta.analysisTime}ms
                  </Badge>
                  <Badge variant="outline">
                    知识点数量: {result.meta.knowledgePointsCount}
                  </Badge>
                  <Badge variant="outline">
                    提供商: {result.meta.provider}
                  </Badge>
                  <Badge variant="outline">模型: {result.meta.model}</Badge>
                </div>
              </CardContent>
            </Card>

            <div>
              <h3 className="text-xl font-semibold mb-4">识别到的知识点</h3>
              <div className="space-y-4">
                {result.result.knowledgePoints.map(
                  (point: KnowledgePoint, index: number) => (
                    <Card key={index} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-lg font-medium">{point.name}</h4>
                          {point.isNew && (
                            <Badge className="bg-blue-500">新</Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-3">
                          {point.description}
                        </p>
                        <div className="flex flex-wrap gap-6">
                          <div>
                            <span className="text-sm font-medium">
                              重要性:{" "}
                            </span>
                            <span className="text-sm">
                              {"★".repeat(point.importance)}
                              {"☆".repeat(5 - point.importance)}
                            </span>
                          </div>
                          <div>
                            <span className="text-sm font-medium">
                              掌握程度:{" "}
                            </span>
                            <span className="text-sm">
                              {"★".repeat(point.masteryLevel)}
                              {"☆".repeat(5 - point.masteryLevel)}
                            </span>
                          </div>
                          <div>
                            <span className="text-sm font-medium">
                              置信度:{" "}
                            </span>
                            <span className="text-sm">{point.confidence}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
