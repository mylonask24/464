# Forest Fires in Greece

## Project description

This project displays Copernicus EFFIS satellite-mapped burned-area perimeters in Greece from 2006 through 2026; the map follows the selected year on the timeline. A separate municipal choropleth colors full municipality boundaries using the selected year's EFFIS area allocated by perimeter overlap. Its final slider stop combines the annual totals and displays all supplied perimeters. The 2026 data is year-to-date and incomplete. The timeline also shows annual national EFFIS estimates. The address search zooms to a location, and the two-address comparison reports fire-service municipality totals for 2014–2018. These totals use a different source and method from the EFFIS perimeters and are not measurements at the addresses.

## Data sources and licenses

- **Wildfire incident records:** [Greece data.gov.gr forest-fire dataset](https://new.data.gov.gr/dataset/363b7676-1604-438e-a5ee-545c29d15caf) ([CSV resource](https://new.data.gov.gr/dataset/363b7676-1604-438e-a5ee-545c29d15caf/resource/3676d1d4-14e4-4758-a5c1-ac6279afe7d3/download/export_mcp_forest_fires.csv)). The dataset page provides the applicable reuse terms; consult it before redistributing the records.
- **Annual satellite-mapped fire estimates:** [Copernicus EFFIS Statistics API for Greece](https://api2.effis.emergency.copernicus.eu/statistics/v2/effis/estimatesbycountry?country=GRC), also available through the [EFFIS Statistics Portal](https://forest-fire.emergency.copernicus.eu/apps/effis.statistics/). The annual series includes mapped-fire counts and burned area in hectares; the 2026 values are partial-year estimates. EFFIS describes the [Rapid Damage Assessment methodology and limitations](https://forest-fire.emergency.copernicus.eu/about-effis/technical-background/rapid-damage-assessment), including satellite detection limits and changes in mapping methods over time. EFFIS content is reusable under [CC BY 4.0](https://forest-fire.emergency.copernicus.eu/about-effis/data-license); attribution is Copernicus EFFIS, with the series accessed November 8, 2026.
- **EFFIS perimeters:** `site/effis_burned_areas.geojson` is an EFFIS/WILDFIRE database GeoJSON export for Greece, covering 2006-01-01 through 2026-11-08 (2,303 perimeters). The supplied geometry uses ETRS89-LAEA Europe (EPSG:3035) and is reprojected in the browser to WGS 84 for mapping. The export includes MODIS, Sentinel-2, and combined-source perimeters; the `map_source` is shown in each map tooltip. The supplied MODIS product generally detects fires around 30 ha or larger; smaller fires may be missed, and perimeters from multiple events may be merged. Dates may not match ignition or extinction dates, and mapped areas can include prescribed or environmental burns. Copyright © European Union, 1995–2026; reuse is authorized with source acknowledgment under the European Commission reuse policy described in [`site/effis_burned_areas_readme.txt`](site/effis_burned_areas_readme.txt). The perimeter feature count is a separate measure from the annual mapped-fire estimate.
- **EFFIS municipality totals:** `site/effis_municipal_yearly.json` apportions each perimeter's reported burned area among intersected geoBoundaries ADM3 municipalities in proportion to the polygon overlap. The map colors each entire municipality by its selected-year or cumulative total, with quantile classes. The municipality layer uses the same boundary geometries as the address comparison, but displays only EFFIS-derived totals. The boundaries represent 2010, and 72 of 2,303 perimeters do not intersect a supplied municipality polygon and are excluded from this municipal layer. Totals can differ from EFFIS national estimates because these data products use different methods and coverage.
- **Municipality boundaries:** [geoBoundaries Greece ADM3 metadata](https://www.geoboundaries.org/api/current/gbOpen/GRC/ADM3/) ([GeoJSON download](https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/GRC/ADM3/geoBoundaries-GRC-ADM3_simplified.geojson)). License: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).

## How to run it

Open `site/index.html` with Live Server in VS Code.

## Not in this iteration

- Fire-service incident records do not include fire geometries; the map therefore uses separate EFFIS satellite-mapped burned-area perimeters, which are approximate and do not represent every incident.
- The address comparison remains based on municipality-level fire-service totals from 2014–2018. It must not be interpreted as comparing the selected year's EFFIS perimeters.
- 302 of the 303 distinct municipality names are matched to the boundary layer (296 distinct boundary labels after aliases are combined). `Δ. ΑΝΩΓΕΙΩΝ` remains unmapped because the supplied ADM3 layer has no corresponding boundary. Another 727 incidents have no municipality value in the source data. Together, these 732 incidents (16,905.53 ha) are not represented on the map but remain included in the overall and yearly totals.

## AI Disclosure

AI tools assisted with project organization, map-development code, and municipality name matching, including completion of the crosswalk in this update. The matches were checked against the available GeoBoundaries labels; Anogeia remains unmapped because the boundary source has no corresponding feature, and incidents without a municipality name cannot be mapped. The data were not generated by AI; EFFIS perimeters are approximate satellite-mapped burned areas, not exact incident locations or a complete inventory. Final choices about the project, data, and presentation are my responsibility.

The tools i used was the chat box here in visual studio code and whatever that entials, i noticed that it uses differet AI models depending on what you ask it. Someimtes it uses chat GPT other times it uses some others. I mostly asked it to help with coding everything because i never coded with python before or visual studio code. The types of questions i would ask it are Specfic carefully thought out questions to achieve specific results. It would return me a lot of different things. For example i asked the chat here to help me a specific map covering a specific data set to portray a silder covering a total area of burnt area. The model returned to me the map and then i would keep asking it to fix specific things to be more attuned to exactly how i want it etc.. Most of the things that came back i accepted since it had to do with coding. I looked it over before accepting to see if it only changed one aspect of the whole code or the whole complete thing. 

## A3 feature: Address search and map zoom

For A3, I added an address-search box that uses the OpenStreetMap Nominatim geocoding API to find an address in Greece and zoom the map to it, so readers can quickly explore a location they're interested in.

The map popup also lists the three closest EFFIS satellite-mapped burned-area perimeters across all available years, with each perimeter's mapped year, distance, mapped area, and source. These are distances to satellite-mapped perimeters, not proof of an individual fire at the address or a complete incident inventory. The same popups appear for both locations in an address comparison.

It has depth because it sends the submitted search to an external geocoding service, receives coordinates for a matching address, zooms the map to it, and finds the closest mapped perimeters using their geographic boundaries.

I know it works when a valid address is found, the map zooms to it, and the marker popup lists the nearest available perimeter years and distances.

It handles an address that cannot be found, an unavailable geocoding service, or unavailable perimeter data by showing a clear message and leaving the map usable.

### A3 feature tests

1. **Search for a valid address in Greece.** Expected: The map zooms to the returned location, and its popup lists up to three closest mapped perimeters with their years and distances.
2. **Search for a different valid address, such as one written in Greek or as a partial address.** Expected: The map zooms to the new matching location. PASS
3. **Search for an invalid or unrecognized address.** Expected: A clear “address not found” message appears, the map does not jump to an unrelated place, and there is no console error. PASS 

## A4 feature: Compare two addresses

The comparison form geocodes two submitted addresses in Greece, identifies the municipality containing each point, and compares each municipality's total reported burned area for 2014–2018. Each address marker also opens a popup listing its three closest EFFIS perimeters across all years. Use **Reset map view** to return the map to its initial Greece-wide center and zoom after panning or zooming. Municipality totals are not burned area at either address, and EFFIS perimeters do not represent every fire. If an address cannot be geocoded or matched to a boundary, the page displays an error instead of showing an unsupported comparison.

### A4 feature tests

1. **Compare addresses in different municipalities.** Expected: Both municipality names and burned-area totals appear, the difference is stated, and each map marker opens its three closest mapped perimeters.
2. **Compare two addresses in the same municipality.** Expected: Both addresses show the same municipality total and the page reports equal values.
3. **Submit an address that cannot be found or matched.** Expected: A clear error appears and no incomplete comparison is shown.

## Pre-flight report (Lab 7)
| Check | Result | What I did |
| --- | --- | --- |
| 1. Cold start | pass | fixed in commit "none" / none |
| 2. Read every label | pass | Checked the header, panel, legend, and municipality popups on the published map; labels were readable and no `undefined`, `null`, `NaN`, or `[object Object]` appeared. |
| 3. Ask twice | pass | Searched for two different locations in Greece; the map zoomed to each location successfully. |
| 4. The edge | pass | Clicking an empty map area opened no popup; searching for Paris, France returned “No addresses in Greece found. Try again”; moving the year slider to its end displayed the cumulative information through the selected year. |
| 5. The data does not come | pass | Blocked `yearly_fire_summary.json` in DevTools and reloaded; the yearly summary displayed N/A/dashes while the rest of the map remained usable. Unblocked the request afterward. |
| 6. On a phone (size view and my phone) | pass | Used Chrome DevTools device mode at about 375 px wide and reloaded; all page content and controls fit on screen. |
| 7. Mouse in my pocket | pass | Used Tab to reach all controls; focus was visible, and Enter/Space activated the focused controls. |
| 8. Accessibility audit | pass | Accessibility audit reported no issues and scored 99. |