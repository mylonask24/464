document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status');
  const period = document.getElementById('period');
  const coverage = document.getElementById('coverage');
  const method = document.getElementById('method');
  const yearSlider = document.getElementById('yearSlider');
  const summaryYear = document.getElementById('summaryYear');
  const incidentCount = document.getElementById('incidentCount');
  const yearTotal = document.getElementById('yearTotal');
  const cumulativeTotal = document.getElementById('cumulativeTotal');
  const addressSearchForm = document.getElementById('addressSearchForm');
  const addressInput = document.getElementById('addressInput');
  const addressSearchButton = document.getElementById('addressSearchButton');
  const addressSearchStatus = document.getElementById('addressSearchStatus');
  const fireMap = document.getElementById('fireMap');
  const geocodeCache = new Map();
  let mapReady = false;
  let pendingLocation = null;
  let lastGeocodeRequestAt = 0;

  const moveMapToLocation = location => {
    if (!fireMap?.contentWindow) {
      return;
    }

    fireMap.contentWindow.postMessage({
      type: 'geocode-result',
      lat: location.lat,
      lon: location.lon,
      zoom: 14
    }, '*');
  };

  if (fireMap) {
    fireMap.addEventListener('load', () => {
      mapReady = true;
      if (pendingLocation) {
        moveMapToLocation(pendingLocation);
        pendingLocation = null;
      }
    });
  }

  if (addressSearchForm && addressInput && addressSearchButton && addressSearchStatus) {
    addressSearchForm.addEventListener('submit', async event => {
      event.preventDefault();
      const query = addressInput.value.trim();
      if (!query) {
        addressSearchStatus.textContent = 'Enter an address in Greece to search.';
        addressInput.focus();
        return;
      }

      const cacheKey = query.toLocaleLowerCase();
      let location = geocodeCache.get(cacheKey);
      addressSearchButton.disabled = true;
      addressSearchStatus.textContent = 'Searching for the address in Greece...';
      addressSearchStatus.dataset.state = 'loading';

      try {
        if (!location) {
          const delay = Math.max(0, 1000 - (Date.now() - lastGeocodeRequestAt));
          if (delay) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          const endpoint = addressSearchForm.dataset.geocoderEndpoint;
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
            addressSearchStatus.textContent = 'No matching address found in Greece. Try adding a city or postal code.';
            addressSearchStatus.dataset.state = 'error';
            return;
          }

          const result = results[0];
          const lat = Number(result.lat);
          const lon = Number(result.lon);
          if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
            throw new Error('The address service returned invalid coordinates.');
          }

          location = { lat, lon, label: result.display_name || query };
          geocodeCache.set(cacheKey, location);
        }

        if (mapReady) {
          moveMapToLocation(location);
        } else {
          pendingLocation = location;
        }
        addressSearchStatus.textContent = `Map moved to: ${location.label}`;
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

  if (status) {
    status.textContent = 'Approximate municipality-level map • 302 of 303 municipality names mapped';
  }

  if (period) {
    period.textContent = '2014–2018';
  }

  if (coverage) {
    coverage.textContent = '302 of 303 municipality names mapped';
  }

  if (method) {
    method.textContent = 'GeoBoundaries crosswalk + burned area totals';
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

      const updateSummary = () => {
        const year = Number(yearSlider.value);
        const record = data.find(item => Number(item.year) === year) || data[data.length - 1];

        if (!record) {
          return;
        }

        if (summaryYear) summaryYear.textContent = record.year;
        if (incidentCount) incidentCount.textContent = numberFormat.format(record.incident_count);
        if (yearTotal) yearTotal.textContent = formatArea(record.total_burned_ha);
        if (cumulativeTotal) cumulativeTotal.textContent = formatArea(record.cumulative_burned_ha);
      };

      yearSlider.min = Math.min(...data.map(item => Number(item.year)));
      yearSlider.max = Math.max(...data.map(item => Number(item.year)));
      yearSlider.value = String(Math.max(...data.map(item => Number(item.year))));
      yearSlider.addEventListener('input', updateSummary);
      updateSummary();
    } catch (error) {
      console.error(error);
      if (summaryYear) summaryYear.textContent = 'N/A';
      if (incidentCount) incidentCount.textContent = '—';
      if (yearTotal) yearTotal.textContent = '—';
      if (cumulativeTotal) cumulativeTotal.textContent = '—';
    }
  }

  loadYearlyData();
});
