import { createEmptyTrackDocument } from '../domain';
import { exportTrackPdf } from './trackPdf';

const acceptedAt = '2026-07-30T18:00:00-04:00';

describe('track PDF exporter', () => {
  it('creates a calibrated general-plan PDF blob without element sheets', async () => {
    const blob = await exportTrackPdf(createEmptyTrackDocument(acceptedAt), {
      includeElementSheets: false,
      language: 'es',
    });

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(1_000);
  });
});
