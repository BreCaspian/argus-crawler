# Changelog | 更新日志

All notable changes to the Argus project will be documented in this file.

此文件记录Argus项目的所有重要更改。

## [1.1.0] - 2023-04-02

### English

#### Added
- Advanced Performance Mode for enhanced crawling capabilities
- Cross-platform support improvements
- Browser dependency auto-detection and installation
- New command `test-env` to diagnose system environment
- Content encryption and decryption functionality
- Auto-retry mechanism for failed requests
- Resource downloading capability with size limits
- Proxy testing functionality

#### Changed
- Improved error handling and graceful shutdown
- Enhanced proxy management with better rotation
- Refactored crawler core for better performance
- Updated dependencies to latest stable versions
- Modified default settings for better compatibility

#### Fixed
- Browser launch issues on different operating systems
- Path handling issues on Windows
- Memory leaks during large crawling sessions
- Various stability issues with long-running crawls

### 中文

#### 新增
- 高级性能模式，增强爬取能力
- 跨平台支持改进
- 浏览器依赖自动检测和安装
- 新命令 `test-env` 用于诊断系统环境
- 内容加密和解密功能
- 失败请求自动重试机制
- 资源下载功能，支持大小限制
- 代理测试功能

#### 变更
- 改进错误处理和优雅关闭
- 增强代理管理，提供更好的轮换
- 重构爬虫核心，提高性能
- 更新依赖至最新稳定版本
- 修改默认设置以提高兼容性

#### 修复
- 不同操作系统上的浏览器启动问题
- Windows上的路径处理问题
- 大型爬取会话中的内存泄漏
- 长时间运行爬取的各种稳定性问题

## [1.0.0] - 2023-03-15

### English

#### Added
- Initial release of Argus Web Crawler
- Basic crawling functionality
- Proxy support
- Multiple output formats (Markdown, XLSX)
- Stealth mode to bypass anti-crawler protections
- Command-line interface

### 中文

#### 新增
- Argus网页爬虫工具初始版本发布
- 基本爬取功能
- 代理支持
- 多种输出格式（Markdown、XLSX）
- 隐身模式，绕过反爬虫保护
- 命令行界面 