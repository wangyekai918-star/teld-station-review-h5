# 特来电 APP · 电站评价 H5

按 Figma `YJ7KptNBMPFPQLWv4lZMTA / 17032:94263` 实现。纯 HTML、CSS、JavaScript，无第三方依赖、无需构建。入口为 `index.html`；不含 APP 顶部状态栏、导航栏及原生 Home Indicator。

## 文件与中文注释

| 文件 | 中文说明覆盖范围 |
| --- | --- |
| `index.html` | 页面区域、必填与选填、计数显示、照片入口、底栏和 Toast |
| `styles.css` | 设计变量、布局尺寸、选中态、变色时长、安全区域与键盘适配 |
| `app.js` | 状态字段、每个函数、标签切换、两类动画、选图、校验、异步提交、APP 接口 |
| `preview.html` | 演示容器、预览宽度、模拟安全区域和重置逻辑 |
| `asset-manifest.json` | 使用 `description` 中文说明字段，保持标准 JSON 可解析 |
| `images/README.md` | 每张 PNG/SVG 的用途、原图尺寸、显示尺寸及图层关系 |
| `images/icon-review-help.svg` | 中文 XML 注释，矢量路径和颜色保持不变 |
| `.gitignore` / `.nojekyll` | 本地文件排除规则及 GitHub Pages 静态发布说明 |

PNG 为二进制文件，中文说明放在图片目录文档中，保持设计切图内容完整。

## 在线访问

- [直接体验 H5](https://wangyekai918-star.github.io/teld-station-review-h5/index.html?demo=1)：适合手机查看，提交仅演示。
- [桌面交互预览](https://wangyekai918-star.github.io/teld-station-review-h5/preview.html)：带宽度切换和重置工具栏。
- [GitHub 仓库](https://github.com/wangyekai918-star/teld-station-review-h5)：源码、中文注释和资源说明。

GitHub Pages 从 `main` 分支根目录直接发布，无需构建。后续更新并推送该分支即可同步网站。

## 预览

双击 `index.html` 会自动进入本地演示模式，选中表情即可演示提交，提示“演示提交成功”，不上传任何内容。桌面预览入口为 `preview.html`，支持切换 320 / 375 / 390 / 430px 宽度和重置；该预览入口建议使用 HTTP 打开。

```sh
# 克隆仓库后进入目录；使用桌面交付目录时，在该目录打开终端即可。
cd teld-station-review-h5
python3 -m http.server 8768 --bind 127.0.0.1
```

打开 <http://127.0.0.1:8768/preview.html>。预览页使用 `index.html?demo=1`，提交只演示交互，不上传照片或评论。HTTP/HTTPS 下不带演示参数时仍走正式接口。APP 应加载**不带 `demo=1`** 的 `index.html` 并配置 `onSubmit`；如果 APP 打包本地文件，使用 `index.html?demo=0` 可关闭本地自动演示。显式配置的真实 `onSubmit` 始终覆盖演示处理，只有真实回调成功才提示“提交成功”。

## 交互约定

- 默认 5 个表情全部亮色，但没有选中值，标签隐藏。选择后，仅当前表情亮色，其他表情和文字变灰。
- 亮色和灰色切图常驻叠放，通过亮色层透明度在 200ms 内柔和切换；文字颜色同步过渡。快速切换从当前颜色继续过渡，避免突然换图；灰色底图持续显示，过渡中不会整体变透明。
- 点击或切换表情时，当前图标放大并弹性回到原尺寸：`1 → 1.28 → 0.94 → 1.06 → 1`，持续 520ms。再次点击同一表情也会重播，快速切换只保留最新表情的动画；文字和布局不缩放。系统开启“减少动态效果”时跳过动画。
- 表情从左到右：很不满意、不满意、一般、满意、很满意；对应评分为 1–5（这是 H5 内部约定，接接口时可转换）。截图表格中的“一般满意”对应设计稿的“一般”。
- 标签两列，按当前表情展示。默认全部未选，可多选，再次点击取消。切换表情清空标签选择，再次点击同一表情不清空。标签不会写入文本。
- 首次展示标签、切换到不同标签行数时，评价卡片在 200ms 内平滑伸长或缩短，下方内容随卡片自然移动。快速切换从当前显示高度继续过渡；行数相同时保持高度。动画只改变卡片高度，不压缩表情或标签，结束后恢复内容自适应高度。系统开启“减少动态效果”时跳过高度动画。
- 文本框固定 90px，行高 18px，可展示 5 行，更多内容在框内滚动。允许输入超过 200 字以显示错误；201 字起展示计数，当前数量 `#FD2020`，`/200` 为 `#B4B6B8`，与 Figma 一致。删回 200 字内隐藏计数。超限不能提交。
- 字数按可见字符计数（现代 WebView 的 `Intl.Segmenter`），中文、标点、空格、换行均计入；普通 emoji / 组合 emoji 按一个可见字符计。旧 WebView 无 `Intl.Segmenter` 时按 Unicode 码点计数。
- 照片 70 × 70px，间距 6px，单行横向滚动，按选择顺序追加。入口位于末尾，添加后滚动到末尾。9 张时隐藏入口，删除后恢复，支持重新选择同一张照片。
- 一次选取过多图片只保留剩余名额，提示“最多添加9张照片”。无法解码的图片不加入并提示，不擅自增加图片尺寸或文件大小限制。
- 只有表情必填；未选表情提交提示“请先选择你的评价”。文本超限提示“评价最多200字，请删减后提交”。
- 提交中禁用编辑、防止重复提交。失败保留填写内容；正式提交成功后锁定为“已提交”。演示成功后仍可继续体验。
- “评价规则”仅保留视觉入口（`#review-rules`），未绑定点击事件、弹窗或跳转地址，由前端开发配置已有规则页面链接。

## 五组标签

| 表情 | 标签（显示顺序） |
| --- | --- |
| 很不满意 | 充电失败、设备故障、停车费与实际不符、不对外开放、导航定位不准确 |
| 不满意 | 充电中断、有车占位、环境卫生差、指引不清晰、设备维护不及时 |
| 一般 | 充电慢、需要排队、收费规则不清晰 |
| 满意 | 设备维护及时、收费规则清晰、停车收费与实际相符、不用排队、导航准确、指引清晰好找 |
| 很满意 | 充电顺利、设备完好、充电快、现场管理好、环境卫生好、位置便利 |

## APP 接入

页面没有预设业务域名或原生 Bridge 协议。加载完成后调用 `window.StationReviewH5.init` 配置真实提交处理，业务成功后 resolve，失败则 reject（或返回 `false` / `{ success: false }`）。**请在真实提交响应成功后再 resolve**，H5 会据此展示成功。

```js
// appApi 是示例占位名称，替换成项目实际 API 或 APP Bridge 适配层。
window.StationReviewH5.init({
  onSubmit: async (value) => {
    return await appApi.submitStationReview(value);
  },
  // 原生已留出底部安全区域时传 0；由 H5 负责时省略该字段。
  safeAreaBottom: 0
});
```

`onSubmit` 收到的数据结构：

```js
{
  rating: 5,
  ratingLabel: '很满意',
  tags: ['充电顺利', '设备完好'],
  content: '充电很顺利。',
  photos: [/* File 或 Blob 对象，按用户选择顺序 */]
}
```

照片在页面内只用 Blob URL 本地预览，不会自动上传。HTTP 接口可以使用 `FormData` 附加照片；**不要直接 JSON.stringify File 对象**，APP Bridge 应在适配层完成上传或文件传递。服务端仍需执行评分、文本长度、照片数量等校验。

可用方法：

| 方法 | 说明 |
| --- | --- |
| `init({ onSubmit, safeAreaBottom })` | 配置回调。`safeAreaBottom: null` 恢复 `env(safe-area-inset-bottom)` |
| `getValue()` | 取得当前评分、标签、文字和 File/Blob 数组 |
| `validate()` | 返回 `{ valid: true }` 或 `{ valid: false, field, message }` |
| `submit()` | 校验并提交，返回 `Promise<boolean>` |
| `addPhotos(files)` | 追加 File/Blob 数组，返回实际添加数量；原生相册可在适配后调用 |
| `reset()` | 清空表单并释放照片 Blob URL；提交中返回 `false` |

可监听 `window` 事件 `station-review:ready`、`station-review:change`、`station-review:submitted`；未配置提交回调时发出 `station-review:unconfigured`，不会展示虚假提交成功。页面本身不把填写内容写入持久化存储。

WebView 设置：导航由 APP 原生提供；Android 需接好 `WebChromeClient.onShowFileChooser`，iOS 使用系统文件选择器/相册权限配置。底部默认使用系统安全区域值，避免原生和 H5 重复留白。已针对 Visual Viewport 处理键盘遮挡；系统相册、键盘及真实网络提交仍需在目标 iOS / Android APP 内联调。

## 资源命名

- 表情：`emoji-{very-dissatisfied|dissatisfied|neutral|satisfied|very-satisfied}-{active|inactive}.png`
- 相机：`icon-add-photo.png`
- 删除：`icon-remove-photo.png`
- 规则问号：`icon-review-help.svg`，从 Figma 原始资源下载。

用户原有的 12 张 PNG 仅重命名，文件内容未改变。`asset-manifest.json` 记录原名、新名与 SHA-256，可用于核对或恢复原名。代码只引用英文文件名。

## 已验证

Chromium 移动端模拟已通过默认状态、5 组标签、取消选择、文字独立、199/200/201 字阈值、中文输入法、emoji 计数、固定高度、1/8/9 张照片、超额选图、损坏图片、删除和重选、单独表情提交、失败重试、防重复提交、预览重置及 320–600px 布局检查。375px 下初始两张卡片分别为 359 × 135px、359 × 222px，与 Figma 去掉顶部导航后的尺寸一致。无 JavaScript 错误或资源请求错误。
