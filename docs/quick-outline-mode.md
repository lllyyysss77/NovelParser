# 快速提纲模式设计

## 目标

为长篇小说增加一条独立于深度章节分析的“快速提纲”链路，满足以下约束：

- 面向 2000 章及以上规模，优先保证吞吐、稳定性和可恢复性。
- 输出结果以剧情脉络为中心，不追求完整文学分析。
- 支持增量重跑，避免某一章修改后全书重新生成。
- 尽量复用现有 Tauri 命令、进度事件、SQLite 缓存机制。

## 为什么不复用现有分析链路

当前流程是：

1. 逐章生成完整 `ChapterAnalysis`
2. 按固定组做阶段汇总
3. 生成 `NovelSummary`

这条链路适合“深度分析”，不适合“快速提纲”：

- 章节 JSON 过重，字段太多，2000 章成本高。
- 汇总输入是完整章节分析，层级不够深时会在大体量下触发上下文瓶颈。
- 现有 `NovelSummary` 结构过于粗，无法表达分卷、冲突线、人物线的阶段推进。

因此应新增轻量数据模型和单独命令，不与现有 `ChapterAnalysis` / `NovelSummary` 混用。

## 总体方案

采用 4 段式流水线：

1. 章节轻提纲提取
2. 叶子组归并
3. 中间层归并
4. 全书提纲收敛

核心原则：

- 章节层只抽“剧情索引”，不做深度评论。
- 分组按 token 预算动态切分，不固定 10 章一组。
- 每层输出都落缓存，支持断点续跑。
- 每个节点带内容指纹，支持增量失效。

## 数据结构

### 章节级

```ts
export interface ChapterOutline {
  chapter_id: number
  chapter_index: number
  title: string
  brief: string
  chapter_goal?: string
  core_events: string[]
  new_characters: string[]
  status_changes: string[]
  hook?: string
  token_estimate: number
  content_hash: string
  created_at: string
}
```

约束：

- `brief` 控制在 80-150 字
- `core_events` 最多 3 条
- `new_characters` 只记首次出现或明显重要人物
- `status_changes` 只记会影响后文推进的变化
- `hook` 为空时不强行生成

### 分段级

```ts
export interface SegmentOutline {
  layer: number
  group_index: number
  chapter_range: [number, number]
  summary: string
  main_progress: string[]
  character_threads: string[]
  conflict_threads: string[]
  unresolved_hooks: string[]
  resolved_hooks: string[]
  content_hash: string
  created_at: string
}
```

### 全书级

```ts
export interface BookOutline {
  created_at: string
  overview: string
  stage_outlines: {
    title: string
    chapter_range: [number, number]
    summary: string
  }[]
  main_plot_threads: string[]
  key_character_arcs: {
    name: string
    arc: string
  }[]
  major_conflicts: string[]
  setup_payoff_map: {
    setup: string
    payoff?: string
    chapter_ref?: string
  }[]
}
```

## 数据库存储

建议新增两张表，不挤进现有 `chapters.analysis` 和 `summary_cache`。

```sql
CREATE TABLE IF NOT EXISTS chapter_outlines (
    chapter_id INTEGER PRIMARY KEY REFERENCES chapters(id) ON DELETE CASCADE,
    novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_index INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    outline TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outline_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    layer INTEGER NOT NULL,
    group_index INTEGER NOT NULL,
    chapter_start INTEGER NOT NULL,
    chapter_end INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    outline TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(novel_id, layer, group_index)
);
```

说明：

- `chapter_outlines` 用于章节级增量跳过。
- `outline_cache` 用于树状归并各层缓存。
- `content_hash` 推荐由当前节点所有子节点的 hash 拼接后再哈希。

## 命令接口

建议新增 `src-tauri/src/commands/outline.rs`，暴露以下命令。

### 章节级

```rust
#[tauri::command]
pub async fn generate_chapter_outline(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    chapter_id: i64,
) -> Result<ChapterOutline, String>
```

```rust
#[tauri::command]
pub async fn batch_generate_outlines(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    novel_id: String,
) -> Result<(), String>
```

### 全书级

```rust
#[tauri::command]
pub async fn generate_book_outline(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    novel_id: String,
) -> Result<BookOutline, String>
```

### 读写与维护

```rust
#[tauri::command]
pub fn get_chapter_outline(...)

#[tauri::command]
pub fn get_book_outline(...)

#[tauri::command]
pub fn clear_book_outline(...)

#[tauri::command]
pub fn clear_outline_cache(...)
```

## Prompt 设计

### 章节轻提纲 Prompt

只输出剧情推进，不要文学分析：

- 本章主目标是什么
- 发生了哪些关键推进
- 有哪些对后文有效的状态变化
- 本章末是否留下明确钩子

输出 JSON 保持极简，避免长字段：

```json
{
  "brief": "100字内本章概述",
  "chapter_goal": "本章主要目标或推动力",
  "core_events": ["事件1", "事件2"],
  "new_characters": ["人物A"],
  "status_changes": ["关系恶化", "身份暴露"],
  "hook": "章末悬念或下一步推进"
}
```

### 组归并 Prompt

输入不再是完整章节 JSON，而是 `ChapterOutline` 或下一级 `SegmentOutline`。

组归并只要求：

- 这段范围推进了什么
- 哪些人物线真正发生变化
- 哪些冲突升级/转向/解决
- 哪些悬念延续，哪些已回收

### 最终归并 Prompt

只允许基于已有结构化节点归并，避免把原文重新塞进模型上下文。

## 分组策略

不要固定“10章一组”。推荐按 token 预算动态打包。

伪代码：

```rust
fn make_groups(nodes: &[NodeMeta], target_tokens: usize) -> Vec<Vec<NodeMeta>> {
    let mut groups = Vec::new();
    let mut current = Vec::new();
    let mut total = 0;

    for node in nodes {
        if !current.is_empty() && total + node.token_estimate > target_tokens {
            groups.push(current);
            current = Vec::new();
            total = 0;
        }
        total += node.token_estimate;
        current.push(node.clone());
    }

    if !current.is_empty() {
        groups.push(current);
    }

    groups
}
```

推荐默认值：

- 章节层到叶子层：`target_tokens = 6000`
- 中间层归并：`target_tokens = 8000`
- 最终层：如节点仍过多，继续加一层，不强行终局合并

对 2000 章而言，通常会形成：

- 第 0 层：2000 个 `ChapterOutline`
- 第 1 层：约 40 到 100 个叶子组
- 第 2 层：约 5 到 15 个中间组
- 第 3 层：1 个全书提纲

## 增量策略

### 章节失效

当章节内容变化时：

1. 重新计算该章 `content_hash`
2. 若 hash 未变，跳过
3. 若 hash 变化，重算该章 `ChapterOutline`
4. 标记其所在叶子组失效

### 组失效

某组任一子节点 hash 变化时：

1. 重新拼接子节点 hash
2. 若组 hash 变化，重算组摘要
3. 继续向上冒泡失效

这样能把重算范围限制在一条祖先链上，而不是全书重跑。

## 并发与稳定性

### 章节层

- 可高并发，沿用当前批处理模式。
- 若未来启用上下文注入，快速提纲模式建议默认禁用。
- 章节层允许失败跳过并记录，最后统一提示失败章节数。

### 归并层

- 同一层组与组之间可并发。
- 层与层之间必须串行。
- 每完成一组立即落库，避免中途失败导致整层全部丢失。

## UI 设计

建议新增独立模式，而不是塞进当前 `api/manual` 二选一。

前端最小改动建议：

- 在小说页增加“深度分析 / 快速提纲”切换
- 快速提纲页展示：
  - 章节提纲生成进度
  - 提纲树归并进度
  - 失败章节列表
  - 最终全书提纲
- 支持单章预览轻提纲，便于 spot check

## 与现有代码的衔接

建议新增以下文件：

- `src-tauri/src/commands/outline.rs`
- `src-tauri/src/outline.rs`
- `src/components/BookOutlineView.tsx`
- `src/store/slices/outlineSlice.ts`

建议修改以下文件：

- `src-tauri/src/models.rs`
- `src-tauri/src/storage.rs`
- `src-tauri/src/prompt.rs`
- `src-tauri/src/commands/mod.rs`
- `src/types/index.ts`

## 实施顺序

建议分 3 步落地。

### 第一步：最小可用

- 新增 `ChapterOutline`
- 支持单章和批量章节轻提纲
- 支持结果落库和读取

### 第二步：树状归并

- 新增 `SegmentOutline` / `BookOutline`
- 动态分组
- 多层缓存和断点续跑

### 第三步：增量重算

- 接入 `content_hash`
- 只重算脏节点
- UI 展示“命中缓存 / 实际重算”统计

## 不建议做法

- 不建议直接把现有 `ChapterAnalysis` 裁掉几个字段来冒充快速提纲。
- 不建议继续固定 10 章一组。
- 不建议将 2000 章的章节摘要一次性拼进单个 prompt。
- 不建议让最终模型直接读原文做全书大纲。

## 默认策略建议

如果现在要先做一版能跑的，我建议默认配置如下：

- 快速提纲模式默认不注入上下文
- 章节级并发沿用 `max_concurrent_tasks`
- 章节输出目标 200 字以内
- 组输入控制在 6000 到 8000 token
- 超过 12 个组时自动再加一层归并
- 失败章节允许跳过，但最终结果中显示“缺失章节数”

这样做的重点不是“最聪明”，而是先把 2000 章规模下最容易炸的 4 个点压住：

- 单章成本
- 汇总层级
- 缓存复用
- 中断恢复
