import { createContext } from "react";

export type Nip07Session = {
	pubkey: string;
};

export type Nip07AuthValue = {
	session: Nip07Session | null;
	isLoggingIn: boolean;
	error: string | null;
	login: () => Promise<void>;
	logout: () => void;
	clearError: () => void;
};

export const Nip07AuthContext = createContext<Nip07AuthValue | null>(null);
