import { IconSearch } from "@tabler/icons-react";
import {
	useDeferredValue,
	useEffect,
	useId,
	useRef,
	useState,
	type MouseEvent,
} from "react";
import useBrowserLanguage from "../hooks/useBrowserLanguage";
import useWikidataSearch from "../hooks/useWikidataSearch";
import {
	buildCastPath,
	buildCompanyPath,
	buildStaffPath,
	buildWorkPath,
} from "../lib/routes";
import type {
	AnimestrEntityKind,
	AnimestrSearchResult,
} from "../lib/wikidataSearch";

type SearchBarProps = {
	basePath: string;
	navigate: (path: string) => void;
	className?: string;
};

const ENTITY_KIND_LABELS: Record<AnimestrEntityKind, string> = {
	work: "Work",
	cast: "Cast",
	staff: "Staff",
	company: "Company",
};

function resultPath(basePath: string, result: AnimestrSearchResult): string {
	switch (result.kind) {
		case "work":
			return buildWorkPath(basePath, result.id);
		case "cast":
			return buildCastPath(basePath, result.id);
		case "staff":
			return buildStaffPath(basePath, result.id);
		case "company":
			return buildCompanyPath(basePath, result.id);
	}
}

function isPlainPrimaryClick(event: MouseEvent<HTMLAnchorElement>): boolean {
	return event.button === 0
		&& !event.metaKey
		&& !event.ctrlKey
		&& !event.shiftKey
		&& !event.altKey;
}

function SearchBar({ basePath, navigate, className }: SearchBarProps) {
	const language = useBrowserLanguage();
	const resultsId = `wikidata-search-${useId().replaceAll(":", "")}`;
	const containerRef = useRef<HTMLDivElement>(null);
	const [query, setQuery] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const deferredQuery = useDeferredValue(query);
	const { results, isLoading, error } = useWikidataSearch(
		deferredQuery,
		language,
	);
	const showDropdown = isOpen && query.trim().length > 0;

	useEffect(() => {
		const handlePointerDown = (event: PointerEvent) => {
			if (!(event.target instanceof Node)) return;
			if (!containerRef.current?.contains(event.target)) setIsOpen(false);
		};
		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, []);

	const close = () => {
		setQuery("");
		setIsOpen(false);
	};

	return (
		<div ref={containerRef} className={`relative ${className ?? ""}`}>
			<label className="input input-sm w-full">
				<IconSearch size={16} className="text-base-content/50" />
				<input
					type="search"
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						setIsOpen(true);
					}}
					onFocus={() => setIsOpen(true)}
					onKeyDown={(event) => {
						if (event.key === "Escape") setIsOpen(false);
					}}
					placeholder="Search"
					autoComplete="off"
					role="combobox"
					aria-label="Search anime entities"
					aria-autocomplete="list"
					aria-controls={resultsId}
					aria-expanded={showDropdown}
				/>
			</label>

			{showDropdown ? (
				<div
					id={resultsId}
					className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl"
				>
					{isLoading ? (
						<div className="flex items-center gap-2 px-4 py-3 text-sm text-base-content/70">
							<span className="loading loading-spinner loading-sm" />
							<span>Searching...</span>
						</div>
					) : error ? (
						<div className="px-4 py-3 text-sm text-error">{error}</div>
					) : results.length > 0 ? (
						<ul className="menu menu-sm max-h-[60vh] w-full flex-nowrap overflow-y-auto p-1">
							{results.map((result) => {
								const path = resultPath(basePath, result);
								return (
									<li key={`${result.id}:${result.kind}`}>
										<a
											href={path}
											className="items-start gap-2"
											onClick={(event) => {
												if (!isPlainPrimaryClick(event)) return;
												event.preventDefault();
												close();
												navigate(path);
											}}
										>
											<span className="min-w-0 flex-1">
												<span className="flex items-center gap-2">
													<span className="truncate font-medium">{result.label}</span>
													<span className="badge badge-outline badge-xs shrink-0">
														{result.id}
													</span>
												</span>
												{result.description ? (
													<span className="mt-0.5 line-clamp-2 text-xs text-base-content/60">
														{result.description}
													</span>
												) : null}
											</span>
											<span className="badge badge-ghost badge-sm shrink-0">
												{ENTITY_KIND_LABELS[result.kind]}
											</span>
										</a>
									</li>
								);
							})}
						</ul>
					) : (
						<div className="px-4 py-3 text-sm text-base-content/70">
							No matches found
						</div>
					)}
				</div>
			) : null}
		</div>
	);
}

export default SearchBar;
