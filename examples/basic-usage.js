/**
 * Argus Web Crawler - 基本使用示例
 */

const { exec } = require('child_process');
const path = require('path');

// 获取Argus主入口文件的路径（相对于当前文件）
const argusPath = path.join(__dirname, '..', 'argus.js');

// 示例1：爬取测试网站
console.log('示例1: 爬取测试网站 crawler-test.com');
exec(`node ${argusPath} https://crawler-test.com --depth 1`, (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`标准错误: ${stderr}`);
    return;
  }
  
  console.log('爬取结果:');
  console.log(stdout);
  console.log('----------------------------');
  
  // 示例2：使用高级性能模式
  console.log('示例2: 使用高级性能模式');
  exec(`node ${argusPath} https://crawler-test.com/tables --advanced-mode --format xlsx`, 
    (error2, stdout2, stderr2) => {
      if (error2) {
        console.error(`执行错误: ${error2.message}`);
        return;
      }
      
      if (stderr2) {
        console.error(`标准错误: ${stderr2}`);
        return;
      }
      
      console.log('爬取结果:');
      console.log(stdout2);
    }
  );
});

// 使用提示
console.log('其他示例命令:');
console.log('- 爬取特定深度: node argus.js https://crawler-test.com --depth 2');
console.log('- 使用代理列表: node argus.js https://crawler-test.com --proxies proxies.txt');
console.log('- 下载资源: node argus.js https://crawler-test.com/image_jpeg --download-resources');
console.log('- 加密内容: node argus.js https://crawler-test.com --encrypt --key "my-secret-key"');
console.log('- 测试环境: node argus.js test-env'); 