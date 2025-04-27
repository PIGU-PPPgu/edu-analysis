-- 添加AI配置表
CREATE TABLE IF NOT EXISTS user_ai_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(255) NOT NULL,
  version VARCHAR(255),
  api_key_encrypted TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  custom_providers JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 为用户AI配置表添加RLS策略
ALTER TABLE user_ai_configs ENABLE ROW LEVEL SECURITY;

-- 只允许用户访问自己的AI配置
CREATE POLICY "Users can only access their own AI configs"
  ON user_ai_configs
  FOR ALL
  USING (auth.uid() = user_id);

-- 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_ai_configs_timestamp
BEFORE UPDATE ON user_ai_configs
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp(); 