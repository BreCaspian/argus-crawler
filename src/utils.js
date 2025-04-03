const cheerio = require('cheerio');
const TurndownService = require('turndown');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto-js');
const os = require('os');

// 创建 Turndown 实例并配置
const turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced'
});

// 自定义 Turndown 规则
turndownService.addRule('tables', {
    filter: 'table',
    replacement: function(content, node) {
        // 在 Markdown 中添加表格标记
        return '\n\n' + content + '\n\n';
    }
});

// 代码块保留格式
turndownService.addRule('pre', {
    filter: 'pre',
    replacement: function(content, node) {
        return '\n```\n' + content + '\n```\n';
    }
});

/**
 * 获取平台特定的文本编码
 * @returns {string} 文本编码
 */
function getPlatformEncoding() {
    // Windows 常用 cp936 (简体中文), 其他平台用 utf-8
    return os.platform() === 'win32' ? 'utf-8' : 'utf-8';
}

/**
 * 获取平台特定的换行符
 * @returns {string} 换行符
 */
function getPlatformEOL() {
    return os.platform() === 'win32' ? '\r\n' : '\n';
}

/**
 * 跨平台创建目录
 * @param {string} dirPath 要创建的目录路径
 */
async function ensureDirectoryExists(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        // 如果是权限错误，提供更详细的错误信息
        if (error.code === 'EACCES') {
            const platform = os.platform();
            if (platform === 'win32') {
                console.error(`Windows权限错误: 无法创建目录 ${dirPath}`);
                console.error('请尝试以管理员身份运行或选择其他目录');
            } else if (platform === 'darwin') {
                console.error(`macOS权限错误: 无法创建目录 ${dirPath}`);
                console.error('请检查文件权限或在系统偏好设置中允许访问');
            } else {
                console.error(`Linux权限错误: 无法创建目录 ${dirPath}`);
                console.error('请检查目录权限或使用 sudo');
            }
        }
        
        // 如果不是"已存在"错误，则抛出
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

/**
 * 显示法律警告
 */
function displayLegalWarning() {
    console.log('');
    console.log('='.repeat(80));
    console.log('警告: 请确保遵守目标网站的服务条款和当地法律法规');
    console.log('Argus 默认尊重 robots.txt');
    console.log('='.repeat(80));
    console.log('');
    
    // 显示系统信息
    console.log(`操作系统: ${os.platform()} ${os.release()}`);
    console.log(`Node.js版本: ${process.version}`);
    console.log(`主机名: ${os.hostname()}`);
    console.log('');
}

/**
 * 加密内容
 * @param {string} content 要加密的内容
 * @param {string} key 加密密钥
 * @returns {string} 加密后的字符串
 */
function encryptContent(content, key = 'argus-default-key') {
    try {
        return crypto.AES.encrypt(content, key).toString();
    } catch (error) {
        console.error('加密失败:', error.message);
        return content;
    }
}

/**
 * 解密内容
 * @param {string} encryptedContent 加密后的内容
 * @param {string} key 解密密钥
 * @returns {string} 解密后的字符串
 */
function decryptContent(encryptedContent, key = 'argus-default-key') {
    if (typeof encryptedContent !== 'string') {
        return encryptedContent;
    }
    
    // 检查是否是加密内容
    if (encryptedContent.startsWith('U2FsdGVkX1')) {
        try {
            const bytes = crypto.AES.decrypt(encryptedContent, key);
            const decrypted = bytes.toString(crypto.enc.Utf8);
            if (!decrypted) {
                console.error('解密结果为空，可能使用了错误的密钥');
                return encryptedContent;
            }
            return decrypted;
        } catch (error) {
            console.error('解密失败:', error.message);
            return encryptedContent;
        }
    }
    
    // 不是加密内容，直接返回
    return encryptedContent;
}

/**
 * 写入日志
 * @param {string} logFile 日志文件路径
 * @param {string} message 日志消息
 * @param {boolean} encrypt 是否加密
 */
async function writeLog(logFile, message, encrypt = true) {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({
        timestamp,
        message,
        platform: os.platform(),
        hostname: os.hostname()
    }, null, 2);
    
    try {
        await ensureDirectoryExists(path.dirname(logFile));
        
        // 规范化日志文件路径，确保跨平台兼容
        const normalizedLogFile = path.normalize(logFile);
        
        // 根据选项决定是否加密
        const contentToWrite = encrypt ? encryptContent(logEntry) : logEntry;
        
        // 追加到日志文件
        await fs.appendFile(normalizedLogFile, contentToWrite + getPlatformEOL());
    } catch (error) {
        console.error(`写入日志失败: ${error.message}`);
    }
}

/**
 * 读取并解密日志
 * @param {string} logFile 日志文件路径
 * @returns {Promise<Array>} 解密后的日志条目数组
 */
async function readLog(logFile, key = 'argus-default-key') {
    try {
        const content = await fs.readFile(logFile, 'utf8');
        const lines = content.split(/\r?\n/).filter(Boolean);
        
        return lines.map(line => {
            try {
                // 尝试解密每一行
                const decrypted = decryptContent(line, key);
                return JSON.parse(decrypted);
            } catch (e) {
                // 如果解析失败，返回原始行
                return { raw: line, error: e.message };
            }
        });
    } catch (error) {
        console.error(`读取日志失败: ${error.message}`);
        return [];
    }
}

/**
 * 从 HTML 提取内容并转换为 Markdown
 * @param {string} html HTML 内容
 * @returns {string} Markdown 文本
 */
function htmlToMarkdown(html) {
    // 清理HTML
    const cleanedHtml = cleanHtml(html);
    
    // 转换为Markdown
    let markdown = turndownService.turndown(cleanedHtml);
    
    // 修复Markdown格式问题
    markdown = markdown
        // 修复标题格式
        .replace(/(?<!\n)#{1,6}\s+/g, '\n$&')
        // 修复列表格式
        .replace(/\n\s*[-*]\s+/g, '\n- ')
        // 修复代码块格式
        .replace(/```\s+/g, '```\n')
        .replace(/\s+```/g, '\n```')
        // 移除多余空行
        .replace(/\n{3,}/g, '\n\n');
    
    return markdown;
}

/**
 * 清理HTML内容，移除广告、脚本等无关元素
 * @param {string} html 原始HTML
 * @returns {string} 清理后的HTML
 */
function cleanHtml(html) {
    const $ = cheerio.load(html);
    
    // 移除脚本和样式
    $('script, style, iframe, noscript').remove();
    
    // 移除广告相关元素
    $('[class*="advert"], [class*="banner"], [id*="ad-"], [class*="ad-"]').remove();
    
    // 移除社交分享按钮
    $('[class*="share"], [class*="social"], [id*="share"]').remove();
    
    // 移除评论区
    $('[class*="comment"], [id*="comment"], [class*="disqus"]').remove();
    
    // 移除导航栏和页脚
    $('nav, footer, header').remove();
    
    // 移除隐藏元素
    $('[style*="display: none"], [style*="display:none"], [style*="visibility: hidden"]').remove();
    
    // 清理空元素
    $('p, div, span').each((i, el) => {
        if ($(el).text().trim() === '' && $(el).children().length === 0) {
            $(el).remove();
        }
    });
    
    return $.html();
}

/**
 * 从 HTML 提取表格
 * @param {string} html HTML 内容
 * @returns {Array<Array<Array<string>>>} 表格数据数组
 */
function extractTablesFromHtml(html) {
    const $ = cheerio.load(html);
    const tables = [];
    
    $('table').each((i, table) => {
        const tableData = [];
        
        $(table).find('tr').each((j, row) => {
            const rowData = [];
            
            $(row).find('th, td').each((k, cell) => {
                // 获取单元格内容，处理嵌套表格
                const cellContent = $(cell).children('table').length ? 
                    '[嵌套表格]' : 
                    $(cell).text().trim();
                    
                rowData.push(cellContent);
            });
            
            if (rowData.length > 0) {
                tableData.push(rowData);
            }
        });
        
        if (tableData.length > 0) {
            tables.push(tableData);
        }
    });
    
    return tables;
}

/**
 * 将表格数据保存为 XLSX 文件
 * @param {Array<Array<Array<string>>>} tables 表格数据数组
 * @param {string} outputPath 输出文件路径
 */
async function saveTableAsXlsx(tables, outputPath) {
    const workbook = new ExcelJS.Workbook();
    
    workbook.creator = 'Argus Crawler';
    workbook.created = new Date();
    
    tables.forEach((table, index) => {
        const worksheet = workbook.addWorksheet(`Table ${index + 1}`);
        
        // 自动调整列宽
        const columnWidths = {};
        
        // 添加表格数据
        table.forEach((row, rowIndex) => {
            worksheet.addRow(row);
            
            // 计算每列的最大宽度
            row.forEach((cell, colIndex) => {
                const cellLength = cell ? String(cell).length : 0;
                columnWidths[colIndex] = Math.max(columnWidths[colIndex] || 0, cellLength, 10);
            });
            
            // 设置第一行为表头样式
            if (rowIndex === 0) {
                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE0E0E0' }
                };
            }
        });
        
        // 设置列宽
        Object.keys(columnWidths).forEach(col => {
            const width = Math.min(columnWidths[col] + 2, 100); // 限制最大宽度
            worksheet.getColumn(Number(col) + 1).width = width;
        });
    });
    
    try {
        // 确保输出目录存在
        await ensureDirectoryExists(path.dirname(outputPath));
        
        // 规范化输出路径，确保跨平台兼容
        const normalizedOutputPath = path.normalize(outputPath);
        
        // 保存 XLSX 文件
        await workbook.xlsx.writeFile(normalizedOutputPath);
    } catch (error) {
        console.error(`保存 XLSX 文件失败: ${error.message}`);
    }
}

/**
 * 分析内容类型，决定应该使用哪种输出格式
 * @param {string} html HTML 内容
 * @returns {Object} 包含 hasText 和 hasTables 属性的对象
 */
function analyzeContentType(html) {
    const $ = cheerio.load(html);
    
    // 检测是否含有表格及表格质量
    const hasTables = $('table').length > 0;
    
    // 检测是否含有足够的文本内容
    const bodyText = $('body').text().trim();
    const hasText = bodyText.length > 100; // 如果文本内容超过100个字符
    
    // 检测图片
    const hasImages = $('img').length > 0;
    
    // 检测视频
    const hasVideos = $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length > 0;
    
    // 检测结构化内容
    const hasHeadings = $('h1, h2, h3, h4, h5, h6').length > 0;
    const hasLists = $('ul, ol').length > 0;
    
    // 检测代码块
    const hasCode = $('pre, code').length > 0;
    
    // 检测链接数量
    const linkCount = $('a[href]').length;
    
    // 计算结构化内容比例
    const totalLength = bodyText.length;
    const structuredContent = hasHeadings || hasLists || hasCode;
    
    // 推荐输出格式
    let suggestedFormat = 'markdown'; // 默认推荐markdown
    
    if (hasTables && !hasText) {
        suggestedFormat = 'xlsx';
    } else if (hasTables && hasText) {
        suggestedFormat = 'both';
    } else if (!hasText && hasImages) {
        suggestedFormat = 'html';
    }
    
    return {
        hasText,
        hasTables,
        hasImages,
        hasVideos,
        hasCode,
        hasHeadings,
        hasLists,
        linkCount,
        structuredContent,
        totalLength,
        suggestedFormat
    };
}

/**
 * 获取当前系统信息
 * @returns {Object} 系统信息对象
 */
function getSystemInfo() {
    return {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + 'GB',
        freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + 'GB',
        homedir: os.homedir(),
        tempdir: os.tmpdir(),
        hostname: os.hostname(),
        nodeVersion: process.version
    };
}

/**
 * 安全复制文件
 * @param {string} sourcePath 源文件路径
 * @param {string} targetPath 目标文件路径
 */
async function copyFileSafely(sourcePath, targetPath) {
    try {
        // 确保目标目录存在
        await ensureDirectoryExists(path.dirname(targetPath));
        
        // 读取源文件
        const content = await fs.readFile(sourcePath);
        
        // 写入临时文件
        const tempPath = `${targetPath}.tmp`;
        await fs.writeFile(tempPath, content);
        
        // 重命名临时文件为目标文件
        await fs.rename(tempPath, targetPath);
        
        return true;
    } catch (error) {
        console.error(`复制文件失败 ${sourcePath} -> ${targetPath}: ${error.message}`);
        
        // 清理临时文件
        try {
            const tempPath = `${targetPath}.tmp`;
            await fs.unlink(tempPath).catch(() => {});
        } catch (e) {
            // 忽略清理错误
        }
        
        return false;
    }
}

/**
 * 安全写入文件
 * @param {string} filePath 文件路径
 * @param {string|Buffer} content 文件内容
 */
async function writeFileSafely(filePath, content) {
    try {
        // 确保目录存在
        await ensureDirectoryExists(path.dirname(filePath));
        
        // 写入临时文件
        const tempPath = `${filePath}.tmp`;
        await fs.writeFile(tempPath, content);
        
        // 重命名临时文件为目标文件
        await fs.rename(tempPath, filePath);
        
        return true;
    } catch (error) {
        console.error(`写入文件失败 ${filePath}: ${error.message}`);
        
        // 清理临时文件
        try {
            const tempPath = `${filePath}.tmp`;
            await fs.unlink(tempPath).catch(() => {});
        } catch (e) {
            // 忽略清理错误
        }
        
        return false;
    }
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的文件大小
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

module.exports = {
    displayLegalWarning,
    encryptContent,
    decryptContent,
    writeLog,
    readLog,
    htmlToMarkdown,
    extractTablesFromHtml,
    saveTableAsXlsx,
    analyzeContentType,
    getPlatformEncoding,
    getPlatformEOL,
    ensureDirectoryExists,
    getSystemInfo,
    cleanHtml,
    copyFileSafely,
    writeFileSafely,
    formatFileSize
}; 