-- 🧠 Master-AI-Data: 用户行为数据表
-- 创建用户行为事件表

-- 用户行为事件表
CREATE TABLE IF NOT EXISTS user_behavior_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  page_path TEXT NOT NULL,
  element_id TEXT,
  context_data JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  duration INTEGER, -- 操作持续时间（毫秒）
  user_agent TEXT NOT NULL,
  screen_resolution TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('desktop', 'tablet', 'mobile')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户行为事件索引
CREATE INDEX IF NOT EXISTS idx_user_behavior_events_user_id ON user_behavior_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_events_timestamp ON user_behavior_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_behavior_events_action_type ON user_behavior_events(action_type);
CREATE INDEX IF NOT EXISTS idx_user_behavior_events_session ON user_behavior_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_events_page_path ON user_behavior_events(page_path);

-- 用户偏好缓存表（提升推荐系统性能）
CREATE TABLE IF NOT EXISTS user_preferences_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  preferred_pages TEXT[] DEFAULT '{}',
  frequent_actions TEXT[] DEFAULT '{}',
  preferred_filters JSONB DEFAULT '{}',
  analysis_patterns JSONB DEFAULT '{}',
  learning_style JSONB DEFAULT '{}',
  performance_preferences JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户偏好缓存索引
CREATE INDEX IF NOT EXISTS idx_user_preferences_cache_user_id ON user_preferences_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_cache_updated ON user_preferences_cache(last_updated);

-- 推荐记录表（追踪推荐效果）
CREATE TABLE IF NOT EXISTS recommendation_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id TEXT NOT NULL,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  action_url TEXT,
  priority INTEGER NOT NULL,
  confidence NUMERIC(3,2) NOT NULL,
  reasoning TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('generated', 'shown', 'clicked', 'dismissed')) DEFAULT 'generated',
  clicked_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 推荐记录索引
CREATE INDEX IF NOT EXISTS idx_recommendation_records_user_id ON recommendation_records(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_records_status ON recommendation_records(status);
CREATE INDEX IF NOT EXISTS idx_recommendation_records_type ON recommendation_records(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_records_created ON recommendation_records(created_at);

-- RLS 策略
ALTER TABLE user_behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_records ENABLE ROW LEVEL SECURITY;

-- 用户行为事件 RLS 策略
CREATE POLICY "用户只能访问自己的行为事件" ON user_behavior_events
  FOR ALL USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 用户偏好缓存 RLS 策略
CREATE POLICY "用户只能访问自己的偏好缓存" ON user_preferences_cache
  FOR ALL USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 推荐记录 RLS 策略
CREATE POLICY "用户只能访问自己的推荐记录" ON recommendation_records
  FOR ALL USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 插入触发器：自动更新用户偏好缓存
CREATE OR REPLACE FUNCTION update_user_preferences_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- 当用户行为事件达到一定数量时，标记偏好缓存需要更新
  INSERT INTO user_preferences_cache (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) 
  DO UPDATE SET last_updated = NOW() - INTERVAL '1 hour'; -- 标记为需要更新
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 每10个事件触发一次偏好缓存更新提示
CREATE TRIGGER trigger_update_preferences_cache
  AFTER INSERT ON user_behavior_events
  FOR EACH ROW
  WHEN (random() < 0.1) -- 10%的概率触发
  EXECUTE FUNCTION update_user_preferences_cache();

-- 清理过期推荐记录的函数
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS void AS $$
BEGIN
  DELETE FROM recommendation_records 
  WHERE expires_at IS NOT NULL AND expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- 定期清理任务（需要在应用层面调用）
COMMENT ON FUNCTION cleanup_expired_recommendations() IS '清理过期的推荐记录，建议定期调用';

-- 视图：用户行为统计
CREATE OR REPLACE VIEW user_behavior_stats AS
SELECT 
  user_id,
  COUNT(*) as total_events,
  COUNT(DISTINCT session_id) as session_count,
  COUNT(DISTINCT page_path) as unique_pages_visited,
  COUNT(DISTINCT DATE(timestamp)) as active_days,
  MAX(timestamp) as last_activity,
  MIN(timestamp) as first_activity,
  COUNT(*) FILTER (WHERE action_type = 'page_view') as page_views,
  COUNT(*) FILTER (WHERE action_type LIKE '%click%') as click_events,
  COUNT(*) FILTER (WHERE action_type LIKE '%search%') as search_events,
  AVG(duration) FILTER (WHERE duration IS NOT NULL) as avg_session_duration
FROM user_behavior_events 
GROUP BY user_id;

-- 用户行为统计视图权限
GRANT SELECT ON user_behavior_stats TO authenticated;

-- 添加注释
COMMENT ON TABLE user_behavior_events IS '用户行为事件记录表，存储所有用户交互数据';
COMMENT ON TABLE user_preferences_cache IS '用户偏好缓存表，存储分析后的用户偏好数据';
COMMENT ON TABLE recommendation_records IS '推荐记录表，追踪推荐生成、展示和交互情况';
COMMENT ON VIEW user_behavior_stats IS '用户行为统计视图，提供用户活动的聚合数据';