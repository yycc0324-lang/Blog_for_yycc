/**
 * IP 归属地解析与欢迎语文案生成（纯函数，无副作用，服务端/客户端通用）。
 *
 * 不同公共接口返回的字段名差异很大，这里做一次归一化：
 *   - api.vore.top      → { ipdata: { info1, info2, info3 } }
 *   - 百度企服 qifu      → { data: { province, city, district, country } }
 *   - ipapi.co          → { country_name, country_code, region, city }
 *   - 其他常见结构       → { province, city, district, country } / { data: {...} } ...
 */

export interface IpRegion {
	province?: string;
	city?: string;
	district?: string;
	country?: string;
	countryCode?: string;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
	return typeof value === "object" && value !== null
		? (value as UnknownRecord)
		: null;
}

function pick(source: UnknownRecord | null, keys: string[]): string {
	if (!source) return "";
	for (const key of keys) {
		const value = source[key];
		if (typeof value === "string" && value.trim()) return value.trim();
	}
	return "";
}

function pickFromAny(
	records: Array<UnknownRecord | null>,
	keys: string[],
): string {
	for (const record of records) {
		const value = pick(record, keys);
		if (value) return value;
	}
	return "";
}

/** 把任意公共接口的响应归一化成 IpRegion；识别不出时返回 null。 */
export function normalizeIpGeo(payload: unknown): IpRegion | null {
	const root = asRecord(payload);
	if (!root) return null;

	const records = [
		root,
		asRecord(root.data),
		asRecord(root.result),
		asRecord(root.ipdata),
		asRecord(root.location),
		asRecord(root.geo),
	];

	const province = pickFromAny(records, [
		"province",
		"provinceName",
		"prov",
		"region",
		"regionName",
		"info1",
	]);
	const city = pickFromAny(records, ["city", "cityName", "info2"]);
	const district = pickFromAny(records, [
		"district",
		"area",
		"county",
		"info3",
	]);
	const country = pickFromAny(records, [
		"country",
		"country_name",
		"countryName",
	]);
	const countryCode = pickFromAny(records, ["country_code", "countryCode"]);
	if (!province && !city && !district && !country) return null;
	return { province, city, district, country, countryCode };
}

function stripSuffix(value: string): string {
	return value
		.replace(/(壮族|回族|维吾尔|藏族|蒙古族)?自治区$/, "")
		.replace(/(特别行政区|省|市|地区|盟|自治州|州)$/, "");
}

function joinUnique(
	parts: Array<string | undefined>,
	separator = "",
): string {
	const cleaned = parts.map((part) => part?.trim() ?? "").filter(Boolean);
	if (cleaned.length === 0) return "";
	const result: string[] = [];
	for (const part of cleaned) {
		const previous = result.at(-1);
		if (!previous) {
			result.push(part);
			continue;
		}
		// 「北京市 + 北京市」这类直辖市重复，或「广东省 + 广东市」这类同源重复，只保留一次。
		if (part === previous || stripSuffix(part) === stripSuffix(previous)) {
			continue;
		}
		result.push(part);
	}
	return result.join(separator);
}

/**
 * 生成欢迎语文案。
 * @param region 归一化后的归属地，null 表示定位失败
 * @param template 支持 {region} / {province} / {city} / {district} / {country}
 * @param fallback 定位失败时的兜底文案
 */
export function formatIpGreeting(
	region: IpRegion | null,
	template: string,
	fallback: string,
): string {
	if (!region) return fallback;
	const province = region.province?.trim() || "";
	const city = region.city?.trim() || "";
	const district = region.district?.trim() || "";
	const country = region.country?.trim() || "";
	const countryCode = region.countryCode?.trim() || "";
	const isChina =
		!country ||
		/^(中国|china|cn|chn)$/i.test(country) ||
		/^cn$/i.test(countryCode);

	let regionText: string;
	if (isChina) {
		regionText = joinUnique([province, city]) || district;
	} else {
		regionText = joinUnique([country, province, city], " ") || country;
	}
	if (!regionText) return fallback;

	const values: Record<string, string> = {
		region: regionText,
		province,
		city,
		district,
		country: country || countryCode,
	};
	const result = template
		.replace(
			/\{(region|province|city|district|country)\}/g,
			(match, key: string) => values[key] ?? match,
		)
		.trim();
	return result || fallback;
}
