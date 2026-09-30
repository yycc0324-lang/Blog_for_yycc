export type { PermalinkConfig } from "./permalinkConfig.ts";

import type { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants";
import type { RainyDayConfig } from "./rainyDayConfig";
import type { TextureConfig } from "./textureConfig";

export type WallpaperMode = "banner" | "none";

export type TopAppBarContentAlign = "left" | "center";

/**
 * 浏览器标签页标题的「离开提醒」效果配置。
 *
 * 开启后访客切到其他标签 / 最小化窗口时，标题临时替换为 awayText；
 * 回到本页时自动恢复为当前页面原本的标题（含 swup 无刷新跳转后的新标题）。
 */
export type TabTitleConfig = {
	/** 是否启用标签页离开提醒（默认关闭时零脚本、零 DOM） */
	enable: boolean;
	/** 离开标签页时显示的文案（颜文字 + 提示语） */
	awayText: string;
};

/**
 * 首页 Banner 副标题的「IP 归属地欢迎语」配置。
 *
 * 开启后副标题由原本的静态文本替换为按访客 IP 归属地生成的问候语，
 * 例如「欢迎来自广东省深圳市的网友，祝你有所收获」；保留打字机特效。
 */
export type IpGreetingConfig = {
	/** 是否启用（默认关闭时副标题回退到 banner.homeText.subtitle） */
	enable: boolean;
	/**
	 * 文案模板，支持占位符：{region}（省+市智能拼接）、{province}、{city}、
	 * {district}、{country}。
	 */
	template?: string;
	/** 定位失败或尚未返回时展示的兜底文案 */
	fallback?: string;
	/**
	 * 归属地查询接口列表，按顺序尝试，命中即用（需支持 CORS 与 JSON 响应）。
	 * 未配置时使用内置的公共接口。
	 */
	endpoints?: string[];
	/** 同一次浏览器会话内的缓存时长（毫秒），默认 6 小时，避免每次跳转重复请求 */
	cacheTtl?: number;
};

export type DisplaySettingsConfig = {
	/** 是否在显示设置面板展示配色风格（9 宫格）选择器（默认 true） */
	colorStyle?: boolean;
	/** 是否在显示设置面板展示 Color Spec（调色规范 2021 / 2025）切换器（默认 true） */
	colorSpec?: boolean;
	/** 是否在显示设置面板展示 Page background（页面背景 纯色 / 横幅）切换器（默认 true） */
	wallpaperMode?: boolean;
	/** 是否在显示设置面板展示 Layout（文章列表布局 列表 / 网格）切换器（默认 true） */
	layoutMode?: boolean;
	/** 是否在显示设置面板展示 Reduce motion（减少动效）切换器（默认 true） */
	reduceMotion?: boolean;
	/** 是否在显示设置面板展示背景纹理选择器（默认 true，且受 texture.enable 控制） */
	texture?: boolean;
	/** 是否在显示设置面板展示雨滴特效开关（默认 true，且受 rainyDay.enable 控制） */
	rainyDay?: boolean;
};

export type BannerThemeSource = {
	light: string[];
	dark: string[];
};

export type BannerSourceValue = string[] | BannerThemeSource;

export type BannerConfig = {
	src: {
		desktop: BannerSourceValue;
		mobile: BannerSourceValue;
	};
	position?: "top" | "center" | "bottom";
	dim: {
		enable: boolean;
		opacity: number;
	};
	homeText: {
		enable: boolean;
		title: string;
		/** 首页副标题文本，支持单条字符串或多条交替循环的字符串数组 */
		subtitle: string | string[];
		typewriter: {
			enable: boolean;
			/** 打字速度（每个字符间隔，毫秒，默认 120） */
			speed: number;
			/** 回退反向删除速度（每个字符间隔，毫秒，默认 50） */
			deleteSpeed?: number;
			/** 打字完成后等待停顿时间（毫秒，默认 2000） */
			pauseTime?: number;
			/** 完成后是否循环播放（默认 true） */
			loop: boolean;
		};
		/** 首页副标题「IP 归属地欢迎语」（可选，未配置或关闭时使用 subtitle） */
		ipGreeting?: IpGreetingConfig;
	};
	carousel: {
		enable: boolean;
		interval: number;
		/** 交叉淡入淡出过渡时长（毫秒，默认 1200） */
		fadeDuration?: number;
		/** 运镜呼吸动画模式："ken-burns"（默认，序列运镜）| "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "none" */
		animation?:
			| "ken-burns"
			| "zoom-in"
			| "zoom-out"
			| "pan-left"
			| "pan-right"
			| "none";
	};
	waves: {
		enable: boolean;
	};
};

export type SiteConfig = {
	site: string;
	base?: string;
	title: string;
	subtitle: string;
	/** 浏览器标签页「离开提醒」效果（可选，未配置或关闭时不注入任何脚本） */
	tabTitle?: TabTitleConfig;
	/** 站点统计：运行天数起点（ISO 8601，建议带时区）。未设置时回退到最早文章发布时间。 */
	siteStats?: {
		startDate?: string;
	};
	/** 默认社交媒体分享预览图（og:image / twitter:image），支持本地相对路径或远程绝对链接。未配置时自动回退为第一张桌面版横幅壁纸。 */
	ogImage?: string;
	topAppBar: {
		/** 桌面端标题与导航内容组的对齐方式。 */
		contentAlign: TopAppBarContentAlign;
	};

	/** 显示设置浮层各切换项的前端可见性控制 */
	displaySettings?: DisplaySettingsConfig;

	lang:
		| "en"
		| "zh_CN"
		| "zh_TW"
		| "ja"
		| "ko"
		| "es"
		| "th"
		| "vi"
		| "tr"
		| "id";

	/** IANA time zone used to interpret precise content timestamps. */
	timeZone: string;

	themeColor: {
		hue: number;
		fixed: boolean;
		style: string;
		spec: string;
	};
	wallpaperMode: {
		defaultMode: WallpaperMode;
	};
	/** 页面背景纹理系统配置，支持布尔值直接开关或详细配置对象 */
	texture?: boolean | TextureConfig;
	/**
	 * 雨滴窗玻璃特效（Banner 上的 WebGL 雨滴），支持布尔值直接开关或详细配置对象。
	 * 重量级可选特性：未配置即关闭，关闭时零 DOM / 零样式 / 零 bundle。
	 */
	rainyDay?: boolean | RainyDayConfig;
	banner: BannerConfig;
	/** Markdown 正文图片处理配置。 */
	imageOptimization?: {
		/** 添加 `referrerpolicy="no-referrer"` 的远程图片域名，支持 `*.example.com` 通配符。 */
		noReferrerDomains?: string[];
	};
	toc: {
		enable: boolean;
		depth: 1 | 2 | 3;
	};

	/** 进度条预设样式（页面切换进度条等，仅线性扫描模式） */
	progressIndicator: {
		/** dual 双向扫描（官方默认双线）/ single 单向扫描（单线） */
		style: "dual" | "single";
	};

	favicon: Favicon[];
};

export type Favicon = {
	src: string;
	theme?: "light" | "dark";
	sizes?: string;
};

export type ProfileConfig = {
	avatar?: string;
	name: string;
	bio?: string;
	links: {
		name: string;
		url: string;
		icon: string;
		/**
		 * 二维码内容：填写后点击该图标弹出二维码弹层（如 QQ 加好友名片协议串）。
		 * 省略时与既有行为完全一致（普通外链按钮），不产生额外 DOM 与请求。
		 */
		qr?: string;
		/** 二维码下方的可复制文本（如 "QQ：12345678"）；省略则只显示二维码 */
		qrLabel?: string;
	}[];
};

export type LicenseConfig = {
	enable: boolean;
	name: string;
	url: string;
};

export type LIGHT_DARK_MODE =
	| typeof LIGHT_MODE
	| typeof DARK_MODE
	| typeof AUTO_MODE;

export type BlogPostData = {
	body: string;
	title: string;
	published: Date;
	publishedAt?: Date;
	updated?: Date;
	updatedAt?: Date;
	description: string;
	tags: string[];
	draft?: boolean;
	image?: string;
	category?: string;
	alias?: string;
	permalink?: string;
	prevTitle?: string;
	prevUrl?: string;
	nextUrl?: string;
	prevSlug?: string;
	nextTitle?: string;
	nextSlug?: string;
};

export type ExpressiveCodeConfig = {
	theme: string;
	lightTheme?: string;
	darkTheme?: string;
};
