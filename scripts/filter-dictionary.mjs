#!/usr/bin/env node
/**
 * 끝말잇기 사전에서 부적절어를 걷어내는 파이프라인 마지막 단계.
 *
 *   node scripts/filter-dictionary.mjs            # 적용
 *   node scripts/filter-dictionary.mjs --check    # 검사만(CI용, 위반 시 exit 1)
 *
 * 사전 원본은 표준국어대사전 표제어라 욕설만 걸러져 있고 성·범죄·자해·약물 관련어는
 * 그대로 남는다. 사전을 재생성하면 그 단어들이 되돌아오므로, 재생성 파이프라인의
 * 마지막에 이 스크립트를 반드시 태운다. 헤더의 규모·막다름 비율도 함께 갱신한다.
 *
 * 차단은 정확일치만 한다 — 부분일치는 설거지·별똥별·대변인까지 지운다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DICT = path.join(ROOT, 'src/data/korean/words-dictionary.ts');
const BLOCKLIST = path.join(ROOT, 'scripts/dictionary-blocklist.txt');
const checkOnly = process.argv.includes('--check');

export function readBlocklist(file = BLOCKLIST) {
  return new Set(
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  );
}

const source = fs.readFileSync(DICT, 'utf8');
const match = source.match(/const RAW =\n {2}'([^']*)';/);
if (!match) {
  console.error('✖ words-dictionary.ts에서 RAW 문자열을 찾지 못했습니다. 파일 형식이 바뀌었는지 확인하세요.');
  process.exit(1);
}

const blocked = readBlocklist();
const words = match[1].split(' ');
const kept = words.filter((w) => !blocked.has(w));
const removed = words.filter((w) => blocked.has(w));

if (removed.length === 0) {
  console.log(`✅ 차단어 없음 — 표제어 ${kept.length.toLocaleString()}개 (blocklist ${blocked.size}개 대조)`);
  process.exit(0);
}

if (checkOnly) {
  console.error(`✖ 차단어 ${removed.length}개가 사전에 남아 있습니다: ${removed.slice(0, 20).join(' ')}${removed.length > 20 ? ' …' : ''}`);
  console.error('  → node scripts/filter-dictionary.mjs 로 제거하세요.');
  process.exit(1);
}

// 막다름 = 끝 글자로 시작하는 단어가 하나도 없는 단어. 제거로 악화되지 않는지 확인용.
const firsts = new Set(kept.map((w) => w[0]));
const deadEndRate = (kept.filter((w) => !firsts.has(w[w.length - 1])).length / kept.length) * 100;

const updated = source
  .replace(match[1], kept.join(' '))
  .replace(/\/\/ 규모: [\d,]+개/, `// 규모: ${kept.length.toLocaleString()}개`)
  .replace(/막다른 단어 [\d.]+%/, `막다른 단어 ${deadEndRate.toFixed(2)}%`);

fs.writeFileSync(DICT, updated);
console.log(`✅ 차단어 ${removed.length}개 제거 — ${words.length.toLocaleString()} → ${kept.length.toLocaleString()}개, 막다름 ${deadEndRate.toFixed(2)}%`);
console.log(`   제거: ${removed.join(' ')}`);
