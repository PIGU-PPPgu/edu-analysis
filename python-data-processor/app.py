#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
学生成绩数据预处理服务
使用Python + pandas处理Excel/CSV文件，提供更可靠的数据解析和字段识别
支持用户认证和数据隔离
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import tempfile
import uuid
from datetime import datetime
import logging
import traceback
from typing import Dict, List, Any, Optional, Tuple
import re
import json
import jwt
import requests

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 配置
UPLOAD_FOLDER = tempfile.gettempdir()
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}

# Supabase配置
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://giluhqotfjpmofowvogn.supabase.co')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8Ho')

def authenticate_user(authorization_header: str) -> Optional[str]:
    """验证用户身份并返回用户ID"""
    if not authorization_header:
        return None
    
    try:
        # 提取Bearer token
        if not authorization_header.startswith('Bearer '):
            return None
        
        token = authorization_header.replace('Bearer ', '')
        
        # 验证JWT token
        headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        # 调用Supabase验证token
        response = requests.get(f'{SUPABASE_URL}/auth/v1/user', headers=headers)
        
        if response.status_code == 200:
            user_data = response.json()
            return user_data.get('id')
        else:
            logger.warning(f"用户认证失败: {response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"用户认证异常: {e}")
        return None

def require_auth(f):
    """装饰器：要求用户认证"""
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        user_id = authenticate_user(auth_header)
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': '用户未认证或认证已过期，请重新登录'
            }), 401
        
        # 将用户ID添加到请求上下文
        request.user_id = user_id
        return f(*args, **kwargs)
    
    decorated_function.__name__ = f.__name__
    return decorated_function

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

class ExcelFieldMapper:
    """增强的Excel字段映射器"""
    
    def __init__(self):
        # 字段映射规则 - 更全面的中文字段识别
        self.field_mappings = {
            'student_id': [
                '学号', '学生号', '学生学号', '考号', '考生号', 'student_id', 'id', 
                '准考证号', '学籍号', '编号', '序号', '学生编号'
            ],
            'name': [
                '姓名', '学生姓名', '名字', 'name', '学生', '考生姓名', '考生'
            ],
            'class_name': [
                '班级', '班级名称', '所在班级', 'class', 'class_name', '年班', 
                '班', '年级班级', '班级信息'
            ],
            'grade_level': [
                '年级', '年级信息', 'grade', 'grade_level', '学年', '年级名称'
            ],
            # 学科成绩字段
            'chinese': ['语文', '语文成绩', '中文', 'chinese'],
            'math': ['数学', '数学成绩', 'math', 'mathematics'],
            'english': ['英语', '英语成绩', 'english'],
            'physics': ['物理', '物理成绩', 'physics'],
            'chemistry': ['化学', '化学成绩', 'chemistry'],
            'biology': ['生物', '生物成绩', 'biology'],
            'politics': ['政治', '思想政治', '政治成绩', 'politics'],
            'history': ['历史', '历史成绩', 'history'],
            'geography': ['地理', '地理成绩', 'geography'],
            # 总分和排名
            'total_score': [
                '总分', '总成绩', '合计', '总计', 'total', 'total_score', 
                '总分数', '成绩总分', '累计分数'
            ],
            'rank_in_class': [
                '班级排名', '班排名', '班级名次', '班内排名', 'class_rank', 
                '班级排序', '班级位次'
            ],
            'rank_in_grade': [
                '年级排名', '年排名', '年级名次', '年级位次', 'grade_rank',
                '全年级排名', '年级排序'
            ]
        }
        
        # 学科到标准名称的映射
        self.subject_standardization = {
            '语文': 'chinese',
            '数学': 'math', 
            '英语': 'english',
            '物理': 'physics',
            '化学': 'chemistry',
            '生物': 'biology',
            '政治': 'politics',
            '历史': 'history',
            '地理': 'geography'
        }
    
    def fuzzy_match(self, column_name: str, candidates: List[str]) -> Tuple[str, float]:
        """模糊匹配字段名"""
        column_clean = re.sub(r'[^\w\u4e00-\u9fff]', '', column_name.lower())
        
        best_match = None
        best_score = 0
        
        for candidate in candidates:
            candidate_clean = re.sub(r'[^\w\u4e00-\u9fff]', '', candidate.lower())
            
            # 完全匹配
            if column_clean == candidate_clean:
                return candidate, 1.0
            
            # 包含匹配
            if candidate_clean in column_clean or column_clean in candidate_clean:
                score = min(len(candidate_clean), len(column_clean)) / max(len(candidate_clean), len(column_clean))
                if score > best_score:
                    best_match = candidate
                    best_score = score
        
        return best_match, best_score
    
    def map_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        """映射DataFrame的列名到标准字段"""
        column_mapping = {}
        confidence_scores = {}
        
        for col in df.columns:
            col_str = str(col).strip()
            best_field = None
            best_score = 0
            
            # 尝试匹配每个字段类型
            for field_type, candidates in self.field_mappings.items():
                match, score = self.fuzzy_match(col_str, candidates)
                if score > best_score and score >= 0.6:  # 最低匹配阈值
                    best_field = field_type
                    best_score = score
            
            if best_field:
                column_mapping[col_str] = best_field
                confidence_scores[col_str] = best_score
                logger.info(f"字段映射: '{col_str}' -> '{best_field}' (置信度: {best_score:.2f})")
        
        return column_mapping
    
    def detect_data_structure(self, df: pd.DataFrame) -> str:
        """检测数据结构类型"""
        # 检查是否是宽格式（每个学科一列）还是长格式（学科和成绩分开列）
        subject_columns = 0
        for col in df.columns:
            col_str = str(col).lower()
            for subject in self.subject_standardization.keys():
                if subject in col_str:
                    subject_columns += 1
                    break
        
        if subject_columns >= 3:
            return 'wide'  # 宽格式：每个学科一列
        else:
            return 'long'  # 长格式：可能有subject和score列
    
    def process_wide_format(self, df: pd.DataFrame, column_mapping: Dict[str, str]) -> List[Dict[str, Any]]:
        """处理宽格式数据（每个学科一列）"""
        results = []
        
        # 获取基础字段
        base_fields = ['student_id', 'name', 'class_name', 'grade_level', 'total_score', 'rank_in_class', 'rank_in_grade']
        
        for _, row in df.iterrows():
            # 基础学生信息
            student_base = {}
            for original_col, mapped_field in column_mapping.items():
                if mapped_field in base_fields:
                    student_base[mapped_field] = self.clean_value(row[original_col])
            
            # 处理学科成绩
            for original_col, mapped_field in column_mapping.items():
                if mapped_field in self.subject_standardization.values():
                    # 为每个学科创建一条记录
                    record = student_base.copy()
                    record['subject'] = self.get_subject_chinese_name(mapped_field)
                    record['score'] = self.clean_numeric_value(row[original_col])
                    
                    if record['score'] is not None:  # 只添加有成绩的记录
                        results.append(record)
        
        return results
    
    def process_long_format(self, df: pd.DataFrame, column_mapping: Dict[str, str]) -> List[Dict[str, Any]]:
        """处理长格式数据（可能有subject和score列）"""
        results = []
        
        for _, row in df.iterrows():
            record = {}
            for original_col, mapped_field in column_mapping.items():
                record[mapped_field] = self.clean_value(row[original_col])
            
            # 如果没有subject字段，可能是总分记录
            if 'subject' not in record:
                record['subject'] = '总分'
            
            results.append(record)
        
        return results
    
    def clean_value(self, value) -> Any:
        """清理数据值"""
        if pd.isna(value) or value == '' or str(value).strip() == '':
            return None
        
        # 转换为字符串并清理
        str_value = str(value).strip()
        
        # 移除常见的无用字符
        str_value = re.sub(r'^[\s\-_]+|[\s\-_]+$', '', str_value)
        
        return str_value if str_value else None
    
    def clean_numeric_value(self, value) -> Optional[float]:
        """清理数值类型的数据"""
        if pd.isna(value) or value == '' or str(value).strip() == '':
            return None
        
        try:
            # 尝试直接转换为数字
            if isinstance(value, (int, float)):
                return float(value)
            
            # 字符串处理
            str_value = str(value).strip()
            
            # 移除常见的非数字字符
            str_value = re.sub(r'[^\d\.\-\+]', '', str_value)
            
            if str_value:
                return float(str_value)
        except (ValueError, TypeError):
            pass
        
        return None
    
    def get_subject_chinese_name(self, english_name: str) -> str:
        """获取学科的中文名称"""
        name_mapping = {v: k for k, v in self.subject_standardization.items()}
        return name_mapping.get(english_name, english_name)

def read_excel_file(file_path: str) -> pd.DataFrame:
    """读取Excel文件，自动检测格式"""
    try:
        # 尝试读取Excel文件
        if file_path.endswith('.csv'):
            # CSV文件，尝试不同编码
            encodings = ['utf-8', 'gbk', 'gb2312', 'utf-8-sig']
            df = None
            
            for encoding in encodings:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    logger.info(f"成功使用 {encoding} 编码读取CSV文件")
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is None:
                raise ValueError("无法读取CSV文件，所有编码尝试都失败")
        
        else:
            # Excel文件
            df = pd.read_excel(file_path, engine='openpyxl')
        
        # 基本数据清理
        df = df.dropna(how='all')  # 删除完全空白的行
        df = df.dropna(axis=1, how='all')  # 删除完全空白的列
        
        # 清理列名
        df.columns = [str(col).strip() for col in df.columns]
        
        logger.info(f"成功读取文件，数据形状: {df.shape}")
        logger.info(f"列名: {list(df.columns)}")
        
        return df
        
    except Exception as e:
        logger.error(f"读取文件失败: {str(e)}")
        raise

def validate_processed_data(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """验证处理后的数据"""
    if not data:
        return {
            'valid': False,
            'errors': ['处理后的数据为空'],
            'warnings': []
        }
    
    errors = []
    warnings = []
    
    # 检查必需字段
    required_fields = ['student_id', 'name']
    for i, record in enumerate(data):
        for field in required_fields:
            if not record.get(field):
                errors.append(f"记录 {i+1}: 缺少必需字段 '{field}'")
    
    # 检查数据一致性
    student_ids = [r.get('student_id') for r in data if r.get('student_id')]
    if len(student_ids) != len(set(student_ids)):
        warnings.append('检测到重复的学号')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'total_records': len(data),
        'unique_students': len(set(student_ids))
    }

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy',
        'service': 'student-data-processor',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/process', methods=['POST'])
@require_auth
def process_file():
    """处理上传的文件 - 需要用户认证"""
    try:
        # 检查文件是否存在
        if 'file' not in request.files:
            return jsonify({'error': '没有上传文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': f'不支持的文件格式，仅支持: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
        
        # 保存临时文件
        temp_filename = str(uuid.uuid4()) + '_' + file.filename
        temp_path = os.path.join(UPLOAD_FOLDER, temp_filename)
        file.save(temp_path)
        
        try:
            # 读取文件
            df = read_excel_file(temp_path)
            
            # 初始化字段映射器
            mapper = ExcelFieldMapper()
            
            # 映射字段
            column_mapping = mapper.map_columns(df)
            
            if not column_mapping:
                return jsonify({
                    'error': '无法识别任何有效字段',
                    'available_columns': list(df.columns),
                    'suggestions': '请确保文件包含学号、姓名等基础字段'
                }), 400
            
            # 检测数据结构
            data_structure = mapper.detect_data_structure(df)
            logger.info(f"检测到数据结构类型: {data_structure}")
            
            # 处理数据
            if data_structure == 'wide':
                processed_data = mapper.process_wide_format(df, column_mapping)
            else:
                processed_data = mapper.process_long_format(df, column_mapping)
            
            # 验证数据
            validation_result = validate_processed_data(processed_data)
            
            # 生成处理报告
            processing_report = {
                'file_info': {
                    'filename': file.filename,
                    'size_bytes': len(file.read()),
                    'rows': len(df),
                    'columns': len(df.columns)
                },
                'field_mapping': column_mapping,
                'data_structure': data_structure,
                'processing_stats': {
                    'total_records': len(processed_data),
                    'unique_students': len(set(r.get('student_id') for r in processed_data if r.get('student_id'))),
                    'subjects_detected': len(set(r.get('subject') for r in processed_data if r.get('subject')))
                },
                'validation': validation_result,
                'timestamp': datetime.now().isoformat()
            }
            
            return jsonify({
                'success': True,
                'data': processed_data,
                'report': processing_report
            })
        
        finally:
            # 清理临时文件
            try:
                os.remove(temp_path)
            except OSError:
                pass
    
    except Exception as e:
        logger.error(f"处理文件时发生错误: {str(e)}")
        logger.error(traceback.format_exc())
        
        return jsonify({
            'error': f'处理文件时发生错误: {str(e)}',
            'type': type(e).__name__
        }), 500

@app.route('/analyze', methods=['POST'])
@require_auth
def analyze_file():
    """分析文件结构，不进行实际处理 - 需要用户认证"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': '没有上传文件'}), 400
        
        file = request.files['file']
        if not allowed_file(file.filename):
            return jsonify({'error': f'不支持的文件格式'}), 400
        
        # 保存临时文件
        temp_filename = str(uuid.uuid4()) + '_' + file.filename
        temp_path = os.path.join(UPLOAD_FOLDER, temp_filename)
        file.save(temp_path)
        
        try:
            # 读取文件
            df = read_excel_file(temp_path)
            
            # 分析文件结构
            mapper = ExcelFieldMapper()
            column_mapping = mapper.map_columns(df)
            data_structure = mapper.detect_data_structure(df)
            
            # 预览数据（前5行）
            preview_data = []
            for i, (_, row) in enumerate(df.head().iterrows()):
                preview_row = {}
                for col in df.columns:
                    preview_row[str(col)] = str(row[col]) if not pd.isna(row[col]) else None
                preview_data.append(preview_row)
            
            return jsonify({
                'success': True,
                'analysis': {
                    'file_info': {
                        'filename': file.filename,
                        'rows': len(df),
                        'columns': len(df.columns)
                    },
                    'columns': list(df.columns),
                    'field_mapping': column_mapping,
                    'data_structure': data_structure,
                    'preview': preview_data,
                    'recommendations': {
                        'processing_type': data_structure,
                        'mapped_fields': len(column_mapping),
                        'total_fields': len(df.columns),
                        'mapping_coverage': f"{len(column_mapping)/len(df.columns)*100:.1f}%"
                    }
                }
            })
        
        finally:
            try:
                os.remove(temp_path)
            except OSError:
                pass
    
    except Exception as e:
        logger.error(f"分析文件时发生错误: {str(e)}")
        return jsonify({
            'error': f'分析文件时发生错误: {str(e)}',
            'type': type(e).__name__
        }), 500

if __name__ == '__main__':
    logger.info("启动学生数据预处理服务...")
    app.run(host='0.0.0.0', port=5000, debug=True) 