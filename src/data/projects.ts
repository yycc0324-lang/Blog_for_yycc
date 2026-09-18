/**
 * 项目页数据源（纯内容）。
 * 页面展示与筛选规则由 src/config/projectsConfig.ts 控制。
 */
import type { ProjectItem } from "@/types/projectsConfig";

export const projectsData: ProjectItem[] = [
	{
		key: "blog",
		title: "个人博客 2.0",
		summary:
			"个人博客的重构版：保留 Astro 与岛屿架构，舍弃原有开源项目结构，主题与内容彻底分离，静态构建产物部署在 Vercel。",
		category: "web",
		phase: "shipped",
		technologies: ["Astro", "Svelte", "TypeScript", "Tailwind CSS"],
		icon: "material-symbols:globe-outline-rounded",
		featured: true,
		repository: "https://github.com/yycc0324-lang/Blog_for_yycc",
		year: "2026",
	},
	{
		key: "openharmony-car-ai",
		title: "北向鸿蒙车载智能助手",
		summary:
			"基于 HarmonyOS / OpenHarmony 的车载智能助手，融合 DeepSeek 大模型多轮对话与华为云 IoT 设备实时数据监测，采用 Stage 应用模型与 ArkUI 声明式 UI。",
		category: "harmony",
		phase: "building",
		technologies: ["HarmonyOS", "ArkTS", "DeepSeek", "华为云 IoT"],
		icon: "material-symbols:directions-car-outline-rounded",
		featured: true,
		repository: "https://github.com/yycc0324-lang/OpenHarmony_Car_AI",
		year: "2026",
	},
	{
		key: "takeaway-backend",
		title: "苍穹外卖 · 后端",
		summary:
			"外卖平台后端服务，Spring Boot 多模块 Maven 项目。提供管理端与微信小程序端的 RESTful API，涵盖菜品、套餐、订单、支付、统计导出与 WebSocket 订单实时提醒。",
		category: "backend",
		phase: "shipped",
		technologies: [
			"Java",
			"Spring Boot",
			"MyBatis-Plus",
			"MySQL",
			"Redis",
			"微信小程序",
		],
		icon: "material-symbols:receipt-long-rounded",
		repository: "https://github.com/yycc0324-lang/Takeaway_Backend",
		year: "2026",
	},
	{
		key: "super-agent",
		title: "Super Agent",
		summary:
			"自主实现的多集成多功能 Agent，围绕工具调用、任务编排与多模型集成等 Agent 核心能力做工程化落地。",
		category: "agent",
		phase: "building",
		technologies: ["Java", "LLM", "Agent"],
		icon: "material-symbols:smart-toy-outline-rounded",
		repository: "https://github.com/yycc0324-lang/Super_Agent",
		year: "2026",
	},
	{
		key: "spring-ai-lab",
		title: "Spring AI 实践",
		summary:
			"用 Spring AI 把基础对话、角色扮演小游戏与智能客服三个玩法串起来的实践工程：模型跑在本地 Ollama（deepseek-r1），数据侧接 MySQL + MyBatis-Plus。",
		category: "agent",
		phase: "exploring",
		technologies: ["Java", "Spring Boot", "Spring AI", "Ollama", "MySQL"],
		icon: "material-symbols:psychology-outline-rounded",
		repository:
			"https://github.com/yycc0324-lang/Experience_SpringAI_framework",
		year: "2026",
	},
	{
		key: "md-admin",
		title: "MD Admin",
		summary:
			"一个 RAG 演示项目，验证检索增强生成在管理后台场景下的落地方式。",
		category: "agent",
		phase: "exploring",
		technologies: ["RAG", "HTML", "JavaScript"],
		icon: "material-symbols:database-outline-rounded",
		repository: "https://github.com/yycc0324-lang/MD-Admin",
		year: "2026",
	},
	{
		key: "openharmony-car-smart-r",
		title: "鸿蒙车载智能座舱",
		summary:
			"鸿蒙车载方向的相关实践工程，偏向系统底层与硬件侧的探索。",
		category: "harmony",
		phase: "exploring",
		technologies: ["C", "OpenHarmony"],
		icon: "material-symbols:memory-rounded",
		repository:
			"https://github.com/yycc0324-lang/Openharmoy_Car_TX_Smart_R",
		year: "2026",
	},
];

/** 获取所有项目数据列表 */
export function getProjectsList(): ProjectItem[] {
	return projectsData;
}
