/**
 * Umami 统计配置类型（由 oddmisc 提供）。
 */
export type UmamiConfig = {
	/** 全局 Umami 统计总开关：false 时完全不加载 oddmisc 运行时脚本与 DOM */
	enable: boolean;
	/** Umami 分享链接（必填） */
	shareUrl: string;
	/** Umami Website ID；与 scriptUrl 同时配置时启用访问采集。 */
	websiteId?: string;
	/** Umami 采集脚本 URL；与 websiteId 同时配置时启用访问采集。 */
	scriptUrl?: string;
	/**
	 * 顶栏访客徽标：true 时在顶栏右上角显示 Umami 统计的唯一访客数。
	 * 依赖 shareUrl 读取数据；建议同时配置 websiteId 与 scriptUrl 以采集新访客。
	 * 默认 false，关闭时不产生任何额外 DOM 与请求。
	 */
	visitorBadge?: boolean;
};

/**
 * 解析后的 Umami 配置选项。
 */
export type ResolvedUmamiOptions = {
	shareUrl: string;
	websiteId?: string;
	scriptUrl?: string;
} | null;
