# 表情与照片图标素材说明

所有文件名使用英文小写和短横线。PNG 为设计师提供的三倍切图，不修改图像内容；中文注释统一记录在此文件，以及根目录 `asset-manifest.json` 的 `description` 字段中。

| 文件名 | 用途 | 原图尺寸 | 页面显示尺寸 |
| --- | --- | --- | --- |
| `emoji-very-dissatisfied-active.png` | 很不满意，亮色上层 | 120 × 120px | 40 × 40px |
| `emoji-very-dissatisfied-inactive.png` | 很不满意，灰色底层 | 120 × 120px | 40 × 40px |
| `emoji-dissatisfied-active.png` | 不满意，亮色上层 | 120 × 120px | 40 × 40px |
| `emoji-dissatisfied-inactive.png` | 不满意，灰色底层 | 120 × 120px | 40 × 40px |
| `emoji-neutral-active.png` | 一般，亮色上层 | 120 × 120px | 40 × 40px |
| `emoji-neutral-inactive.png` | 一般，灰色底层 | 120 × 120px | 40 × 40px |
| `emoji-satisfied-active.png` | 满意，亮色上层 | 120 × 120px | 40 × 40px |
| `emoji-satisfied-inactive.png` | 满意，灰色底层 | 120 × 120px | 40 × 40px |
| `emoji-very-satisfied-active.png` | 很满意，亮色上层 | 120 × 120px | 40 × 40px |
| `emoji-very-satisfied-inactive.png` | 很满意，灰色底层 | 120 × 120px | 40 × 40px |
| `icon-add-photo.png` | 添加照片入口的相机图标 | 60 × 60px | 20 × 20px |
| `icon-remove-photo.png` | 缩略图右上角删除图标 | 48 × 48px | 16 × 16px，点击区 32 × 32px |
| `icon-review-help.svg` | 评价须知问号图标 | 原始矢量 | 11 × 11px，居中放入 12px 容器 |

表情两层同时存在：灰色图在下，亮色图在上。未选中时亮色层在 200ms 内淡出，选中时淡入；回弹作用于两层共用的 40px 容器，持续 520ms。

`active` 不代表页面默认已有评分。初次进入五个表情都展示亮色图，评分值仍为 `null`。

资源清单字段：`original` 是原始中文文件名，`filename` 是当前英文文件名，`sha256` 用于核验原图未改动，`description` 是资源中文说明。标准 JSON 不允许行注释，因此使用说明字段保持文件可解析。
