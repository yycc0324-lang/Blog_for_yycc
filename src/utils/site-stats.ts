/**
 * 站点统计取数（SideBar stats widget 消费）。
 * 模块级备忘化：构建期多个页面渲染共享一次汇总（总字数需要对全部
 * 文章跑 render 提取 remark 字数，不做缓存会逐页重复开销）。
 */
import { render } from "astro:content";
import { siteConfig } from "@/config/siteConfig";
import {
	getCategoryList,
	getSortedMoments,
	getSortedPosts,
	getTagList,
} from "./content-utils";

export interface SiteStats {
	posts: number;
	moments: number;
	categories: number;
	tags: number;
	/** 全部文章 remark 字数之和 */
	words: number;
	/** 运行天数：优先从 siteConfig.siteStats.startDate 起算，未配置时回退到最早文章发布日 */
	days: number;
	/** 最近更新：本次项目构建/加载时间（ISO 字符串） */
	lastActivity: string | null;
}

const DAY_MS = 86_400_000;

let cache: SiteStats | null = null;

export async function getSiteStats(): Promise<SiteStats> {
	if (cache) return cache;

	const [posts, moments, categories, tags] = await Promise.all([
		getSortedPosts(),
		getSortedMoments(),
		getCategoryList(),
		getTagList(),
	]);

	const now = Date.now();

	// 总字数与最早发布日来自同一批文章，一次遍历
	let words = 0;
	let earliest = Number.POSITIVE_INFINITY;
	for (const post of posts) {
		const { remarkPluginFrontmatter } = await render(post);
		words += remarkPluginFrontmatter.words ?? 0;
		const published = new Date(post.data.published).getTime();
		if (published < earliest) earliest = published;
	}

	const configuredStart = siteConfig.siteStats?.startDate
		? Date.parse(siteConfig.siteStats.startDate)
		: Number.NaN;
	const uptimeStart = Number.isFinite(configuredStart)
		? configuredStart
		: earliest;

	cache = {
		posts: posts.length,
		moments: moments.length,
		categories: categories.length,
		tags: tags.length,
		words,
		days: Number.isFinite(uptimeStart)
			? Math.max(0, Math.floor((now - uptimeStart) / DAY_MS))
			: 0,
		// 项目每次重新构建/启动 dev server 都会刷新此时间；前端再按 24h 计算相对天数。
		lastActivity: new Date(now).toISOString(),
	};
	return cache;
}
