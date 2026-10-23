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

  if (status) {
    status.textContent = 'Approximate municipality-level map • reviewed boundary matches only';
  }

  if (period) {
    period.textContent = '2014–2018';
  }

  if (coverage) {
    coverage.textContent = 'Approved municipality matches';
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
