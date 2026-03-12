# Scripts — AI補完計画 実装ツール

## pandora_extractor.js
生ログから構造化データを自動抽出する2段パイプライン。

```bash
# ドライラン（実際には書き込まない）
node pandora_extractor.js --input ./pandora/ --output ./candidates/ --dry-run

# 本番実行
node pandora_extractor.js --input ./pandora/ --output ./candidates/
```

**カスタマイズ:** `CONFIG.keywords` に自分の業界・業務のキーワードを追加。

## pii_anonymizer.js
テキスト内のPIIを検出→仮名化→暗号化対応表保存。

```bash
# 暗号化キー生成（初回のみ）
export PII_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 仮名化（可逆）
node pii_anonymizer.js --input data.txt --output data_anon.txt

# 不可逆匿名化（対応表を保存しない）
node pii_anonymizer.js --input data.txt --output data_anon.txt --irreversible

# 対応表の破棄（仮名化→匿名化への移行）
node pii_anonymizer.js --destroy-table ./pii_mappings/mapping_table.enc
```

## 共通要件
- Node.js 18+
- LLM APIキー（extractorのみ: OPENAI_API_KEY or ANTHROPIC_API_KEY）

## カスタマイズのコツ
1. `CONFIG.patterns` に業界固有のPIIパターンを追加
2. `CONFIG.keywords` に業務固有の抽出キーワードを追加
3. 名簿ファイル（name_roster.txt）を用意すると人名検出精度UP
