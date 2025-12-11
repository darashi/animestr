import { estimateSeason, formatDate } from "../lib/season";

type WorkCardProps = {
	title: string;
	id: string;
	startDate?: string;
	endDate?: string;
	url: string;
};

function WorkCard({ title, id, startDate, endDate, url }: WorkCardProps) {
	const seasonInfo = estimateSeason(startDate, endDate);
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
				<div className="text-sm text-base-content/70">
					{seasonInfo && (
						<span className={`badge align-middle text-xs mr-2 ${seasonInfo.badgeClass}`}>
							{seasonInfo.label}
						</span>
					)}
					開始: {formatDate(startDate) ?? "N/A"}
					{endDate ? ` / 終了: ${formatDate(endDate)}` : ""}
				</div>
			</div>
		</li>
	);
}

export default WorkCard;
