import type { TrackDescriptor } from "@/types/musicConfig";

/**
 * 侧栏音乐本地曲目数据源（保底列表）。
 *
 * ⚠ 本文件由 `node scripts/music/audit-playlist.mjs --write` 生成：
 *   只保留 tencent 歌单中「体检时确认可播放」的曲目，生成时间 2026-09-16T17:09:49.351Z。
 *   想恢复手写列表：把同目录的 music.ts.bak 覆盖回来即可。
 *
 * ⚠ source 里写入的是「体检时所用接口」的地址：本机生成的会指向 127.0.0.1，
 *   部署上线前请用公网接口重新生成一次：
 *   pnpm music:audit -- --api="https://meting.你的域名/?server=:server&type=:type&id=:id&r=:r" --write
 *
 * 字段含义见 docs/DEPLOYMENT_METING.md 第 10 节。
 */
export const musicTracks: readonly TrackDescriptor[] = [
	{
		id: "meting-tencent-001wl4Hj38669Z",
		title: "困守雪夜",
		artist: "予锦言/阿楚",
		cover: "http://127.0.0.1:8899/?server=tencent&type=pic&id=000u5ZgH2zeQ1x",
		source: "http://127.0.0.1:8899/?server=tencent&type=url&id=001wl4Hj38669Z",
	},
	{
		id: "meting-tencent-003wTcL937Mexl",
		title: "Midnight Feeling (Feat. Sense)",
		artist: "Teqkoi",
		cover: "http://127.0.0.1:8899/?server=tencent&type=pic&id=004aD4LB4CQQ7c",
		source: "http://127.0.0.1:8899/?server=tencent&type=url&id=003wTcL937Mexl",
	},
	{
		id: "meting-tencent-001cp6JE05GTeW",
		title: "樱花草",
		artist: "白允y",
		cover: "http://127.0.0.1:8899/?server=tencent&type=pic&id=001o83pp4SZOOQ",
		source: "http://127.0.0.1:8899/?server=tencent&type=url&id=001cp6JE05GTeW",
	},
	{
		id: "meting-tencent-002clcDK0UuMgx",
		title: "如约而至",
		artist: "许嵩",
		cover: "http://127.0.0.1:8899/?server=tencent&type=pic&id=002JXz4o2xeuh9",
		source: "http://127.0.0.1:8899/?server=tencent&type=url&id=002clcDK0UuMgx",
	},
];
