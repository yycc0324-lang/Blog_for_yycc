import { expect, test } from "@playwright/test";
import I18nKey from "../../src/i18n/i18nKey";
import { i18n } from "../../src/i18n/translation";

const DEVICE_COUNT = 6;

test.describe("设备展示页", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/devices/");
		await expect(page.locator(".device-card")).toHaveCount(DEVICE_COUNT);
	});

	test("渲染页面标题、设备卡片与状态/规格信息", async ({ page }) => {
		await expect(page.locator("#swup-container")).toHaveAttribute(
			"data-current-page",
			"devices",
		);
		await expect(page.locator(".page-header__title")).toHaveText(i18n(I18nKey.devices));
		await expect(page.locator(".devices-section__count")).toHaveText(
			String(DEVICE_COUNT) + " " + i18n(I18nKey.devicesCounts),
		);

		const macbook = page.locator('[data-device="macbook-air-m4"]');
		await expect(macbook.locator("h2")).toHaveText("MacBook Air M4");
		await expect(macbook.locator(".device-card__brand")).toHaveText("Apple");
		await expect(macbook.locator('[data-status="active"]')).toContainText(
			i18n(I18nKey.devicesStatusActive),
		);
		await expect(macbook.locator(".device-card__specs")).toContainText(
			"M4 / 16GB / 256GB",
		);
		await expect(macbook).toHaveClass(/device-card--featured/);
		// 该设备未配置 link：卡片不渲染「查看详情」入口
		await expect(
			macbook.getByRole("link", { name: i18n(I18nKey.devicesViewSpecs) }),
		).toHaveCount(0);

		// 无图片设备：渲染图标瓷砖形态（不渲染媒体区）
		const iphone = page.locator('[data-device="iphone-17-pro-max"]');
		await expect(iphone.locator(".device-card__icon")).toBeVisible();
		await expect(iphone.locator(".device-card__media")).toHaveCount(0);

		// 主力推荐（featured）设备的状态徽标正确渲染
		const mini = page.locator('[data-device="mac-mini-m4"]');
		await expect(mini.locator('[data-status="active"]')).toContainText(
			i18n(I18nKey.devicesStatusActive),
		);
	});

	test("直接加载时导航高亮与侧栏页面过滤正确", async ({ page }) => {
		await expect(
			page.locator('[data-nav-key="devices"]').first(),
		).toHaveAttribute("aria-current", "page");
		await expect(
			page.locator('widget-layout[data-id="categories"]'),
		).toBeVisible();
		await expect(page.locator('widget-layout[data-id="tags"]')).toBeVisible();
	});

	test("场景分类筛选同步剩余设备与计数（含 LoadingIndicator 过渡）", async ({
		page,
	}) => {
		await page
			.getByRole("button", { name: "随身设备", exact: true })
			.click();
		await expect(
			page.locator(".devices-section__loading .m3-loading--contained"),
		).toBeVisible();
		await expect(page.locator(".device-card")).toHaveCount(1);
		await expect(page.locator(".devices-section__count")).toHaveText(
			String(1) + " " + i18n(I18nKey.devicesCounts),
		);
		await expect(page.locator('[data-device="iphone-17-pro-max"]')).toBeVisible();
		await expect(page.locator('[data-device="macbook-air-m4"]')).toHaveCount(0);
		await expect(page.locator(".devices-section__loading")).toHaveCount(0);

		// 再次点击已选分类取消筛选，恢复全部
		await page
			.getByRole("button", { name: "随身设备", exact: true })
			.click();
		await expect(page.locator(".device-card")).toHaveCount(DEVICE_COUNT);
	});

	test("搜索无结果时展示空状态反馈", async ({ page }) => {
		const searchInput = page.locator(".devices-section__search input");
		await searchInput.fill("Unknown9999");
		await expect(page.locator(".device-card")).toHaveCount(0);
		await expect(page.locator(".devices-section__empty")).toContainText(
			i18n(I18nKey.devicesNoResults),
		);
	});

	test("实时搜索过滤与清除（URL ?q= 同步）", async ({ page }) => {
		const searchInput = page.locator(".devices-section__search input");
		await expect(searchInput).toBeVisible();
		await searchInput.fill("MacBook");
		await expect(page.locator(".device-card")).toHaveCount(1);
		await expect(page.locator('[data-device="macbook-air-m4"]')).toBeVisible();
		await expect(page).toHaveURL(/[?&]q=MacBook/);

		// 清除搜索恢复全部
		const clearBtn = page.locator(".devices-section__search-clear");
		await clearBtn.click();
		await expect(page.locator(".device-card")).toHaveCount(DEVICE_COUNT);
		await expect(page).not.toHaveURL(/q=/);
	});

	test("URL 参数刷新后恢复筛选状态", async ({ page }) => {
		await page
			.getByRole("button", { name: "影音设备", exact: true })
			.click();
		await expect(page).toHaveURL(/[?&]category=audio/);
		await expect(page.locator(".device-card")).toHaveCount(1);
		await expect(page.locator('[data-device="xiberia-k30s"]')).toBeVisible();

		// 刷新后恢复同一次筛选
		await page.reload();
		await expect(page.locator(".device-card")).toHaveCount(1);
		await expect(page.locator('[data-device="xiberia-k30s"]')).toBeVisible();
		await expect(
			page.getByRole("button", { name: "影音设备", exact: true }),
		).toHaveAttribute("aria-pressed", "true");
	});
});

test.describe("设备展示页 Swup 导航", () => {
	test.use({ viewport: { width: 1280, height: 900 } });

	test("从持久顶栏进入后同步页面、导航与侧栏状态", async ({ page }) => {
		await page.goto("/skills/", { waitUntil: "domcontentloaded" });
		await page.getByRole("button", { name: i18n(I18nKey.more), exact: true }).click();
		await page.locator('a[data-nav-key="devices"]').click();

		await expect(page).toHaveURL(/\/devices\/$/);
		await expect(page.locator("#swup-container")).toHaveAttribute(
			"data-current-page",
			"devices",
		);
		await expect(page.locator(".device-card")).toHaveCount(DEVICE_COUNT);
		await expect(page.locator('a[data-nav-key="devices"]')).toHaveAttribute(
			"aria-current",
			"page",
		);
		await expect(
			page.locator('widget-layout[data-id="categories"]'),
		).toBeVisible();
		await expect(page.locator('widget-layout[data-id="tags"]')).toBeVisible();
	});
});
