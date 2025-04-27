// 设置Supabase存储桶的脚本
const { createClient } = require('@supabase/supabase-js');

// 获取环境变量中的Supabase凭据
const SUPABASE_URL = process.env.SUPABASE_URL || "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // 需要服务端密钥

if (!SUPABASE_SERVICE_KEY) {
  console.error('请提供SUPABASE_SERVICE_KEY环境变量');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupStorage() {
  try {
    // 创建存储桶
    const bucketName = 'homework_files';
    
    // 检查存储桶是否已存在
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('获取存储桶列表失败:', listError);
      return;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      // 创建存储桶
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: false, // 设置为公开或私有
        fileSizeLimit: 10485760, // 限制文件大小为10MB
      });
      
      if (error) {
        console.error(`创建存储桶 ${bucketName} 失败:`, error);
      } else {
        console.log(`存储桶 ${bucketName} 创建成功`);
        
        // 设置存储桶策略为公开访问
        const { error: policyError } = await supabase.storage.from(bucketName).createSignedUploadUrl('test.txt');
        if (policyError) {
          console.error(`设置存储桶 ${bucketName} 策略失败:`, policyError);
        } else {
          console.log(`存储桶 ${bucketName} 策略设置成功`);
        }
      }
    } else {
      console.log(`存储桶 ${bucketName} 已存在`);
    }
  } catch (error) {
    console.error('设置存储桶时出错:', error);
  }
}

setupStorage()
  .then(() => console.log('存储桶设置完成'))
  .catch(err => console.error('存储桶设置失败:', err)); 