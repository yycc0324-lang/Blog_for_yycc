import type { I18nConfig } from "../types/i18nConfig.ts";
import { withUserConfig } from "../utils/config-overlay.ts";

export const i18nConfig: I18nConfig = withUserConfig("i18n", {
	zh_CN: {
		// 关于页已关闭（aboutConfig.enable = false），友链横幅里不再指向它
		friendsBanner: "诸事顺利",
	},
});
