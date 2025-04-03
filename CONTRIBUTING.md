# 贡献指南

感谢您对Argus项目的关注！我们欢迎各种形式的贡献，包括但不限于：改进代码、优化文档、报告问题以及提出新功能建议。

## 报告问题

如果您发现了bug或者有任何问题，请通过GitHub Issues提交。在提交问题时，请提供以下信息：

- Argus的版本信息
- 运行环境（操作系统、Node.js版本等）
- 问题的详细描述
- 复现步骤
- 期望结果和实际结果
- 相关的日志输出或错误信息
- 如果可能，请提供截图

## 提交代码

我们使用GitHub Flow工作流程。如果您想贡献代码，请按照以下步骤操作：

1. Fork本仓库
2. 创建您的特性分支：`git checkout -b feature/amazing-feature`
3. 提交您的更改：`git commit -m 'Add some amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 打开一个Pull Request

### 开发环境设置

```bash
# 克隆您fork的仓库
git clone https://github.com/your-username/argus.git
cd argus

# 安装依赖
npm install

# 安装浏览器依赖
npm run postinstall
```

### 代码风格

- 我们使用ESLint进行代码风格检查
- 提交前请运行 `npm run lint` 确保代码符合规范
- 请保持一致的代码风格，遵循现有代码的模式

### 测试

- 添加新功能时，请同时添加适当的测试
- 修复bug时，请先添加一个测试来验证问题，然后再修复它
- 在提交PR前，请确保所有测试都通过：`npm test`

## 文档贡献

文档同样重要。如果您发现文档中的错误或者想要改进文档，可以：

- 直接在README.md或其他文档文件上提交PR
- 在Issues中提出文档改进建议

## 发布周期

- 我们使用[语义化版本控制](https://semver.org/)来管理版本
- 重大更新会在发布前进行公告
- 版本更新将记录在CHANGELOG.md中

## 行为准则

请查阅我们的[行为准则](CODE_OF_CONDUCT.md)，了解我们的社区标准。

## 获取帮助

如果您需要帮助或有任何疑问，可以：

- 在GitHub Issues中提问
- 联系项目维护者

感谢您的贡献！ 