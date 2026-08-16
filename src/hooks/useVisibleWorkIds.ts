import { useCallback, useEffect, useRef, useState, type RefCallback } from "react";

const OBSERVER_OPTIONS: IntersectionObserverInit = {
	root: null,
	rootMargin: "0px 0px 200px 0px",
	threshold: 0.1,
};

function useVisibleWorkIds() {
	const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set());
	const observerRef = useRef<IntersectionObserver | null>(null);
	const workNodesRef = useRef<Map<string, HTMLLIElement>>(new Map());
	const workIdsRef = useRef<WeakMap<Element, string>>(new WeakMap());
	const refCallbacksRef = useRef<Map<string, RefCallback<HTMLLIElement>>>(new Map());

	const setIdVisibility = useCallback((id: string, visible: boolean) => {
		setVisibleIds((current) => {
			if (current.has(id) === visible) return current;

			const next = new Set(current);
			if (visible) {
				next.add(id);
			} else {
				next.delete(id);
			}
			return next;
		});
	}, []);

	useEffect(() => {
		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				const id = workIdsRef.current.get(entry.target);
				if (!id) continue;
				setIdVisibility(id, entry.isIntersecting);
			}
		}, OBSERVER_OPTIONS);

		observerRef.current = observer;
		for (const node of workNodesRef.current.values()) {
			observer.observe(node);
		}

		return () => {
			observer.disconnect();
			if (observerRef.current === observer) {
				observerRef.current = null;
			}
		};
	}, [setIdVisibility]);

	const registerWorkRef = useCallback(
		(id: string): RefCallback<HTMLLIElement> => {
			const existingCallback = refCallbacksRef.current.get(id);
			if (existingCallback) return existingCallback;

			const callback: RefCallback<HTMLLIElement> = (node) => {
				const previousNode = workNodesRef.current.get(id);
				if (previousNode === node) return;

				if (previousNode) {
					observerRef.current?.unobserve(previousNode);
					workIdsRef.current.delete(previousNode);
					setIdVisibility(id, false);
				}

				if (node) {
					workNodesRef.current.set(id, node);
					workIdsRef.current.set(node, id);
					observerRef.current?.observe(node);
					return;
				}

				workNodesRef.current.delete(id);
				setIdVisibility(id, false);
			};

			refCallbacksRef.current.set(id, callback);
			return callback;
		},
		[setIdVisibility],
	);

	return { visibleIds, registerWorkRef };
}

export default useVisibleWorkIds;
