import { expect, test } from "@playwright/test";
import I18nKey from "../../src/i18n/i18nKey";
import { i18n } from "../../src/i18n/translation";
import { profileConfig } from "../../src/config/profileConfig";

/**
 * 资料卡社交链接二维码弹层防回归。
 *
 * 背景：QQ 个人名片只有自定义协议（`mqqapi://`），未安装 QQ 的桌面浏览器点击
 * 毫无响应，因此配置了 `qr` 的链接渲染为 <button> 并弹出二维码弹层，同时提供
 * 「复制号码」与「打开链接」两条兜底路径；未配置 `qr` 的链接保持原生
 * <a rel="me">，不产生任何弹层 DOM（零额外负担）。
 */
const qrLink = profileConfig.links.find((link) => link.qr);
const plainLinks = profileConfig.links.filter((link) => !link.qr);

test.describe("资料卡社交链接二维码弹层", () => {
	test("配置 qr 的链接点击后弹出二维码，并给出桌面兜底", async ({ page }) => {
		expect(qrLink, "profile.links 中应有一条配置了 qr 的链接").toBeTruthy();
		expect(
			qrLink?.qrLabel,
			"配置了 qr 的链接应同时给出可复制文本",
		).toBeTruthy();

		await page.goto("/", { waitUntil: "domcontentloaded" });

		const trigger = page.locator(
			`.m3-profile__links button[aria-label="${qrLink?.name}"]`,
		);
		await expect(trigger).toHaveCount(1);
		// 未打开时不渲染弹层 DOM
		await expect(page.locator("dialog.m3-dialog")).toHaveCount(0);

		await trigger.click();

		const dialog = page.locator("dialog.m3-dialog");
		await expect(dialog).toBeVisible();
		await expect(dialog).toHaveAttribute(
			"aria-label",
			i18n(I18nKey.qrCodeTitle).replace("{name}", qrLink?.name ?? ""),
		);

		// 二维码确实绘制进画布：绘制依赖 qrcode 的动态 import，异步完成需轮询
		await expect
			.poll(() =>
				dialog.locator("canvas.profile-link-qr__canvas").evaluate((el) => {
					const context = (el as HTMLCanvasElement).getContext("2d");
					return context ? context.getImageData(0, 0, 1, 1).data[3] : 0;
				}),
			)
			.toBeGreaterThan(0);

		// 桌面兜底：可复制号码 + 打开链接（自定义协议在桌面无客户端时无效）
		await expect(dialog.locator(".profile-link-qr__value")).toHaveText(
			qrLink?.qrLabel ?? "",
		);
		await expect(dialog.locator(`a[href="${qrLink?.url}"]`)).toHaveCount(1);
	});

	test("未配置 qr 的链接保持原生外链，不产生弹层 DOM", async ({ page }) => {
		await page.goto("/", { waitUntil: "domcontentloaded" });

		for (const link of plainLinks) {
			await expect(
				page.locator(`.m3-profile__links a[aria-label="${link.name}"]`),
			).toHaveAttribute("href", link.url);
		}
		// http(s) 链接沿用原有语义：新窗口打开 + rel="me"
		await expect(page.locator(".m3-profile__links a[rel='me']")).toHaveCount(
			plainLinks.filter((link) => /^https?:\/\//i.test(link.url)).length,
		);
		await expect(page.locator("dialog.m3-dialog")).toHaveCount(0);
	});
});
