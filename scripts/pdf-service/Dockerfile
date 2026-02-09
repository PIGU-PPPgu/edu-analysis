# PDF生成服务 Docker镜像
FROM python:3.9-slim

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    pandoc \
    texlive-xetex \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-extra \
    git \
    && rm -rf /var/lib/apt/lists/*

# 安装LaTeX包
RUN tlmgr init-usertree && \
    tlmgr update --self && \
    tlmgr install ucs fvextra sectsty cancel framed titlesec ctex xecjk

# 安装42ai_pdf_builder
RUN pip install --no-cache-dir git+https://github.com/42-AI/42ai_pdf_builder.git

# 安装Flask用于API服务
RUN pip install --no-cache-dir flask flask-cors

# 创建工作目录
WORKDIR /app

# 复制API服务代码
COPY pdf_api.py /app/
COPY templates/ /app/templates/

# 暴露端口
EXPOSE 5000

# 启动服务
CMD ["python", "pdf_api.py"]
