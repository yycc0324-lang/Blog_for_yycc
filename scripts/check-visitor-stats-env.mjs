#!/usr/bin/env node
/**
 * 私密访问统计页（/stats/）构建期环境变量预检。
 *
 * 用法：node scripts/check-visitor-stats-env.mjs   （或 pnpm stats:check）
 *
 * 规则：
 * - 两个都未配置 → 功能关闭，/stats/ 会跳 404，属于合法状态（exit 0）；
 * - 只配置了一个 → 会静默 404，属于误配置（exit 1）；
 * - 都配置了 → 校验分享链接格式与密码强度（弱密码只警告，exit 0）。
 *
 * 环境变量可来自进程环境，也可来自仓库根目录的 `.env`；进程环境优先。
 * 完整部署说明见 docs/DEPLOYMENT_UMAMI.md。
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = join(ROOT, ".env");
const KEYS = [
	"VISITOR_STATS_SHARE_URL",
	"VISITOR_STATS_PASSWORD",
	"VISITOR_STATS_HINT",
];

function parseEnvFile(path) {
	const values = {};
	if (!existsSync(path)) return values;
	for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const separator = line.indexOf("=");
		if (separator === -1) continue;
		const key = line.slice(0, separator).trim();
		let value = line.slice(separator + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		values[key] = value;
	}
	return values;
}

const fileValues = parseEnvFile(ENV_FILE);
const fromProcess = (key) => process.env[key]?.trim();
const fromFile = (key) => fileValues[key]?.trim();
const valueOf = (key) => fromProcess(key) || fromFile(key) || "";

const shareUrl = valueOf("VISITOR_STATS_SHARE_URL");
const password = valueOf("VISITOR_STATS_PASSWORD");
const hint = valueOf("VISITOR_STATS_HINT");

const line = (status, message) => console.log(`  ${status} ${message}`);
let failed = false;

console.log("[visitor-stats] /stats/ 构建期环境变量预检");
console.log(
	`  来源：进程环境 ${fromProcess("VISITOR_STATS_SHARE_URL") || fromProcess("VISITOR_STATS_PASSWORD") ? "有覆盖" : "无"}，${existsSync(ENV_FILE) ? ".env 已找到" : ".env 不存在"}`,
);

if (!shareUrl && !password) {
	line("i", "未配置 VISITOR_STATS_*：/stats/ 会重定向到 404（功能关闭，其余页面零额外负担）。");
	console.log("  如需开启，请参考 docs/DEPLOYMENT_UMAMI.md 配置后重跑本检查。");
	process.exit(0);
}

if (!shareUrl) {
	line("x", "缺少 VISITOR_STATS_SHARE_URL（只配了密码会导致 /stats/ 静默 404）。");
	failed = true;
} else if (!shareUrl.includes("/share/")) {
	line("x", `VISITOR_STATS_SHARE_URL 格式可疑：未包含 /share/<shareId> → ${shareUrl}`);
	failed = true;
} else {
	try {
		const parsed = new URL(shareUrl);
		line("✓", `VISITOR_STATS_SHARE_URL 有效（host: ${parsed.host}）`);
		if (parsed.protocol !== "https:") {
			line("!", "分享链接不是 https：https 站点会被混合内容拦截");
		}
	} catch {
		line("x", `VISITOR_STATS_SHARE_URL 不是合法 URL → ${shareUrl}`);
		failed = true;
	}
}

if (!password) {
	line("x", "缺少 VISITOR_STATS_PASSWORD（只配了分享链接会导致 /stats/ 静默 404）。");
	failed = true;
} else {
	line("✓", `VISITOR_STATS_PASSWORD 已设置（${password.length} 字符）`);
	if (password.length < 12) {
		line("!", "密码偏短：密文随静态产物公开，建议 16 位以上随机串。");
	}
	if (password.length < 8) failed = true;
}

if (hint) line("i", "VISITOR_STATS_HINT 已设置，会显示在密码框下方。");

if (failed) {
	console.log("[visitor-stats] ❌ 配置不完整，请修正后重新构建。");
	process.exit(1);
}
console.log("[visitor-stats] ✅ 配置就绪：构建后访问 /stats/ 即可。");
