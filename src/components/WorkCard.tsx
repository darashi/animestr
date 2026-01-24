import { forwardRef } from "react";
import { estimateSeason, formatDate } from "../lib/season";
import useWorkReactions from "../hooks/useWorkReactions";
import CompactEntity from "./CompactEntity";
import LinkedUserAvatar from "./LinkedUserAvatar";

type WorkCardProps = {
	title: string;
	id: string;
	startDate?: string;
	endDate?: string;
	url: string;
	voiceActors: { id: string; name: string }[];
	productionCompanies: { id: string; name: string }[];
	directors: { id: string; name: string }[];
	screenwriters: { id: string; name: string }[];
	composers: { id: string; name: string }[];
};

const WorkCard = forwardRef<HTMLLIElement, WorkCardProps>(function WorkCard(
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
	const shownVoiceActors = voiceActors;
	const shownCompanies = productionCompanies;
	const shownDirectors = directors;
	const shownScreenwriters = screenwriters;
	const shownComposers = composers;
	const basePath = import.meta.env.BASE_URL ?? "/";
	const buildCastLink = (entityId: string) => {
		if (!entityId) return "";
		const trimmed = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
		return `${trimmed}/casts/${entityId}`;
	};
	const buildStaffLink = (entityId: string) => {
		if (!entityId) return "";
		const trimmed = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
		return `${trimmed}/staffs/${entityId}`;
	};
	const buildCompanyLink = (entityId: string) => {
		if (!entityId) return "";
		const trimmed = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
		return `${trimmed}/companies/${entityId}`;
	};
	const renderEntities = (
		label: string,
		entities: { id: string; name: string }[],
		buildLinkPath?: (id: string) => string,
	) => {
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
							linkPath={buildLinkPath ? buildLinkPath(entity.id) : undefined}
						/>
					))}
				</div>
			</div>
		);
	};
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
							{reactions.length > 0 ? (
								<span className="flex -space-x-2">
									{reactions.slice(0, 5).map((reaction) => (
										<LinkedUserAvatar
											key={reaction.id}
											pubkey={reaction.pubkey}
											sizeClassName="w-6 h-6"
										/>
									))}
								</span>
							) : null}
						</span>
					</span>
				</h3>
				<div className="flex items-center gap-2 text-sm text-base-content/70 flex-wrap">
					{seasonInfo ? (
						<span className={`badge align-middle text-xs ${seasonInfo.badgeClass}`}>{seasonInfo.label}</span>
					) : null}
					<span>
						開始: {formatDate(startDate) ?? "N/A"}
						{endDate ? ` / 終了: ${formatDate(endDate)}` : ""}
					</span>
				</div>
				{renderEntities("キャスト", shownVoiceActors, buildCastLink)}
				{renderEntities("制作会社", shownCompanies, buildCompanyLink)}
				{renderEntities("監督", shownDirectors, buildStaffLink)}
				{renderEntities("脚本", shownScreenwriters, buildStaffLink)}
				{renderEntities("作曲", shownComposers, buildStaffLink)}
			</div>
		</li>
	);
});

export default WorkCard;
