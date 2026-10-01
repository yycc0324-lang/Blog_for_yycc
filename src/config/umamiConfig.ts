import type { ResolvedUmamiOptions, UmamiConfig } from "@/types/umamiConfig";
import { withUserConfig } from "../utils/config-overlay.ts";

/**
 * Umami 统计配置单一真源（由 oddmisc 提供）。
 *
 * 当前使用 **Umami Cloud**（https://cloud.umami.is）。
 * 遵循「零额外负担」原则：shareUrl 未填写时不产生任何外部网络请求、
 * 零额外 DOM 占位与零包体积膨胀；配置齐全后页脚「今日访客 / 累计访问」、
 * 侧栏统计、`/admin/` 与 `/stats/` 全部自动生效。
 *
 * Umami Cloud 三个值的获取位置：
 *   1. 登录 cloud.umami.is → 添加网站（填你的域名，如 cnyicheng.top）
 *   2. 网站详情页 → 复制 Website ID  → 填下面的 websiteId
 *   3. Settings → Share → 创建分享链接，复制完整 URL → 填下面的 shareUrl
 *      ⚠️ 若复制到的是短链 https://cloud.umami.is/share/xxxxxxxx，
 *         请手动补成地域完整地址 https://cloud.umami.is/analytics/us/share/xxxxxxxx
 *         否则 oddmisc 会推导出错误的 API 地址（详见下方 shareUrl 注释）
 *   4. scriptUrl 固定为 Cloud 采集脚本，无需修改
 *
 * 详细用法见：`docs/umami-guide.md`
 */
export const umamiConfig: UmamiConfig = withUserConfig("umami", {
	/** 全局 Umami 统计总开关：false 时完全不加载 oddmisc 运行时脚本与 DOM */
	enable: true,
	/**
	 * Umami Cloud 公开分享链接（必填；填写前统计 UI 整体隐藏，零请求）。
	 *
	 * ⚠️ 必须用**带地域段**的完整地址：https://cloud.umami.is/analytics/us/share/<shareId>
	 * 后台复制出来的短链 https://cloud.umami.is/share/<shareId> 会 307 跳到上面的地域地址，
	 * 但 oddmisc 是按「/share 之前的路径 + /api」推导接口地址的，用短链会推成
	 * https://cloud.umami.is/api/... → 404，页脚会一直读不到数据。
	 */
	shareUrl: "https://cloud.umami.is/analytics/us/share/lqp71l3pGI1CLXs7",
	/** Umami Cloud Website ID；与 scriptUrl 同时填写后才开始采集访问 */
	websiteId: "9a946664-2a4f-4b06-86c5-2b4a844e0323",
	/** Umami Cloud 采集脚本地址（固定值，无需修改） */
	scriptUrl: "https://cloud.umami.is/script.js",
	/** 顶栏访客徽标：true 时在顶栏右上角显示 Umami 唯一访客数，默认 false */
	visitorBadge: false,
});

/**
 * 解析并校验 Umami 配置。未启用或关键参数缺失时返回 null。
 */
export function resolveUmamiOptions(config: UmamiConfig): ResolvedUmamiOptions {
	if (!config.enable) {
		return null;
	}
	const shareUrl = config.shareUrl?.trim();
	if (!shareUrl) {
		return null;
	}
	return {
		shareUrl,
		websiteId: config.websiteId?.trim() || undefined,
		scriptUrl: config.scriptUrl?.trim() || undefined,
	};
}

export type { ResolvedUmamiOptions };
