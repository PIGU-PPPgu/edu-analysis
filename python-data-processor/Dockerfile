# Python数据处理服务Dockerfile
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 设置pip配置（CI环境使用官方源，本地可覆盖）
ARG PIP_INDEX_URL=https://pypi.org/simple
RUN if [ -n "$PIP_INDEX_URL" ]; then pip config set global.index-url $PIP_INDEX_URL; fi

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 5000

# 设置环境变量
ENV FLASK_ENV=development
ENV FLASK_DEBUG=1
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# 启动Flask服务
CMD ["python", "app.py"]