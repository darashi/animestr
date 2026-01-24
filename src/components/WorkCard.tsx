import { estimateSeason, formatDate } from "../lib/season";
import useWorkReactions from "../hooks/useWorkReactions";
import ReactionAvatarList from "./ReactionAvatarList";
import CompactEntity from "./CompactEntity";

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

function WorkCard({
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
}: WorkCardProps) {
	const seasonInfo = estimateSeason(startDate, endDate);
	const { reactions } = useWorkReactions(id);
	const shownVoiceActors = voiceActors.slice(0, 6);
	const hasMoreVoiceActors = voiceActors.length > shownVoiceActors.length;
	const shownCompanies = productionCompanies.slice(0, 4);
	const hasMoreCompanies = productionCompanies.length > shownCompanies.length;
	const shownDirectors = directors.slice(0, 2);
	const shownScreenwriters = screenwriters.slice(0, 2);
	const shownComposers = composers.slice(0, 2);
	const renderEntities = (label: string, entities: { id: string; name: string }[], hasMore = false) => {
		if (entities.length === 0) return null;
		return (
			<div className="flex flex-wrap items-center gap-2 text-sm text-base-content/70">
				<span className="font-semibold text-base-content">{label}:</span>
				<div className="flex flex-wrap items-center gap-2">
					{entities.map((entity) => (
						<CompactEntity key={entity.id || entity.name} id={entity.id} name={entity.name} />
					))}
					{hasMore ? <span className="text-xs text-base-content/60">ほか</span> : null}
				</div>
			</div>
		);
	};
	return (
		<li className="card bg-base-100 shadow-sm border border-base-200">
			<div className="card-body">
				<h3 className="card-title text-base leading-tight">
					<span className="break-words">
						{title}
						<a
							className="badge badge-outline badge-primary inline-flex align-middle rounded-full no-underline font-normal text-xs px-2 py-1 ml-2 whitespace-nowrap"
							href={url}
							target="_blank"
							rel="noreferrer"
						>
							{id || "Q?"}
						</a>
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
				{renderEntities("声優", shownVoiceActors, hasMoreVoiceActors)}
				{renderEntities("制作会社", shownCompanies, hasMoreCompanies)}
				{renderEntities("監督", shownDirectors)}
				{renderEntities("脚本", shownScreenwriters)}
				{renderEntities("作曲", shownComposers)}
				{reactions.length > 0 ? (
					<div className="mt-1">
						<ReactionAvatarList reactions={reactions} />
					</div>
				) : null}
			</div>
		</li>
	);
}

export default WorkCard;
