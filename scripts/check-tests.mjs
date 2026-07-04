import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirs = new Set(["node_modules", ".next", "coverage", "playwright-report", "test-results", ".git"]);
const testFilePattern = /\.(test|spec)\.(t|j)sx?$/;
const e2eDir = path.join(root, "tests", "e2e");
const forbiddenPatterns = [
  /\b(?:test|it|describe)\.only\s*\(/,
  /\b(?:test|it|describe)\.skip\s*\(/,
  /\b(?:test|it|describe)\.todo\s*\(/,
  /\btest\.fixme\s*\(/,
  /\btest\.describe\.configure\s*\(\s*\{[^}]*mode\s*:\s*["']skip["']/s,
];

function walk(dir) {
  const entries = [];
  if (!existsSync(dir)) return entries;

  for (const item of readdirSync(dir)) {
    if (ignoredDirs.has(item)) continue;
    const absolute = path.join(dir, item);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      entries.push(...walk(absolute));
    } else {
      entries.push(absolute);
    }
  }

  return entries;
}

function relative(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function hasSuspiciousCommentBlock(content) {
  const lines = content.split(/\r?\n/);
  let consecutive = 0;
  let commentLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const isComment = trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");
    if (isComment) {
      commentLines += 1;
      consecutive += 1;
    } else if (trimmed.length > 0) {
      consecutive = 0;
    }

    if (consecutive >= 20) return true;
  }

  return lines.length >= 40 && commentLines / lines.length > 0.35;
}

function extractTestBlocks(content) {
  const blocks = [];
  const startPattern = /\b(?:test|it)\s*\(/g;
  let match;

  while ((match = startPattern.exec(content)) !== null) {
    const start = match.index;
    const next = content.slice(start + 1).search(/\b(?:test|it)\s*\(/);
    const end = next === -1 ? content.length : start + 1 + next;
    blocks.push(content.slice(start, end));
  }

  return blocks;
}

const files = walk(root).filter((file) => testFilePattern.test(file) || relative(file) === "playwright.config.ts");
const testFiles = files.filter((file) => testFilePattern.test(file));
const e2eFiles = testFiles.filter((file) => relative(file).startsWith("tests/e2e/"));
const failures = [];

if (testFiles.length === 0) {
  failures.push("No test files were found.");
}

if (!existsSync(e2eDir) || e2eFiles.length === 0) {
  failures.push("No E2E spec files were found under tests/e2e.");
}

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const name = relative(file);

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      failures.push(`${name}: forbidden focused/skipped/todo test pattern detected (${pattern}).`);
    }
  }

  if (testFilePattern.test(file) && hasSuspiciousCommentBlock(content)) {
    failures.push(`${name}: suspicious large comment block or comment-heavy test file detected.`);
  }

  if (testFilePattern.test(file)) {
    for (const block of extractTestBlocks(content)) {
      if (!/\bexpect\s*\(/.test(block)) {
        failures.push(`${name}: test block without an expect assertion detected.`);
        break;
      }
    }
  }
}

if (e2eFiles.length > 0) {
  const e2eContent = e2eFiles.map((file) => readFileSync(file, "utf8")).join("\n");
  if (!/\bexpect\s*\(/.test(e2eContent)) {
    failures.push("E2E tests do not contain assertions.");
  }
}

if (failures.length > 0) {
  console.error("Test quality guard failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Test quality guard passed (${testFiles.length} spec files checked).`);
