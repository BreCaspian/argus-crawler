// 添加ReadableStream polyfill
require('web-streams-polyfill/ponyfill');

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { getSystemInfo, writeLog } = require('./utils');

/**
 * 代理管理器类，用于加载和管理代理列表
 */
class ProxyManager {
    /**
     * 创建代理管理器实例
     * @param {Object} options 选项对象
     * @param {string} options.proxiesPath 代理文件路径
     * @param {boolean} options.testProxies 是否测试代理可用性
     * @param {string} options.outputDir 输出目录，用于日志
     */
    constructor(options = {}) {
        this.proxiesPath = options.proxiesPath || null;
        this.proxies = [];
        this.currentIndex = 0;
        this.testProxies = options.testProxies || false;
        this.validProxies = [];
        this.invalidProxies = [];
        this.testResults = {};
        this.outputDir = options.outputDir || path.join(process.cwd(), 'argus_data');
        this.logPath = path.join(this.outputDir, 'logs', 'proxy_manager.log');
        this.lastRotationTime = Date.now();
        this.rotationInterval = 5 * 60 * 1000; // 5分钟轮换一次代理
        this.retryLimit = 3; // 代理失败重试次数限制
        this.failedProxies = new Map(); // 跟踪失败的代理
        this.proxyStats = new Map(); // 每个代理的统计
    }

    /**
     * 加载代理列表
     */
    async loadProxies() {
        if (!this.proxiesPath) {
            return [];
        }
        
        try {
            const content = await fs.readFile(this.proxiesPath, 'utf8');
            
            // 分割文本为行，并移除空行和注释行
            this.proxies = content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));
            
            // 记录日志
            await this.log(`已加载 ${this.proxies.length} 个代理`);
            
            // 如果需要测试代理，则进行测试
            if (this.testProxies) {
                await this.testAllProxies();
            } else {
                this.validProxies = [...this.proxies];
            }
            
            return this.proxies;
        } catch (error) {
            console.error(`加载代理列表失败: ${error.message}`);
            await this.log(`加载代理列表失败: ${error.message}`, 'error');
            this.proxies = [];
            this.validProxies = [];
            return [];
        }
    }
    
    /**
     * 测试指定代理的有效性
     * @param {string} proxy 代理字符串
     * @returns {Promise<boolean>} 代理是否有效
     */
    async testProxy(proxy) {
        try {
            // 记录测试开始
            await this.log(`正在测试代理: ${proxy}`);
            
            // 从代理字符串解析出协议、地址、端口
            const [protocol, credentials, host, port] = this.parseProxyString(proxy);
            
            // 如果解析失败，则标记为无效
            if (!protocol || !host || !port) {
                await this.log(`代理格式无效: ${proxy}`, 'error');
                return false;
            }
            
            const proxyConfig = {
                protocol: protocol.endsWith(':') ? protocol : `${protocol}:`,
                host,
                port: parseInt(port, 10),
            };
            
            // 如果有认证信息，则添加到配置中
            if (credentials) {
                const [username, password] = credentials.split(':');
                proxyConfig.auth = {
                    username: username || '',
                    password: password || ''
                };
            }
            
            // 使用axios测试代理
            const startTime = Date.now();
            const response = await axios.get('https://api.ipify.org?format=json', {
                proxy: proxyConfig,
                timeout: 10000, // 10秒超时
            });
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            // 检查响应状态码
            const isValid = response.status === 200;
            
            // 记录测试结果
            this.testResults[proxy] = {
                isValid,
                latency,
                testedAt: new Date().toISOString(),
                ip: response.data?.ip || 'unknown'
            };
            
            await this.log(`代理测试结果: ${proxy} - ${isValid ? '有效' : '无效'}, 延迟: ${latency}ms, IP: ${response.data?.ip || 'unknown'}`);
            
            // 更新代理统计
            if (!this.proxyStats.has(proxy)) {
                this.proxyStats.set(proxy, {
                    successCount: 0,
                    failCount: 0,
                    totalLatency: 0,
                    lastUsed: null,
                    lastStatus: null
                });
            }
            
            const stats = this.proxyStats.get(proxy);
            if (isValid) {
                stats.successCount++;
                stats.totalLatency += latency;
                stats.lastStatus = 'success';
            } else {
                stats.failCount++;
                stats.lastStatus = 'fail';
            }
            stats.lastUsed = new Date();
            this.proxyStats.set(proxy, stats);
            
            return isValid;
        } catch (error) {
            // 记录错误
            await this.log(`代理测试异常: ${proxy} - ${error.message}`, 'error');
            
            // 更新代理统计
            if (!this.proxyStats.has(proxy)) {
                this.proxyStats.set(proxy, {
                    successCount: 0,
                    failCount: 0,
                    totalLatency: 0,
                    lastUsed: null,
                    lastStatus: null
                });
            }
            
            const stats = this.proxyStats.get(proxy);
            stats.failCount++;
            stats.lastStatus = 'error';
            stats.lastUsed = new Date();
            stats.lastError = error.message;
            this.proxyStats.set(proxy, stats);
            
            return false;
        }
    }
    
    /**
     * 测试所有代理的有效性
     */
    async testAllProxies() {
        if (this.proxies.length === 0) {
            console.log('没有可测试的代理');
            return;
        }
        
        console.log(`正在测试 ${this.proxies.length} 个代理...`);
        
        // 清空之前的测试结果
        this.validProxies = [];
        this.invalidProxies = [];
        
        // 并行测试所有代理，但限制并发数量
        const concurrency = Math.min(10, this.proxies.length);
        const chunks = [];
        
        // 分批处理代理列表，每批并发测试
        for (let i = 0; i < this.proxies.length; i += concurrency) {
            chunks.push(this.proxies.slice(i, i + concurrency));
        }
        
        let completedCount = 0;
        for (const chunk of chunks) {
            const results = await Promise.all(chunk.map(proxy => this.testProxy(proxy)));
            
            results.forEach((isValid, index) => {
                const proxy = chunk[index];
                if (isValid) {
                    this.validProxies.push(proxy);
                } else {
                    this.invalidProxies.push(proxy);
                }
                
                // 更新进度
                completedCount++;
                const percent = Math.round((completedCount / this.proxies.length) * 100);
                process.stdout.write(`\r测试进度: ${percent}% (${completedCount}/${this.proxies.length})`);
            });
        }
        
        console.log('\n');
        console.log(`测试完成: ${this.validProxies.length} 个有效代理, ${this.invalidProxies.length} 个无效代理`);
        
        // 记录日志
        await this.log(`代理测试完成 - 有效: ${this.validProxies.length}, 无效: ${this.invalidProxies.length}`);
        
        // 保存测试结果
        await this.saveTestResults();
        
        return {
            valid: this.validProxies,
            invalid: this.invalidProxies
        };
    }
    
    /**
     * 保存代理测试结果
     */
    async saveTestResults() {
        try {
            const systemInfo = getSystemInfo();
            const resultsDir = path.join(this.outputDir, 'proxy_results');
            
            // 确保结果目录存在
            try {
                await fs.mkdir(resultsDir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
            
            // 生成结果文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const resultsFile = path.join(resultsDir, `proxy_test_${timestamp}.json`);
            
            // 创建结果对象
            const results = {
                timestamp: new Date().toISOString(),
                system: systemInfo,
                proxy_file: this.proxiesPath,
                total_proxies: this.proxies.length,
                valid_proxies: this.validProxies.length,
                invalid_proxies: this.invalidProxies.length,
                valid_list: this.validProxies,
                invalid_list: this.invalidProxies,
                detailed_results: this.testResults
            };
            
            // 保存结果
            await fs.writeFile(resultsFile, JSON.stringify(results, null, 2), 'utf8');
            console.log(`代理测试结果已保存到: ${resultsFile}`);
            
            // 保存有效代理列表
            const validProxiesFile = path.join(resultsDir, `valid_proxies_${timestamp}.txt`);
            await fs.writeFile(validProxiesFile, this.validProxies.join('\n'), 'utf8');
            console.log(`有效代理列表已保存到: ${validProxiesFile}`);
            
            return resultsFile;
        } catch (error) {
            console.error(`保存代理测试结果失败: ${error.message}`);
            await this.log(`保存代理测试结果失败: ${error.message}`, 'error');
            return null;
        }
    }
    
    /**
     * 获取下一个可用代理
     * @returns {string|null} 代理字符串或null
     */
    getNextProxy() {
        if (this.validProxies.length === 0) {
            return null;
        }
        
        // 检查是否需要轮换代理
        const now = Date.now();
        if (now - this.lastRotationTime > this.rotationInterval) {
            this.lastRotationTime = now;
            this.shuffleProxies();
        }
        
        // 轮询选择代理
        this.currentIndex = (this.currentIndex + 1) % this.validProxies.length;
        const proxy = this.validProxies[this.currentIndex];
        
        // 更新代理使用统计
        if (!this.proxyStats.has(proxy)) {
            this.proxyStats.set(proxy, {
                successCount: 0,
                failCount: 0,
                totalLatency: 0,
                lastUsed: new Date(),
                lastStatus: null
            });
        } else {
            const stats = this.proxyStats.get(proxy);
            stats.lastUsed = new Date();
            this.proxyStats.set(proxy, stats);
        }
        
        return proxy;
    }
    
    /**
     * 随机打乱代理列表顺序
     */
    shuffleProxies() {
        for (let i = this.validProxies.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.validProxies[i], this.validProxies[j]] = [this.validProxies[j], this.validProxies[i]];
        }
        this.currentIndex = 0;
    }
    
    /**
     * 标记代理失败
     * @param {string} proxy 代理字符串
     */
    markProxyFailed(proxy) {
        if (proxy) {
            // 增加失败计数
            const failCount = this.failedProxies.get(proxy) || 0;
            this.failedProxies.set(proxy, failCount + 1);
            
            // 更新统计
            if (this.proxyStats.has(proxy)) {
                const stats = this.proxyStats.get(proxy);
                stats.failCount++;
                stats.lastStatus = 'fail';
                stats.lastUsed = new Date();
                this.proxyStats.set(proxy, stats);
            }
            
            // 如果失败次数超过限制，将其从有效列表中移除
            if (failCount + 1 >= this.retryLimit) {
                this.validProxies = this.validProxies.filter(p => p !== proxy);
                this.invalidProxies.push(proxy);
                this.failedProxies.delete(proxy); // 已移除，不再跟踪
                this.log(`代理 ${proxy} 失败次数过多，已从有效列表中移除`);
            }
        }
    }
    
    /**
     * 标记代理成功
     * @param {string} proxy 代理字符串
     */
    markProxySuccess(proxy) {
        if (proxy) {
            // 重置失败计数
            this.failedProxies.delete(proxy);
            
            // 更新统计
            if (this.proxyStats.has(proxy)) {
                const stats = this.proxyStats.get(proxy);
                stats.successCount++;
                stats.lastStatus = 'success';
                stats.lastUsed = new Date();
                this.proxyStats.set(proxy, stats);
            }
        }
    }
    
    /**
     * 获取代理统计信息
     * @returns {Object} 代理统计信息
     */
    getProxyStats() {
        const result = {
            totalProxies: this.proxies.length,
            validProxies: this.validProxies.length,
            invalidProxies: this.invalidProxies.length,
            proxyStats: Object.fromEntries(this.proxyStats)
        };
        
        // 计算平均延迟和成功率
        for (const [proxy, stats] of this.proxyStats.entries()) {
            const totalRequests = stats.successCount + stats.failCount;
            stats.successRate = totalRequests > 0 ? Math.round((stats.successCount / totalRequests) * 100) : 0;
            stats.averageLatency = stats.successCount > 0 ? Math.round(stats.totalLatency / stats.successCount) : 0;
        }
        
        return result;
    }
    
    /**
     * 记录日志
     * @param {string} message 日志消息
     * @param {string} level 日志级别
     */
    async log(message, level = 'info') {
        try {
            await writeLog(this.logPath, {
                level,
                message,
                component: 'ProxyManager',
                proxyCount: this.proxies.length,
                validCount: this.validProxies.length
            });
        } catch (error) {
            console.error(`写入代理管理器日志失败: ${error.message}`);
        }
    }
    
    /**
     * 解析代理字符串
     * @param {string} proxyString 代理字符串
     * @returns {Array} 解析结果 [protocol, credentials, host, port]
     */
    parseProxyString(proxyString) {
        try {
            // 常见代理格式：
            // http://user:pass@host:port
            // http://host:port
            // host:port
            
            let protocol = 'http:';
            let credentials = null;
            let host;
            let port;
            
            // 检查是否包含协议
            if (proxyString.includes('://')) {
                const parts = proxyString.split('://');
                protocol = parts[0];
                proxyString = parts[1];
            }
            
            // 检查是否包含认证信息
            if (proxyString.includes('@')) {
                const parts = proxyString.split('@');
                credentials = parts[0];
                proxyString = parts[1];
            }
            
            // 分割主机和端口
            const hostPortParts = proxyString.split(':');
            if (hostPortParts.length === 2) {
                host = hostPortParts[0];
                port = hostPortParts[1];
            } else {
                return [null, null, null, null]; // 格式无效
            }
            
            return [protocol, credentials, host, port];
        } catch (error) {
            this.log(`解析代理字符串失败: ${proxyString} - ${error.message}`, 'error');
            return [null, null, null, null];
        }
    }
}

module.exports = ProxyManager; 