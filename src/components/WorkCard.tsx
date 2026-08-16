import { forwardRef } from "react";
import { estimateSeason, formatDate } from "../lib/season";
import { buildCastPath, buildCompanyPath, buildStaffPath, buildWorkPath } from "../lib/routes";
import type { Work } from "../types/work";
import EntityReactionControl from "./EntityReactionControl";
import WorkEntityRow from "./WorkEntityRow";

const WorkCard = forwardRef<HTMLLIElement, Work>(function WorkCard(
	{
		title,
		id,
		description,
		startDate,
		endDate,
		url,
		voiceActors,
		productionCompanies,
		directors,
		screenwriters,
		composers,
	},
	ref,
) {
	const seasonInfo = estimateSeason(startDate, endDate);
	const basePath = import.meta.env.BASE_URL ?? "/";
	const buildCastLink = (entityId: string) => buildCastPath(basePath, entityId);
	const buildStaffLink = (entityId: string) => buildStaffPath(basePath, entityId);
	const buildCompanyLink = (entityId: string) => buildCompanyPath(basePath, entityId);
	const workLink = buildWorkPath(basePath, id);
	return (
		<li ref={ref} data-work-id={id} className="card bg-base-100 shadow-sm border border-base-200">
			<div className="card-body">
				<div className="space-y-1">
					<h3 className="card-title text-lg leading-tight">
						<span className="flex flex-wrap items-center gap-2 break-words">
							{workLink ? <a className="link link-hover" href={workLink}>{title}</a> : title}
							<span className="inline-flex items-center gap-3">
								<a
									className="badge badge-outline badge-primary inline-flex align-middle rounded-full no-underline font-normal text-xs px-2 py-1 whitespace-nowrap"
									href={url}
									target="_blank"
									rel="noreferrer"
								>
									{id || "Q?"}
								</a>
								<EntityReactionControl entityId={id} />
							</span>
						</span>
					</h3>
					{description ? (
						<p className="text-sm text-base-content/70">{description}</p>
					) : null}
				</div>
				<div className="mt-2 flex items-center gap-2 text-sm text-base-content/70 flex-wrap">
					{seasonInfo ? (
						<span className={`badge align-middle text-xs ${seasonInfo.badgeClass}`}>
							{seasonInfo.label}
						</span>
					) : null}
					<span>
						開始: {formatDate(startDate) ?? "N/A"}
						{endDate ? ` / 終了: ${formatDate(endDate)}` : ""}
					</span>
				</div>
				<WorkEntityRow label="キャスト" entities={voiceActors} buildPath={buildCastLink} showRole />
				<WorkEntityRow label="制作会社" entities={productionCompanies} buildPath={buildCompanyLink} />
				<WorkEntityRow label="監督" entities={directors} buildPath={buildStaffLink} />
				<WorkEntityRow label="脚本" entities={screenwriters} buildPath={buildStaffLink} />
				<WorkEntityRow label="作曲" entities={composers} buildPath={buildStaffLink} />
			</div>
		</li>
	);
});

export default WorkCard;
