/**
 * 页脚自定义 HTML 注入配置类型。
 */
export interface FooterConfig {
	/**
	 * 是否启用自定义页脚 HTML 注入。
	 * 开启后将读取 src/config/FooterConfig.html 中的内容注入到页脚；
	 * 关闭时（false）满足零额外负担，不进行文件读取与额外 DOM 渲染。
	 */
	enable: boolean;
	/**
	 * 是否在页脚展示「今日访客 / 累计访问」统计条。
	 * 数据来自 Umami 公开分享统计（umamiConfig.shareUrl）；未配置时静默隐藏。
	 * 默认开启，关闭时零额外 DOM 与请求。
	 */
	visitorStats?: boolean;
	/**
	 * 「累计访问」口径："pageviews"（默认，累计浏览量 PV）| "visits"（累计访问次数）。
	 */
	visitorStatsMetric?: "pageviews" | "visits";
}
