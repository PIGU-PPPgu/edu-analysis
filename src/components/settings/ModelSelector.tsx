import React, { useState, useEffect } from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip,
  Typography,
  Box,
  Grid
} from '@mui/material';
import { ModelInfo } from '@/types/ai';
import { getAvailableModels } from '@/services/aiService';

interface ModelSelectorProps {
  providerId: string;
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

/**
 * 模型选择器组件
 * 提供更直观的模型选择体验
 */
export default function ModelSelector({ providerId, value, onChange, disabled = false }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载提供商支持的模型
  useEffect(() => {
    if (!providerId) {
      setModels([]);
      return;
    }

    setLoading(true);
    // 获取提供商支持的模型
    const availableModels = getAvailableModels(providerId);
    setModels(availableModels);
    setLoading(false);

    // 如果当前选择的模型不在可用模型列表中，选择第一个可用模型
    if (value && availableModels.length > 0 && !availableModels.some(m => m.id === value)) {
      onChange(availableModels[0].id);
    }
  }, [providerId]);

  return (
    <FormControl fullWidth margin="normal" disabled={disabled || loading || models.length === 0}>
      <InputLabel>模型</InputLabel>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label="模型"
        renderValue={(selected) => {
          const model = models.find(m => m.id === selected);
          if (!model) return selected;
          return (
            <Box display="flex" alignItems="center">
              <Typography>{model.name}</Typography>
              <Chip 
                size="small" 
                label={`${model.maxTokens} tokens`} 
                variant="outlined" 
                sx={{ ml: 1 }}
              />
              {model.supportStream && (
                <Chip 
                  size="small" 
                  label="支持流式输出" 
                  color="success" 
                  variant="outlined" 
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          );
        }}
      >
        {models.map(model => (
          <MenuItem key={model.id} value={model.id}>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Typography variant="body1">{model.name}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Chip 
                  size="small" 
                  label={`${model.maxTokens} tokens`} 
                  variant="outlined" 
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                {model.supportStream && (
                  <Chip 
                    size="small" 
                    label="流式输出" 
                    color="success" 
                    variant="outlined" 
                  />
                )}
              </Grid>
            </Grid>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
} 