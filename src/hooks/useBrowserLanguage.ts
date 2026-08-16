import { useMemo } from "react";

const DEFAULT_LANGUAGE = "ja";

function normalizeLanguage(value?: string) {
	return value?.slice(0, 2).toLowerCase() || DEFAULT_LANGUAGE;
}

function useBrowserLanguage() {
	return useMemo(() => {
		if (typeof navigator === "undefined") return DEFAULT_LANGUAGE;
		return normalizeLanguage(navigator.language || navigator.languages?.[0]);
	}, []);
}

export default useBrowserLanguage;
