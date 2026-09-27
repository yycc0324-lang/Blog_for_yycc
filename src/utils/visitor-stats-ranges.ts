/**
 * 访问统计页的时间区间计算（纯函数，可单测）。
 *
 * Umami 分享接口的 `getSiteStats({ startAt, endAt })` 会对**该区间内**的
 * 匿名访客 ID 去重，因此「今日 / 近 7 天 / 近 30 天 / 全部」需要分别查询。
 * 区间有重叠，数值不可相加。
 *
 * 边界按浏览器本地时区计算：该页面只给站长本人看，跟随其所在时区即可。
 */

export type VisitorRangeKey = "today" | "7d" | "30d" | "total";

export interface VisitorRange {
	key: VisitorRangeKey;
	/** 毫秒时间戳（含） */
	startAt: number;
	/** 毫秒时间戳（不含，取“现在”） */
	endAt: number;
}

const DAY_MS = 86_400_000;

/** 本地时区当日 00:00:00.000 的时间戳。 */
export function startOfLocalDay(timestamp: number): number {
	const date = new Date(timestamp);
	date.setHours(0, 0, 0, 0);
	return date.getTime();
}

/**
 * 生成四个统计区间。`today` 含当天已过去的时段，
 * `7d` / `30d` 均含今天，因此分别是 7 天和 30 个自然日。
 */
export function buildVisitorRanges(now: number = Date.now()): VisitorRange[] {
	const todayStart = startOfLocalDay(now);
	return [
		{ key: "today", startAt: todayStart, endAt: now },
		{ key: "7d", startAt: todayStart - 6 * DAY_MS, endAt: now },
		{ key: "30d", startAt: todayStart - 29 * DAY_MS, endAt: now },
		{ key: "total", startAt: 0, endAt: now },
	];
}
