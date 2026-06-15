# VCF 中文化 - 浏览器扩展

为 VMware Cloud Foundation 提供中文界面的浏览器扩展，持续跟进版本更新。无需服务器权限，安装即用。

支持：**Chrome · Edge · Firefox**

---

## 安装方法

### Chrome

1. 下载 [vcf-zh-extension.zip](../../raw/main/vcf-zh-extension.zip)，解压到本地文件夹
2. 打开 `chrome://extensions/`
3. 右上角开启**开发者模式**
4. 点击**加载已解压的扩展程序**，选择解压后的文件夹

### Edge

与 Chrome 步骤相同：

1. 下载并解压 [vcf-zh-extension.zip](../../raw/main/vcf-zh-extension.zip)
2. 打开 `edge://extensions/`
3. 左侧栏开启**开发人员模式**
4. 点击**加载解压缩的扩展**，选择解压后的文件夹

### Firefox

Firefox 需要通过**调试页面**加载（临时安装，重启浏览器后需重新加载）：

1. 下载并解压 [vcf-zh-extension.zip](../../raw/main/vcf-zh-extension.zip)
2. 打开 `about:debugging`
3. 点击左侧**此 Firefox**
4. 点击**临时载入附加组件**
5. 进入解压后的文件夹，选择 `manifest.json`

> **提示：** 如需永久安装，可使用 Firefox Developer Edition，在 `about:config` 中将 `xpinstall.signatures.required` 设为 `false`，然后将扩展文件夹打成 `.zip` 后改名为 `.xpi` 再安装。

---

## 使用说明

- 安装后访问 vSphere Client / NSX Manager / Aria Operations，界面自动切换为中文
- 点击浏览器右上角扩展图标可开关中文化
- 点击**立即更新翻译包**可手动拉取最新译文
- 译文每 24 小时自动从 GitHub 更新一次

---

## 工作原理

扩展从 jsDelivr CDN 加载 `vcf-zh/strings` 仓库中的 `lookup.json`（英文原文→中文译文映射），通过 MutationObserver 监听页面 DOM 变化，实时替换文本节点。不修改服务器文件，不影响 VCF 正常运行。

---

## 覆盖范围

| 产品 | 说明 |
|------|------|
| vSphere Client | vCenter UI |
| vSAN | 存储管理 |
| NSX | 网络与安全控制台 |
| Aria Operations | 监控与运维 |

---

## 参与贡献

有 VCF 9.0 环境？帮助提取真实的 UI 字符串，见 [vcf-zh/strings 贡献指南](https://github.com/vcf-zh/strings/blob/main/CONTRIBUTING.md)。

如发现翻译错误，欢迎在 [vcf-zh/strings](https://github.com/vcf-zh/strings) 提交 PR。
