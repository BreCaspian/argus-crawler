#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 彩色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// 获取当前平台信息
const platform = os.platform();
const isWindows = platform === 'win32';
const isMac = platform === 'darwin';
const isLinux = platform === 'linux';

// 日志函数
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 错误日志
function logError(message) {
    console.error(`${colors.red}[错误] ${message}${colors.reset}`);
}

// 成功日志
function logSuccess(message) {
    console.log(`${colors.green}[成功] ${message}${colors.reset}`);
}

// 信息日志
function logInfo(message) {
    console.log(`${colors.blue}[信息] ${message}${colors.reset}`);
}

// 警告日志
function logWarning(message) {
    console.log(`${colors.yellow}[警告] ${message}${colors.reset}`);
}

// 运行命令
function runCommand(command, options = {}) {
    try {
        log(`执行命令: ${command}`, 'cyan');
        const output = execSync(command, {
            stdio: 'inherit',
            ...options
        });
        return { success: true, output };
    } catch (error) {
        if (options.ignoreError) {
            logWarning(`命令执行失败，但忽略错误: ${error.message}`);
            return { success: false, error };
        } else {
            logError(`命令执行失败: ${error.message}`);
            throw error;
        }
    }
}

// 检查文件是否存在
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (error) {
        return false;
    }
}

// 安装 Playwright 浏览器
function installPlaywrightBrowsers() {
    logInfo('准备安装 Playwright 浏览器...');
    
    // 检查是否已经安装
    const userDataDir = path.join(os.homedir(), '.cache', 'ms-playwright');
    const windowsDataDir = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
    
    let dataDir = isMac || isLinux ? userDataDir : windowsDataDir;
    
    if (fileExists(dataDir)) {
        logInfo('Playwright 浏览器可能已安装，检查版本...');
    }
    
    try {
        // 尝试安装 Playwright 浏览器
        runCommand('npx playwright install chromium firefox webkit', { ignoreError: true });
        logSuccess('Playwright 浏览器安装成功');
    } catch (error) {
        logWarning('无法安装完整的 Playwright 浏览器，尝试仅安装 Chromium...');
        try {
            runCommand('npx playwright install chromium', { ignoreError: true });
            logSuccess('Playwright Chromium 安装成功');
        } catch (chromiumError) {
            logError(`无法安装 Playwright 浏览器: ${chromiumError.message}`);
            logInfo('请手动运行: npx playwright install');
        }
    }
}

// 安装 Puppeteer 浏览器
function installPuppeteerBrowser() {
    logInfo('准备设置 Puppeteer 浏览器...');
    
    // Puppeteer 会在安装依赖时自动下载浏览器
    // 这里只需要确认一下是否已安装
    
    try {
        const puppeteerPath = require.resolve('puppeteer');
        logInfo(`找到 Puppeteer: ${puppeteerPath}`);
        logSuccess('Puppeteer 配置正常');
    } catch (error) {
        logWarning('找不到 Puppeteer，可能需要重新安装');
        logInfo('请运行: npm install puppeteer --save');
    }
}

// 创建必要的目录
function createDirectories() {
    logInfo('创建必要的目录...');
    
    const dirs = [
        'argus_data',
        'argus_data/logs',
        'argus_data/downloads',
        'argus_data/output'
    ];
    
    dirs.forEach(dir => {
        const dirPath = path.join(process.cwd(), dir);
        
        if (!fileExists(dirPath)) {
            try {
                fs.mkdirSync(dirPath, { recursive: true });
                logInfo(`创建目录: ${dirPath}`);
            } catch (error) {
                logWarning(`无法创建目录 ${dirPath}: ${error.message}`);
            }
        }
    });
    
    logSuccess('目录创建完成');
}

// 检查系统依赖
function checkSystemDependencies() {
    logInfo(`检测系统: ${platform}`);
    
    if (isLinux) {
        logInfo('Linux 系统检测中...');
        
        // 在 Linux 上检查一些必要的依赖
        try {
            const lddOutput = execSync('ldd --version').toString();
            logInfo(`发现 ldd: ${lddOutput.split('\n')[0]}`);
        } catch (error) {
            logWarning('无法检测 ldd 版本');
        }
        
        // 在Linux上，Playwright可能需要一些系统依赖
        logInfo('提示：在某些Linux发行版上，您可能需要安装额外的依赖.');
        logInfo('可以尝试运行: npx playwright install-deps');
    } else if (isMac) {
        logInfo('macOS 系统检测中...');
    } else if (isWindows) {
        logInfo('Windows 系统检测中...');
    }
    
    // 检查 Node.js 版本
    const nodeVersion = process.version;
    logInfo(`Node.js 版本: ${nodeVersion}`);
    
    // 检查 npm 版本
    try {
        const npmVersion = execSync('npm --version').toString().trim();
        logInfo(`npm 版本: ${npmVersion}`);
    } catch (error) {
        logWarning('无法检测 npm 版本');
    }
}

// 主函数
async function main() {
    log('='.repeat(60), 'cyan');
    log(' Argus 浏览器引擎设置工具 ', 'magenta');
    log('='.repeat(60), 'cyan');
    
    logInfo(`操作系统: ${os.type()} ${os.release()}`);
    logInfo(`平台: ${platform}`);
    logInfo(`架构: ${os.arch()}`);
    log('');
    
    // 检查系统依赖
    checkSystemDependencies();
    log('');
    
    // 创建必要的目录
    createDirectories();
    log('');
    
    // 安装浏览器
    installPlaywrightBrowsers();
    log('');
    installPuppeteerBrowser();
    log('');
    
    log('='.repeat(60), 'cyan');
    log(' 浏览器设置完成 ', 'green');
    log('='.repeat(60), 'cyan');
    
    logInfo('如果安装过程中出现错误，请尝试手动安装浏览器:');
    logInfo('- Playwright: npx playwright install');
    logInfo('- Playwright 系统依赖: npx playwright install-deps');
    log('');
    
    logSuccess('Argus 爬虫工具已准备就绪!');
}

// 执行主函数
main().catch(error => {
    logError(`设置过程中出错: ${error.message}`);
    process.exit(1);
}); 