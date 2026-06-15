# VCF 中文化 - 浏览器扩展

为 VMware Cloud Foundation 9.0 提供中文界面的 Chrome 扩展。无需服务器权限，安装即用。

## 安装方法

1. 下载 [vcf-zh-extension.zip](../../releases/latest)，解压到本地文件夹
2. 打开 Chrome，地址栏输入 `chrome://extensions/`
3. 右上角开启**开发者模式**
4. 点击**加载已解压的扩展程序**，选择解压后的文件夹
5. 访问 vSphere Client，界面自动切换为中文

## 使用说明

- 点击浏览器右上角扩展图标可开关中文化
- 点击**立即更新翻译包**可手动拉取最新译文
- 译文每 24 小时自动从 GitHub 更新一次

## 工作原理

扩展从 jsDelivr CDN 加载 `vcf-zh/strings` 仓库中的 `lookup.json`（英文→中文映射表），通过 MutationObserver 监听页面 DOM 变化，实时替换文本节点。不修改服务器文件，不影响 VCF 正常运行。

## 覆盖范围

- vSphere Client（vCenter）
- vSAN 存储管理
- NSX 控制台
- VMware Aria Operations

## 注意事项

- 仅支持 Chrome / Edge（Chromium 内核）
- 翻译基于社区贡献的字符串，覆盖率随时间持续提升
- 如发现翻译错误，欢迎在 [vcf-zh/strings](https://github.com/vcf-zh/strings) 提交 PR

## 参与贡献

有 VCF 9.0 环境？帮助提取真实的 UI 字符串：见 [vcf-zh/strings 贡献指南](https://github.com/vcf-zh/strings/blob/main/CONTRIBUTING.md)
