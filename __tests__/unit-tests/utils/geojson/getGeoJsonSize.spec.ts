import { getGeoJsonSize } from '@utils/geojson/generateGeoJson';

describe('getGeoJsonSize', () => {
  const geoJson = [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] } },
  ];
  const expectedBytes = new TextEncoder().encode(
    JSON.stringify(geoJson)
  ).length;

  it('returns the JSON size in bytes', () => {
    expect(getGeoJsonSize(geoJson, 'Bytes')).toBe(expectedBytes);
  });

  it('returns the JSON size in kilobytes', () => {
    expect(getGeoJsonSize(geoJson, 'KB')).toBeCloseTo(expectedBytes / 1024, 3);
  });

  it('returns undefined for unknown size types', () => {
    expect(getGeoJsonSize(geoJson, 'MB')).toBeUndefined();
  });
});
