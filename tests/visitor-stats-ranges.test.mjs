import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildVisitorRanges,
	startOfLocalDay,
} from "../src/utils/visitor-stats-ranges.ts";

const DAY_MS = 86_400_000;

describe("visitor stats ranges", () => {
	it("startOfLocalDay 归零到本地 00:00:00.000", () => {
		const noon = new Date(2026, 0, 15, 12, 34, 56, 789).getTime();
		const expected = new Date(2026, 0, 15, 0, 0, 0, 0).getTime();
		assert.equal(startOfLocalDay(noon), expected);
		assert.equal(startOfLocalDay(expected), expected);
	});

	it("生成 today / 7d / 30d / total 四个含今天、各自去重的区间", () => {
		const now = new Date(2026, 0, 15, 12, 0, 0).getTime();
		const todayStart = new Date(2026, 0, 15, 0, 0, 0, 0).getTime();

		const ranges = buildVisitorRanges(now);
		assert.deepEqual(
			ranges.map((range) => range.key),
			["today", "7d", "30d", "total"],
		);
		assert.equal(ranges[0].startAt, todayStart);
		assert.equal(ranges[0].endAt, now);
		assert.equal(ranges[1].startAt, todayStart - 6 * DAY_MS);
		assert.equal(ranges[1].endAt, now);
		assert.equal(ranges[2].startAt, todayStart - 29 * DAY_MS);
		assert.equal(ranges[2].endAt, now);
		assert.equal(ranges[3].startAt, 0);
		assert.equal(ranges[3].endAt, now);
	});

	it("区间起点单调递增，后者包含前者（不可相加）", () => {
		const now = new Date(2026, 0, 15, 12, 0, 0).getTime();
		const [today, week, month, total] = buildVisitorRanges(now);
		assert.ok(total.startAt <= month.startAt);
		assert.ok(month.startAt <= week.startAt);
		assert.ok(week.startAt <= today.startAt);
	});
});
