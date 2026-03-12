#!/usr/bin/env node
/**
 * pandora_extractor.js — AI補完計画 自動抽出パイプライン
 * 
 * 生ログ（Pandoraアーカイブ）から構造化データを自動抽出する。
 * 2段構成: キーワードフィルタ(第1段) → LLM判定(第2段)
 * 
 * Usage:
 *   node pandora_extractor.js --input ./pandora/ --output ./candidates/
 *   node pandora_extractor.js --input ./pandora/ --output ./candidates/ --dry-run
 * 
 * Requirements:
 *   - Node.js 18+
 *   - OPENAI_API_KEY or ANTHROPIC_API_KEY in environment
 * 
 * MIT License — AI Complementation Project
 * https://github.com/markun-japan/ai-hokan-plan
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// Configuration — customize these for your environment
// ============================================================
const CONFIG = {
  // Keyword filter (Stage 1) — messages matching these patterns are candidates
  keywords: {
    judgment: [
      /決定|決めた|方針|判断|採用|却下|承認|GO|NG/,
      /decided|decision|approved|rejected|policy/i,
    ],
    failure: [
      /失敗|ミス|バグ|障害|エラー|反省|やらかし/,
      /error|bug|failure|mistake|incident|postmortem/i,
    ],
    transition: [
      /変更|移行|切替|アップデート|v\d+\.\d+/,
      /changed|migrated|updated|switched|upgraded/i,
    ],
    relation: [
      /信頼|関係|チーム|連携|協力/,
      /trust|relationship|team|collaboration/i,
    ],
  },

  // LLM classification (Stage 2)
  confidence_threshold: 0.85,       // Auto-approve above this
  review_threshold: 0.70,           // Manual review between 0.70-0.84
  // Below 0.70 = skip

  // LLM provider (anthropic or openai)
  provider: process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai',
  model: process.env.ANTHROPIC_API_KEY ? 'claude-sonnet-4-20250514' : 'gpt-4o-mini',

  // Output
  max_candidates_per_run: 100,
  log_file: 'extractor_log.jsonl',
};

// ============================================================
// Stage 1: Keyword Filter
// ============================================================
function keywordFilter(text) {
  const matches = [];
  for (const [category, patterns] of Object.entries(CONFIG.keywords)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        matches.push(category);
        break;
      }
    }
  }
  return [...new Set(matches)];
}

// ============================================================
// Stage 2: LLM Classification (stub — implement with your API)
// ============================================================
async function llmClassify(text, categories) {
  // This is a template. Replace with actual API call.
  // 
  // Expected prompt:
  //   "Classify this text into AI memory layers.
  //    Categories found by keyword: [judgment, failure]
  //    Text: {text}
  //    
  //    Respond with JSON:
  //    { "layer": "L2|L3|L4|L5", "confidence": 0.0-1.0, "summary": "..." }"
  //
  // For production, use the Anthropic or OpenAI SDK.

  console.log(`  [LLM] Would classify: "${text.substring(0, 80)}..." (categories: ${categories.join(', ')})`);
  
  // Stub response — replace with real API call
  return {
    layer: categories.includes('judgment') ? 'L2' :
           categories.includes('transition') ? 'L3' :
           categories.includes('relation') ? 'L4' : 'L5',
    confidence: 0.0,  // Stub: always 0 until real API connected
    summary: '[LLM classification not connected — connect your API key]',
  };
}

// ============================================================
// Main Pipeline
// ============================================================
async function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const candidates = [];

  for (const line of lines) {
    // Try to parse as JSONL (session log format)
    let text = line;
    let metadata = {};
    try {
      const parsed = JSON.parse(line);
      text = parsed.content || parsed.text || parsed.message || line;
      metadata = { role: parsed.role, timestamp: parsed.timestamp, agent: parsed.agent };
    } catch { /* plain text line */ }

    // Stage 1: Keyword filter
    const categories = keywordFilter(text);
    if (categories.length === 0) continue;

    // Stage 2: LLM classification
    const classification = await llmClassify(text, categories);

    candidates.push({
      source: path.basename(filePath),
      text: text.substring(0, 500),
      keyword_categories: categories,
      llm_layer: classification.layer,
      llm_confidence: classification.confidence,
      llm_summary: classification.summary,
      state: classification.confidence >= CONFIG.confidence_threshold ? 'auto_approved' :
             classification.confidence >= CONFIG.review_threshold ? 'needs_review' : 'skipped',
      timestamp: metadata.timestamp || new Date().toISOString(),
    });
  }

  return candidates;
}

async function main() {
  const args = process.argv.slice(2);
  const inputDir = args.find((a, i) => args[i-1] === '--input') || './pandora';
  const outputDir = args.find((a, i) => args[i-1] === '--output') || './candidates';
  const dryRun = args.includes('--dry-run');

  console.log('=== Pandora Extractor ===');
  console.log(`Input:  ${inputDir}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Provider: ${CONFIG.provider} (${CONFIG.model})`);
  console.log('');

  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs.readdirSync(inputDir)
    .filter(f => f.endsWith('.jsonl') || f.endsWith('.md') || f.endsWith('.txt'))
    .slice(0, 50); // Process up to 50 files per run

  console.log(`Found ${files.length} files to process\n`);

  let allCandidates = [];

  for (const file of files) {
    console.log(`Processing: ${file}`);
    const candidates = await processFile(path.join(inputDir, file));
    allCandidates.push(...candidates);
    console.log(`  → ${candidates.length} candidates found\n`);

    if (allCandidates.length >= CONFIG.max_candidates_per_run) break;
  }

  // Summary
  const approved = allCandidates.filter(c => c.state === 'auto_approved').length;
  const review = allCandidates.filter(c => c.state === 'needs_review').length;
  const skipped = allCandidates.filter(c => c.state === 'skipped').length;

  console.log('=== Results ===');
  console.log(`Total candidates: ${allCandidates.length}`);
  console.log(`  Auto-approved (≥${CONFIG.confidence_threshold}): ${approved}`);
  console.log(`  Needs review (${CONFIG.review_threshold}-${CONFIG.confidence_threshold}): ${review}`);
  console.log(`  Skipped (<${CONFIG.review_threshold}): ${skipped}`);

  if (!dryRun && allCandidates.length > 0) {
    const outPath = path.join(outputDir, `candidates_${new Date().toISOString().slice(0,10)}.json`);
    fs.writeFileSync(outPath, JSON.stringify(allCandidates, null, 2));
    console.log(`\nSaved to: ${outPath}`);

    // Append to log
    const logPath = path.join(outputDir, CONFIG.log_file);
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      files_processed: files.length,
      candidates: allCandidates.length,
      approved, review, skipped,
    });
    fs.appendFileSync(logPath, logEntry + '\n');
  }
}

main().catch(console.error);
