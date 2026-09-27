import { existsSync, readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

/**
 * 私密访问统计页（/stats/）端到端验证。
 *
 * 页面由构建期环境变量 `VISITOR_STATS_SHARE_URL` / `VISITOR_STATS_PASSWORD`
 * 控制；未配置时整页重定向到 404，此时跳过（主题仓 CI 默认不配置）。
 * 配置后拦截 Umami 分享接口，验证「密码门 → 解锁 → 渲染区间统计」全链路。
 */

function envValue(key: string): string | null {
	const fromProcess = process.env[key]?.trim();
	if (fromProcess) return fromProcess;
	if (!existsSync(".env")) return null;
	for (const line of readFileSync(".env", "utf8").split("\n")) {
		if (!line.startsWith(`${key}=`)) continue;
		return line
			.slice(key.length + 1)
			.trim()
			.replace(/^["']|["']$/g, "")
			.trim();
	}
	return null;
}

const password = envValue("VISITOR_STATS_PASSWORD");
const configured = Boolean(envValue("VISITOR_STATS_SHARE_URL") && password);

async function mockUmami(page: Page) {
	await page.route("**/api/share/**", (route) =>
		route.fulfill({ json: { websiteId: "mock-site", token: "mock-token" } }),
	);
	await page.route("**/api/websites/mock-site/stats**", (route) =>
		route.fulfill({ json: { pageviews: 100, visitors: 40, visits: 60 } }),
	);
	await page.route("**/api/websites/mock-site/pageviews**", (route) =>
		route.fulfill({
			json: {
				pageviews: [
					{ x: "2026-01-01", y: 3 },
					{ x: "2026-01-02", y: 5 },
				],
				sessions: [{ x: "2026-01-01", y: 2 }],
			},
		}),
	);
	await page.route("**/api/websites/mock-site/active", (route) =>
		route.fulfill({ json: { visitors: 3 } }),
	);
}

test.describe("私密访问统计页", () => {
	test("未配置环境变量时跳转到 404", async ({ page }) => {
		if (configured) {
			test.skip(true, "已配置 VISITOR_STATS_*，跳过未配置分支");
		}
		await page.goto("/stats/", { waitUntil: "networkidle" });
		await expect(page).toHaveURL(/\/404\/?$/);
	});

	test("密码门拦截错误密码，解锁后渲染访客与实时在线", async ({ page }) => {
		if (!configured) {
			test.skip(true, "未配置 VISITOR_STATS_*，跳过解锁分支");
		}
		await page.goto("/stats/", { waitUntil: "networkidle" });

		const gate = page.locator(".password-gate");
		await expect(gate).toBeVisible();

		// 错误密码：保持门控并提示错误
		await page.locator('input[name="password"]').fill("definitely-wrong");
		await page.locator('.password-gate button[type="submit"]').click();
		await expect(gate).toContainText(/密码错误|Incorrect password|密碼錯誤/);

		await mockUmami(page);

		// 正确密码：解密 shareUrl → 按需加载 oddmisc → 渲染四个区间
		await page.locator('input[name="password"]').fill(password as string);
		await page.locator('.password-gate button[type="submit"]').click();

		const cards = page.locator(".visitor-stats__card");
		await expect(cards).toHaveCount(4);
		await expect(cards.first()).toContainText("40");
		await expect(page.locator(".visitor-stats__active")).toContainText("3");
		await expect(page.locator(".visitor-stats__trend polyline")).toBeVisible();
	});

	test("静态产物不含明文密码与分享链接", async ({ request }) => {
		const response = await request.get("/stats/");
		if (!configured) return;
		expect(response.ok()).toBe(true);
		const html = await response.text();
		expect(html).not.toContain(password as string);
		expect(html).toContain("stats:visitors");
		expect(html).toContain("ciphertext");
	});
});
