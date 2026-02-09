"""
PDF生成API服务
将Markdown转换为专业的PDF报告
"""

from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import subprocess
import tempfile
import os
import shutil
from pathlib import Path

app = Flask(__name__)
CORS(app)


@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({'status': 'ok', 'service': 'pdf-builder'})


@app.route('/api/generate-pdf', methods=['POST'])
def generate_pdf():
    """
    生成PDF报告

    请求体：
    {
        "markdown": "# 报告标题\n\n内容...",
        "title": "增值评价分析报告",
        "template": "simple",  // 或 "bootcamp"
        "logo": "data:image/png;base64,..."  // 可选
    }
    """
    try:
        data = request.json
        markdown_content = data.get('markdown', '')
        title = data.get('title', '分析报告')
        template = data.get('template', 'simple')
        logo_data = data.get('logo')

        if not markdown_content:
            return jsonify({'error': '缺少markdown内容'}), 400

        # 创建临时工作目录
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # 保存Markdown文件
            md_file = temp_path / 'report.md'
            md_file.write_text(markdown_content, encoding='utf-8')

            # 保存Logo（如果有）
            logo_file = None
            if logo_data:
                logo_file = temp_path / 'logo.png'
                # 解析base64并保存
                import base64
                if logo_data.startswith('data:image'):
                    logo_data = logo_data.split(',')[1]
                logo_bytes = base64.b64decode(logo_data)
                logo_file.write_bytes(logo_bytes)

            # 输出PDF路径
            output_pdf = temp_path / 'output.pdf'

            # 构建命令
            if template == 'simple':
                cmd = [
                    'pdf-builder', 'simple',
                    '--project-title', title,
                    '--input-directory', str(temp_path),
                    '--output-path', str(output_pdf)
                ]
                if logo_file:
                    cmd.extend(['--logo-file', str(logo_file)])
            else:
                # Bootcamp模式
                cmd = [
                    'pdf-builder', 'bootcamp',
                    '--bootcamp-title', title,
                    '--input-directory', str(temp_path),
                    '--day-title', data.get('subtitle', '报告'),
                    '--output-path', str(output_pdf)
                ]
                if logo_file:
                    cmd.extend(['--logo-file', str(logo_file)])

            # 执行转换
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode != 0:
                return jsonify({
                    'error': 'PDF生成失败',
                    'stderr': result.stderr,
                    'stdout': result.stdout
                }), 500

            # 检查PDF是否生成
            if not output_pdf.exists():
                return jsonify({'error': 'PDF文件未生成'}), 500

            # 返回PDF文件
            return send_file(
                str(output_pdf),
                mimetype='application/pdf',
                as_attachment=True,
                download_name=f'{title}.pdf'
            )

    except subprocess.TimeoutExpired:
        return jsonify({'error': 'PDF生成超时'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/preview', methods=['POST'])
def preview():
    """
    预览Markdown渲染效果（返回HTML）
    """
    try:
        data = request.json
        markdown_content = data.get('markdown', '')

        if not markdown_content:
            return jsonify({'error': '缺少markdown内容'}), 400

        # 使用pandoc转换为HTML
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            md_file = temp_path / 'preview.md'
            html_file = temp_path / 'preview.html'

            md_file.write_text(markdown_content, encoding='utf-8')

            cmd = [
                'pandoc',
                str(md_file),
                '-o', str(html_file),
                '--standalone',
                '--css', 'https://cdn.jsdelivr.net/npm/github-markdown-css/github-markdown.min.css'
            ]

            subprocess.run(cmd, check=True, timeout=10)

            html_content = html_file.read_text(encoding='utf-8')

            return jsonify({'html': html_content})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # 开发环境
    app.run(host='0.0.0.0', port=5000, debug=True)
