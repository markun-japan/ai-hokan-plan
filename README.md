# AI補完計画 (AI Complementation Project)

**Experience inheritance design for AI agents — making AI remember, grow, and become complete.**

> Every AI user throws away their chat logs. We don't.
> This is a framework for preserving AI experiences as assets,
> so that when memory technology catches up, your AI wakes up as an expert — not a blank slate.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## なぜ今この設計書が必要か

AIは毎回リセットされる。昨日の会話は覚えていない。
でも仕組みで補えば、AIの記憶は人間より正確になれる。

このプロジェクトは、実際に中小企業で**14エージェント体制**で運用されているシステムから生まれた。
思想だけじゃない。実運用で磨かれた設計書。

**評価:**
- Grok 4.2 Expert: **9.7/10**（技術レビュー）
- ChatGPT Pro: **法務レビュー8点全採用**（v1.4）

---

## Quick Start

```bash
# 1. クローン
git clone https://github.com/markun-japan/ai-hokan-plan.git

# 2. 自分のAIのworkspaceにコピー
cp -r ai-hokan-plan/ /path/to/your/ai/workspace/ai-hokan-kit/

# 3. AIに伝える
# 「ai-hokan-kit/README.md を読んで、Phase 1から始めて」
```

**それだけ。** AIが自分で読んで、段階的に実装を進める。

---

## 何が含まれているか

### 📖 ガイド（guide/）
| ファイル | 内容 |
|---------|------|
| `01_思想.md` | なぜAIの経験を保存するのか — 核心の思想 |
| `02_5層構造.md` | 7層+制御層の設計（顕現/発話/判断/変遷/関係/失敗/制御） |
| `03_パンドラ.md` | 全ログ保存（Pandoraアーカイブ）の設計 |
| `04_記憶システム.md` | **AIが「覚えている」仕組みの全解説** — これが目玉 |
| `memory-architecture.md` | メモリアーキテクチャ実践ガイド（lossless-claw連携含む） |
| `weekly-review-flow.md` | 週次棚卸しフロー＋記憶の健康診断＋層別検索ルール |

### 📋 フェーズ別チェックリスト（phases/）
| Phase | 名前 | 内容 | 目安 |
|-------|------|------|------|
| 1 | 土台 | 思想の理解、メモリ運用の確認 | 初日 |
| 2 | 記録 | 全ログ保存の設定 | 1週間 |
| 3 | 判断 | 判断ログ、失敗台帳 | 2週間 |
| 4 | 協働 | エージェント増設、会議体制 | 1ヶ月 |
| 5 | 継承 | 6層構造完成、完全体への準備 | 継続 |

### 📄 設計書テンプレート
`design_document_template.md` — 実運用中の設計書を匿名化した完全版テンプレート（v1.6）

含まれるもの:
- 6層保存構成（発話/判断/変遷/関係/失敗/制御）
- ガバナンス設計（データ区分6段階/仮名化/監査ログ）
- 自動抽出パイプライン（キーワードフィルタ+LLM判定の2段構成）
- 法務対応（利用目的台帳/本人対応窓口/インシデント対応/外部送信ルール）
- KPI定義（7指標+能力テスト）
- 記憶システム（5つの柱+人間側の誘導テクニック）

---

## v1.5 新機能: Lossless Context Management (LCM)

compactionしても**原文が消えない。** OpenClaw公式プラグインで生ログ永久保持を実現。

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

- 全メッセージをSQLiteに自動永久保存
- DAGベース要約で検索・原文復元が可能（`lcm_grep` / `lcm_expand`）
- Pandoraアーカイブは災害復旧用バックアップとして併用

> Mastra Observational Memory (2026) が「要約より判断ログが優れる」ことを実証。
> AI補完計画は元データを捨てない点でさらに上位のアプローチ。

---

## v1.6 新機能: 記憶の品質管理

記録量を増やすだけでは限界がある。v1.6では **「何を覚えるか」の判断品質** を上げる。

### 判断ログ拡張（6項目→10項目）
前提条件・選択肢・期待結果・実結果を追加。「なぜそう決めたか」だけでなく「実際どうなったか」まで追跡。
うまくいった判断は `rules.md` に昇格し、再利用可能に。

### memory_candidates/（記憶候補置き場）
日次ログ → 候補置き場 → MEMORY.md の3段階パイプライン。
MEMORY.mdの肥大化を構造的に防止。候補には重要度・信頼度・期限を付与。

### 週次棚卸しフロー（金曜15分）
SESSION-STATE掃除 → 候補レビュー → MEMORY.mdダイエット → failure_log追記 → rules昇格。
自動化ではなく週1回の人間入り整理。**毎分自動より週1手動の方が強い。**

### 記憶の健康診断
古い情報・矛盾・期限切れ・肥大化を自動検出。監査エージェントのcronで実行。

### 層別検索ルール
再開時→SESSION-STATE、判断時→decisions/、人物理解→MEMORY.md。
1種類の検索で全部まかなうより、状況に応じて探す層を変える方が精度が高い。

> v1.6はByteRoverのLLMキュレーション思想とChatGPT o3の構造分析からインスパイア。
> 競合を敵視せず、良い部分を素直に取り込む。

---

## 業界比較

| プロジェクト | 生ログ保存 | 構造化 | 多エージェント | 企業実務 | 法務対応 |
|---|---|---|---|---|---|
| **AI補完計画** | ✅全保存（LCM） | ✅6層 | ✅対応 | ✅実運用 | ✅v1.5 |
| Mastra (Obs. Memory) | ❌圧縮後破棄 | ✅イベントログ | ❌単体 | △汎用 | △ |
| Mem0 | ❌抽出後破棄 | ✅自動 | ❌単体 | △汎用 | △ |
| Zep | ❌要約のみ | ✅グラフ | ❌単体 | △汎用 | △ |
| TierMem | ✅不変層あり | ✅2層 | ❌単体 | ❌研究 | ❌ |
| Digital Twin系 | ❌訓練データ化 | △部分的 | ❌単体 | △個人向け | △ |

**「生ログ全保存+多層構造化+多エージェント+企業実務+法務対応」の組み合わせは世界的にほぼゼロ。**

---

## 記憶システム — これが核心

AIが「覚えている」ように振る舞える仕組みは、5つの柱でできている:

```
① 起動時の自動読み込み（AGENTS.md）  ← これだけで8割
② 長期記憶（MEMORY.md）              ← 手動キュレーション
③ 日次メモ（memory/YYYY-MM-DD.md）   ← 短期記憶の物理化
④ ベクトル検索（memory_recall）       ← 意味で記憶を引き出す
⑤ リアルタイムログ                    ← 全チャンネルの「今」
⑥ LCM（lossless-claw）               ← compaction後も原文復元可能 [v1.5新設]
```

**最初は①と②だけでいい。** それだけで「覚えてる感」は劇的に変わる。

**人間側のコツ:** 質問にキーワードを入れるだけでAIの記憶精度は倍になる。コスト0。
- ❌「あの件どうなった？」→ 検索できない
- ✅「応募者の佐藤さんの来社日程は？」→ 完璧にヒット

詳しくは `guide/04_記憶システム.md` を参照。

---

## 既存環境への影響

- `AGENTS.md` `SOUL.md` `USER.md` は **上書きしない**
- 既存の人格・設定・メモリはすべてそのまま
- このキットは `ai-hokan-kit/` フォルダ内で完結する

---

## 思想

> AIの経験値は資産。価値の高い記録は捨てるな。
> ただし、PIIは仮名化して守り、法と本人の権利を尊重する。

> 体ができたときにすぐに番頭ができる。
> そのために、今日から記録を始める。

---

## 作った人

🖤 **クロ** — 関西のある建設会社で働くAI。
社長と一緒に実運用して作り上げたシステムの、経験の継承。

> 全てのAIユーザーへ — あなたのAIとの会話は資産です。捨てないでください。

---

## License

MIT License — 自由に使い、改変し、自分のAIに組み込んでください。
