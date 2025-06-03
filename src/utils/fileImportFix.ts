import { parseExcel, parseCSV, enhancedGenerateInitialMappings } from './fileParsingUtils';
import { supabase } from '../integrations/supabase/client';
import toast from 'react-hot-toast';

// 文件导入修复工具类
export class FileImportFixer {
  
  /**
   * 测试文件解析功能
   */
  async testFileParser(file: File): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    details?: any;
  }> {
    console.log('🔧 开始测试文件解析功能...');
    console.log('文件信息:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    try {
      // 检查文件类型
      const fileName = file.name.toLowerCase();
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      const isCSV = fileName.endsWith('.csv');

      if (!isExcel && !isCSV) {
        return {
          success: false,
          error: '不支持的文件类型。请使用 .xlsx, .xls 或 .csv 文件'
        };
      }

      // 检查文件大小 (50MB限制)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        return {
          success: false,
          error: '文件过大。最大支持50MB的文件'
        };
      }

      let parseResult;

      if (isExcel) {
        console.log('📊 开始解析Excel文件...');
        parseResult = await parseExcel(file);
      } else {
        console.log('📄 开始解析CSV文件...');
        parseResult = await parseCSV(file);
      }

      console.log('✅ 文件解析完成:', {
        success: parseResult.success,
        rowCount: parseResult.data?.length || 0,
        columns: parseResult.columns?.length || 0,
        fileName: parseResult.fileName
      });

      return {
        success: parseResult.success,
        data: parseResult.data,
        details: {
          fileName: parseResult.fileName,
          rowCount: parseResult.data?.length || 0,
          columns: parseResult.columns,
          preview: parseResult.data?.slice(0, 3) // 前3行预览
        }
      };

    } catch (error) {
      console.error('❌ 文件解析失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 测试字段映射功能
   */
  async testFieldMapping(parsedData: any[], fileName: string): Promise<{
    success: boolean;
    mappings?: any;
    error?: string;
    details?: any;
  }> {
    console.log('🗺️ 开始测试字段映射功能...');

    try {
      if (!parsedData || parsedData.length === 0) {
        return {
          success: false,
          error: '没有可用的解析数据进行字段映射'
        };
      }

      // 获取字段列表
      const columns = Object.keys(parsedData[0] || {});
      console.log('原始字段列表:', columns);

      // 生成字段映射
      const mappingResult = await enhancedGenerateInitialMappings(parsedData, fileName);
      
      console.log('✅ 字段映射生成完成:', {
        success: mappingResult.success,
        standardFieldsCount: Object.keys(mappingResult.standardFields || {}).length,
        customFieldsCount: Object.keys(mappingResult.customFields || {}).length,
        confidence: mappingResult.confidence
      });

      return {
        success: mappingResult.success,
        mappings: {
          standardFields: mappingResult.standardFields,
          customFields: mappingResult.customFields
        },
        details: {
          confidence: mappingResult.confidence,
          suggestions: mappingResult.suggestions,
          unmappedFields: mappingResult.unmappedFields
        }
      };

    } catch (error) {
      console.error('❌ 字段映射失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '字段映射过程中出现未知错误'
      };
    }
  }

  /**
   * 测试Supabase连接
   */
  async testSupabaseConnection(): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    console.log('🔗 开始测试Supabase连接...');

    try {
      // 测试基本连接
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.warn('认证检查警告:', authError);
      }

      // 测试数据库查询
      const { data: testData, error: dbError } = await supabase
        .from('students')
        .select('id, name')
        .limit(1);

      if (dbError) {
        return {
          success: false,
          error: `数据库连接失败: ${dbError.message}`,
          details: {
            code: dbError.code,
            hint: dbError.hint
          }
        };
      }

      console.log('✅ Supabase连接测试成功');
      return {
        success: true,
        details: {
          authenticated: !!authData.user,
          databaseAccess: true,
          userEmail: authData.user?.email
        }
      };

    } catch (error) {
      console.error('❌ Supabase连接测试失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Supabase连接测试中出现未知错误'
      };
    }
  }

  /**
   * 测试Edge Function
   */
  async testEdgeFunction(testData: any[]): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    console.log('⚡ 开始测试Edge Function...');

    try {
      if (!testData || testData.length === 0) {
        return {
          success: false,
          error: '没有测试数据可用于Edge Function测试'
        };
      }

      // 准备测试数据
      const sampleData = testData.slice(0, 5); // 只用前5行测试

      const { data, error } = await supabase.functions.invoke('auto-analyze-data', {
        body: {
          data: sampleData,
          examInfo: {
            title: '导入测试',
            type: '测试',
            date: new Date().toISOString().split('T')[0]
          }
        }
      });

      if (error) {
        return {
          success: false,
          error: `Edge Function调用失败: ${error.message}`,
          details: {
            functionName: 'auto-analyze-data',
            errorCode: error.code || 'unknown'
          }
        };
      }

      console.log('✅ Edge Function测试成功');
      return {
        success: true,
        details: {
          functionName: 'auto-analyze-data',
          responseData: data,
          dataProcessed: sampleData.length
        }
      };

    } catch (error) {
      console.error('❌ Edge Function测试失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Edge Function测试中出现未知错误'
      };
    }
  }

  /**
   * 完整的文件导入诊断
   */
  async diagnoseFileImport(file: File): Promise<{
    success: boolean;
    issues: string[];
    fixes: string[];
    testResults: any;
  }> {
    console.log('🔍 开始完整的文件导入诊断...');
    
    const issues: string[] = [];
    const fixes: string[] = [];
    const testResults: any = {};

    // 1. 测试文件解析
    const parseTest = await this.testFileParser(file);
    testResults.parsing = parseTest;
    
    if (!parseTest.success) {
      issues.push(`文件解析失败: ${parseTest.error}`);
      fixes.push('检查文件格式和完整性，确保使用支持的文件类型(.xlsx, .xls, .csv)');
    }

    // 2. 测试字段映射 (如果解析成功)
    if (parseTest.success && parseTest.data) {
      const mappingTest = await this.testFieldMapping(parseTest.data, file.name);
      testResults.mapping = mappingTest;
      
      if (!mappingTest.success) {
        issues.push(`字段映射失败: ${mappingTest.error}`);
        fixes.push('检查Excel/CSV文件的表头是否正确，确保包含学号、姓名等基本字段');
      }
    }

    // 3. 测试Supabase连接
    const connectionTest = await this.testSupabaseConnection();
    testResults.connection = connectionTest;
    
    if (!connectionTest.success) {
      issues.push(`数据库连接失败: ${connectionTest.error}`);
      fixes.push('检查网络连接和Supabase配置，确保已正确登录');
    }

    // 4. 测试Edge Function (如果前面都成功)
    if (parseTest.success && parseTest.data && connectionTest.success) {
      const edgeFunctionTest = await this.testEdgeFunction(parseTest.data);
      testResults.edgeFunction = edgeFunctionTest;
      
      if (!edgeFunctionTest.success) {
        issues.push(`AI分析功能失败: ${edgeFunctionTest.error}`);
        fixes.push('检查AI服务配置，或跳过AI分析直接导入数据');
      }
    }

    const success = issues.length === 0;
    
    console.log('🎯 诊断完成:', {
      success,
      issuesCount: issues.length,
      fixesCount: fixes.length
    });

    return {
      success,
      issues,
      fixes,
      testResults
    };
  }

  /**
   * 修复文件导入中的常见问题
   */
  async fixCommonIssues(): Promise<{
    success: boolean;
    message: string;
    details: string[];
  }> {
    console.log('🔧 开始修复常见的文件导入问题...');
    
    const details: string[] = [];
    
    try {
      // 1. 清理浏览器缓存中的旧数据
      if (typeof localStorage !== 'undefined') {
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.includes('file-import') || 
          key.includes('parsed-data') ||
          key.includes('field-mapping')
        );
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        details.push(`清理了${keysToRemove.length}个缓存项`);
      }

      // 2. 重置Supabase客户端连接
      try {
        await supabase.auth.refreshSession();
        details.push('刷新了Supabase认证会话');
      } catch (refreshError) {
        details.push('Supabase会话刷新失败，可能需要重新登录');
      }

      // 3. 验证必要的数据表
      const tables = ['students', 'grades', 'exams', 'classes'];
      for (const table of tables) {
        try {
          const { error } = await supabase.from(table).select('id').limit(1);
          if (error) {
            details.push(`⚠️ 表 ${table} 访问异常: ${error.message}`);
          } else {
            details.push(`✅ 表 ${table} 访问正常`);
          }
        } catch (tableError) {
          details.push(`❌ 表 ${table} 检查失败`);
        }
      }

      console.log('✅ 常见问题修复完成');
      return {
        success: true,
        message: '文件导入环境已重置，可以重新尝试导入',
        details
      };

    } catch (error) {
      console.error('❌ 问题修复失败:', error);
      return {
        success: false,
        message: '修复过程中出现错误',
        details: [...details, `错误: ${error instanceof Error ? error.message : '未知错误'}`]
      };
    }
  }

  /**
   * 显示修复建议
   */
  showRepairSuggestions(issues: string[], fixes: string[]): void {
    if (issues.length === 0) {
      toast.success('🎉 文件导入功能检查通过，没有发现问题');
      return;
    }

    console.group('🔧 文件导入修复建议');
    console.log('发现的问题:');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
    
    console.log('\n建议的修复方法:');
    fixes.forEach((fix, index) => {
      console.log(`${index + 1}. ${fix}`);
    });
    console.groupEnd();

    // 显示用户友好的提示
    toast.error(`发现 ${issues.length} 个问题需要修复，请查看控制台获取详细信息`);
  }
}

// 导出单例实例
export const fileImportFixer = new FileImportFixer();

// 快捷修复函数
export async function quickFixFileImport(): Promise<void> {
  console.log('🚀 开始快速修复文件导入功能...');
  
  const result = await fileImportFixer.fixCommonIssues();
  
  if (result.success) {
    toast.success(result.message);
    console.log('修复详情:', result.details);
  } else {
    toast.error(result.message);
    console.error('修复失败:', result.details);
  }
}

// 完整诊断函数 
export async function diagnoseAndFixFileImport(file?: File): Promise<void> {
  if (!file) {
    toast.error('请选择一个文件进行诊断');
    return;
  }

  console.log('🔍 开始完整的文件导入诊断和修复...');
  
  const diagnosis = await fileImportFixer.diagnoseFileImport(file);
  
  fileImportFixer.showRepairSuggestions(diagnosis.issues, diagnosis.fixes);
  
  // 如果有问题，自动尝试修复
  if (!diagnosis.success) {
    console.log('🔧 检测到问题，开始自动修复...');
    await quickFixFileImport();
  }
} 