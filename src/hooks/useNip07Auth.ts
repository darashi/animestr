import { useContext } from "react";
import { Nip07AuthContext } from "../providers/nip07AuthContext";

function useNip07Auth() {
	const value = useContext(Nip07AuthContext);
	if (!value) throw new Error("Nip07AuthProvider is missing in the component tree.");
	return value;
}

export default useNip07Auth;
