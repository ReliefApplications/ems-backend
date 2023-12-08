/**
 * Get GeoJson array object size in the bytes
 *
 * @param geoJsonData is the array of object of geo json
 * @param sizeType is the which type in you need to return size
 * @returns size of GeoJson array object in bytes or KiloBytes
 */
export const getGeoJsonSize = (geoJsonData, sizeType) => {
  switch (sizeType) {
    case 'Bytes':
      return new TextEncoder().encode(JSON.stringify(geoJsonData)).length;
    case 'KB': //KiloBytes
      return (
        new TextEncoder().encode(JSON.stringify(geoJsonData)).length * 0.000977
      );
  }
};
