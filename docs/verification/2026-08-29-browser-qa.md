# 浏览器 QA 回执：首个可玩繁育切片

日期：2026-08-29
方式：隔离 Playwright CLI 浏览器会话
服务：本地 Vite，`http://127.0.0.1:5173/`

## 结论

首个两代繁育垂直切片在桌面和平板两条独立 Chromium 会话中完成。两个目标视口的关键页面均无横向溢出，错误级控制台消息均为 0。两条会话都在第一代留鸟后和第二代完成后刷新，并恢复到正确阶段。

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

## 平板完整闭环 · 1024×768

使用全新浏览器会话和空本地存档重复完整流程：湖蓝 × 青柠第一代配种、展开遗传解释、填写留鸟理由、刷新恢复、与银铃进行第二代有限兼容配种、完成两代，再次刷新恢复完成页。最终统计同样为 12 个记录个体、2 个完成代数和 10 条历史事件。

检查结果：

- `viewport = 1024 × 768`
- `scrollWidth = clientWidth = 1024`
- 初始鸟舍、第一代配对、出生揭晓、第二代配对和完成页：`horizontalOverflow = false`
- 浏览器控制台：`Errors: 0, Warnings: 0`
- 第一代留鸟后刷新：恢复到“准备第二代”
- 第二代完成后刷新：恢复到“你的第一条血系已经开始”
- [平板鸟舍截图](../../output/playwright/tablet-birdhouse-1024x768.png)
- [平板第二代配对截图](../../output/playwright/tablet-generation-two-pairing-1024x768.png)
- [平板完成页截图](../../output/playwright/tablet-completion-1024x768.png)

## 档案与四代血统窗口

在空存档中打开晨露档案，检查已知表型、检测结果、未知位点、潜力与机会成本，以及四代血统窗口。桌面和平板均能滚动到血统区域，页面和对话框都没有横向溢出；父亲、母亲与基础种鸟节点没有遮挡。检查期间浏览器控制台错误为 0。

- 桌面对话框：`scrollWidth = clientWidth = 1150`
- 平板对话框：`scrollWidth = clientWidth = 990`
- [桌面档案与血统图](../../output/playwright/desktop-profile-pedigree.png)
- [平板档案与血统图](../../output/playwright/tablet-profile-pedigree-1024x768.png)

## 尚未跨越的门槛

- 尚未完成至少 5 名目标玩家的可用性试玩。
- 尚未验证玩家能否稳定形成不依赖“最高总数值”的留鸟理由。
- 兼容率、遗传稳定度、健康风险和真实物种边界仍需鸟类繁育专业复核。
- 本轮没有验证手机视口、无障碍读屏完整性、长期多存档迁移或性能压力。
