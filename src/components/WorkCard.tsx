import { forwardRef } from "react";
import { estimateSeason, formatDate } from "../lib/season";
import { buildCastPath, buildCompanyPath, buildStaffPath } from "../lib/routes";
import useWorkReactions from "../hooks/useWorkReactions";
import type { Work, WorkEntity } from "../types/work";
import CompactEntity from "./CompactEntity";
import ReactionAvatarStack from "./ReactionAvatarStack";

type EntityRowProps = {
	label: string;
	entities: (WorkEntity & { role?: string })[];
	buildPath: (id: string) => string;
	showRole?: boolean;
};

function EntityRow({ label, entities, buildPath, showRole = false }: EntityRowProps) {
	if (entities.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-2 text-sm text-base-content/70">
			<span className="font-semibold text-base-content">{label}:</span>
			<div className="flex flex-wrap items-center gap-4">
				{entities.map((entity) => (
					<CompactEntity
						key={entity.id || entity.name}
						id={entity.id}
						name={entity.name}
						linkPath={buildPath(entity.id)}
						suffix={showRole ? entity.role : undefined}
					/>
				))}
			</div>
		</div>
	);
}

const WorkCard = forwardRef<HTMLLIElement, Work>(function WorkCard(
	{
		title,
		id,
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
	const { reactions } = useWorkReactions(id);
	const basePath = import.meta.env.BASE_URL ?? "/";
	const buildCastLink = (entityId: string) => buildCastPath(basePath, entityId);
	const buildStaffLink = (entityId: string) => buildStaffPath(basePath, entityId);
	const buildCompanyLink = (entityId: string) => buildCompanyPath(basePath, entityId);
	return (
		<li ref={ref} data-work-id={id} className="card bg-base-100 shadow-sm border border-base-200">
			<div className="card-body">
				<h3 className="card-title text-base leading-tight">
					<span className="flex flex-wrap items-center gap-2 break-words">
						{title}
						<span className="inline-flex items-center gap-2">
							<a
								className="badge badge-outline badge-primary inline-flex align-middle rounded-full no-underline font-normal text-xs px-2 py-1 whitespace-nowrap"
								href={url}
								target="_blank"
								rel="noreferrer"
							>
								{id || "Q?"}
							</a>
							<ReactionAvatarStack reactions={reactions} />
						</span>
					</span>
				</h3>
				<div className="flex items-center gap-2 text-sm text-base-content/70 flex-wrap">
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
				<EntityRow label="キャスト" entities={voiceActors} buildPath={buildCastLink} showRole />
				<EntityRow label="制作会社" entities={productionCompanies} buildPath={buildCompanyLink} />
				<EntityRow label="監督" entities={directors} buildPath={buildStaffLink} />
				<EntityRow label="脚本" entities={screenwriters} buildPath={buildStaffLink} />
				<EntityRow label="作曲" entities={composers} buildPath={buildStaffLink} />
			</div>
		</li>
	);
});

export default WorkCard;
