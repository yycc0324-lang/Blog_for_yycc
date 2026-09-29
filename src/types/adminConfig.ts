export interface AdminConfig {
	/** 是否启用站内后台统计页；默认 false。启用后访问 /admin/。 */
	enable: boolean;
	/** 后台统计页标题 */
	title: string;
	/** 后台统计页顶部说明文字 */
	description?: string;
	/**
	 * 可选访问口令（仅前端校验，默认留空表示不校验）。
	 * 注意：静态站无法做真正的服务端鉴权，此口令只是「防君子」；
	 * 真正需要私密数据请使用 Umami 后台或托管平台的访问控制。
	 */
	accessKey?: string;
}
