import { serializeTrackDocument, trackDocumentV1JsonSchema, type TrackDocumentV1 } from '../domain';

export function exportTrackJson(document: TrackDocumentV1): string {
  return serializeTrackDocument(document);
}

export function exportTrackJsonSchema(): string {
  return `${JSON.stringify(trackDocumentV1JsonSchema, null, 2)}\n`;
}

export const createTrackJson = exportTrackJson;
export const createTrackJsonSchema = exportTrackJsonSchema;
