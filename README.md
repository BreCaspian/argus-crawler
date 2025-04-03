# <div align="center">Argus Web Crawler | 网页爬虫工具</div>

<div align="center">

[![License](https://img.shields.io/github/license/BreCaspian/argus-crawler?color=blue&style=flat-square)](https://github.com/BreCaspian/argus-crawler/blob/main/LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen?style=flat-square)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-lightgrey?style=flat-square)](https://github.com/BreCaspian/argus-crawler)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/BreCaspian/argus-crawler/pulls)
[![Last Commit](https://img.shields.io/github/last-commit/BreCaspian/argus-crawler?style=flat-square)](https://github.com/BreCaspian/argus-crawler/commits/main)

[中文](#中文) | [English](#english)

</div>

<a id="中文"></a>

## 🌐 中文

Argus 是一款全自动网页爬虫工具，能够自动绕过防爬虫保护，保护爬取者隐私，并将内容转换为 Markdown 或 XLSX 格式。

### ⚡ 快速开始

#### 方法一：直接安装

```bash
# 克隆仓库或下载项目到本地
git clone https://github.com/BreCaspian/argus-crawler.git
cd argus-crawler

# 安装依赖
npm install

# 基本用法
node argus.js https://example.com
```

#### 方法二：使用npm CLI

```bash
# 安装全局包
npm install -g argus-crawler

# 基本用法
argus https://example.com

# 使用高级模式和代理
argus https://example.com --advanced-mode --proxies proxies.txt
```

### ✨ 特性

- **全自动爬取**：只需输入起始 URL，自动爬取整个网站
- **反爬虫技术**：自动绕过 JavaScript 挑战、CAPTCHA 和浏览器指纹检测
- **IP 隐藏**：支持代理轮换和用户代理轮换，避免被封禁
- **智能内容提取**：自动提取页面主要内容，过滤噪音
- **多格式输出**：根据内容特性自动选择 Markdown、XLSX 或混合格式
- **结构化存储**：按照网站架构组织文件，便于查找和管理
- **隐私保护**：加密日志记录，保护用户隐私
- **高级性能模式**：提供更高性能的爬取选项和增强的匿名性
- **跨平台支持**：兼容 Windows、macOS 和 Linux 系统

### 📄 项目架构

```
argus-crawler/
├── src/                      # 核心源代码
│   ├── ArgusCrawler.js       # 主爬虫实现
│   ├── ProxyManager.js       # 代理管理和轮换
│   └── utils.js              # 工具函数
├── scripts/                  # 支持脚本
│   └── browser-setup.js      # 浏览器环境设置
├── examples/                 # 使用示例
│   └── basic-usage.js        # 基本演示
├── tests/                    # 测试文件
│   └── basic.test.js         # 核心功能测试
├── argus.js                  # 主执行文件
├── package.json              # 项目元数据
├── README.md                 # 文档
└── LICENSE                   # MIT许可证
```

### 🚀 安装

#### 前提条件

- Node.js 16.x 或更高版本
- npm 或 yarn 包管理器

#### 安装方法

**从GitHub克隆**

```bash
git clone https://github.com/BreCaspian/argus-crawler.git
cd argus-crawler
npm install
```

#### 浏览器引擎安装

Argus 使用 Playwright 作为浏览器引擎。在安装依赖后，系统会自动尝试安装所需的浏览器。如果自动安装失败，可以手动安装：

```bash
# 安装所有支持的浏览器
npx playwright install

# 仅安装 Chromium（推荐，占用空间小）
npx playwright install chromium
   
# 在Linux上可能需要额外的系统依赖
npx playwright install-deps
```

#### 使工具可执行（仅适用于 Linux/macOS）

```bash
chmod +x argus.js
```

### 🖥️ 跨平台运行

Argus 完全兼容所有主要操作系统：

- **Windows**：
  ```
  node argus.js <url> [选项]
  ```

- **macOS**：
  ```
  ./argus.js <url> [选项]
  # 或
  node argus.js <url> [选项]
  ```

- **Linux**：
  ```
  ./argus.js <url> [选项]
  # 或
  node argus.js <url> [选项]
  ```

#### 平台特定说明

- **Windows**：在 Windows 上，工具会自动检测并使用适当的浏览器路径
- **macOS**：在 macOS 上，访问某些系统目录可能需要额外的权限
- **Linux**：在 Linux 系统上，浏览器自动化可能需要额外的依赖项。使用 `npx playwright install-deps` 安装所需的系统包

### 📖 基本用法

最简单的用法是直接提供目标网站 URL：

```bash
node argus.js https://crawler-test.com
```

这将使用默认设置爬取网站，并将结果保存在当前目录的 `argus_data` 文件夹中。

### 🛠️ 命令行参数

| 参数 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `--output-dir <path>` | `-o` | 指定输出目录 | `./argus_data` |
| `--proxies <file>` | `-p` | 指定代理列表文件 | 无 |
| `--depth <number>` | `-d` | 设置爬取深度（1表示只爬取起始页面及其直接链接） | `1` |
| `--delay <ms>` | `-w` | 请求之间的延迟（毫秒） | `1000` |
| `--format <format>` | `-f` | 输出格式 (markdown/xlsx/html/auto) | `auto` |
| `--encrypt` | `-e` | 加密输出内容 | `false` |
| `--key <key>` | `-k` | 加密/解密密钥 | `argus-default-key` |
| `--advanced-mode` | `-a` | 启用高级性能模式 | `false` |
| `--test-proxies` | 无 | 在使用前测试代理的有效性 | `false` |
| `--max-concurrency <number>` | 无 | 最大并发请求数 | `10` (标准) / `25` (高级) |
| `--max-requests <number>` | 无 | 最大请求总数 | `1000` (标准) / `5000` (高级) |
| `--navigation-timeout <ms>` | 无 | 页面导航超时时间（毫秒） | `60000` (标准) / `120000` (高级) |
| `--no-browser-check` | 无 | 跳过浏览器依赖检查 | `false` |
| `--download-resources` | 无 | 下载页面资源(图片等) | `false` |
| `--max-file-size <MB>` | 无 | 下载资源的最大文件大小(MB) | `10` |
| `--help`, `-h` | 无 | 显示帮助信息 | N/A |
| `--version`, `-v` | 无 | 显示版本号 | N/A |

### 🧰 特殊命令

Argus 还提供了一些特殊命令：

```bash
# 测试环境和依赖项
node argus.js test-env

# 解密已加密的文件
node argus.js decrypt <加密文件> --key <密钥> --output <输出文件>
```

### 📝 使用示例

#### 使用代理列表：

```bash
node argus.js https://crawler-test.com --proxies proxies.txt
```

代理文件应该每行包含一个代理服务器地址，例如：`http://123.45.67.89:8080`。

#### 限制爬取深度：

```bash
node argus.js https://crawler-test.com --depth 2
```

这将爬取起始页面以及它直接链接的页面及其链接的页面（总共 2 层）。

#### 调整请求延迟：

```bash
node argus.js https://crawler-test.com --delay 2000
```

这将在请求之间设置 2 秒的延迟，减少对目标网站的压力。

#### 爬取 crawler-test.com 的特定测试页面：

```bash
# 爬取包含多个表格的测试页面
node argus.js https://crawler-test.com/tables --format xlsx

# 爬取包含各种链接类型的页面
node argus.js https://crawler-test.com/links/simple --depth 2

# 爬取包含图片的页面并下载资源
node argus.js https://crawler-test.com/image_jpeg --download-resources
```

#### 启用高级性能模式：

```bash
node argus.js https://crawler-test.com --advanced-mode
```

启用高级性能模式，提供更高效的爬取和更强的隐私保护。

### 🔒 高级性能模式

高级性能模式（`--advanced-mode`）是为需要更高效爬取和更强隐私保护的用户设计的，它有以下特点：

- **更高的并发**：默认并发请求数从 10 增加到 25
- **更广的覆盖**：默认最大请求数从 1000 增加到 5000
- **更长的耐心**：页面导航超时从 60 秒增加到 120 秒
- **增强的隐匿**：采用更多浏览器指纹伪造技术
- **增强的代理使用**：更智能的代理轮换和故障转移
- **更强的内容抓取**：改进的资源提取和处理能力
- **随机化**：随机化视口大小、请求头等参数

使用高级模式时，请考虑以下建议：

1. 强烈建议使用代理列表（`--proxies`）
2. 考虑使用代理测试功能（`--test-proxies`）确保代理的有效性
3. 如果目标网站负载敏感，可以适当增加延迟（`--delay`）
4. 注意遵守网站条款和当地法律法规

### 📊 工作原理

Argus 使用以下技术实现强大的爬取功能：

1. **PlaywrightCrawler**：处理页面渲染和导航
2. **Puppeteer + Stealth 插件**：绕过反爬虫检测
3. **代理和用户代理轮换**：隐藏真实 IP
4. **智能内容分析**：根据内容类型选择合适的保存格式
5. **队列管理**：高效处理大量页面请求
6. **错误处理**：自动重试失败的请求

### 📁 输出文件组织

爬取的内容将按照以下结构组织：

```
output_dir/
├── crawler-test.com/
│   ├── tables/
│   │   ├── nested.md
│   │   └── nested.xlsx
│   ├── links/
│   │   └── simple.md
│   └── index.md
├── logs/
│   └── crawler.log
└── downloads/
    └── images/
        └── sample.jpg
```

### 📊 截图示例

<details>
<summary>点击查看截图</summary>

#### 命令行输出
![命令行输出](https://via.placeholder.com/800x300/222222/FFFFFF?text=命令行输出)

#### Markdown输出示例
![Markdown结果](https://via.placeholder.com/800x300/333333/FFFFFF?text=Markdown结果)

#### XLSX输出示例
![XLSX结果](https://via.placeholder.com/800x300/444444/FFFFFF?text=XLSX结果)

</details>

### 🔧 问题排查

#### 浏览器初始化问题

如果遇到浏览器初始化问题：

1. 确保安装了Playwright的浏览器：`npx playwright install`
2. 在Linux上，安装系统依赖：`npx playwright install-deps`
3. 如果您已经在自定义位置安装了浏览器，请尝试使用`--no-browser-check`标志
4. 检查您的系统是否满足Playwright的要求

#### 代理问题

如果您在使用代理时遇到问题：

1. 验证代理格式（例如，`http://user:pass@hostname:port`）
2. 使用`--test-proxies`标志在爬取前验证代理
3. 确保您有权限使用这些代理
4. 检查从您的机器到代理的网络连接

#### 内容未正确保存

如果内容提取未按预期工作：

1. 检查目标网站是否使用不常见的标记结构
2. 尝试不同的输出格式（`--format markdown`或`--format xlsx`）
3. 对于复杂页面，增加导航超时（`--navigation-timeout 120000`）
4. 使用`--debug`标志查看详细日志进行调试

### 🤝 参与贡献

欢迎贡献！请随时提交Pull Request。

1. Fork此仓库
2. 创建您的功能分支（`git checkout -b feature/amazing-feature`）
3. 提交您的更改（`git commit -am 'Add some amazing feature'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 创建新的Pull Request

请阅读[CONTRIBUTING.md](CONTRIBUTING.md)了解我们的行为准则和提交Pull Request的流程。

### ⚠️ 注意事项

使用 Argus 时，请：

- 尊重目标网站的服务条款
- 遵守当地法律法规
- 不要对目标网站造成过大负载
- 仅用于合法目的，如数据分析和研究

使用高级性能模式时请格外注意上述事项。

### 📄 许可证

本项目采用MIT许可证 - 详情请参阅[LICENSE](LICENSE)文件。

---

<a id="english"></a>

## 🌐 English

Argus is a powerful automated web crawler tool that can bypass anti-crawler protection, protect the privacy of the crawler, and convert content to Markdown or XLSX formats.

### ⚡ Quick Start

#### Method 1: Direct Installation

```bash
# Clone repository or download the project
git clone https://github.com/BreCaspian/argus-crawler.git
cd argus-crawler

# Install dependencies
npm install

# Basic usage
node argus.js https://example.com
```

#### Method 2: Using npm CLI

```bash
# Install globally via npm
npm install -g argus-crawler

# Basic usage
argus https://example.com

# Advanced mode with proxy
argus https://example.com --advanced-mode --proxies proxies.txt
```

### ✨ Features

- **Automated Crawling**: Just input the starting URL and automatically crawl the entire website
- **Anti-Crawler Technology**: Automatically bypass JavaScript challenges, CAPTCHAs, and browser fingerprint detection
- **IP Protection**: Support proxy rotation and user agent rotation to avoid being banned
- **Smart Content Extraction**: Automatically extract the main content of the page and filter out noise
- **Multiple Output Formats**: Automatically select the appropriate format (Markdown, XLSX, or mixed) based on content characteristics
- **Structured Storage**: Organize files according to website architecture for easy retrieval and management
- **Privacy Protection**: Encrypted logging to protect user privacy
- **Advanced Performance Mode**: Provides higher performance crawling options and enhanced anonymity
- **Cross-Platform Support**: Compatible with Windows, macOS, and Linux operating systems

### 📄 Project Architecture

```
argus-crawler/
├── src/                      # Core source code
│   ├── ArgusCrawler.js       # Main crawler implementation
│   ├── ProxyManager.js       # Proxy management and rotation
│   └── utils.js              # Utility functions
├── scripts/                  # Support scripts
│   └── browser-setup.js      # Browser environment setup
├── examples/                 # Usage examples
│   └── basic-usage.js        # Basic demo
├── tests/                    # Test files
│   └── basic.test.js         # Core functionality tests
├── argus.js                  # Main executable
├── package.json              # Project metadata
├── README.md                 # Documentation
└── LICENSE                   # MIT License
```

### 🚀 Installation

#### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager

#### Installation Method

**Clone from GitHub**

```bash
git clone https://github.com/BreCaspian/argus-crawler.git
cd argus-crawler
npm install
```

#### Browser Engine Installation

Argus uses Playwright as its browser engine. After installing dependencies, the system will automatically try to install the required browsers. If automatic installation fails, you can install manually:

```bash
# Install all supported browsers
npx playwright install

# Only install Chromium (recommended, smaller footprint)
npx playwright install chromium
   
# On Linux, you may need additional system dependencies
npx playwright install-deps
```

#### Make the tool executable (Linux/macOS only)

```bash
chmod +x argus.js
```

### 🖥️ Cross-Platform Usage

Argus is fully compatible with all major operating systems:

- **Windows**:
  ```
  node argus.js <url> [options]
  ```

- **macOS**:
  ```
  ./argus.js <url> [options]
  # or
  node argus.js <url> [options]
  ```

- **Linux**:
  ```
  ./argus.js <url> [options]
  # or
  node argus.js <url> [options]
  ```

#### Platform-Specific Notes

- **Windows**: On Windows, the tool automatically detects and uses the appropriate browser paths
- **macOS**: On macOS, additional permissions might be required to access certain system directories
- **Linux**: On Linux systems, additional dependencies might be needed for browser automation. Use `npx playwright install-deps` to install required system packages

### 📖 Basic Usage

The simplest usage is to directly provide the target website URL:

```bash
node argus.js https://crawler-test.com
```

This will crawl the website using default settings and save the results in the `argus_data` folder in the current directory.

### 🛠️ Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output-dir <path>` | `-o` | Specify output directory | `./argus_data` |
| `--proxies <file>` | `-p` | Specify proxy list file | None |
| `--depth <number>` | `-d` | Set crawl depth (1 means only crawl the starting page and its direct links) | `1` |
| `--delay <ms>` | `-w` | Delay between requests (milliseconds) | `1000` |
| `--format <format>` | `-f` | Output format (markdown/xlsx/html/auto) | `auto` |
| `--encrypt` | `-e` | Encrypt output content | `false` |
| `--key <key>` | `-k` | Encryption/decryption key | `argus-default-key` |
| `--advanced-mode` | `-a` | Enable advanced performance mode | `false` |
| `--test-proxies` | N/A | Test proxy validity before use | `false` |
| `--max-concurrency <number>` | N/A | Maximum concurrent requests | `10` (standard) / `25` (advanced) |
| `--max-requests <number>` | N/A | Maximum total requests | `1000` (standard) / `5000` (advanced) |
| `--navigation-timeout <ms>` | N/A | Page navigation timeout (milliseconds) | `60000` (standard) / `120000` (advanced) |
| `--no-browser-check` | N/A | Skip browser dependency check | `false` |
| `--download-resources` | N/A | Download page resources (images, etc.) | `false` |
| `--max-file-size <MB>` | N/A | Maximum file size for downloaded resources (MB) | `10` |
| `--help`, `-h` | N/A | Display help information | N/A |
| `--version`, `-v` | N/A | Display version number | N/A |

### 🧰 Special Commands

Argus also provides some special commands:

```bash
# Test environment and dependencies
node argus.js test-env

# Decrypt encrypted files
node argus.js decrypt <encrypted_file> --key <key> --output <output_file>
```

### 📝 Usage Examples

#### Using a proxy list:

```bash
node argus.js https://crawler-test.com --proxies proxies.txt
```

The proxy file should contain one proxy server address per line, e.g., `http://123.45.67.89:8080`.

#### Limiting crawl depth:

```bash
node argus.js https://crawler-test.com --depth 2
```

This will crawl the starting page plus its linked pages and their linked pages (2 levels in total).

#### Adjusting request delay:

```bash
node argus.js https://crawler-test.com --delay 2000
```

This sets a 2-second delay between requests, reducing pressure on the target website.

#### Crawling specific test pages on crawler-test.com:

```bash
# Crawl test page with multiple tables
node argus.js https://crawler-test.com/tables --format xlsx

# Crawl page with various link types
node argus.js https://crawler-test.com/links/simple --depth 2

# Crawl page with images and download resources
node argus.js https://crawler-test.com/image_jpeg --download-resources
```

#### Enabling advanced performance mode:

```bash
node argus.js https://crawler-test.com --advanced-mode
```

Enable advanced performance mode for more efficient crawling and stronger privacy protection.

### 🔒 Advanced Performance Mode

Advanced performance mode (`--advanced-mode`) is designed for users who need more efficient crawling and stronger privacy protection. It offers:

- **Higher concurrency**: Default concurrent requests increased from 10 to 25
- **Broader coverage**: Default maximum requests increased from 1000 to 5000
- **Longer patience**: Page navigation timeout increased from 60 seconds to 120 seconds
- **Enhanced stealth**: More browser fingerprint spoofing techniques
- **Enhanced proxy usage**: Smarter proxy rotation and failover
- **Stronger content extraction**: Improved resource extraction and processing capabilities
- **Randomization**: Randomize viewport sizes, request headers, and other parameters

When using advanced mode, consider these recommendations:

1. Strongly recommended to use a proxy list (`--proxies`)
2. Consider using the proxy testing feature (`--test-proxies`) to ensure proxy validity
3. Adjust the delay (`--delay`) if the target website is load-sensitive
4. Be mindful of the website's terms of service and local laws and regulations

### 📊 How It Works

Argus uses the following technologies to achieve powerful crawling capabilities:

1. **PlaywrightCrawler**: Handles page rendering and navigation
2. **Puppeteer + Stealth plugins**: Bypasses anti-crawler detection
3. **Proxy and user agent rotation**: Hides real IP
4. **Intelligent content analysis**: Chooses appropriate saving format based on content type
5. **Queue management**: Efficiently processes large numbers of page requests
6. **Error handling**: Automatically retries failed requests

### 📁 Output File Organization

The crawled content will be organized according to the following structure:

```
output_dir/
├── crawler-test.com/
│   ├── tables/
│   │   ├── nested.md
│   │   └── nested.xlsx
│   ├── links/
│   │   └── simple.md
│   └── index.md
├── logs/
│   └── crawler.log
└── downloads/
    └── images/
        └── sample.jpg
```

### 📊 Screenshot Examples

<details>
<summary>Click to view screenshots</summary>

#### Command Line Output
![Command Line Output](https://via.placeholder.com/800x300/222222/FFFFFF?text=Command+Line+Output)

#### Markdown Output Example
![Markdown Result](https://via.placeholder.com/800x300/333333/FFFFFF?text=Markdown+Result)

#### XLSX Output Example
![XLSX Result](https://via.placeholder.com/800x300/444444/FFFFFF?text=XLSX+Result)

</details>

### 🔧 Troubleshooting

#### Browser Initialization Problems

If you encounter browser initialization problems:

1. Ensure Playwright's browsers are installed: `npx playwright install`
2. On Linux, install system dependencies: `npx playwright install-deps`
3. Try running with `--no-browser-check` flag if you've already installed browsers in a custom location
4. Check if your system meets Playwright's requirements

#### Proxy Issues

If you're having trouble with proxies:

1. Verify proxy format (e.g., `http://user:pass@hostname:port`)
2. Use the `--test-proxies` flag to validate proxies before crawling
3. Ensure you have permission to use the proxies
4. Check network connectivity from your machine to the proxies

#### Content Not Being Saved Correctly

If content extraction doesn't work as expected:

1. Check if the target website uses unusual markup structures
2. Try different output formats (`--format markdown` or `--format xlsx`)
3. Increase the navigation timeout for complex pages (`--navigation-timeout 120000`)
4. For debugging, use `--debug` flag to see detailed logs

### 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -am 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a new Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### ⚠️ Notice

When using Argus, please:

- Respect the target website's terms of service
- Comply with local laws and regulations
- Do not cause excessive load on the target website
- Use only for legitimate purposes such as data analysis and research

Be especially mindful of these considerations when using advanced performance mode.

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 