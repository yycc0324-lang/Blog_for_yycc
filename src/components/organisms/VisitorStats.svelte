<script lang="ts">
/**
 * VisitorStats.svelte — 独立访问统计页业务有机体 (Svelte 5 Runes)
 *
 * 数据流：PasswordGate 解锁 → 解密出 Umami shareUrl（构建期加密，源码中
 * 无明文）→ 动态 import("oddmisc") 建立只读客户端 → 分区间查询 →
 * 渲染访客/浏览/访问次数与近 30 天趋势。
 *
 * 零额外负担：未配置环境变量时页面直接 404；oddmisc 仅在本组件解锁后
 * 按需加载；关闭/失败时静默降级为「暂无数据」，不阻塞页面主体。
 */
import Button from "@components/atoms/action/Button.svelte";
import PasswordGate from "@components/organisms/PasswordGate.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import {
	buildVisitorRanges,
	type VisitorRangeKey,
} from "@utils/visitor-stats-ranges";
import type { StatsResult, UmamiClient } from "oddmisc";
import { onDestroy } from "svelte";
import type { ProtectedPayload } from "@/types/protectedContent";

let {
	payload,
	scope,
	hint = "",
}: {
	payload: ProtectedPayload;
	scope: string;
	hint?: string;
} = $props();

interface StatRow {
	key: VisitorRangeKey;
	label: string;
	stats: StatsResult | null;
}

const RANGE_LABELS: Record<VisitorRangeKey, string> = {
	today: i18n(I18nKey.statsToday),
	"7d": i18n(I18nKey.statsLast7Days),
	"30d": i18n(I18nKey.statsLast30Days),
	total: i18n(I18nKey.statsAllTime),
};

const VISITORS_LABEL = i18n(I18nKey.statsVisitors);
const PAGEVIEWS_LABEL = i18n(I18nKey.profileStatsPageViews);
const VISITS_LABEL = i18n(I18nKey.profileStatsVisits);
const TREND_LABEL = i18n(I18nKey.statsLast30Days);

let unlocked = $state(false);
let loading = $state(false);
let failed = $state(false);
let rows = $state<StatRow[]>([]);
let trend = $state<number[]>([]);
let active = $state<number | null>(null);
let rootEl = $state<HTMLElement | null>(null);
let shareUrl: string | null = null;
let disposed = false;

function alive(): boolean {
	return !disposed && Boolean(rootEl?.isConnected);
}

function formatCount(value: number): string {
	try {
		const lang =
			typeof document === "undefined"
				? undefined
				: document.documentElement.lang || undefined;
		return new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(
			value,
		);
	} catch {
		return String(value);
	}
}

function metric(stats: StatsResult | null, key: keyof StatsResult): number {
	const value = stats?.[key];
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** 未拿到数据时显示占位符，避免加载中误显示为 0。 */
function display(stats: StatsResult | null, key: keyof StatsResult): string {
	if (!stats) return "—";
	return formatCount(metric(stats, key));
}

/** 近 30 天 pageviews → SVG 折线 points（viewBox 0 0 300 64）。 */
function trendPoints(values: number[]): string {
	if (values.length === 0) return "";
	const max = Math.max(...values, 1);
	const step = values.length > 1 ? 300 / (values.length - 1) : 0;
	return values
		.map((value, index) => {
			const x = (index * step).toFixed(1);
			const y = (64 - (value / max) * 56).toFixed(1);
			return `${x},${y}`;
		})
		.join(" ");
}

async function handleUnlocked(content: string) {
	unlocked = true;
	let parsedUrl: string | null = null;
	try {
		const parsed: unknown = JSON.parse(content);
		if (
			parsed &&
			typeof parsed === "object" &&
			typeof (parsed as { shareUrl?: unknown }).shareUrl === "string" &&
			(parsed as { shareUrl: string }).shareUrl.trim()
		) {
			parsedUrl = (parsed as { shareUrl: string }).shareUrl.trim();
		}
	} catch {
		parsedUrl = null;
	}
	if (!parsedUrl) {
		failed = true;
		return;
	}
	shareUrl = parsedUrl;
	await load(parsedUrl);
}

async function load(url: string) {
	loading = true;
	failed = false;
	const now = Date.now();
	const ranges = buildVisitorRanges(now);
	rows = ranges.map((range) => ({
		key: range.key,
		label: RANGE_LABELS[range.key],
		stats: null,
	}));
	try {
		const { createUmamiClient } = await import("oddmisc");
		const client: UmamiClient = createUmamiClient({ shareUrl: url });
		const results = await Promise.all(
			ranges.map((range) =>
				client.getSiteStats({ startAt: range.startAt, endAt: range.endAt }),
			),
		);
		if (!alive()) return;

		rows = ranges.map((range, index) => ({
			key: range.key,
			label: RANGE_LABELS[range.key],
			stats: results[index] ?? null,
		}));

		const timezone =
			typeof Intl === "undefined"
				? "UTC"
				: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
		try {
			const series = await client.getPageviews({
				startAt: ranges[2].startAt,
				endAt: now,
				unit: "day",
				timezone,
			});
			if (alive()) trend = series.pageviews.map((point) => point.y);
		} catch {
			if (alive()) trend = [];
		}

		try {
			const count = await client.getActiveVisitors();
			if (alive()) active = Number.isFinite(count) ? count : null;
		} catch {
			if (alive()) active = null;
		}
	} catch {
		if (alive()) failed = true;
	} finally {
		if (alive()) loading = false;
	}
}

function retry() {
	if (shareUrl) void load(shareUrl);
}

onDestroy(() => {
	disposed = true;
});
</script>

<div class="visitor-stats" bind:this={rootEl}>
	{#if !unlocked}
		<PasswordGate {payload} {scope} {hint} variant="stats" onunlocked={handleUnlocked} />
	{:else if failed}
		<div class="visitor-stats__state" role="status">
			<p>{i18n(I18nKey.noData)}</p>
			{#if shareUrl}
				<Button
					label={i18n(I18nKey.statsRetry)}
					icon="material-symbols:refresh-rounded"
					variant="tonal"
					size="small"
					onclick={retry}
				/>
			{/if}
		</div>
	{:else}
		<div class="visitor-stats__body" aria-busy={loading}>
			<div class="visitor-stats__grid">
				{#each rows as row (row.key)}
					<article class="visitor-stats__card">
						<h3 class="visitor-stats__range">{row.label}</h3>
						<p class="visitor-stats__value">
							{display(row.stats, "visitors")}
						</p>
						<p class="visitor-stats__unit">{VISITORS_LABEL}</p>
						<dl class="visitor-stats__metrics">
							<div>
								<dt>{PAGEVIEWS_LABEL}</dt>
								<dd>{display(row.stats, "pageviews")}</dd>
							</div>
							<div>
								<dt>{VISITS_LABEL}</dt>
								<dd>{display(row.stats, "visits")}</dd>
							</div>
						</dl>
					</article>
				{/each}
			</div>

			{#if active !== null}
				<p class="visitor-stats__active" aria-live="polite">
					<span class="visitor-stats__dot" aria-hidden="true"></span>
					{i18n(I18nKey.statsActiveNow)}
					<span class="visitor-stats__active-count">{formatCount(active)}</span>
				</p>
			{/if}

			{#if trend.length > 0}
				<figure class="visitor-stats__trend">
					<figcaption>{TREND_LABEL}</figcaption>
					<svg
						viewBox="0 0 300 64"
						preserveAspectRatio="none"
						role="img"
						aria-label={TREND_LABEL}
					>
						<polyline points={trendPoints(trend)} />
					</svg>
				</figure>
			{/if}
		</div>
	{/if}
</div>

<style lang="stylus">
@import "../../styles/breakpoints.styl"

.visitor-stats
	width: 100%

	&__body
		display: flex
		flex-direction: column
		gap: var(--m3e-space-5)

	&__grid
		display: grid
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr))
		gap: var(--m3e-space-4)

	&__card
		display: flex
		flex-direction: column
		gap: var(--m3e-space-1)
		padding: var(--m3e-space-5)
		border: 1px solid var(--outline-variant)
		border-radius: var(--shape-corner-l)
		background: var(--surface-container-low)
		color: var(--on-surface)

	&__range
		margin: 0
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-large)

	&__value
		margin: 0
		color: var(--on-surface)
		font: var(--m3e-type-display-small)
		font-weight: 600
		font-variant-numeric: tabular-nums
		line-height: 1.1

	&__unit
		margin: 0
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-small)

	&__metrics
		display: flex
		flex-wrap: wrap
		gap: var(--m3e-space-1) var(--m3e-space-4)
		margin: var(--m3e-space-2) 0 0
		padding: 0
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-small)

		div
			display: flex
			align-items: baseline
			gap: var(--m3e-space-1)

		dt
			margin: 0

		dd
			margin: 0
			color: var(--on-surface)
			font-weight: 600
			font-variant-numeric: tabular-nums

	&__active
		display: inline-flex
		align-items: center
		gap: var(--m3e-space-2)
		align-self: flex-start
		margin: 0
		padding: var(--m3e-space-2) var(--m3e-space-4)
		border-radius: var(--shape-corner-full)
		background: var(--secondary-container)
		color: var(--on-secondary-container)
		font: var(--m3e-type-body-medium)

	&__active-count
		font-weight: 700
		font-variant-numeric: tabular-nums

	&__dot
		width: 0.5rem
		height: 0.5rem
		border-radius: var(--shape-corner-full)
		background: currentColor

	&__trend
		display: flex
		flex-direction: column
		gap: var(--m3e-space-2)
		margin: 0
		padding: var(--m3e-space-5)
		border: 1px solid var(--outline-variant)
		border-radius: var(--shape-corner-l)
		background: var(--surface-container-low)

		figcaption
			color: var(--on-surface-variant)
			font: var(--m3e-type-label-large)

		svg
			display: block
			width: 100%
			height: 4rem
			color: var(--primary)
			overflow: visible

		polyline
			fill: none
			stroke: currentColor
			stroke-width: 2
			stroke-linejoin: round
			stroke-linecap: round
			vector-effect: non-scaling-stroke

	&__state
		display: flex
		flex-direction: column
		align-items: center
		gap: var(--m3e-space-4)
		padding: var(--m3e-space-8)
		border: 1px solid var(--outline-variant)
		border-radius: var(--shape-corner-l)
		background: var(--surface-container-lowest)
		color: var(--on-surface-variant)
		text-align: center

		p
			margin: 0
			font: var(--m3e-type-body-medium)

@media (max-width: bp-sm - 1px)
	.visitor-stats
		&__grid
			grid-template-columns: repeat(2, minmax(0, 1fr))
			gap: var(--m3e-space-3)

		&__card
			padding: var(--m3e-space-4)

		&__value
			font: var(--m3e-type-headline-medium)
			font-weight: 600
</style>
