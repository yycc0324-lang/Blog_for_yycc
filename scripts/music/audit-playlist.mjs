import { copyFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildMetingUrl,
	parseMetingSong,
} from "../../src/utils/music/meting.ts";

/**
 * 歌单体检器：逐个探测 Meting 歌单里每首歌「现在能不能放」。
 *
 * 用途：
 *   - 快速定位歌单里哪些曲目是 VIP / 版权受限（服务端拿不到音频地址）；
 *   - 可选生成 src/data/music.ts：只保留可播放曲目，作为 mixed 模式的保底列表，
 *     这样即使远端接口波动，侧栏播放器也永远有能放的歌。
 *
 * 探测方式与真实播放一致：直接请求播放器会用的 type=url 地址，只看重定向/类型，
 * 不下载音频本体（不产生音频流量）。
 *
 * 用法：
 *   node scripts/music/audit-playlist.mjs                       # 用 musicConfig 里的歌单
 *   node scripts/music/audit-playlist.mjs --server=netease --id=14164869977
 *   node scripts/music/audit-playlist.mjs --api=http://127.0.0.1:8899/ --limit=10
 *   node scripts/music/audit-playlist.mjs --write               # 写入 src/data/music.ts（先备份）
 */

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const MUSIC_DATA_FILE = join(projectRoot, "src/data/music.ts");

const DEFAULTS = {
	api: "http://127.0.0.1:8899/?server=:server&type=:type&id=:id&r=:r",
	server: "tencent",
	type: "playlist",
	id: "",
	timeout: 20000,
	limit: 0,
};

function parseArgs(argv) {
	const options = { write: false };
	for (const raw of argv) {
		if (raw === "--write") {
			options.write = true;
			continue;
		}
		const [key, value] = raw.replace(/^--/, "").split("=");
		if (value === undefined) continue;
		if (key === "limit" || key === "timeout") {
			const parsed = Number.parseInt(value, 10);
			if (Number.isFinite(parsed) && parsed > 0) options[key] = parsed;
			continue;
		}
		options[key] = value;
	}
	return options;
}

/** 读取 musicConfig 作为默认值；配置不可用时退回内置默认值。 */
async function loadDefaults() {
	try {
		const mod = await import("../../src/config/musicConfig.ts");
		const meting = mod.musicConfig?.meting ?? {};
		return {
			api: meting.api?.trim() || DEFAULTS.api,
			server: meting.server?.trim() || DEFAULTS.server,
			type: meting.type?.trim() || DEFAULTS.type,
			id: meting.id?.trim() || "",
		};
	} catch (error) {
		console.warn(
			`⚠ 读取 src/config/musicConfig.ts 失败（${error instanceof Error ? error.message : error}），改用命令行参数与内置默认值`,
		);
		return { ...DEFAULTS };
	}
}

/** 探测单个地址是否指向可播放音频（只看首跳，不下载音频）。 */
async function probe(url, timeoutMs) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch(url, {
			redirect: "manual",
			signal: controller.signal,
		});
		const location = response.headers.get("location") ?? "";
		const contentType = response.headers.get("content-type") ?? "";
		// Meting 对可播放曲目返回 302 跳到音频 CDN；无权限时返回 200 + text/html（空体）
		const playable =
			response.status === 302
				? location.length > 0
				: contentType.startsWith("audio/");
		return {
			playable,
			status: response.status,
			contentType,
			note: playable
				? `302 → 音频 CDN${contentType ? ` (${contentType})` : ""}`
				: `HTTP ${response.status} ${contentType || "无响应类型"}`,
		};
	} catch (error) {
		return {
			playable: false,
			status: 0,
			contentType: "",
			note: error instanceof Error ? error.message : String(error),
		};
	} finally {
		clearTimeout(timer);
	}
}

async function fetchPlaylist(url) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`歌单请求失败：HTTP ${response.status}`);
	}
	const data = await response.json();
	if (!Array.isArray(data)) {
		throw new Error("歌单响应不是数组（id 与 server 是否匹配？）");
	}
	return data;
}

function trackIdOf(source) {
	try {
		return new URL(source).searchParams.get("id") ?? "?";
	} catch {
		return "?";
	}
}

/** 生成 src/data/music.ts 内容（仅保留可播放曲目）。 */
function renderMusicFile(server, tracks) {
	const lines = [
		'import type { TrackDescriptor } from "@/types/musicConfig";',
		"",
		"/**",
		" * 侧栏音乐本地曲目数据源（保底列表）。",
		" *",
		" * ⚠ 本文件由 `node scripts/music/audit-playlist.mjs --write` 生成：",
		` *   只保留 ${server} 歌单中「体检时确认可播放」的曲目，生成时间 ${new Date().toISOString()}。`,
		" *   想恢复手写列表：把同目录的 music.ts.bak 覆盖回来即可。",
		" *",
		" * ⚠ source 里写入的是「体检时所用接口」的地址：本机生成的会指向 127.0.0.1，",
		" *   部署上线前请用公网接口重新生成一次：",
		' *   pnpm music:audit -- --api="https://meting.你的域名/?server=:server&type=:type&id=:id&r=:r" --write',
		" *",
		" * 字段含义见 docs/DEPLOYMENT_METING.md 第 10 节。",
		" */",
		"export const musicTracks: readonly TrackDescriptor[] = [",
	];
	for (const track of tracks) {
		const parts = [
			// 用「平台 + 曲目 mid」生成稳定 id：重复生成不会产生无意义 diff
			`\t\tid: ${JSON.stringify(`meting-${server}-${trackIdOf(track.source)}`)}`,
			`\t\ttitle: ${JSON.stringify(track.title)}`,
		];
		if (track.artist) parts.push(`\t\tartist: ${JSON.stringify(track.artist)}`);
		if (track.cover) parts.push(`\t\tcover: ${JSON.stringify(track.cover)}`);
		parts.push(`\t\tsource: ${JSON.stringify(track.source)}`);
		if (track.duration) parts.push(`\t\tduration: ${track.duration}`);
		lines.push("\t{", `${parts.join(",\n")},`, "\t},");
	}
	lines.push("];", "");
	return lines.join("\n");
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const defaults = await loadDefaults();
	const api = args.api ?? defaults.api;
	const server = args.server ?? defaults.server;
	const type = args.type ?? defaults.type;
	const id = args.id ?? defaults.id;
	const timeout = args.timeout ?? DEFAULTS.timeout;

	if (!id) {
		console.error(
			"✘ 缺少歌单 ID：请在 src/config/musicConfig.ts 配置，或用 --id=xxx 指定",
		);
		process.exitCode = 1;
		return;
	}

	console.log(`ⓘ 歌单：server=${server} type=${type} id=${id}`);
	console.log(`ⓘ 接口：${api}`);

	const raw = await fetchPlaylist(buildMetingUrl({ api, server, type, id }));
	const tracks = raw
		.map((song, index) => parseMetingSong(song, index, server))
		.filter((track) => track !== null);
	const limit = args.limit ?? DEFAULTS.limit;
	const targets = limit > 0 ? tracks.slice(0, limit) : tracks;

	console.log(
		`ⓘ 曲目：${tracks.length} 首${limit > 0 ? `（仅体检前 ${targets.length} 首）` : ""}\n`,
	);

	const playable = [];
	const blocked = [];
	for (const track of targets) {
		// 用播放器实际会请求的地址探测（--api 可强制指定接口基址）
		const url = args.api
			? buildMetingUrl({
					api,
					server,
					type: "url",
					id: trackIdOf(track.source),
				})
			: track.source;
		const result = url
			? await probe(url, timeout)
			: { playable: false, note: "无地址" };
		const label = `${track.title}${track.artist ? ` — ${track.artist}` : ""}`;
		if (result.playable) {
			playable.push(track);
			console.log(`  ✓ ${label}   [${result.note}]`);
		} else {
			blocked.push(track);
			console.log(`  ✘ ${label}   [${result.note}]`);
		}
	}

	const total = targets.length;
	const percent = total > 0 ? Math.round((playable.length / total) * 100) : 0;
	console.log(`\n→ 可播放 ${playable.length}/${total}（${percent}%）`);

	if (blocked.length > 0) {
		console.log(
			"ⓘ 不可播放多为 VIP / 版权受限曲目（服务端按账号权限发放播放地址），排查见 docs/DEPLOYMENT_METING.md 第 8 节。",
		);
	}

	if (args.write) {
		if (playable.length === 0) {
			console.error(
				"✘ 没有可播放曲目，已跳过写入（避免清空 src/data/music.ts）",
			);
			process.exitCode = 1;
			return;
		}
		const outFile = args.out ?? MUSIC_DATA_FILE;
		await copyFile(outFile, `${outFile}.bak`);
		await writeFile(outFile, renderMusicFile(server, playable), "utf8");
		console.log(`✓ 已写入 ${outFile}（原文件备份为 ${outFile}.bak）`);
		console.log(
			'ⓘ 该列表在 provider: "mixed" 下与远端歌单合并，远端故障时依然有歌可放',
		);
	}
}

await main();
