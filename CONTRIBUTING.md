# 参与开发

可直接修改 `extension/` 中的源码，不需要打包工具。提交前运行 `npm test`、`npm run check:release`；修改浏览器交互时，再运行 `npm run test:browser`。

新增规则请在 `tests/rule-fixtures.json` 中补上合成案例，包括应命中和不应命中的情况。避免只针对某个人的收藏设计规则。

模型适配位于 `extension/ai-providers.js`，分类队列位于 `extension/ai-classifier.js`。不得在源码、测试或截图里放真实 Key；协议测试通过模拟 fetch 验证，真实服务测试需使用自己的账户并自行确认费用。

提交问题时说明浏览器版本、操作步骤、预期和实际结果。用 `example.com` 等示例网址替换私人链接，检查截图中是否出现收藏标题、账户信息或密钥。

发布前运行检查脚本，并人工检查新增文件。检查器不是完整的数据防泄露工具。不要把浏览器配置目录、收藏备份、个人种子、历史预览或测试输出加入仓库。
