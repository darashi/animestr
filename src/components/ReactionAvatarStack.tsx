import { IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useFollowedPubkeys from "../hooks/useFollowedPubkeys";
import useNip07Auth from "../hooks/useNip07Auth";
import useProfile from "../hooks/useProfile";
import type { WorkReaction } from "../hooks/useWorkReactions";
import { formatShortPubkey, normalizePubkey } from "../lib/nostr";
import { isLikeReaction, reactionSymbol } from "../lib/reactions";
import {
	classifyReactionAuthor,
	reactionRelationshipPriority,
	type ReactionRelationship,
} from "../lib/reactionRelationships";
import LinkedUserAvatar from "./LinkedUserAvatar";

type ClassifiedReaction = WorkReaction & {
	relationship: ReactionRelationship;
};

type ReactionAvatarStackProps = {
	reactions: WorkReaction[];
	limit?: number;
	sizeClassName?: string;
};

function ReactionAvatarStack({
	reactions,
	limit = 5,
	sizeClassName = "w-6 h-6",
}: ReactionAvatarStackProps) {
	const followedPubkeys = useFollowedPubkeys();
	const { session } = useNip07Auth();
	const viewerPubkey = session?.pubkey ?? null;
	const sortedReactions = useMemo(() => {
		return reactions
			.map((reaction) => {
				const pubkey = normalizePubkey(reaction.pubkey) ?? reaction.pubkey;
				const relationship = classifyReactionAuthor(
					pubkey,
					viewerPubkey,
					followedPubkeys,
				);
				return { ...reaction, pubkey, relationship } as const;
			})
			.sort((a, b) => {
				return reactionRelationshipPriority(a.relationship)
					- reactionRelationshipPriority(b.relationship)
					|| b.createdAt - a.createdAt;
			});
	}, [followedPubkeys, reactions, viewerPubkey]);

	if (reactions.length === 0) return null;
	const visibleReactions = sortedReactions.slice(0, limit);
	const overflowCount = sortedReactions.length - visibleReactions.length;

	return (
		<span className="inline-flex items-center gap-1">
			{visibleReactions.map((reaction) => (
				<LinkedUserAvatar
					key={reaction.id}
					pubkey={reaction.pubkey}
					sizeClassName={sizeClassName}
					relationship={reaction.relationship}
					reactionContent={reaction.content}
				/>
			))}
			{overflowCount > 0 ? (
				<ReactionOverflow reactions={sortedReactions} count={overflowCount} />
			) : null}
		</span>
	);
}

type ReactionOverflowProps = {
	reactions: ClassifiedReaction[];
	count: number;
};

function ReactionOverflow({ reactions, count }: ReactionOverflowProps) {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const closeOnOutsideClick = (event: PointerEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
		};
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsOpen(false);
		};
		document.addEventListener("pointerdown", closeOnOutsideClick);
		document.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("pointerdown", closeOnOutsideClick);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [isOpen]);

	return (
		<span ref={containerRef} className="relative inline-flex">
			<button
				type="button"
				className="btn btn-ghost btn-circle btn-xs text-[10px] text-base-content/60"
				onClick={() => setIsOpen((current) => !current)}
				aria-label={`Show all ${reactions.length} reactions`}
				aria-expanded={isOpen}
			>
				+{count}
			</button>
			{isOpen ? (
				<span
					className="fixed inset-x-4 bottom-4 z-50 max-h-80 overflow-y-auto rounded-box border border-base-300 bg-base-100 p-3 shadow-xl sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64"
					role="dialog"
					aria-label="All reactions"
				>
					<span className="flex items-center justify-between gap-2">
						<span className="font-semibold text-base-content">All reactions</span>
						<button
							type="button"
							className="btn btn-ghost btn-circle btn-xs"
							onClick={() => setIsOpen(false)}
							aria-label="Close"
						>
							<IconX size={14} />
						</button>
					</span>
					<span className="mt-2 grid gap-2">
						{reactions.map((reaction) => (
							<ReactionDetail key={reaction.id} reaction={reaction} />
						))}
					</span>
				</span>
			) : null}
		</span>
	);
}

function ReactionDetail({ reaction }: { reaction: ClassifiedReaction }) {
	const { name } = useProfile(reaction.pubkey);
	const displayName = reaction.relationship === "self"
		? "You"
		: name ?? formatShortPubkey(reaction.pubkey);

	return (
		<span className="flex items-center gap-2 text-xs">
			<LinkedUserAvatar
				pubkey={reaction.pubkey}
				sizeClassName="w-7 h-7"
				relationship={reaction.relationship}
				reactionContent={reaction.content}
			/>
			<span className="min-w-0 flex-1">
				<span className="block truncate text-base-content">{displayName}</span>
				{reaction.relationship === "followed" ? (
					<span className="badge badge-secondary badge-soft badge-xs">Following</span>
				) : null}
			</span>
			<span
				className={`text-base ${isLikeReaction(reaction.content) ? "font-bold text-primary" : ""}`}
				aria-hidden="true"
			>
				{reactionSymbol(reaction.content)}
			</span>
		</span>
	);
}

export default ReactionAvatarStack;
