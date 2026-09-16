/**
 * 设备展示页数据源（纯内容）。
 * 页面展示与筛选规则由 src/config/devicesConfig.ts 控制。
 */
import type { DeviceItem } from "@/types/devicesConfig";

export const devicesData: DeviceItem[] = [
	{
		id: "macbook-air-m4",
		name: "MacBook Air M4",
		brand: "Apple",
		category: "desk",
		status: "active",
		specs: "M4 / 16GB / 256GB",
		description: "主力开发与日常办公的轻薄本，M4 芯片 + 16GB 内存，非常喜欢，很方便轻薄",
		icon: "material-symbols:laptop-mac-rounded",
		featured: true,
		year: "2026",
	},
	{
		id: "iphone-17-pro-max",
		name: "iPhone 17 Pro Max",
		brand: "Apple",
		category: "mobile",
		status: "active",
		specs: "Natural Titanium / 256GB",
		description: "影像出色",
		icon: "material-symbols:phone-iphone",
		featured: true,
		year: "2025",
	},
	{
		id: "xiberia-k30s",
		name: "西伯利亚 K30s",
		brand: "西伯利亚",
		category: "audio",
		status: "active",
		specs: "头戴式 / 有线",
		description: "打游戏和听歌都够用，戴着很舒服。",
		icon: "material-symbols:headphones-rounded",
		year: "2023",
	},
	{
		id: "aula-f75",
		name: "狼蛛 F75",
		brand: "狼蛛",
		category: "peripheral",
		status: "active",
		specs: "75% 配列 / 机械轴",
		description: "75% 配列键盘，日常打字手感很满意。",
		icon: "material-symbols:keyboard-outline-rounded",
		year: "2025",
	},
	{
		id: "mac-mini-m4",
		name: "Mac mini M4",
		brand: "Apple",
		category: "desk",
		status: "active",
		specs: "M4 / 24GB / 1TB",
		description: "不用关机可以当小服务器，日常开发跑模型，安静省电",
		icon: "material-symbols:desktop-mac-rounded",
		featured: true,
		year: "2025",
	},
	{
		id: "lenovo-2024-4070",
		name: "Lenovo 2024 RTX 4070",
		brand: "Lenovo",
		category: "desk",
		status: "active",
		specs: "RTX 4070 / 16GB / 1TB",
		description: "Windows 阵营主力机：游戏与需要独立显卡的任务。",
		year: "2024",
	},
];

/** 获取所有设备数据列表 */
export function getDevicesList(): DeviceItem[] {
	return devicesData;
}
