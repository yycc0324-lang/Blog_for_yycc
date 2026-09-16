<script lang="ts">
/**
 * 资料卡社交链接分子。
 *
 * 形态由 `qr` 决定：
 * - 未配置 `qr`：Tooltip + IconButton(<a href>)——与历史渲染逐字一致，
 *   不产生额外 DOM、请求与依赖加载（零额外负担）；
 * - 配置 `qr`：IconButton 渲染为 <button>，点击打开 Dialog：二维码 +
 *   可复制文本（桌面兜底）+「打开链接」动作。
 *
 * 图标必须由调用方以 children 传入 astro-icon 的渲染结果，禁止使用 icon prop：
 * 图标数据在无 hydration 的 SSR 阶段不可用，直出结果是空图标
 * （见 rules/pitfalls.md 与 tests/site/icons.spec.ts）。
 */
import Button from "@components/atoms/action/Button.svelte";
import IconButton from "@components/atoms/action/IconButton.svelte";
import Dialog from "@components/atoms/overlay/Dialog.svelte";
import Tooltip from "@components/atoms/overlay/Tooltip.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { drawQrCode } from "@utils/qr-code";
import { showSnackbar } from "@utils/snackbar";

/** 二维码位图边长；显示尺寸由 CSS 缩放，位图保持整数方阵避免采样模糊 */
const QR_BITMAP_SIZE = 240;

let {
	name,
	url,
	qr = "",
	qrLabel = "",
	labeled = false,
	children,
}: {
	/** 链接名称（同时作为无障碍标签与二维码弹层标题参数） */
	name: string;
	/** 链接地址；自定义协议（如 mqqapi://）在未安装对应客户端的环境点击无响应 */
	url: string;
	/** 二维码内容；省略时退化为普通外链按钮 */
	qr?: string;
	/** 二维码下方的可复制文本（如 "QQ：12345678"）；省略则只显示二维码 */
	qrLabel?: string;
	/** 资料卡只有一个链接时渲染为「图标 + 名称」按钮，匹配原有排版 */
	labeled?: boolean;
	/** 图标（astro-icon 已渲染结果；禁止改用 icon prop） */
	children?: import("svelte").Snippet;
} = $props();

let dialogOpen = $state(false);
let canvasEl = $state<HTMLCanvasElement | undefined>();
let qrFailed = $state(false);

const hasQr = $derived(qr.length > 0);
const dialogTitle = $derived(i18n(I18nKey.qrCodeTitle).replace("{name}", name));
// 自定义协议（mqqapi:// 等）在桌面端通常没有注册处理程序：带 target="_blank"
// 会留下一个空白标签页，因此只有 http(s) 链接才按外链新开窗口并标注 rel="me"。
const isHttpUrl = /^https?:\/\//i.test(url);
const linkTarget = isHttpUrl ? "_blank" : undefined;

// Dialog 打开后才挂载内容，故依赖 canvasEl 的变化重跑：画布挂载完成即绘制
$effect(() => {
	if (!dialogOpen || !hasQr || !canvasEl) return;
	const canvas = canvasEl;
	qrFailed = false;
	void drawQrCode(canvas, qr, { size: QR_BITMAP_SIZE }).catch(() => {
		qrFailed = true;
	});
});

function openDialog() {
	dialogOpen = true;
}

async function copyQrLabel() {
	try {
		await navigator.clipboard.writeText(qrLabel);
		showSnackbar(i18n(I18nKey.copySuccess), {
			icon: "material-symbols:check-rounded",
		});
	} catch {
		showSnackbar(i18n(I18nKey.copyFailed));
	}
}
</script>

{#if labeled}
	<Button
		href={hasQr ? undefined : url}
		target={hasQr ? undefined : linkTarget}
		ariaLabel={name}
		variant="text"
		size="small"
		class="!px-3 !font-bold !text-[var(--on-surface)]"
		onclick={hasQr ? openDialog : undefined}
	>
		{@render children?.()}
		{name}
	</Button>
{:else}
	<Tooltip label={name} placement="top">
		<IconButton
			href={hasQr ? undefined : url}
			target={hasQr ? undefined : linkTarget}
			rel={hasQr || !isHttpUrl ? undefined : "me"}
			label={name}
			ariaExpanded={hasQr ? dialogOpen : undefined}
			onclick={hasQr ? openDialog : undefined}
		>
			{@render children?.()}
		</IconButton>
	</Tooltip>
{/if}

{#if hasQr}
	<Dialog
		bind:open={dialogOpen}
		title={dialogTitle}
		class="profile-link-qr"
	>
		<div class="profile-link-qr__body">
			<p class="profile-link-qr__hint">{i18n(I18nKey.qrCodeHint)}</p>
			<div class="profile-link-qr__frame">
				<canvas
					bind:this={canvasEl}
					class="profile-link-qr__canvas"
					width={QR_BITMAP_SIZE}
					height={QR_BITMAP_SIZE}
					aria-hidden="true"
				></canvas>
			</div>
			{#if qrFailed}
				<p class="profile-link-qr__failed" role="alert">
					{i18n(I18nKey.qrCodeFailed)}
				</p>
			{/if}
			{#if qrLabel}
				<div class="profile-link-qr__label">
					<span class="profile-link-qr__value">{qrLabel}</span>
					<IconButton
						icon="material-symbols:content-copy-rounded"
						label={i18n(I18nKey.copyContent)}
						size="xsmall"
						onclick={copyQrLabel}
					/>
				</div>
			{/if}
		</div>

		{#snippet actions()}
			<Button
				variant="text"
				size="small"
				label={i18n(I18nKey.close)}
				onclick={() => (dialogOpen = false)}
			/>
			<Button
				variant="filled"
				size="small"
				href={url}
				target={linkTarget}
				rel={isHttpUrl ? "me" : undefined}
				label={i18n(I18nKey.openLink)}
			/>
		{/snippet}
	</Dialog>
{/if}

<style lang="stylus">
.profile-link-qr
	&__body
		display: flex
		flex-direction: column
		align-items: center
		gap: var(--m3e-space-3)

	&__hint
		margin: 0
		font: var(--m3e-type-body-medium)
		color: var(--on-surface-variant)
		text-align: center

	&__frame
		display: flex
		align-items: center
		justify-content: center
		width: 15rem
		max-width: 100%

	/* 二维码本体不加圆角与描边：静默区必须完整，任何裁切或贴边都会降低识别率 */
	&__canvas
		display: block
		width: 100%
		height: auto
		aspect-ratio: 1

	&__failed
		margin: 0
		font: var(--m3e-type-body-small)
		color: var(--error)
		text-align: center

	&__label
		display: flex
		align-items: center
		justify-content: center
		gap: var(--m3e-space-1)

	&__value
		font: var(--m3e-type-body-large)
		color: var(--on-surface)
</style>
