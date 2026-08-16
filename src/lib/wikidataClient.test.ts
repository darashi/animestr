import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWikidataJsonLd } from "./wikidataClient";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("fetchWikidataJsonLd", () => {
	it("returns a parsed JSON-LD document", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('[{"@id":"wd:Q1"}]', {
			status: 200,
			headers: { "content-type": "application/ld+json;charset=utf-8" },
		})));

		await expect(fetchWikidataJsonLd("CONSTRUCT WHERE {}"))
			.resolves.toEqual([{ "@id": "wd:Q1" }]);
	});

	it("rejects a successful response in a different format", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"results":{}}', {
			status: 200,
			headers: { "content-type": "application/sparql-results+json" },
		})));

		await expect(fetchWikidataJsonLd("CONSTRUCT WHERE {}"))
			.rejects.toThrow("Wikidata response was not JSON-LD");
	});

	it("includes the response status in request errors", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Too many requests", {
			status: 429,
			headers: { "content-type": "text/plain" },
		})));

		await expect(fetchWikidataJsonLd("CONSTRUCT WHERE {}"))
			.rejects.toThrow("status 429");
	});
});
