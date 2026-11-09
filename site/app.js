document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status');
  const period = document.getElementById('period');
  const coverage = document.getElementById('coverage');
  const method = document.getElementById('method');
  const yearSlider = document.getElementById('yearSlider');
  const summaryYear = document.getElementById('summaryYear');
  const fireCount = document.getElementById('fireCount');
  const fireCountLabel = document.getElementById('fireCountLabel');
  const yearTotal = document.getElementById('yearTotal');
  const yearTotalLabel = document.getElementById('yearTotalLabel');
  const cumulativeTotal = document.getElementById('cumulativeTotal');
  const cumulativeTotalLabel = document.getElementById('cumulativeTotalLabel');
  const mapHeading = document.getElementById('mapHeading');
  const addressSearchForm = document.getElementById('addressSearchForm');
  const addressInput = document.getElementById('addressInput');
  const addressSearchButton = document.getElementById('addressSearchButton');
  const addressSearchStatus = document.getElementById('addressSearchStatus');
  const fireMap = document.getElementById('fireMap');
  const resetMapButton = document.getElementById('resetMapButton');
  const mapResetStatus = document.getElementById('mapResetStatus');
  const comparisonForm = document.getElementById('comparisonForm');
  const comparisonAddressA = document.getElementById('comparisonAddressA');
  const comparisonAddressB = document.getElementById('comparisonAddressB');
  const comparisonButton = document.getElementById('comparisonButton');
  const clearComparisonButton = document.getElementById('clearComparisonButton');
  const comparisonStatus = document.getElementById('comparisonStatus');
  const comparisonResults = document.getElementById('comparisonResults');
  const comparisonStatusDefault = 'Address searches go to OpenStreetMap Nominatim. Do not enter sensitive personal information.';
  const geocodeCache = new Map();
  const comparisonRequests = new Map();
  const nearbyRequests = new Map();
  let mapReady = false;
  let pendingMapYear = null;
  let lastGeocodeRequestAt = 0;
  let comparisonRequestNumber = 0;
  let activeComparison = 0;

  if (fireMap) {
    fireMap.addEventListener('load', () => {
      mapReady = true;
      if (pendingMapYear !== null) {
        fireMap.contentWindow.postMessage({
          type: 'selected-year',
          year: pendingMapYear
        }, '*');
      }
    });
  }

  function showMapYear(year) {
    if (mapHeading) {
      mapHeading.textContent = year === 'all'
        ? 'Satellite-mapped burned areas (all years, 2006–2026)'
        : `Satellite-mapped burned areas (${year})`;
    }
    if (mapReady && fireMap?.contentWindow) {
      fireMap.contentWindow.postMessage({ type: 'selected-year', year }, '*');
    } else {
      pendingMapYear = year;
    }
  }

  if (resetMapButton && mapResetStatus) {
    resetMapButton.addEventListener('click', async () => {
      try {
        await waitForMap();
        fireMap.contentWindow.postMessage({ type: 'reset-map-view' }, '*');
        mapResetStatus.textContent = 'Map view reset to Greece.';
      } catch (error) {
        console.error(error);
        mapResetStatus.textContent = 'The map is not available. Please try again shortly.';
      }
    });
  }

  async function geocodeAddress(query) {
    const cacheKey = query.toLocaleLowerCase();
    let location = geocodeCache.get(cacheKey);
    if (location) {
      return location;
    }

    const delay = Math.max(0, 1000 - (Date.now() - lastGeocodeRequestAt));
    if (delay) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const endpoint = addressSearchForm?.dataset.geocoderEndpoint
      || comparisonForm?.dataset.geocoderEndpoint;
    if (!endpoint) {
      throw new Error('Address search is not configured.');
    }
    const url = new URL(endpoint);
    url.search = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'gr'
    });

    lastGeocodeRequestAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`Address service returned HTTP ${response.status}.`);
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const result = results[0];
    const lat = Number(result.lat);
    const lon = Number(result.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      throw new Error('The address service returned invalid coordinates.');
    }

    location = { lat, lon, label: result.display_name || query };
    geocodeCache.set(cacheKey, location);
    return location;
  }

  function waitForMap() {
    if (mapReady) {
      return Promise.resolve();
    }
    if (!fireMap) {
      return Promise.reject(new Error('The map is not available.'));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        fireMap.removeEventListener('load', onLoad);
        reject(new Error('The map did not finish loading.'));
      }, 15000);
      const onLoad = () => {
        clearTimeout(timeout);
        resolve();
      };
      fireMap.addEventListener('load', onLoad, { once: true });
    });
  }

  function requestMunicipalityComparison(locations) {
    return waitForMap().then(() => new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${++comparisonRequestNumber}`;
      const timeout = setTimeout(() => {
        comparisonRequests.delete(requestId);
        reject(new Error('The map did not return comparison and nearby-perimeter data.'));
      }, 30000);

      comparisonRequests.set(requestId, result => {
        clearTimeout(timeout);
        resolve(result);
      });
      fireMap.contentWindow.postMessage({
        type: 'compare-locations',
        requestId,
        locations: locations.map(({ lat, lon, label }) => ({ lat, lon, label }))
      }, '*');
    }));
  }

  function requestNearbyPerimeters(location) {
    return waitForMap().then(() => new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${++comparisonRequestNumber}`;
      const timeout = setTimeout(() => {
        nearbyRequests.delete(requestId);
        reject(new Error('The map did not return nearby perimeter data.'));
      }, 30000);

      nearbyRequests.set(requestId, result => {
        clearTimeout(timeout);
        if (result.error) {
          reject(new Error('Unable to find nearby EFFIS perimeters.'));
          return;
        }
        resolve(result.nearby);
      });
      fireMap.contentWindow.postMessage({
        type: 'find-nearby-perimeters',
        requestId,
        location: { lat: location.lat, lon: location.lon, label: location.label }
      }, '*');
    }));
  }

  window.addEventListener('message', event => {
    if (!fireMap || event.source !== fireMap.contentWindow) {
      return;
    }
    const data = event.data;
    if (!data) {
      return;
    }

    if (data.type === 'selected-year-result') {
      const allYearsSelected = Number(yearSlider?.value) === Number(yearSlider?.max);
      if (allYearsSelected ? data.year !== 'all' : Number(data.year) !== Number(yearSlider?.value)) {
        return;
      }
      if (status) {
        status.textContent = data.error
          ? `Unable to load EFFIS perimeters for ${data.year === 'all' ? 'all years' : data.year}.`
          : `${data.year === 'all' ? '2006–2026' : data.year}: ${new Intl.NumberFormat('en-US').format(data.count)} satellite-mapped perimeters; municipality shading updated`;
      }
      if (allYearsSelected && !data.error && cumulativeTotal && cumulativeTotalLabel) {
        cumulativeTotalLabel.textContent = 'Perimeters shown on map';
        cumulativeTotal.textContent = new Intl.NumberFormat('en-US').format(data.count);
      }
      return;
    }

    if (data.type === 'nearby-perimeters-result' && nearbyRequests.has(data.requestId)) {
      const resolve = nearbyRequests.get(data.requestId);
      nearbyRequests.delete(data.requestId);
      resolve(data);
      return;
    }

    if (data.type !== 'comparison-result' || !comparisonRequests.has(data.requestId)) {
      return;
    }

    const resolve = comparisonRequests.get(data.requestId);
    comparisonRequests.delete(data.requestId);
    resolve(data);
  });

  if (addressSearchForm && addressInput && addressSearchButton && addressSearchStatus) {
    addressSearchForm.addEventListener('submit', async event => {
      event.preventDefault();
      const query = addressInput.value.trim();
      if (!query) {
        addressSearchStatus.textContent = 'Enter an address in Greece to search.';
        addressInput.focus();
        return;
      }

      addressSearchButton.disabled = true;
      addressSearchStatus.textContent = 'Searching for the address in Greece...';
      addressSearchStatus.dataset.state = 'loading';

      try {
        const location = await geocodeAddress(query);
        if (!location) {
          addressSearchStatus.textContent = 'No matching address found in Greece. Try adding a city or postal code.';
          addressSearchStatus.dataset.state = 'error';
          return;
        }

        const nearby = await requestNearbyPerimeters(location);
        addressSearchStatus.textContent = nearby.length
          ? `Map moved to: ${location.label}. The popup shows the ${nearby.length} closest mapped perimeter${nearby.length === 1 ? '' : 's'} across all years.`
          : `Map moved to: ${location.label}. No mapped EFFIS perimeters were found.`;
        addressSearchStatus.dataset.state = 'success';
      } catch (error) {
        if (error.name === 'AbortError') {
          addressSearchStatus.textContent = 'Address search timed out. Please try again.';
        } else {
          addressSearchStatus.textContent = 'Address search is temporarily unavailable. Please try again shortly.';
        }
        addressSearchStatus.dataset.state = 'error';
      } finally {
        addressSearchButton.disabled = false;
      }
    });
  }

  if (
    comparisonForm && comparisonAddressA && comparisonAddressB
    && comparisonButton && clearComparisonButton && comparisonStatus && comparisonResults
  ) {
    clearComparisonButton.addEventListener('click', () => {
      activeComparison += 1;
      comparisonAddressA.value = '';
      comparisonAddressB.value = '';
      comparisonResults.hidden = true;
      document.getElementById('comparisonLabelA').textContent = 'First address';
      document.getElementById('comparisonLabelB').textContent = 'Second address';
      document.getElementById('comparisonMunicipalityA').textContent = '';
      document.getElementById('comparisonMunicipalityB').textContent = '';
      document.getElementById('comparisonAreaA').textContent = '';
      document.getElementById('comparisonAreaB').textContent = '';
      document.getElementById('comparisonDifference').textContent = '';
      comparisonStatus.textContent = comparisonStatusDefault;
      delete comparisonStatus.dataset.state;
      comparisonButton.disabled = false;
      if (mapReady) {
        fireMap.contentWindow.postMessage({ type: 'clear-comparison-markers' }, '*');
      }
      comparisonAddressA.focus();
    });

    comparisonForm.addEventListener('submit', async event => {
      event.preventDefault();
      const queryA = comparisonAddressA.value.trim();
      const queryB = comparisonAddressB.value.trim();
      if (!queryA || !queryB) {
        comparisonStatus.textContent = 'Enter two addresses in Greece to compare.';
        comparisonStatus.dataset.state = 'error';
        return;
      }

      comparisonButton.disabled = true;
      const requestNumber = ++activeComparison;
      comparisonResults.hidden = true;
      comparisonStatus.textContent = 'Finding both addresses and their municipalities...';
      comparisonStatus.dataset.state = 'loading';

      try {
        const locationA = await geocodeAddress(queryA);
        if (requestNumber !== activeComparison) {
          return;
        }
        if (!locationA) {
          comparisonStatus.textContent = 'The first address was not found in Greece. Try adding a city or postal code.';
          comparisonStatus.dataset.state = 'error';
          return;
        }

        const locationB = await geocodeAddress(queryB);
        if (requestNumber !== activeComparison) {
          return;
        }
        if (!locationB) {
          comparisonStatus.textContent = 'The second address was not found in Greece. Try adding a city or postal code.';
          comparisonStatus.dataset.state = 'error';
          return;
        }

        const comparison = await requestMunicipalityComparison([locationA, locationB]);
        if (requestNumber !== activeComparison) {
          return;
        }
        if (comparison.error) {
          throw new Error('The map could not find nearby EFFIS perimeters.');
        }
        const matches = comparison.matches;
        if (!Array.isArray(matches) || matches.length !== 2 || matches.some(match => !match)) {
          throw new Error('The map returned incomplete municipality data.');
        }
        if (matches.some(match => !match.municipality)) {
          comparisonStatus.textContent = 'Could not match one or both addresses to a municipality boundary.';
          comparisonStatus.dataset.state = 'error';
          return;
        }

        const formatArea = value => `${new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(Number(value))} ha`;
        const areaA = Number(matches[0].totalBurnedHa);
        const areaB = Number(matches[1].totalBurnedHa);
        if (!Number.isFinite(areaA) || !Number.isFinite(areaB)) {
          throw new Error('The map returned invalid burned-area totals.');
        }

        document.getElementById('comparisonLabelA').textContent = locationA.label;
        document.getElementById('comparisonLabelB').textContent = locationB.label;
        document.getElementById('comparisonMunicipalityA').textContent = matches[0].municipality;
        document.getElementById('comparisonMunicipalityB').textContent = matches[1].municipality;
        document.getElementById('comparisonAreaA').textContent = formatArea(areaA);
        document.getElementById('comparisonAreaB').textContent = formatArea(areaB);

        const difference = Math.abs(areaA - areaB);
        const differenceText = difference < 0.005
          ? 'Both municipalities have the same reported burned-area total for 2014–2018.'
          : `${areaA > areaB ? matches[0].municipality : matches[1].municipality} had ${formatArea(difference)} more reported burned area during 2014–2018.`;
        document.getElementById('comparisonDifference').textContent = differenceText;
        comparisonResults.hidden = false;
        comparisonStatus.textContent = comparison.nearby?.some(results => results.length)
          ? 'Comparison complete. Each map popup shows the closest EFFIS mapped perimeters across all years.'
          : 'Comparison complete. No mapped EFFIS perimeters were found near these locations.';
        comparisonStatus.dataset.state = 'success';
      } catch (error) {
        if (requestNumber !== activeComparison) {
          return;
        }
        if (error.name === 'AbortError') {
          comparisonStatus.textContent = 'An address search timed out. Please try again.';
        } else {
          console.error(error);
          comparisonStatus.textContent = 'The comparison is temporarily unavailable. Please try again shortly.';
        }
        comparisonStatus.dataset.state = 'error';
      } finally {
        if (requestNumber === activeComparison) {
          comparisonButton.disabled = false;
        }
      }
    });
  }

  if (period) {
    period.textContent = '2006–2026';
  }

  if (coverage) {
    coverage.textContent = 'EFFIS mapped perimeters';
  }

  if (method) {
    method.textContent = 'Satellite imagery';
  }

  async function loadYearlyData() {
    try {
      const response = await fetch('yearly_fire_summary.json');
      if (!response.ok) {
        throw new Error('Unable to load yearly summary');
      }
      const data = await response.json();
      if (!data.length || !yearSlider) {
        return;
      }

      const numberFormat = new Intl.NumberFormat('en-US');
      const formatArea = value => `${numberFormat.format(Number(value).toFixed(2))} ha`;
      const firstYear = Math.min(...data.map(item => Number(item.year)));
      const lastYear = Math.max(...data.map(item => Number(item.year)));
      const allYearsValue = lastYear + 1;
      const cumulativeRecord = data.find(item => Number(item.year) === lastYear);

      const updateSummary = () => {
        const year = Number(yearSlider.value);
        const allYearsSelected = year === allYearsValue;
        const record = allYearsSelected
          ? cumulativeRecord
          : data.find(item => Number(item.year) === year);

        if (!record) {
          return;
        }

        if (summaryYear) summaryYear.textContent = allYearsSelected
          ? `All years (${firstYear}–${lastYear})`
          : String(record.year);
        yearSlider.setAttribute('aria-valuetext', allYearsSelected
          ? `All years, ${firstYear} through ${lastYear}`
          : String(record.year));
        if (fireCount) {
          const count = allYearsSelected
            ? data.reduce((sum, item) => sum + Number(item.fire_count), 0)
            : Number(record.fire_count);
          fireCount.textContent = numberFormat.format(count);
        }
        if (fireCountLabel) {
          fireCountLabel.textContent = allYearsSelected
            ? 'Annual mapped-fire counts summed'
            : 'Mapped fires';
        }
        if (yearTotal) {
          yearTotal.textContent = formatArea(allYearsSelected
            ? record.cumulative_burned_ha
            : record.total_burned_ha);
        }
        if (yearTotalLabel) {
          yearTotalLabel.textContent = allYearsSelected
            ? `Burned area, ${firstYear}–${lastYear}`
            : 'Burned area in selected year';
        }
        if (cumulativeTotal && cumulativeTotalLabel) {
          cumulativeTotalLabel.textContent = allYearsSelected
            ? 'Perimeters shown on map'
            : 'Cumulative area since 2006';
          cumulativeTotal.textContent = allYearsSelected ? 'Loading…' : formatArea(record.cumulative_burned_ha);
        }
        showMapYear(allYearsSelected ? 'all' : year);
      };

      yearSlider.min = String(firstYear);
      yearSlider.max = String(allYearsValue);
      yearSlider.value = String(lastYear);
      yearSlider.addEventListener('input', updateSummary);
      updateSummary();
    } catch (error) {
      console.error(error);
      if (summaryYear) summaryYear.textContent = 'N/A';
      if (fireCount) fireCount.textContent = '—';
      if (yearTotal) yearTotal.textContent = '—';
      if (cumulativeTotal) cumulativeTotal.textContent = '—';
    }
  }

  loadYearlyData();
});
