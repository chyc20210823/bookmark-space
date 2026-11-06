# 演示素材

README 的图谱、规则流程截图、GIF 和视频录制于 0.5.0；分类选择器截图来自 0.5.1。所有素材均来自扩展的实际操作，使用 22 条公开网站组成的示例收藏。录制运行在一次性 Chromium 配置中，阻断 HTTP/HTTPS 页面请求，没有接触日常浏览器、使用真实 Key 或调用模型。分类结果来自本机规则和演示中添加的自定义规则，不代表 AI 分类效果。

## 录制内容

1. 收藏首页与最近收藏。
2. 收藏图谱 → 编程开发 → Python → 文章详情。
3. 添加 example.com 域名规则，归入学习与研究 / 待读资料。
4. 查看内置规则，再打开示例收藏确认归类依据。

## 重新录制

先按 README 安装开发依赖与 Chromium，然后运行：

```sh
node scripts/capture-demo.cjs
```

截图输出到 docs，原始录屏和时间记录输出到 artifacts/demo（不提交）。录屏脚本会验证收藏数量、规则生效、详情来源及页面错误，结束后清理临时浏览器配置。

安装 FFmpeg 后，可以导出通用 MP4 与图谱 GIF。以下截取时间对应本次录制；重新录制时应结合 recording.json 和实际画面调整：

```sh
ffmpeg -i artifacts/demo/walkthrough.webm -ss 0.7 -c:v libx264 -pix_fmt yuv420p -crf 22 -movflags +faststart -an docs/walkthrough.mp4
ffmpeg -ss 2.8 -t 10.3 -i artifacts/demo/walkthrough.webm -filter_complex "[0:v]fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" -loop 0 docs/graph-demo.gif
```

视频无配音、无后期功能演绎。GIF 用于 README 自动播放预览，MP4 提供完整操作录像下载。发布前检查每张截图及视频，确认没有个人收藏、密钥、账号信息或私人路径。不要录制自己的日常浏览器再直接上传。

0.5.3 新增 AI 设置与整理页截图。它们来自独立浏览器的实际界面，使用合成收藏、假 Key 与模拟模型返回；演示中的每日上限和调用数是测试设置，不是新安装默认值或真实账单。
