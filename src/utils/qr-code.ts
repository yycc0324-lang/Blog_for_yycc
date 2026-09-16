/**
 * 二维码绘制工具。
 *
 * `qrcode` 通过动态 import 按需加载：只有真正打开二维码弹层时才把该依赖拉进
 * 客户端 bundle，其余页面零成本（与 `share-poster.ts` 同源写法）。
 *
 * 配色固定黑/白属于**文档化的内容特定例外**：二维码必须保持最高对比度才能被
 * 扫码识别，跟随主题色（深色模式下的浅色前景）会导致无法扫描。
 */
export interface DrawQrCodeOptions {
	/** 位图边长（px）；显示尺寸由消费方 CSS 控制，默认 240 */
	size?: number;
	/** 静默区宽度（模块数）；低于 2 会明显降低识别率，默认 2 */
	margin?: number;
}

export async function drawQrCode(
	canvas: HTMLCanvasElement,
	content: string,
	options: DrawQrCodeOptions = {},
): Promise<void> {
	if (!content) throw new Error("Empty QR code content");

	const qrcodeModule = await import("qrcode");
	const QRCode =
		(qrcodeModule as unknown as { default: typeof qrcodeModule }).default ||
		qrcodeModule;

	await QRCode.toCanvas(canvas, content, {
		width: options.size ?? 240,
		margin: options.margin ?? 2,
		errorCorrectionLevel: "M",
		color: { dark: "#000000", light: "#ffffff" },
	});
}
