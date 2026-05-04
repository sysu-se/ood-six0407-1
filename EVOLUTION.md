# Homework 2 设计演进说明（EVOLUTION）

## 1. 你如何实现提示功能？

在 **`Sudoku`** 上增加了与盘面快照相关的纯函数与实例方法：

- **`cellCandidatesForGrid` / `getCellCandidates`**：对空格根据同行、同列、同宫已填数字计算仍合法的候选集合（「候选提示」的数据来源）。
- **`nextSinglesHintForGrid` / `getNextSinglesHint`**：按行优先找到第一个「仅有一个候选」的空格，得到 `{ row, col, value }`（「下一步提示」/推定数，仅用 singles，不调用完整求解器）。

**`Game`** 不负责算候选，仍只负责 `guess` 与历史栈；「下一步提示」在适配层 `userGrid.applySinglesHint` 中读取 `getNextSinglesHint`，扣减提示次数后调用 `guess`，因此与 HW1 一样在主线 history 里占一步。

「候选提示」在 **`userGrid.applyCandidateHint`** 中只读领域、把候选列表交给 **`candidates.setFromHint`** 写入 UI 的候选显示，不自动填数。

## 2. 你认为提示功能更属于 `Sudoku` 还是 `Game`？为什么？

**推理与数据更属于 `Sudoku`**：候选与 singles 都是对「当前 9×9 数字矩阵」的规则推演，与是否开局、是否限时提示无关。

**会话与扣次更属于外层**：提示次数、与 store 的同步仍在 `stores` 与（若将来需要）`Game` 的会话策略里；`Game` 不复制一套候选算法，避免把规则逻辑拆散到 UI。

## 3. 你如何实现探索模式？

在 **`createGame`** 内增加布尔 **`exploring`** 与锚点 **`exploreAnchor`**（进入探索时对 `current` 的克隆）。

- **`enterExplore`**：当前盘无冲突、有空格、且 **`nextSinglesHintForGrid` 为 null**（没有任何「唯一候选」格）时才允许进入，避免与作业「无法用推定数推进时才探索」的前提冲突。
- **探索中的 `guess`**：不向主 **`past`/`future`** 压栈；若盘面出现冲突，把当前整盘签名写入 **`failedBoardSignatures`**（`Set`）。
- **`backtrackExploreToAnchor`**：把 `current` 恢复为锚点克隆，便于在起点换一支候选。
- **`abandonExplore`**：同样回到锚点并退出探索，主历史栈不变。
- **`commitExplore`**：退出探索前 **`past.push(exploreAnchor.clone())`** 并清空 **`future`**，使之后 **一次 `undo` 即可回到探索前** 的锚点局面。

## 4. 主局面与探索局面的关系是什么？

- **不维护两套长期对象**：始终只有一个 **`current`** Sudoku；探索只是在「不污染主 undo 栈」的前提下在其上试填。
- **锚点是值拷贝**：`exploreAnchor` 为 `clone()`，与 `current` 不共享内部 9×9 数组，无深拷贝引用污染问题。
- **提交**：逻辑上把探索终点合并为当前主局面，并用锚点快照补进 **`past`**，保证撤销语义清晰。
- **放弃**：丢弃探索中的修改，用锚点覆盖 `current`。

## 5. 你的 history 结构在本次作业中是否发生了变化？

**主栈仍是线性 `past` / `future`**，与 HW1 一致。

变化在于：**探索中的落子不进入主栈**；**提交探索**时一次性压入**锚点**快照，而不是为探索中每一步各压一条。这样满足「快速回到起点」与「提交后主 undo 仍合理」，且未引入 DAG。

**未**为探索单独实现完整子 history（加分项）；若要做「探索内 undo/redo」，可在 `exploring` 为真时再挂一对局部栈。

## 6. Homework 1 中的哪些设计，在 Homework 2 中暴露出了局限？

- **原先提示走完整 `solveSudoku`**：与「推定数 / 领域语义」不一致，也难以区分「仅提示」与「直接填数」。HW2 改为领域内的 singles / 候选。
- **单一 `guess` 一律压栈**：无法表达「试填分支不污染主线历史」，因此必须在 `Game` 里分支 `exploring` 分支。

## 7. 如果重做一次 Homework 1，你会如何修改原设计？

- 在 **`Sudoku` 创建时**就预留 **`getCellCandidates` / `getNextSinglesHint`** 一类纯查询接口，避免后来再在 store 里调用求解器包。
- 在 **`Game`** 的 API 上更早区分 **`applyMove`**（记历史）与 **`applyProvisionalMove`**（不记历史），或引入显式 **`MoveRecorder`**，使探索/撤销策略扩展时少改核心分支。

---

**序列化**：`Game.toJSON` 仍为 `{ sudoku }`，与 HW1 测试兼容；探索状态未持久化到 JSON（刷新即丢失），若需可后续扩展字段。
