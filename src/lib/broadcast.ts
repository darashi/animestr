type HasStartDate = {
	startDate?: string;
};

export function sortByStartDate<T extends HasStartDate>(items: T[], order: "asc" | "desc") {
	return [...items].sort((a, b) =>
		order === "asc"
			? (a.startDate ?? "").localeCompare(b.startDate ?? "")
			: (b.startDate ?? "").localeCompare(a.startDate ?? ""),
	);
}
