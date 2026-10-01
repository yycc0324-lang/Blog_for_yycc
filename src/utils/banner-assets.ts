/**
 * 本地 Banner 图片「自动发现」（Vite 构建期 glob）。
 *
 * 约定目录：`src/assets/images/banner/{desktop,tablet,mobile}/`
 * 只要把图片丢进对应目录，就自动按文件名顺序参与轮播，无需改配置；
 * 删掉文件同样自动生效。单张图时不会轮播（只显示这一张）。
 *
 * 想精确控制顺序 / 只挑其中几张 / 用远程图 / 深浅色两套时，
 * 仍可在 `src/config/siteConfig.ts` 的 `banner.src.<组>` 里显式写数组——
 * 显式数组非空时优先于自动发现。
 */

export type BannerAssetGroup = "desktop" | "tablet" | "mobile";

const bannerFiles = import.meta.glob<ImageMetadata>(
	"../assets/images/banner/*/*.{png,jpg,jpeg,webp,avif}",
	{ import: "default" },
);

/**
 * 列出某个分组目录下的全部图片，返回「相对 src 的路径」数组
 * （例如 `assets/images/banner/mobile/1.webp`），可直接交给 resolveImageAsset。
 * 排序按文件名自然序：1, 2, 3, 10（而不是 1, 10, 2）。
 */
export function listLocalBannerImages(group: BannerAssetGroup): string[] {
	const prefix = `../assets/images/banner/${group}/`;
	return Object.keys(bannerFiles)
		.filter((key) => key.startsWith(prefix))
		.sort((a, b) =>
			a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
		)
		.map((key) => key.replace(/^\.\.\//, ""));
}
