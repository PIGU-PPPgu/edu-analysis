#!/bin/bash
# Task Analyzer: Determine which AIs to invoke based on task description
# Usage: bash .claude/scripts/task-analyzer.sh "<task_description>"

TASK_DESCRIPTION=$1

# Initialize flags
HAS_FRONTEND=false
HAS_BACKEND=false

# Frontend keywords (English and Chinese)
if echo "$TASK_DESCRIPTION" | grep -qiE "(component|ui|界面|样式|tailwind|css|前端|页面|按钮|表单|modal|dialog|layout|布局|responsive|响应式|animation|动画|hover|悬停|click|点击|visual|视觉|design|设计|style|造型|标签页|tab|tabs|contentabs|render|渲染|display|显示|canvas|画布|hook|hooks|state|状态|react|vue|组件|交互|shadcn|图表|echarts|recharts|可视化|导航|navigation|菜单|menu)"; then
  HAS_FRONTEND=true
fi

# Backend keywords (English and Chinese)
if echo "$TASK_DESCRIPTION" | grep -qiE "(api|endpoint|database|数据库|后端|服务|接口|模型|schema|认证|权限|authentication|authorization|query|查询|crud|server|服务器|route|路由|middleware|中间件|validation|验证|security|安全|stream|streaming|流式|parser|解析|event|事件|sse|websocket|redis|postgresql|cache|缓存|supabase|rls|migration|迁移|成绩|grade|学生|student|班级|class|考试|exam|预警|warning)"; then
  HAS_BACKEND=true
fi

# Output decision
if $HAS_FRONTEND && $HAS_BACKEND; then
  echo "FULL_STACK"
elif $HAS_FRONTEND; then
  echo "FRONTEND_ONLY"
elif $HAS_BACKEND; then
  echo "BACKEND_ONLY"
else
  echo "SIMPLE_TASK"
fi
