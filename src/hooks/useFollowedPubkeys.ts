import { useContext } from "react";
import { FollowedPubkeysContext } from "../providers/followedPubkeysContext";

function useFollowedPubkeys() {
	const value = useContext(FollowedPubkeysContext);
	if (!value) {
		throw new Error("FollowedPubkeysProvider is missing in the component tree.");
	}
	return value;
}

export default useFollowedPubkeys;
