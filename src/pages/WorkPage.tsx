import { useMemo } from "react";
import EntityReactionControl from "../components/EntityReactionControl";
import WorkEntityRow from "../components/WorkEntityRow";
import useThingstrEntityReactions from "../hooks/useThingstrEntityReactions";
import useWork from "../hooks/useWork";
import { buildCastPath, buildCompanyPath, buildStaffPath } from "../lib/routes";
import { estimateSeason, formatDate } from "../lib/season";
import { collectVisibleEntityIds } from "../lib/works";
import type { Work } from "../types/work";

type WorkPageProps = {
	basePath: string;
	workId: string;
};

function WorkPage({ basePath, workId }: WorkPageProps) {
	const { work, loading, error } = useWork(workId);
	const reactionEntityIds = useMemo(
		() => work ? collectVisibleEntityIds([work], new Set([work.id])) : [workId],
		[work, workId],
	);

	useThingstrEntityReactions(reactionEntityIds);

	return (
		<div className="space-y-6">
			<section className="space-y-4">
				<div className="card bg-base-100 shadow-sm">
					<div className="card-body">
						<div className="space-y-1">
							<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
								<h2 className="text-lg font-semibold">作品: {work?.title ?? workId}</h2>
								<a
									className="badge badge-outline badge-primary rounded-full no-underline font-normal text-xs px-2 py-1 whitespace-nowrap"
									href={work?.url ?? `https://www.wikidata.org/entity/${workId}`}
									target="_blank"
									rel="noreferrer"
								>
									{workId}
								</a>
								<EntityReactionControl entityId={work?.id ?? workId} />
							</div>
							{work?.description ? (
								<p className="text-sm text-base-content/80">{work.description}</p>
							) : loading ? (
								<div className="skeleton h-4 w-48" />
							) : null}
						</div>
					</div>
				</div>
			</section>

			<section className="space-y-4">
				{error ? (
					<div className="alert alert-error">
						<span>Failed to load: {error}</span>
					</div>
				) : null}

				{loading && !error ? (
					<div className="flex justify-center py-4">
						<span className="loading loading-spinner loading-lg text-primary" aria-label="Loading" />
					</div>
				) : null}

				{!loading && !error && work ? (
					<WorkPageContent basePath={basePath} work={work} />
				) : null}
			</section>
		</div>
	);
}

type WorkPageContentProps = {
	basePath: string;
	work: Work;
};

function WorkPageContent({ basePath, work }: WorkPageContentProps) {
	const seasonInfo = estimateSeason(work.startDate, work.endDate);
	const buildCastLink = (entityId: string) => buildCastPath(basePath, entityId);
	const buildStaffLink = (entityId: string) => buildStaffPath(basePath, entityId);
	const buildCompanyLink = (entityId: string) => buildCompanyPath(basePath, entityId);

	return (
		<div className="card bg-base-100 shadow-sm border border-base-200">
			<div className="card-body">
				<div className="flex items-center gap-2 text-sm text-base-content/70 flex-wrap">
					{seasonInfo ? (
						<span className={`badge align-middle text-xs ${seasonInfo.badgeClass}`}>
							{seasonInfo.label}
						</span>
					) : null}
					<span>
						開始: {formatDate(work.startDate) ?? "N/A"}
						{work.endDate ? ` / 終了: ${formatDate(work.endDate)}` : ""}
					</span>
				</div>
				<WorkEntityRow label="キャスト" entities={work.voiceActors} buildPath={buildCastLink} showRole />
				<WorkEntityRow label="制作会社" entities={work.productionCompanies} buildPath={buildCompanyLink} />
				<WorkEntityRow label="監督" entities={work.directors} buildPath={buildStaffLink} />
				<WorkEntityRow label="脚本" entities={work.screenwriters} buildPath={buildStaffLink} />
				<WorkEntityRow label="作曲" entities={work.composers} buildPath={buildStaffLink} />
			</div>
		</div>
	);
}

export default WorkPage;
