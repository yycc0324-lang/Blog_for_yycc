import type { ProfileConfig } from "@/types/config";
import { withUserConfig } from "../utils/config-overlay.ts";

/**
 * 博主资料：头像 / 名称 / 简介 / 社交链接（侧栏 Profile 卡片、页脚、RSS 作者等消费）。
 * 类型见 src/types/config.ts。
 */
export const profileConfig: ProfileConfig = withUserConfig("profile", {
	avatar: "assets/images/avatar.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "伊橙",
	bio: "诸事顺,利",
	links: [
		{
			name: "BiliBili",
			icon: "fa6-brands:bilibili", // Visit https://icones.js.org/ for icon codes
			// You will need to install the corresponding icon set if it's not already included
			// `pnpm add @iconify-json/<icon-set-name>`
			url: "https://space.bilibili.com/1084234569?spm_id_from=333.1007.0.0",
		},
		{
			name: "QQ",
			icon: "fa6-brands:qq",
			// 个人名片协议：手机 QQ 内点击直接弹出「加好友」名片；桌面浏览器无 QQ 时
			// 该协议无响应，因此下方 qr / qrLabel 提供扫码与复制号码两条兜底路径。
			url: "mqqapi://card/show_pslcard?src_type=internal&version=1&uin=2816146402&card_type=person&source=qrcode",
			// 二维码内容：与 url 同源，供手机 QQ「扫一扫」直接弹出加好友名片
			qr: "mqqapi://card/show_pslcard?src_type=internal&version=1&uin=2816146402&card_type=person&source=qrcode",
			qrLabel: "QQ：2816146402",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/yycc0324-lang",
		},
	],
});
