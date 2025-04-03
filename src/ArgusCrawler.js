const { PlaywrightCrawler, RequestList, RequestQueue } = require('crawlee');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');
const os = require('os');
const fetch = require('node-fetch').default;
const { 
    htmlToMarkdown, 
    extractTablesFromHtml, 
    saveTableAsXlsx, 
    analyzeContentType,
    writeLog,
    cleanHtml,
    ensureDirectoryExists,
    getPlatformEOL,
    getSystemInfo
} = require('./utils');

puppeteer.use(StealthPlugin());

class ArgusCrawler {
    constructor(options = {}) {
        // 检测操作系统类型
        this.isWindows = os.platform() === 'win32';
        this.isMac = os.platform() === 'darwin';
        this.isLinux = os.platform() === 'linux';
        
        // 设置默认输出目录（考虑跨平台兼容性）
        const defaultOutputDir = path.join(
            this.isWindows ? process.env.USERPROFILE : process.env.HOME,
            'argus_data'
        );
        
        this.options = {
            outputDir: options.outputDir || defaultOutputDir,
            proxies: options.proxies || null,
            depth: options.depth || 3,
            delay: options.delay || 1000,
            format: options.format || 'auto',
            respectRobotsTxt: options.respectRobotsTxt !== false,
            stealthMode: options.stealthMode !== false,
            logFile: options.logFile || path.join(options.outputDir || defaultOutputDir, 'argus.log'),
            advancedMode: options.advancedMode || false,
            maxConcurrency: options.maxConcurrency || 10,
            maxRequestsPerCrawl: options.maxRequestsPerCrawl || 1000,
            navigationTimeout: options.navigationTimeout || 60,
            downloadResources: options.downloadResources || false,
            maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 默认50MB
            noEncryption: options.noEncryption || false,
            retryAttempts: options.retryAttempts || 3,
            verbose: options.verbose || false,
            ...options
        };
        
        // 确保输出路径使用正确的路径分隔符
        this.options.outputDir = path.normalize(this.options.outputDir);
        this.options.logFile = path.normalize(this.options.logFile);
        
        // 如果是高级模式，调整相关设置
        if (this.options.advancedMode) {
            this.options.maxConcurrency = options.maxConcurrency || 25;        // 增加并发数
            this.options.maxRequestsPerCrawl = options.maxRequestsPerCrawl || 10000; // 增加最大请求数
            this.options.depth = options.depth || 10;                          // 增加默认爬取深度
            this.options.delay = Math.max(options.delay || 500, 300);          // 减少默认延迟但设置最小值
            this.options.navigationTimeout = options.navigationTimeout || 120;  // 增加导航超时时间
            this.options.stealthMode = true;                                   // 强制启用隐身模式
            
            // 确保记录高级模式的启用
            console.log('⚠️ 高级模式已启用 - 请确保合法使用并尊重目标网站');
        }
        
        // 基于操作系统调整设置
        if (this.isWindows) {
            // Windows特定优化
            if (this.options.verbose) {
                console.log(`检测到Windows系统: ${os.release()}`);
            }
            // 在Windows上，某些浏览器设置可能需要调整
            this.browserArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'];
        } else if (this.isMac) {
            if (this.options.verbose) {
                console.log(`检测到macOS系统: ${os.release()}`);
            }
            this.browserArgs = ['--no-sandbox'];
        } else {
            if (this.options.verbose) {
                console.log(`检测到Linux系统: ${os.release()}`);
            }
            this.browserArgs = ['--no-sandbox', '--disable-setuid-sandbox'];
        }
        
        this.visitedUrls = new Set();
        this.baseHostname = null;
        this.currentDepth = 0;
        this.resourcesDownloaded = { images: 0, documents: 0, videos: 0, others: 0 };
        this.startTime = Date.now();
        
        // 设置内存监控
        this.memoryMonitorId = setInterval(() => {
            const memUsage = process.memoryUsage();
            const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            const rssMemoryMB = Math.round(memUsage.rss / 1024 / 1024);
            
            if (heapUsedMB > 1024) { // 超过1GB堆内存
                console.warn(`⚠️ 内存使用过高: 堆内存 ${heapUsedMB}MB, 总内存 ${rssMemoryMB}MB`);
                
                if (heapUsedMB > 1500) { // 超过1.5GB可能有内存泄漏
                    console.error('内存使用超出安全阈值，考虑降低并发请求数或启用更少选项');
                    // 可以考虑在这里自动调整maxConcurrency
                    if (this.options.maxConcurrency > 5) {
                        this.options.maxConcurrency = 5;
                        console.log(`已自动调整最大并发数至: ${this.options.maxConcurrency}`);
                    }
                }
            }
            
            // 记录爬取进度
            const elapsedTimeMin = Math.round((Date.now() - this.startTime) / 60000);
            if (this.options.verbose && elapsedTimeMin > 0 && elapsedTimeMin % 5 === 0) { // 每5分钟
                const urlsPerMinute = Math.round(this.visitedUrls.size / elapsedTimeMin);
                console.log(`已爬取 ${this.visitedUrls.size} 个URL，耗时 ${elapsedTimeMin}分钟，速率 ${urlsPerMinute} URL/分钟`);
            }
        }, 60000); // 每分钟检查一次
    }

    async initialize() {
        try {
            // 创建输出目录
            await ensureDirectoryExists(this.options.outputDir);
            
            // 确保日志目录存在
            await ensureDirectoryExists(path.dirname(this.options.logFile));
            
            // 记录开始日志
            await writeLog(
                this.options.logFile, 
                `开始初始化爬虫，配置: ${JSON.stringify({
                    ...this.options,
                    // 简化某些大对象以避免日志过大
                    proxies: this.options.proxies ? '已配置' : '未配置'
                }, null, 2)}`,
                !this.options.noEncryption
            );
            
            console.log(`输出目录: ${this.options.outputDir}`);
            console.log(`日志文件: ${this.options.logFile}`);
        } catch (error) {
            console.error(`初始化出错: ${error.message}`);
            // 如果是权限错误，提供操作系统特定的提示
            if (error.code === 'EACCES') {
                if (this.isWindows) {
                    console.error('Windows权限错误: 请尝试以管理员身份运行或更改输出目录');
                } else {
                    console.error('权限错误: 请检查目录权限或使用 sudo');
                }
            }
            throw error;
        }
    }

    async crawl(startUrl) {
        try {
            await this.initialize();
            
            // 设置基础域名
            this.baseHostname = new URL(startUrl).hostname;
            
            // 配置请求队列
            const requestQueue = await RequestQueue.open();
            await requestQueue.addRequest({ url: startUrl, userData: { depth: 0 } });
            
            // 创建并配置爬虫
            const crawler = new PlaywrightCrawler({
                requestQueue,
                maxRequestsPerCrawl: this.options.maxRequestsPerCrawl,
                maxConcurrency: this.options.maxConcurrency,
                navigationTimeoutSecs: this.options.navigationTimeout,
                retryOnBlocked: true,
                maxRequestRetries: this.options.retryAttempts,
                
                // 配置浏览器启动选项，考虑不同操作系统
                launchContext: {
                    launchOptions: {
                        headless: true,
                        args: this.browserArgs
                    }
                },
                
                // 请求处理函数
                async requestHandler({ request, page, enqueueLinks, log }) {
                    const url = request.url;
                    const depth = request.userData.depth;
                    
                    log.info(`正在爬取 [深度 ${depth}]: ${url}`);
                    await writeLog(this.options.logFile, `爬取: ${url}`, !this.options.noEncryption);
                    
                    // 标记为已访问
                    this.visitedUrls.add(url);
                    
                    try {
                        // 检查链接类型，处理资源文件
                        const urlExt = url.split('.').pop().toLowerCase();
                        const isResource = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 
                                           'xlsx', 'mp3', 'mp4', 'zip', 'rar'].includes(urlExt);
                                           
                        if (isResource && this.options.downloadResources) {
                            await this.downloadResource(url);
                            return;
                        }
                    
                        // 检查 robots.txt，除非高级模式且明确设置忽略
                        if (this.options.respectRobotsTxt && !this.options.advancedMode) {
                            if (!await this.checkRobotsTxt(url)) {
                                log.info(`根据 robots.txt 规则跳过: ${url}`);
                                return;
                            }
                        }
                        
                        // 应用代理和隐身模式
                        if (this.options.proxies) {
                            await this.options.proxies.applyToPage(page);
                        }
                        
                        // 高级模式下的额外隐身措施
                        if (this.options.advancedMode) {
                            await this.applyAdvancedStealth(page);
                        }
                        
                        // 随机延迟，模拟人类行为
                        const randomDelay = this.options.delay + Math.floor(Math.random() * 500);
                        await page.waitForTimeout(randomDelay);
                        
                        // 获取页面内容
                        const content = await page.content();
                        
                        // 如果启用了资源下载
                        if (this.options.downloadResources) {
                            await this.extractAndDownloadResources(page, url);
                        }
                        
                        // 分析内容类型
                        const contentType = analyzeContentType(
                            this.options.cleanContent ? cleanHtml(content) : content
                        );
                        
                        // 保存内容
                        await this.saveContent(url, content, contentType);
                        
                        // 添加链接到队列（如果未达到最大深度）
                        if (depth < this.options.depth) {
                            await enqueueLinks({
                                globs: [`**/*.${this.baseHostname}/**`],
                                transformRequestFunction: (req) => {
                                    req.userData = { ...req.userData, depth: depth + 1 };
                                    return req;
                                }
                            });
                        }
                    } catch (error) {
                        log.error(`处理页面失败 ${url}: ${error.message}`);
                        await writeLog(
                            this.options.logFile, 
                            `爬取错误: ${url} - ${error.message}`,
                            !this.options.noEncryption
                        );
                    }
                },
                
                // 失败请求处理
                failedRequestHandler({ request, error, log }) {
                    log.error(`爬取失败 ${request.url}: ${error.message}`);
                    writeLog(
                        this.options.logFile, 
                        `错误: ${request.url} - ${error.message}`,
                        !this.options.noEncryption
                    );
                },
            });
            
            // 开始爬取
            await crawler.run();
            await writeLog(
                this.options.logFile, 
                `爬取完成，共处理 ${this.visitedUrls.size} 个URL`,
                !this.options.noEncryption
            );
            
            const endTime = Date.now();
            const durationMin = ((endTime - this.startTime) / 60000).toFixed(2);
            
            // 爬取统计
            const stats = {
                totalUrls: this.visitedUrls.size,
                durationMinutes: durationMin,
                urlsPerMinute: (this.visitedUrls.size / durationMin).toFixed(2),
                resourcesDownloaded: this.resourcesDownloaded
            };
            
            console.log(`爬取统计: 共爬取 ${stats.totalUrls} 个URL，耗时 ${stats.durationMinutes} 分钟`);
            if (this.resourcesDownloaded.images + this.resourcesDownloaded.documents + 
                this.resourcesDownloaded.videos + this.resourcesDownloaded.others > 0) {
                console.log(`下载资源: ${this.resourcesDownloaded.images} 图片, ${this.resourcesDownloaded.documents} 文档, ${this.resourcesDownloaded.videos} 视频, ${this.resourcesDownloaded.others} 其他`);
            }
            
        } catch (error) {
            console.error('爬虫运行错误:', error.message);
            await writeLog(this.options.logFile, `严重错误: ${error.message}`, !this.options.noEncryption);
        } finally {
            // 清理资源
            clearInterval(this.memoryMonitorId);
        }
    }

    // 高级隐身技术
    async applyAdvancedStealth(page) {
        // 注入脚本来修改浏览器特征
        await page.evaluateOnNewDocument(() => {
            // 修改 navigator 属性使网站更难检测自动化
            const originalNavigator = window.navigator;
            const overrides = {
                webdriver: false,
                plugins: {
                    length: 5,
                    refresh: () => {},
                    item: () => ({ name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' }),
                    namedItem: () => ({ name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' })
                },
                language: 'zh-CN',
                languages: ['zh-CN', 'zh', 'en-US', 'en'],
                userAgent: originalNavigator.userAgent.replace('Headless', '')
            };

            Object.defineProperties(navigator, Object.getOwnPropertyDescriptors(overrides));
            
            // 模拟更多浏览器特征
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => {
                if (parameters.name === 'notifications') {
                    return Promise.resolve({ state: Notification.permission });
                }
                return originalQuery(parameters);
            };
            
            // 修改WebGL信息
            const getParameterFn = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) {
                    return 'Intel Inc.';
                }
                if (parameter === 37446) {
                    return 'Intel Iris OpenGL Engine';
                }
                return getParameterFn.call(this, parameter);
            };
        });
        
        // 随机化视口大小
        const viewports = [
            { width: 1366, height: 768 },
            { width: 1920, height: 1080 },
            { width: 1440, height: 900 },
            { width: 1536, height: 864 },
            { width: 1280, height: 720 }
        ];
        const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];
        await page.setViewport(randomViewport);
    }

    async saveContent(url, html, contentType) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const pathSegments = urlObj.pathname.split('/').filter(Boolean);
            
            // 创建目录结构，使用path.join确保跨平台兼容性
            const dirPath = path.join(this.options.outputDir, domain, ...pathSegments);
            await ensureDirectoryExists(dirPath);
            
            // 生成文件名基础
            const fileName = pathSegments.length > 0 
                ? pathSegments[pathSegments.length - 1] || 'index'
                : 'index';
                
            const filePath = path.join(dirPath, fileName);
            
            // 决定保存格式
            let formats = [];
            if (this.options.format === 'auto') {
                // 自动选择格式
                if (contentType.hasText) formats.push('markdown');
                if (contentType.hasTables) formats.push('xlsx');
                if (formats.length === 0) formats.push('html'); // 默认HTML
            } else if (this.options.format === 'both') {
                formats = ['markdown', 'xlsx'];
            } else {
                formats = [this.options.format];
            }
            
            // 清理HTML内容
            const cleanedHtml = cleanHtml(html);
            
            // 保存内容
            for (const format of formats) {
                try {
                    if (format === 'markdown' && contentType.hasText) {
                        const markdown = htmlToMarkdown(cleanedHtml);
                        await fs.writeFile(`${filePath}.md`, markdown, 'utf8');
                        if (this.options.verbose) {
                            console.log(`已保存Markdown: ${filePath}.md`);
                        }
                    }
                    
                    if (format === 'xlsx' && contentType.hasTables) {
                        const tables = extractTablesFromHtml(cleanedHtml);
                        if (tables.length > 0) {
                            await saveTableAsXlsx(tables, `${filePath}.xlsx`);
                            if (this.options.verbose) {
                                console.log(`已保存表格: ${filePath}.xlsx (${tables.length}张表格)`);
                            }
                        }
                    }
                    
                    if (format === 'html') {
                        await fs.writeFile(`${filePath}.html`, cleanedHtml, 'utf8');
                        if (this.options.verbose) {
                            console.log(`已保存HTML: ${filePath}.html`);
                        }
                    }
                } catch (formatError) {
                    console.error(`保存${format}格式失败:`, formatError.message);
                }
            }
            
            // 保存元数据
            try {
                const metadata = {
                    url: url,
                    title: (() => {
                        const match = cleanedHtml.match(/<title>(.*?)<\/title>/i);
                        return match ? match[1] : '无标题';
                    })(),
                    crawlTime: new Date().toISOString(),
                    contentFeatures: contentType,
                    savedFormats: formats
                };
                
                await fs.writeFile(
                    `${filePath}.meta.json`, 
                    JSON.stringify(metadata, null, 2),
                    'utf8'
                );
            } catch (metaError) {
                // 元数据保存失败不影响主要内容
                console.error(`保存元数据失败:`, metaError.message);
            }
            
        } catch (error) {
            console.error(`保存内容失败 ${url}: ${error.message}`);
            await writeLog(
                this.options.logFile, 
                `保存错误: ${url} - ${error.message}`,
                !this.options.noEncryption
            );
        }
    }

    async extractAndDownloadResources(page, baseUrl) {
        try {
            // 提取图片
            const imageUrls = await page.$$eval('img[src]', imgs => 
                imgs.filter(img => img.src && !img.src.startsWith('data:'))
                    .map(img => img.src)
            );
            
            // 并行下载图片，但限制并发数
            const concurrentDownloads = 5;
            for (let i = 0; i < imageUrls.length; i += concurrentDownloads) {
                const batch = imageUrls.slice(i, i + concurrentDownloads);
                await Promise.all(batch.map(imgUrl => 
                    this.downloadResource(new URL(imgUrl, baseUrl).href, 'images')
                ));
            }
            
            // 提取文档链接
            const docLinks = await page.$$eval('a[href]', links => {
                const docExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar'];
                return links
                    .filter(link => {
                        if (!link.href || link.href.startsWith('javascript:')) return false;
                        const ext = link.href.split('.').pop().toLowerCase();
                        return docExtensions.includes(ext);
                    })
                    .map(link => ({
                        url: link.href,
                        text: link.textContent.trim()
                    }));
            });
            
            // 下载文档
            for (const doc of docLinks) {
                await this.downloadResource(new URL(doc.url, baseUrl).href, 'documents');
            }
            
            // 提取视频
            const videoSources = await page.$$eval(
                'video source[src], iframe[src*="youtube"], iframe[src*="vimeo"]',
                elements => elements.map(el => el.src).filter(Boolean)
            );
            
            for (const videoSrc of videoSources) {
                await this.downloadResource(new URL(videoSrc, baseUrl).href, 'videos');
            }
        } catch (error) {
            console.error(`提取资源出错: ${error.message}`);
        }
    }

    async downloadResource(url, resourceType = 'others') {
        // 跳过无效URL
        if (!url || !url.startsWith('http') || url.startsWith('javascript:')) {
            return null;
        }
        
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const filename = path.basename(urlObj.pathname);
            
            // 如果没有文件名或扩展名有问题，使用时间戳
            const fileExt = filename.split('.').pop() || '';
            const actualFilename = (filename && fileExt) ? 
                filename : 
                `resource_${Date.now()}.${this.getExtensionByResourceType(resourceType)}`;
            
            // 创建资源目录
            const resourceDir = path.join(
                this.options.outputDir, 
                domain, 
                'resources',
                resourceType
            );
            await ensureDirectoryExists(resourceDir);
            
            const filePath = path.join(resourceDir, actualFilename);
            
            // 检查文件是否已存在
            try {
                await fs.access(filePath);
                // 文件已存在，不重复下载
                if (this.options.verbose) {
                    console.log(`资源已存在: ${filePath}`);
                }
                return filePath;
            } catch (e) {
                // 文件不存在，继续下载
            }
            
            // 请求资源
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000); // 30秒超时
            
            try {
                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                        'Accept': '*/*',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                    }
                });
                
                clearTimeout(timeout);
                
                if (!response.ok) {
                    throw new Error(`HTTP错误 ${response.status}`);
                }
                
                // 检查文件大小
                const contentLength = parseInt(response.headers.get('content-length') || '0');
                if (contentLength > this.options.maxFileSize) {
                    if (this.options.verbose) {
                        console.log(`跳过大文件(${Math.round(contentLength/1024/1024)}MB): ${url}`);
                    }
                    return null;
                }
                
                // 获取数据
                const buffer = await response.buffer();
                
                // 保存文件
                await fs.writeFile(filePath, buffer);
                
                // 更新计数
                this.resourcesDownloaded[resourceType]++;
                
                if (this.options.verbose) {
                    console.log(`已下载: ${url} -> ${filePath}`);
                }
                
                return filePath;
            } finally {
                clearTimeout(timeout);
            }
        } catch (error) {
            if (this.options.verbose) {
                console.error(`下载失败 ${url}: ${error.message}`);
            }
            return null;
        }
    }
    
    getExtensionByResourceType(resourceType) {
        switch(resourceType) {
            case 'images': return 'jpg';
            case 'documents': return 'pdf';
            case 'videos': return 'mp4';
            default: return 'bin';
        }
    }

    // 重试机制包装的请求函数
    async requestWithRetry(url, options = {}, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) return response;
                
                // 服务器错误可能是临时的，可以重试
                if (response.status >= 500 && response.status < 600) {
                    lastError = new Error(`服务器错误: ${response.status}`);
                    console.log(`请求失败(${attempt}/${maxRetries}): 服务器错误 ${response.status}`);
                } else {
                    // 其他错误状态码直接返回
                    return response;
                }
            } catch (error) {
                lastError = error;
                console.log(`请求失败(${attempt}/${maxRetries}): ${error.message}`);
                
                // 检查错误类型，某些错误不值得重试
                if (error.name === 'AbortError') {
                    break; // 中止请求不重试
                }
            }
            
            if (attempt < maxRetries) {
                // 使用指数退避策略
                const delay = 1000 * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError || new Error('请求失败达到最大重试次数');
    }

    async checkRobotsTxt(url) {
        try {
            const urlObj = new URL(url);
            const robotsUrl = `${urlObj.protocol}//${urlObj.hostname}/robots.txt`;
            
            const response = await this.requestWithRetry(robotsUrl, {
                timeout: 5000
            }, this.options.retryAttempts);
            
            if (!response.ok) return true; // 如果无法获取，默认允许
            
            const robotsTxt = await response.text();
            
            // 简单解析 robots.txt
            const userAgentSections = robotsTxt.split(/User-agent:/i);
            
            // 查找适用于所有爬虫或特定爬虫的规则
            let rules = [];
            for (const section of userAgentSections) {
                const lines = section.split('\n');
                const userAgent = lines[0]?.trim();
                
                if (userAgent === '*' || userAgent === 'Argus') {
                    // 提取此用户代理的规则
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line.startsWith('Disallow:')) {
                            const path = line.substring('Disallow:'.length).trim();
                            if (path) rules.push(path);
                        }
                    }
                }
            }
            
            // 检查当前 URL 是否禁止爬取
            const urlPath = urlObj.pathname;
            return !rules.some(rule => urlPath.startsWith(rule));
            
        } catch (error) {
            if (this.options.verbose) {
                console.error(`检查 robots.txt 失败: ${error.message}`);
            }
            return true; // 出错时默认允许爬取
        }
    }
}

module.exports = ArgusCrawler; 