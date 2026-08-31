# 移动端背景稳定性冻结记录

## 最终实现（当前版本：sticky 视口尺寸壁纸）

用户反馈“壁纸自然是拉伸，我不要有拉伸的”，据此授权将背景实现从“跟随文档高度”改为“sticky 视口尺寸吸附”，消除长页面下壁纸被放大裁切的拉伸感：

- `.app-page-background`（App.vue）使用 Tailwind：`sticky top-0 -z-10 mb-[-100vh] h-screen w-full overflow-hidden pointer-events-none`。
  - 高度锁定 `100vh`（iOS 上是常量），宽度 `100%` —— 壁纸按**屏幕比例（100vw × 100vh）** cover 居中裁剪，16:9 / 19.5:9 / 20:9 等主流手机比例下均为自然构图。
  - `mb-[-100vh]` 抵消 sticky 层的文档流占位，内容仍从页面顶部开始并覆盖在壁纸之上。
- `.app-bg-canvas` 保持 `position: absolute; inset: 0; background-size: cover; background-position: center center; background-repeat: no-repeat`，相对视口尺寸层裁剪。
- 滚动时壁纸吸附在视口顶部，内容从壁纸上滚过，形成沉浸式手机壁纸效果；吸附由合成器驱动，无 JS、无滚动监听、无 transform。
- 未使用 `position: fixed`、`100dvh`、`100lvh`、`visualViewport` 动态测量或滚动时背景变换；地址栏收起/展开与橡皮筋回弹不会触发尺寸重算或位移。
- `html { height: 100% }`、`#app { min-height: 100vh }`、`.app-root { min-height: 100vh }` 保留，保证短页面容器不小于视口。
- `html/body` 仍持有 `--prohub-background-color` 底色，回弹露出区域与主题色一致。
- 已知表现（非缺陷）：地址栏展开时壁纸底部最多被裁掉约一条地址栏高度（100vh 为最大视口常量）；文档顶部/底部橡皮筋回弹露出的区域为纯色底（与主题色一致）。

### 拉伸问题根因记录（历史）

旧方案背景层 `absolute inset: 0` 跟随整篇文档高度，首页等长页面容器达数屏高（如 390px × 2600px），`cover` 为盖满容器把壁纸等比放大约 3 倍，用户只能看到原图中间一小块，构图破坏 → 视觉上“拉伸/变形”。`cover` 本身不改变宽高比，问题在于它按文档高度而非屏幕高度裁剪。

## 变更历史

| 轮次 | 触发（用户反馈） | 变更 |
| --- | --- | --- |
| 1 | 背景位移/抽搐/闪烁 | 弃用 fixed + 动态视口方案，改为 absolute inset:0 跟随文档高度 + cover |
| 2 | “背景没有铺满整个网页/屏幕” | `html{height:100%}`、`#app/.app-root{min-height:100vh}` 修复百分比高度链 |
| 3 | “页面上部和下部的黑边依然存在” | 尝试 safe-area 负 inset 外延 + 内容层 env padding + viewport meta 修改 |
| 4 | “壁纸被拉伸” + “把背景壁纸恢复到正常” | 回退第 3 轮全部改动（含 md 文档恢复原状） |
| 5 | “壁纸自然是拉伸，我不要有拉伸的” | 定位拉伸根因：cover 按文档总高度放大。改用 sticky 视口尺寸背景，壁纸始终按屏幕比例自然裁剪 |

## 已完成的静态验证

- 前端 `npm run build` 通过。
- 站内已有 `position: sticky` 元素（AppHeader `sticky top-3`）在真实设备工作正常；`body { overflow-x: hidden }` 因 overflow 向视口传播规则不会破坏 sticky（AppHeader 即为例证）。
- 全站无其他 background-size 覆盖（grep 仅 style.css cover 与 BgSwitcher 内联 cover）。

## 移动浏览器验证矩阵

| 环境 | 壁纸无拉伸/按屏裁剪 | 滚动吸附稳定（无位移/抽搐/闪烁） | 深浅色 + 换壁纸 | 状态 |
| --- | --- | --- | --- | --- |
| iOS Safari | 待设备验证 | 待设备验证 | 待设备验证 | 未覆盖 |
| iOS Edge | 待设备验证 | 待设备验证 | 待设备验证 | 未覆盖 |
| Android Chrome | 待设备验证 | 待设备验证 | 待设备验证 | 未覆盖 |
| Android Edge | 待设备验证 | 待设备验证 | 待设备验证 | 未覆盖 |

注：上下黑边与壁纸拉伸是两个独立问题。黑边疑似浏览器 chrome 染色（如 Edge iOS 顶栏/底栏），页面 CSS 只能通过 theme-color 等间接影响，等待用户确认后单独处理。

## 冻结范围

后续 Bug 修复不得修改以下背景实现，除非用户明确授权：

- `App.vue` 中 `.app-page-background`（sticky 视口层）与 `.app-bg-canvas` 的 DOM 结构与类名；
- `style.css` 中 `.app-page-background` 注释与规则、`.app-bg-canvas`（cover 居中裁剪）规则；
- `style.css` 中 `html { height: 100% }`、`#app { min-height: 100vh }`、`.app-root { min-height: 100vh }`；
- 不得重新引入 `position: fixed` 背景、`100dvh/100lvh` 动态视口高度计算、`visualViewport` 监听或滚动时背景变换。

如果真实设备测试仍发现问题，应先记录设备型号、系统版本、浏览器版本、地址栏状态和复现步骤，再单独取得授权修改冻结范围。
