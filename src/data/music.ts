import type { TrackDescriptor } from "@/types/musicConfig";

/**
 * 侧栏音乐本地曲目数据源（保底列表）。
 *
 * ⚠ 本文件由 `node scripts/music/audit-playlist.mjs --write` 生成：
 *   只保留 tencent 歌单中「体检时确认可播放」的曲目，生成时间 2026-10-09T12:20:43.655Z。
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
		id: "meting-tencent-001Bbywq2gicae",
		title: "搁浅",
		artist: "周杰伦",
		cover: "https://cnyicheng.top/meting/?server=tencent&type=pic&id=003DFRzD192KKD",
		source: "https://cnyicheng.top/meting/?server=tencent&type=url&id=001Bbywq2gicae",
	},
	{
		id: "meting-tencent-0017K7gL4WYnw2",
		title: "反方向的钟",
		artist: "周杰伦",
		cover: "https://cnyicheng.top/meting/?server=tencent&type=pic&id=000f01724fd7TH",
		source: "https://cnyicheng.top/meting/?server=tencent&type=url&id=0017K7gL4WYnw2",
	},
	{
		id: "meting-tencent-004Z8Ihr0JIu5s",
		title: "七里香",
		artist: "周杰伦",
		cover: "https://cnyicheng.top/meting/?server=tencent&type=pic&id=003DFRzD192KKD",
		source: "https://cnyicheng.top/meting/?server=tencent&type=url&id=004Z8Ihr0JIu5s",
	},
	{
		id: "meting-tencent-003KtYhg4frNXC",
		title: "枫",
		artist: "周杰伦",
		cover: "https://cnyicheng.top/meting/?server=tencent&type=pic&id=0024bjiL2aocxT",
		source: "https://cnyicheng.top/meting/?server=tencent&type=url&id=003KtYhg4frNXC",
	},
	{
		id: "meting-tencent-003OUlho2HcRHC",
		title: "告白气球",
		artist: "周杰伦",
		cover: "https://cnyicheng.top/meting/?server=tencent&type=pic&id=003RMaRI1iFoYd",
		source: "https://cnyicheng.top/meting/?server=tencent&type=url&id=003OUlho2HcRHC",
	},
	{
		id: "meting-tencent-002qU5aY3Qu24y",
		title: "青花瓷",
		artist: "周杰伦",
		cover: "https://cnyicheng.top/meting/?server=tencent&type=pic&id=002eFUFm2XYZ7z",
		source: "https://cnyicheng.top/meting/?server=tencent&type=url&id=002qU5aY3Qu24y",
	},
	{
		id: "meting-tencent-001xd0HI0X9GNq",
		title: "一路向北",
		artist: "周杰伦",
		cover: "https://cnyicheng.top/meting/?server=tencent&type=pic&id=002MAeob3zLXwZ",
		source: "https://cnyicheng.top/meting/?server=tencent&type=url&id=001xd0HI0X9GNq",
	},
	{
		id: "meting-tencent-003xv4w313tZHV",
		title: "红尘客栈",
		artist: "周杰伦",
		cover: "https://cnyicheng.top/meting/?server=tencent&type=pic&id=003Ow85E3pnoqi",
		source: "https://cnyicheng.top/meting/?server=tencent&type=url&id=003xv4w313tZHV",
	},
	{
		id: "meting-tencent-001Zi7Ly4ZtVQk",
		title: "星晴",
		artist: "周杰伦",
		cover: "https://cnyicheng.top/meting/?server=tencent&type=pic&id=000f01724fd7TH",
		source: "https://cnyicheng.top/meting/?server=tencent&type=url&id=001Zi7Ly4ZtVQk",
	},
	{
		id: "meting-tencent-004emQMs09Z1lz",
		title: "烟花易冷",
		artist: "周杰伦",
		cover: "https://cnyicheng.top/meting/?server=tencent&type=pic&id=000bviBl4FjTpO",
		source: "https://cnyicheng.top/meting/?server=tencent&type=url&id=004emQMs09Z1lz",
	},
	{
		id: "meting-tencent-0027oMO61wWi55",
		title: "发如雪",
		artist: "周杰伦",
		cover: "https://cnyicheng.top/meting/?server=tencent&type=pic&id=0024bjiL2aocxT",
		source: "https://cnyicheng.top/meting/?server=tencent&type=url&id=0027oMO61wWi55",
	},
	{
		id: "meting-tencent-002u8ZOM4C7QF4",
		title: "手写的从前",
		artist: "周杰伦",
		cover: "https://cnyicheng.top/meting/?server=tencent&type=pic&id=001uqejs3d6EID",
		source: "https://cnyicheng.top/meting/?server=tencent&type=url&id=002u8ZOM4C7QF4",
	},
	{
		id: "meting-tencent-0039MnYb0qxYhV",
		title: "晴天",
		artist: "周杰伦",
		cover: "https://cnyicheng.top/meting/?server=tencent&type=pic&id=000MkMni19ClKG",
		source: "https://cnyicheng.top/meting/?server=tencent&type=url&id=0039MnYb0qxYhV",
	},
];
