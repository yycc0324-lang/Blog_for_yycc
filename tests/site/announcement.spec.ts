import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

/**
 * 公告关闭状态的 key 现在带「内容指纹」后缀：
 *   announcementClosed:<hash> / announcementClosedTime:<hash>
 * 指纹存在 .announcement-wrapper 的 data-announcement-hash 上。
 */
async function getAnnouncementKeys(
	page: Page,
): Promise<{ closed: string; time: string }> {
	const hash = await page
		.locator(".announcement-wrapper")
		.getAttribute("data-announcement-hash");
	const suffix = hash ? `:${hash}` : "";
	return {
		closed: `announcementClosed${suffix}`,
		time: `announcementClosedTime${suffix}`,
	};
}

test.describe("Announcement Widget", () => {
	test("renders announcement with title, content, link, and close functionality", async ({
		page,
	}) => {
		await page.goto("/", { waitUntil: "networkidle" });
		await page.evaluate(() => localStorage.clear());
		await page.reload({ waitUntil: "networkidle" });

		const announcement = page.locator('widget-layout[data-id="announcement"]');
		await expect(announcement).toBeVisible();

		const keys = await getAnnouncementKeys(page);

		// 测试关闭功能
		const closeBtn = announcement.locator(".announcement-close-btn");
		await expect(closeBtn).toBeVisible();
		await closeBtn.click();
		await expect(announcement).toBeHidden();

		const isClosed = await page.evaluate(
			(k) => localStorage.getItem(k),
			keys.closed,
		);
		const closedTime = await page.evaluate(
			(k) => localStorage.getItem(k),
			keys.time,
		);
		expect(isClosed).toBe("true");
		expect(Number(closedTime)).toBeGreaterThan(0);

		// 刷新后在有效期内依然隐藏
		await page.reload({ waitUntil: "networkidle" });
		await expect(announcement).toBeHidden();

		// 模拟生命周期过期（将关闭时间改到 2 天前）
		await page.evaluate((k) => {
			localStorage.setItem(k, (Date.now() - 2 * 86400 * 1000).toString());
		}, keys.time);

		// 重新加载页面，验证公告重新展示且 localStorage 状态已重置
		await page.reload({ waitUntil: "networkidle" });
		await expect(announcement).toBeVisible();
		const clearedClosed = await page.evaluate(
			(k) => localStorage.getItem(k),
			keys.closed,
		);
		expect(clearedClosed).toBeNull();
	});

	test("公告内容变化（指纹变化）后，旧的关闭记录失效并重新展示", async ({
		page,
	}) => {
		await page.goto("/", { waitUntil: "networkidle" });
		await page.evaluate(() => localStorage.clear());

		// 伪造一份「上一版公告」的关闭记录（旧指纹）
		await page.evaluate(() => {
			localStorage.setItem("announcementClosed:staleoldcontent", "true");
			localStorage.setItem(
				"announcementClosedTime:staleoldcontent",
				Date.now().toString(),
			);
		});

		await page.reload({ waitUntil: "networkidle" });

		// 内容变了 → 公告必须重新出现
		const announcement = page.locator('widget-layout[data-id="announcement"]');
		await expect(announcement).toBeVisible();

		// 且旧指纹记录会被清理掉
		const staleKeys = await page.evaluate(() =>
			Object.keys(localStorage).filter((k) => k.includes("staleoldcontent")),
		);
		expect(staleKeys).toEqual([]);
	});

	test("旧版（无指纹）的关闭记录会迁移到当前指纹，不会让公告意外复活", async ({
		page,
	}) => {
		await page.goto("/", { waitUntil: "networkidle" });
		await page.evaluate(() => localStorage.clear());

		// 升级前用户已经关闭过公告：只有旧版无后缀 key
		await page.evaluate(() => {
			localStorage.setItem("announcementClosed", "true");
			localStorage.setItem("announcementClosedTime", Date.now().toString());
		});

		await page.reload({ waitUntil: "networkidle" });
		const announcement = page.locator('widget-layout[data-id="announcement"]');
		await expect(announcement).toBeHidden();

		// 旧版 key 被迁移清理，状态落在当前指纹上
		const keys = await getAnnouncementKeys(page);
		const state = await page.evaluate(
			(ks) => ({
				legacyClosed: localStorage.getItem("announcementClosed"),
				closed: localStorage.getItem(ks.closed),
			}),
			keys,
		);
		expect(state.legacyClosed).toBeNull();
		expect(state.closed).toBe("true");
	});
});
