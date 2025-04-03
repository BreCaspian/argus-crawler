#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const { execSync } = require('child_process');
const ArgusCrawler = require('./src/ArgusCrawler');
const ProxyManager = require('./src/ProxyManager');
const { decryptContent, displayLegalWarning, getSystemInfo } = require('./src/utils');

// 捕获未处理的异步异常
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的拒绝承诺:', promise, '原因:', reason);
    // 不立即退出，让进程有机会完成正在进行的操作
});

// 捕获未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    // 不立即退出，让进程有机会完成正在进行的操作
});

// 处理SIGINT信号（Ctrl+C）
process.on('SIGINT', async () => {
    console.log('\n正在优雅地关闭...');
    console.log('完成所有正在进行的请求后退出');
    
    // 给一些时间完成日志写入等操作
    setTimeout(() => {
        console.log('已退出');
        process.exit(0);
    }, 1000);
});

// 检查浏览器依赖是否安装
async function checkBrowserDependencies(skipCheck = false) {
    if (skipCheck) {
        console.log('已跳过浏览器依赖检查');
        return true;
    }
    
    try {
        console.log('检查浏览器依赖...');
        
        // 检查Playwright浏览器是否安装
        const userDataDir = path.join(os.homedir(), '.cache', 'ms-playwright');
        const windowsDataDir = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
        
        let dataDir = os.platform() !== 'win32' ? userDataDir : windowsDataDir;
        
        // 检查相关目录是否存在
        try {
            await fs.access(dataDir);
            console.log('✓ 已找到Playwright浏览器目录');
        } catch (error) {
            console.warn('未找到Playwright浏览器目录');
            console.log('尝试安装Playwright浏览器...');
            
            try {
                // 尝试安装浏览器
                execSync('npx playwright install chromium', { stdio: 'inherit' });
                console.log('✓ 已成功安装Playwright浏览器');
            } catch (installError) {
                console.error('安装浏览器失败:', installError.message);
                console.log('请手动运行: npx playwright install');
                
                if (os.platform() === 'linux') {
                    console.log('在Linux上，您可能还需要运行: npx playwright install-deps');
                }
                
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('检查浏览器依赖时出错:', error);
        return false;
    }
}

// 记录爬虫启动信息
async function logCrawlerStart(url, outputDir, options = {}) {
    try {
        const logDir = path.join(outputDir, 'logs');
        
        // 确保日志目录存在
        await fs.mkdir(logDir, { recursive: true });
        
        const logFile = path.join(logDir, 'crawler.log');
        const timestamp = new Date().toISOString();
        const systemInfo = getSystemInfo();
        
        const logEntry = JSON.stringify({
            timestamp,
            action: 'start',
            url,
            options,
            system: systemInfo
        }, null, 2);
        
        await fs.appendFile(logFile, logEntry + '\n');
    } catch (error) {
        console.error('无法记录爬虫启动信息:', error.message);
    }
}

// 测试环境和依赖项
async function testEnvironment() {
    console.log('='.repeat(60));
    console.log('Argus 环境测试');
    console.log('='.repeat(60));
    
    // 检查操作系统信息
    const systemInfo = getSystemInfo();
    console.log('系统信息:');
    console.log(JSON.stringify(systemInfo, null, 2));
    
    // 检查Node.js和npm版本
    console.log('\nNode.js版本:', process.version);
    try {
        const npmVersion = execSync('npm --version').toString().trim();
        console.log('npm版本:', npmVersion);
    } catch (error) {
        console.log('无法检测npm版本');
    }
    
    // 检查依赖包
    console.log('\n检查依赖包:');
    const dependencies = [
        'playwright',
        'puppeteer',
        'cheerio',
        'commander',
        'crypto-js',
        'exceljs',
        'turndown'
    ];
    
    for (const dep of dependencies) {
        try {
            const depPath = require.resolve(dep);
            console.log(`✓ ${dep} - 已安装`);
        } catch (error) {
            console.log(`✗ ${dep} - 未安装`);
        }
    }
    
    // 检查浏览器
    console.log('\n检查浏览器:');
    const browsers = await checkBrowserDependencies(false);
    if (browsers) {
        console.log('✓ 浏览器依赖已安装');
    } else {
        console.log('✗ 浏览器依赖未完全安装');
    }
    
    // 检查网络连接
    console.log('\n检查网络连接:');
    try {
        execSync('curl -s https://www.google.com > /dev/null');
        console.log('✓ 互联网连接正常');
    } catch (error) {
        console.log('✗ 无法连接到互联网或curl命令不可用');
    }
    
    console.log('\n检查完成');
    console.log('='.repeat(60));
}

// 主函数
async function main() {
    // 设置版本号和描述
    program
        .name('argus')
        .description('Argus Web Crawler - 高效的网页抓取与内容提取工具')
        .version('1.1.0');
    
    // 设置命令行参数
    program
        .argument('[url]', '要爬取的网站URL')
        .option('-o, --output-dir <directory>', '输出目录', path.join(process.cwd(), 'argus_data'))
        .option('-d, --depth <number>', '爬取深度', '1')
        .option('-f, --format <format>', '输出格式 (markdown, xlsx, html, auto)', 'auto')
        .option('-w, --delay <ms>', '请求之间的延迟(毫秒)', '1000')
        .option('-p, --proxies <file>', '代理服务器列表文件')
        .option('-e, --encrypt', '加密输出内容')
        .option('-k, --key <key>', '加密/解密密钥', 'argus-default-key')
        .option('-a, --advanced-mode', '启用高级性能模式')
        .option('--test-proxies', '在使用前测试代理可用性')
        .option('--max-concurrency <number>', '最大并发请求数')
        .option('--max-requests <number>', '最大请求数限制')
        .option('--navigation-timeout <ms>', '导航超时时间(毫秒)')
        .option('--no-browser-check', '跳过浏览器依赖检查')
        .option('--download-resources', '下载页面资源(图片等)')
        .option('--max-file-size <MB>', '下载资源的最大文件大小(MB)', '10');
    
    // 添加解密命令
    program
        .command('decrypt <file>')
        .description('解密先前加密的文件')
        .option('-k, --key <key>', '解密密钥', 'argus-default-key')
        .option('-o, --output <file>', '输出文件')
        .action(async (file, options) => {
            try {
                console.log(`解密文件: ${file}`);
                const encryptedContent = await fs.readFile(file, 'utf8');
                const decryptedContent = decryptContent(encryptedContent, options.key);
                
                const outputFile = options.output || `${file}.decrypted`;
                await fs.writeFile(outputFile, decryptedContent);
                console.log(`解密内容已保存到: ${outputFile}`);
            } catch (error) {
                console.error(`解密失败: ${error.message}`);
                process.exit(1);
            }
        });
    
    // 添加测试环境的命令
    program
        .command('test-env')
        .description('测试环境和依赖项')
        .action(testEnvironment);
    
    // 解析命令行参数
    program.parse();
    
    // 获取解析后的参数
    const options = program.opts();
    const url = program.args[0];
    
    // 如果没有URL参数，显示帮助信息
    if (!url && !program.args.includes('decrypt') && !program.args.includes('test-env')) {
        program.help();
        return;
    }
    
    // 如果命令是test-env或decrypt，不执行爬虫部分
    if (program.args.includes('decrypt') || program.args.includes('test-env')) {
        return;
    }
    
    // 确保输出目录存在
    try {
        await fs.mkdir(options.outputDir, { recursive: true });
    } catch (error) {
        console.error(`创建输出目录失败: ${error.message}`);
        process.exit(1);
    }
    
    // 显示法律警告
    displayLegalWarning();
    
    // 如果启用高级模式，显示警告
    if (options.advancedMode) {
        console.log('');
        console.log('!'.repeat(80));
        console.log('高级性能模式已启用!');
        console.log('此模式提供更高的并发性和更深入的抓取能力，但请负责任地使用。');
        console.log('请确保遵守目标网站的服务条款和当地法律法规。');
        console.log('!'.repeat(80));
        console.log('');
    }
    
    // 检查浏览器依赖
    const browserDepsOk = await checkBrowserDependencies(options.noBrowserCheck);
    if (!browserDepsOk && !options.noBrowserCheck) {
        console.error('浏览器依赖检查失败，无法继续。请安装所需的浏览器或使用 --no-browser-check 跳过此检查。');
        process.exit(1);
    }
    
    // 创建爬虫选项对象
    const crawlerOptions = {
        depth: parseInt(options.depth, 10),
        outputDir: options.outputDir,
        delay: parseInt(options.delay, 10),
        format: options.format,
        encrypt: options.encrypt,
        encryptKey: options.key,
        advancedMode: options.advancedMode,
        downloadResources: options.downloadResources,
        maxFileSize: parseInt(options.maxFileSize, 10)
    };
    
    // 如果指定了代理文件，配置代理
    if (options.proxies) {
        console.log(`使用代理列表文件: ${options.proxies}`);
        
        // 配置代理管理器选项
        const proxyOptions = {
            proxiesPath: options.proxies,
            testProxies: options.testProxies,
            outputDir: options.outputDir
        };
        
        // 创建代理管理器
        const proxyManager = new ProxyManager(proxyOptions);
        
        // 加载代理列表
        await proxyManager.loadProxies();
        
        // 如果有有效代理，添加到爬虫选项
        if (proxyManager.validProxies.length > 0) {
            crawlerOptions.proxyManager = proxyManager;
            console.log(`已加载 ${proxyManager.validProxies.length} 个有效代理`);
        } else {
            console.log('没有有效代理可用，将使用直接连接');
        }
    }
    
    // 设置高级性能模式的选项
    if (options.advancedMode) {
        crawlerOptions.maxConcurrency = options.maxConcurrency ? parseInt(options.maxConcurrency, 10) : 25;
        crawlerOptions.maxRequests = options.maxRequests ? parseInt(options.maxRequests, 10) : 5000;
        crawlerOptions.navigationTimeout = options.navigationTimeout ? parseInt(options.navigationTimeout, 10) : 120000;
    } else {
        crawlerOptions.maxConcurrency = options.maxConcurrency ? parseInt(options.maxConcurrency, 10) : 10;
        crawlerOptions.maxRequests = options.maxRequests ? parseInt(options.maxRequests, 10) : 1000;
        crawlerOptions.navigationTimeout = options.navigationTimeout ? parseInt(options.navigationTimeout, 10) : 60000;
    }
    
    // 记录爬虫启动信息
    await logCrawlerStart(url, options.outputDir, crawlerOptions);
    
    // 创建爬虫实例
    const crawler = new ArgusCrawler(crawlerOptions);
    
    // 开始爬取
    try {
        console.log(`开始爬取: ${url}`);
        console.log(`输出目录: ${options.outputDir}`);
        await crawler.crawl(url);
        console.log('爬取完成!');
    } catch (error) {
        console.error(`爬取过程中出错: ${error.message}`);
        if (error.stack) {
            console.error('详细错误信息:');
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// 执行主函数
main().catch(error => {
    console.error('程序执行出错:', error);
    process.exit(1);
}); 