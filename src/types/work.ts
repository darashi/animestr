export type WorkEntity = {
	id: string;
	name: string;
};

export type VoiceActor = WorkEntity & {
	role?: string;
};

export type Work = {
	id: string;
	title: string;
	description?: string;
	startDate?: string;
	endDate?: string;
	url: string;
	voiceActors: VoiceActor[];
	productionCompanies: WorkEntity[];
	directors: WorkEntity[];
	screenwriters: WorkEntity[];
	composers: WorkEntity[];
};

export type WorkDetails = Pick<
	Work,
	"voiceActors" | "productionCompanies" | "directors" | "screenwriters" | "composers"
>;

export function createEmptyWorkDetails(): WorkDetails {
	return {
		voiceActors: [],
		productionCompanies: [],
		directors: [],
		screenwriters: [],
		composers: [],
	};
}
