import { useCallback, useMemo, useState, type ReactNode } from "react";
import { requestNip07PublicKey } from "../lib/nip07";
import { normalizePubkey } from "../lib/nostr";
import {
	Nip07AuthContext,
	type Nip07Session,
} from "./nip07AuthContext";

const AUTH_STORAGE_KEY = "animestr.auth";

function readStoredSession(): Nip07Session | null {
	try {
		const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<Nip07Session>;
		const pubkey = typeof parsed.pubkey === "string"
			? normalizePubkey(parsed.pubkey)
			: null;
		if (!pubkey) {
			window.localStorage.removeItem(AUTH_STORAGE_KEY);
			return null;
		}
		return { pubkey };
	} catch (error) {
		console.error("Failed to load Nostr auth state", error);
		return null;
	}
}

function persistSession(session: Nip07Session | null) {
	try {
		if (session) {
			window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
		} else {
			window.localStorage.removeItem(AUTH_STORAGE_KEY);
		}
	} catch (error) {
		console.error("Failed to persist Nostr auth state", error);
	}
}

function Nip07AuthProvider({ children }: { children: ReactNode }) {
	const [session, setSession] = useState<Nip07Session | null>(readStoredSession);
	const [isLoggingIn, setIsLoggingIn] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const login = useCallback(async () => {
		if (isLoggingIn) return;
		setIsLoggingIn(true);
		setError(null);
		try {
			const nextSession = { pubkey: await requestNip07PublicKey() };
			setSession(nextSession);
			persistSession(nextSession);
		} catch (loginError) {
			console.error("Failed to log in with NIP-07", loginError);
			setError(
				loginError instanceof Error
					? loginError.message
					: "Unable to log in with a NIP-07 Nostr signer.",
			);
		} finally {
			setIsLoggingIn(false);
		}
	}, [isLoggingIn]);

	const logout = useCallback(() => {
		setSession(null);
		setError(null);
		persistSession(null);
	}, []);

	const clearError = useCallback(() => setError(null), []);
	const value = useMemo(
		() => ({ session, isLoggingIn, error, login, logout, clearError }),
		[clearError, error, isLoggingIn, login, logout, session],
	);

	return (
		<Nip07AuthContext.Provider value={value}>
			{children}
		</Nip07AuthContext.Provider>
	);
}

export default Nip07AuthProvider;
