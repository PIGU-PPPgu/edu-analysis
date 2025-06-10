-- 修复AI配置相关的数据库结构

-- 1. 为user_profiles表添加ai_config字段
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ai_config JSONB DEFAULT '{
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "apiKey": "",
  "temperature": 0.7,
  "maxTokens": 2000,
  "enabled": false
}'::jsonb;

-- 2. 创建AI配置管理表（可选，更结构化的方案）
CREATE TABLE IF NOT EXISTS ai_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  api_endpoint TEXT,
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, provider_id)
);

-- 3. 创建预设AI提供商配置表
CREATE TABLE IF NOT EXISTS ai_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  api_endpoint TEXT,
  supports_streaming BOOLEAN DEFAULT false,
  models JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. 插入默认AI提供商配置
INSERT INTO ai_providers (id, name, description, api_endpoint, supports_streaming, models) VALUES
('openai', 'OpenAI', 'OpenAI GPT系列模型', 'https://api.openai.com/v1/chat/completions', true, '[
  {"id": "gpt-4", "name": "GPT-4", "maxTokens": 8192},
  {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "maxTokens": 4096}
]'::jsonb),
('doubao', '豆包(火山方舟)', '字节跳动豆包AI模型', 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', true, '[
  {"id": "ep-20241205172724-xzmqm", "name": "豆包通用模型", "maxTokens": 4096}
]'::jsonb),
('deepseek', 'DeepSeek', 'DeepSeek AI模型', 'https://api.deepseek.com/v1/chat/completions', true, '[
  {"id": "deepseek-chat", "name": "DeepSeek Chat", "maxTokens": 4096}
]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  api_endpoint = EXCLUDED.api_endpoint,
  supports_streaming = EXCLUDED.supports_streaming,
  models = EXCLUDED.models;

-- 5. 设置安全策略
ALTER TABLE ai_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;

-- AI配置只能被拥有者访问
CREATE POLICY "Users can manage their own AI configs" ON ai_configurations
  FOR ALL USING (auth.uid() = user_id);

-- AI提供商信息对所有认证用户可读
CREATE POLICY "AI providers are readable by authenticated users" ON ai_providers
  FOR SELECT USING (auth.role() = 'authenticated');

-- 6. 创建更新时间戳函数
CREATE OR REPLACE FUNCTION update_ai_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建触发器
CREATE TRIGGER update_ai_configurations_timestamp
  BEFORE UPDATE ON ai_configurations
  FOR EACH ROW EXECUTE FUNCTION update_ai_config_timestamp();

-- 8. 验证安装
SELECT 
  'AI配置数据库结构安装完成!' as status,
  (SELECT COUNT(*) FROM ai_providers) as providers_count,
  'AI功能数据库就绪，可以配置API密钥启用' as message; 