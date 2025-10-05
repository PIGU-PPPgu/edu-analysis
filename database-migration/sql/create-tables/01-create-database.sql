-- =============================================
-- 数据库初始化脚本
-- 版本: v1.0
-- 日期: 2025-01-21
-- 说明: 创建数据库和基础配置
-- =============================================

-- 创建数据库（如果不存在）
-- 注意: 需要有创建数据库的权限
-- CREATE DATABASE edu_system
--     WITH 
--     OWNER = postgres
--     ENCODING = 'UTF8'
--     LC_COLLATE = 'en_US.utf8'
--     LC_CTYPE = 'en_US.utf8'
--     TABLESPACE = pg_default
--     CONNECTION LIMIT = -1;

-- 连接到数据库
-- \c edu_system;

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID生成
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- 文本相似度搜索
CREATE EXTENSION IF NOT EXISTS "btree_gist";     -- GiST索引支持
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- 加密功能

-- 设置默认配置
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- 创建schema
CREATE SCHEMA IF NOT EXISTS edu;
SET search_path TO edu, public;

-- 创建自定义类型
CREATE TYPE student_status AS ENUM ('active', 'graduated', 'transferred', 'suspended');
CREATE TYPE exam_type AS ENUM ('monthly', 'midterm', 'final', 'mock');
CREATE TYPE warning_level AS ENUM ('info', 'warning', 'danger', 'critical');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- 创建通用函数
-- 更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 生成学号函数
CREATE OR REPLACE FUNCTION generate_student_no(year_val VARCHAR, class_no INTEGER)
RETURNS VARCHAR AS $$
BEGIN
    RETURN year_val || LPAD(class_no::TEXT, 2, '0') || LPAD(nextval('student_no_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 创建序列
CREATE SEQUENCE IF NOT EXISTS student_no_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS teacher_no_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS exam_no_seq START WITH 1;

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '✅ 数据库初始化完成';
    RAISE NOTICE '📦 已启用扩展: uuid-ossp, pg_trgm, btree_gist, pgcrypto';
    RAISE NOTICE '🔧 已创建自定义类型和函数';
END $$;