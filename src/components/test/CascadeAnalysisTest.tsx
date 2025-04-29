import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { 
  Button, Paper, Typography, Box, CircularProgress, Alert, 
  Card, CardContent, Chip, Divider, List, ListItem, ListItemText, Rating,
  TextField
} from '@mui/material';
import { KnowledgePoint } from '@/types/homework';
import { performSingleModelAnalysis } from '@/services/apiService';
import { VISION_MODELS_FOR_TEST } from '@/services/providers'; 
import { saveUserAPIKey, getUserAPIKey } from '@/utils/userAuth';
import { toast } from 'sonner';

// 只保留豆包视觉模型
const DOUBAO_VISION_MODEL = VISION_MODELS_FOR_TEST.find(m => m.provider === 'doubao' && m.type === 'vision');

if (!DOUBAO_VISION_MODEL) {
  console.error("豆包视觉模型配置未找到!");
  // 可以在这里抛出错误或设置一个默认值，以防万一
}

const DOUBAO_PROVIDER_ID = 'doubao';

export default function CascadeAnalysisTest() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [currentApiKey, setCurrentApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchKey = async () => {
      setLoadingKey(true);
      const key = await getUserAPIKey(DOUBAO_PROVIDER_ID);
      setCurrentApiKey(key);
      setApiKeyInput(key || '');
      setLoadingKey(false);
    };
    fetchKey();
  }, []);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.match('image.*')) {
      setError('请上传图片文件');
      return;
    }
    setImage(file);
    setError('');
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
      toast.error('请输入 API 密钥');
      return;
    }
    try {
      await saveUserAPIKey(DOUBAO_PROVIDER_ID, apiKeyInput);
      setCurrentApiKey(apiKeyInput);
      toast.success('豆包 API 密钥已保存');
    } catch (err) {
      toast.error('保存密钥失败');
      console.error(err);
    }
  };

  const handleTest = async () => {
    if (!DOUBAO_VISION_MODEL) {
       setError('豆包视觉模型配置错误');
       return;
    }
    if (!image || !imagePreview) {
      setError('请先上传图片');
      return;
    }
    if (!currentApiKey) {
      setError('请先保存豆包 API 密钥');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const analysisResult = await performSingleModelAnalysis(
        imagePreview,
        [], 
        DOUBAO_VISION_MODEL.id
      );
      setResult(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto', my: 4 }}>
      <Typography variant="h5" gutterBottom>豆包视觉模型分析测试</Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        使用模型: {DOUBAO_VISION_MODEL?.name || 'N/A'} ({DOUBAO_VISION_MODEL?.id || 'N/A'})
      </Typography>

      <Card variant="outlined" sx={{ my: 3, p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>API 密钥管理 (临时)</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            label={`豆包 (${DOUBAO_PROVIDER_ID}) API 密钥`}
            type="password"
            value={apiKeyInput}
            onChange={handleApiKeyChange}
            placeholder="输入豆包 API 密钥"
            disabled={loadingKey}
            size="small"
          />
          <Button 
            variant="contained"
            size="small"
            onClick={handleSaveApiKey}
            disabled={loadingKey || !apiKeyInput || apiKeyInput === currentApiKey}
          >
            保存密钥
          </Button>
        </Box>
        {loadingKey && <Typography variant="caption" sx={{mt: 1}}>正在加载密钥...</Typography>}
        {currentApiKey && <Typography variant="caption" sx={{mt: 1, color: 'green'}}>当前已保存密钥。</Typography>}
        {!loadingKey && !currentApiKey && <Typography variant="caption" sx={{mt: 1, color: 'orange'}}>尚未保存密钥。</Typography>}
      </Card>

      <Box sx={{ my: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          style={{ display: 'none' }}
          ref={fileInputRef}
        />
        
        {imagePreview ? (
          <Box sx={{ mb: 2, textAlign: 'center' }}>
            <img 
              src={imagePreview} 
              alt="作业图片预览" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '300px', 
                objectFit: 'contain',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }} 
            />
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              {image?.name} ({image ? Math.round(image.size / 1024) : 0} KB)
            </Typography>
          </Box>
        ) : (
          <Box 
            sx={{ 
              width: '100%', 
              height: '200px', 
              border: '2px dashed #ccc',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              cursor: 'pointer',
              '&:hover': { borderColor: '#aaa' }
            }}
            onClick={handleUploadClick}
          >
            <Typography variant="body1" color="text.secondary">
              点击上传作业图片
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={handleUploadClick}
          >
            {imagePreview ? '更换图片' : '上传图片'}
          </Button>
          
          <Button 
            variant="contained" 
            onClick={handleTest}
            disabled={loading || !imagePreview || !currentApiKey}
          >
            {loading ? <CircularProgress size={24} /> : '开始分析'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Box sx={{ mt: 4 }}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1">分析元数据</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                <Chip label={`分析时间: ${result.meta.analysisTime}ms`} />
                <Chip label={`知识点数量: ${result.meta.knowledgePointsCount}`} />
                <Chip label={`提供商: ${result.meta.provider}`} />
                <Chip label={`模型: ${result.meta.model}`} />
              </Box>
            </CardContent>
          </Card>

          <Typography variant="h6" gutterBottom>识别到的知识点</Typography>
            <List>
              {result.result.knowledgePoints.map((point: KnowledgePoint, index: number) => (
                <React.Fragment key={index}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">{point.name}</Typography>
                          {point.isNew && <Chip label="新" size="small" color="primary" />}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" sx={{ mb: 1 }}>{point.description}</Typography> 
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 1 }}> 
                            <Box>
                              <Typography variant="caption">重要性</Typography>
                              <Rating value={point.importance} readOnly max={5} />
                            </Box>
                            <Box>
                              <Typography variant="caption">掌握程度</Typography>
                              <Rating value={point.masteryLevel} readOnly max={5} />
                            </Box>
                            <Box>
                              <Typography variant="caption">置信度</Typography>
                              <Typography variant="body2">{point.confidence}%</Typography>
                            </Box>
                          </Box>
                        </>
                      }
                    />
                  </ListItem>
                  {index < result.result.knowledgePoints.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
        </Box>
      )}
    </Paper>
  );
} 