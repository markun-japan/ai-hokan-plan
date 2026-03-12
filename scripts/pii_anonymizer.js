#!/usr/bin/env node
/**
 * pii_anonymizer.js — AI補完計画 PII仮名化スクリプト
 * 
 * テキスト内のPII（個人識別情報）を検出し、置換IDに変換する。
 * 対応表はAES-256-GCMで暗号化して保存。
 * 
 * Usage:
 *   node pii_anonymizer.js --input file.txt --output file_anon.txt
 *   node pii_anonymizer.js --input file.txt --output file_anon.txt --irreversible
 *   node pii_anonymizer.js --destroy-table ./mapping_table.enc  # 不可逆匿名化
 * 
 * Requirements:
 *   - Node.js 18+
 *   - PII_ENCRYPTION_KEY in environment (32-byte hex string)
 *     Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * 
 * MIT License — AI Complementation Project
 * https://github.com/markun-japan/ai-hokan-plan
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// ============================================================
// Configuration
// ============================================================
const CONFIG = {
  // PII detection patterns — customize for your locale/industry
  patterns: {
    // Japanese patterns
    phone_jp: /0\d{1,4}-?\d{1,4}-?\d{3,4}/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    postal_jp: /\d{3}-?\d{4}/g,

    // Universal patterns
    credit_card: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    ip_address: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,

    // Add your own patterns here:
    // my_number_jp: /\b\d{12}\b/g,  // マイナンバー
    // ssn_us: /\b\d{3}-\d{2}-\d{4}\b/g,
  },

  // Name list file (one name per line, for roster-based detection)
  // Set to null if not using roster matching
  name_list_path: null,  // e.g., './name_roster.txt'

  // Encryption
  algorithm: 'aes-256-gcm',
  mapping_dir: './pii_mappings',

  // Audit
  audit_log: './pii_audit_log.jsonl',
};

// ============================================================
// Encryption helpers
// ============================================================
function getEncryptionKey() {
  const key = process.env.PII_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    console.error('Error: PII_ENCRYPTION_KEY must be a 64-char hex string (32 bytes).');
    console.error('Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }
  return Buffer.from(key, 'hex');
}

function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(CONFIG.algorithm, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return { iv: iv.toString('hex'), encrypted, tag };
}

function decrypt(encData, key) {
  const decipher = crypto.createDecipheriv(
    CONFIG.algorithm,
    key,
    Buffer.from(encData.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encData.tag, 'hex'));
  let decrypted = decipher.update(encData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ============================================================
// PII Detection
// ============================================================
function detectPII(text) {
  const findings = [];

  // Pattern-based detection
  for (const [category, pattern] of Object.entries(CONFIG.patterns)) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      findings.push({
        category,
        value: match[0],
        index: match.index,
        length: match[0].length,
      });
    }
  }

  // Roster-based detection (if name list provided)
  if (CONFIG.name_list_path && fs.existsSync(CONFIG.name_list_path)) {
    const names = fs.readFileSync(CONFIG.name_list_path, 'utf-8')
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    for (const name of names) {
      let idx = text.indexOf(name);
      while (idx !== -1) {
        findings.push({
          category: 'name_roster',
          value: name,
          index: idx,
          length: name.length,
        });
        idx = text.indexOf(name, idx + 1);
      }
    }
  }

  // Sort by position (reverse for safe replacement)
  return findings.sort((a, b) => b.index - a.index);
}

// ============================================================
// Pseudonymization
// ============================================================
function pseudonymize(text, findings, mappingTable) {
  let result = text;

  for (const finding of findings) {
    // Check if we already have a mapping for this value
    if (!mappingTable[finding.value]) {
      const id = `[${finding.category.toUpperCase()}_${crypto.randomBytes(4).toString('hex')}]`;
      mappingTable[finding.value] = id;
    }

    const replacement = mappingTable[finding.value];
    result = result.substring(0, finding.index) + replacement +
             result.substring(finding.index + finding.length);
  }

  return result;
}

// ============================================================
// Mapping Table I/O
// ============================================================
function saveMappingTable(table, outputPath, key) {
  const json = JSON.stringify(table);
  const encData = encrypt(json, key);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(encData));
  console.log(`Mapping table saved (encrypted): ${outputPath}`);
}

function loadMappingTable(inputPath, key) {
  if (!fs.existsSync(inputPath)) return {};
  const encData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const json = decrypt(encData, key);
  return JSON.parse(json);
}

function destroyMappingTable(tablePath) {
  if (!fs.existsSync(tablePath)) {
    console.error(`Table not found: ${tablePath}`);
    process.exit(1);
  }

  // Overwrite with random data before deletion (secure erase)
  const size = fs.statSync(tablePath).size;
  fs.writeFileSync(tablePath, crypto.randomBytes(size));
  fs.unlinkSync(tablePath);

  console.log(`⚠️  Mapping table DESTROYED: ${tablePath}`);
  console.log('This action is IRREVERSIBLE. Pseudonymized data can no longer be reversed.');
}

// ============================================================
// Audit Log
// ============================================================
function auditLog(action, details) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    action,
    ...details,
  });
  fs.appendFileSync(CONFIG.audit_log, entry + '\n');
}

// ============================================================
// Main
// ============================================================
function main() {
  const args = process.argv.slice(2);

  // Special command: destroy mapping table (irreversible anonymization)
  if (args[0] === '--destroy-table') {
    const tablePath = args[1];
    if (!tablePath) {
      console.error('Usage: --destroy-table <path_to_mapping_table.enc>');
      process.exit(1);
    }
    destroyMappingTable(tablePath);
    auditLog('destroy_table', { path: tablePath });
    return;
  }

  const inputPath = args.find((a, i) => args[i-1] === '--input');
  const outputPath = args.find((a, i) => args[i-1] === '--output');
  const irreversible = args.includes('--irreversible');

  if (!inputPath || !outputPath) {
    console.log('Usage: node pii_anonymizer.js --input <file> --output <file> [--irreversible]');
    console.log('       node pii_anonymizer.js --destroy-table <mapping.enc>');
    process.exit(0);
  }

  const key = getEncryptionKey();
  const tablePath = path.join(CONFIG.mapping_dir, 'mapping_table.enc');

  // Load or create mapping table
  let mappingTable = {};
  if (!irreversible) {
    mappingTable = loadMappingTable(tablePath, key);
  }

  // Read input
  const text = fs.readFileSync(inputPath, 'utf-8');

  // Detect PII
  const findings = detectPII(text);
  console.log(`Found ${findings.length} PII instances in ${inputPath}`);

  if (findings.length === 0) {
    fs.copyFileSync(inputPath, outputPath);
    console.log('No PII found. File copied as-is.');
    return;
  }

  // Show findings summary
  const categories = {};
  for (const f of findings) {
    categories[f.category] = (categories[f.category] || 0) + 1;
  }
  console.log('Categories:', categories);

  // Pseudonymize
  const anonymized = pseudonymize(text, findings, mappingTable);
  fs.writeFileSync(outputPath, anonymized);
  console.log(`Anonymized output: ${outputPath}`);

  // Save mapping table (unless irreversible)
  if (!irreversible) {
    saveMappingTable(mappingTable, tablePath, key);
  } else {
    console.log('⚠️  Irreversible mode: no mapping table saved.');
  }

  // Audit
  auditLog('pseudonymize', {
    input: inputPath,
    output: outputPath,
    findings_count: findings.length,
    categories,
    irreversible,
  });
}

main();
