# Data Sources

## Forest-fire incident records

- Dataset: `Λίστα Δασικών Πυρκαγιών` (List of Forest Fires), published through Greece's data.gov.gr portal.
- Local files: `mcp_forest_fires-f2bzgog3/export_mcp_forest_fires.csv` and its `datapackage.json` metadata.
- Dataset page: https://new.data.gov.gr/dataset/363b7676-1604-438e-a5ee-545c29d15caf
- CSV source: https://new.data.gov.gr/dataset/363b7676-1604-438e-a5ee-545c29d15caf/resource/3676d1d4-14e4-4758-a5c1-ac6279afe7d3/download/export_mcp_forest_fires.csv
- The package metadata also lists resource `92018a96-bea9-49df-82a2-7eafc39a82d1` for the same CSV filename.
- The records inspected here cover 2014-01-02 through 2018-12-31. The file has 43,571 incident rows and area fields in hectares.
- The dataset contains Greek administrative/place names and no latitude/longitude or fire-perimeter geometry. Its area fields describe reported burned area by land-cover category; they are not polygon measurements made in this project.
- Dataset metadata describes the records as fire-service incident forms processed into statistical reports. Check the source portal for current reuse terms and attribution requirements.

## Municipality boundaries used for approximate map locations

- Dataset: geoBoundaries Greece ADM3 simplified boundaries (`326` units; boundary year represented: `2010`).
- Local file: `geoBoundaries-GRC-ADM3-simplified.geojson`.
- Metadata: https://www.geoboundaries.org/api/current/gbOpen/GRC/ADM3/
- Download: https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/GRC/ADM3/geoBoundaries-GRC-ADM3_simplified.geojson
- License: CC0 1.0 Universal (public domain dedication), as reported by geoBoundaries metadata.
- The layer's Latin-script names do not exactly match every Greek municipality name in the incident records. Any joined locations must be reviewed and unmatched records reported; polygon representative points are municipality-level approximations, not fire coordinates.

## Broad administrative boundaries

- Dataset: geoBoundaries Greece ADM2 simplified boundaries (`14` units; boundary year represented: `2016`).
- Local file: `geoBoundaries-GRC-ADM2-simplified.geojson`.
- Metadata: https://www.geoboundaries.org/api/current/gbOpen/GRC/ADM2/
- Download: https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/GRC/ADM2/geoBoundaries-GRC-ADM2_simplified.geojson
- License: Creative Commons Attribution 4.0 International (CC BY 4.0), as reported by geoBoundaries metadata.
- Attribution: geoBoundaries; boundary source credited in its metadata to EuroGeoGraphics, Regional IM Working Group - Europe.

Accessed 2026-10-07. Preserve this file with the project when sharing the maps so the source, boundary vintage, and limitations remain clear.
