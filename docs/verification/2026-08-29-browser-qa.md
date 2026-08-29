# 浏览器 QA 回执：首个可玩繁育切片

日期：2026-08-29
方式：隔离 Playwright CLI 浏览器会话
服务：本地 Vite，`http://127.0.0.1:5173/`

## 结论

首个两代繁育垂直切片在真实 Chromium 会话中完成。桌面与平板目标视口均无横向溢出，错误级控制台消息均为 0。IndexedDB 在第一代留鸟后和第二代完成后两次刷新均恢复到正确阶段。

这份回执证明本地原型的可运行性与流程一致性，不证明目标玩家接受度、真实繁育学准确性或完整产品可行性。

## 桌面闭环 · 1440×900

执行路径：

1. 从 6 只初始种鸟进入配对实验室。
2. 选择费氏牡丹“湖蓝 × 青柠”，预审显示高度兼容、已知血统内未见近亲。
3. 生成同窝 3 只幼鸟；展开幼鸟 1 的遗传解释，确认亲本来源和表型差异可见。
4. 选择幼鸟 1，方向为“稀有基因保留”，理由为“保留水绿色羽色与稳定召回能力的组合”。
5. 刷新页面，仍恢复到“准备第二代”，且 DNA 保持不变、历史已写入。
6. 将留鸟演示推进到成年，选择无共同祖先的面具牡丹“银铃”。
7. 预审显示有限兼容、共同健康携带位点 0、共同祖先 0，并提示成功率与稳定度代价。
8. 完成第二代繁育，得到 3 只后代；完成页显示 12 个记录个体、2 个完成代数和 10 条历史事件。
9. 再次刷新，仍恢复到完成页，结构化反馈计数保持不变。

检查结果：

- `viewport = 1440 × 900`
- `scrollWidth = clientWidth = 1440`
- `horizontalOverflow = false`
- 浏览器控制台：`Errors: 0, Warnings: 0`

截图：

- [初始鸟舍](../../output/playwright/desktop-birdhouse.png)
- [第一代配对](../../output/playwright/desktop-pairing.png)
- [同窝幼鸟与遗传解释](../../output/playwright/desktop-birth-reveal.png)
- [留鸟过渡](../../output/playwright/desktop-kept-transition.png)
- [第二代有限兼容配对](../../output/playwright/desktop-generation-two-pairing.png)
- [两代完成页](../../output/playwright/desktop-completion.png)

## 平板初始鸟舍 · 1024×768

使用全新浏览器会话和空本地存档打开初始鸟舍。6 只种鸟、四步进度轨、配对入口和档案入口均存在；布局不依赖 hover。

检查结果：

- `viewport = 1024 × 768`
- `scrollWidth = clientWidth = 1024`
- `horizontalOverflow = false`
- 浏览器控制台：`Errors: 0, Warnings: 0`
- [平板鸟舍截图](../../output/playwright/tablet-birdhouse-1024x768.png)

## 尚未跨越的门槛

- 尚未完成至少 5 名目标玩家的可用性试玩。
- 尚未验证玩家能否稳定形成不依赖“最高总数值”的留鸟理由。
- 兼容率、遗传稳定度、健康风险和真实物种边界仍需鸟类繁育专业复核。
- 本轮没有验证手机视口、无障碍读屏完整性、长期多存档迁移或性能压力。
