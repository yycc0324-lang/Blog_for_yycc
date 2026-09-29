import type { AdminConfig } from "@/types/adminConfig";
import { withUserConfig } from "../utils/config-overlay.ts";

/**
 * 站内后台统计页配置（/admin/）。
 *
 * 页面数据复用站内已有的 Umami 集成（umamiConfig.shareUrl），
 * 展示「不同访客数 / 总访问次数 / 页面浏览量 / 当前在线」等站点统计。
 * 本页只读取数据，不新增采集脚本、不新增数据库。
 *
 * 遵循「零额外负担」原则：默认关闭（enable: false），
 * 未开启时访问 /admin/ 会直接重定向到 404，不产生任何额外页面。
 */
export const adminConfig: AdminConfig = withUserConfig("admin", {
	enable: true,
	title: "访问统计",
	description: "站点访问数据总览（数据来源：Umami 公开分享统计）",
	accessKey: "",
});
