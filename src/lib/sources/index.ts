// Source handling module
// Fetches, parses, and distills insights from external source links

export { fetchSource, fetchSources, type FetchedSource, type FetchSourceOptions } from "./fetch-source";
export { parseSource, parseSources, type SourceSummary } from "./source-parser-agent";
export { distillSourceInsights, toExtractedInsights, type DistilledInsight } from "./source-supervisor-agent";
