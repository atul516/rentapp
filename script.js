const API_URL = 'https://script.google.com/macros/s/AKfycbzlkTA16Z-vntj0ERKb46opOjz4nPux3rG4w3ZUdsqd_elm0b8n8Z66CWQU78L4m6gNeQ/exec';

document.addEventListener('DOMContentLoaded', () => {
  loadFlats();
});

function showLoader() {
  document.getElementById('global-loader').style.display = 'flex';
}
function hideLoader() {
  document.getElementById('global-loader').style.display = 'none';
}

function postData(data) {
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, val]) => params.append(key, val));
  return fetch(API_URL, {
    method: 'POST',
    body: params
  }).then(res => {
    if (!res.ok) {
      return res.text().then(text => {
        throw new Error(text || 'Request failed with status ' + res.status);
      });
    }
    return res;
  });
}

function toggleSection(header) {
  const section = header.parentElement;
  section.classList.toggle('collapsed');
}

function loadFlats() {
  showLoader();
  fetch(`${API_URL}?action=get_flats`)
    .then(res => {
      if (!res.ok) throw new Error("Failed to load flats.");
      return res.json();
    })
    .then(response => {
      if (!response.success) throw new Error("Error loading flats.");
      const flats = response.data;

      const selects = ['rent-flat-select', 'tenant-flat-select', 'reading-flat-select', 'report-flat-select'];
      selects.forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = '';
        flats.forEach(flat => {
          const option = document.createElement('option');
          option.value = flat.FlatNumber;
          option.textContent = flat.FlatNumber;
          select.appendChild(option);
        });
      });

      const ul = document.getElementById('existing-flats');
      ul.innerHTML = '';
      flats.forEach(flat => {
        const li = document.createElement('li');
        const rentInfo = flat.LatestRent ? `₹${flat.LatestRent}` : 'No Rent Info';
        li.textContent = `Flat no: ${flat.FlatNumber} Tenant Name: ${flat.TenantName} Rent: (${rentInfo})`;
        ul.appendChild(li);
      });
    })
    .catch(err => alert(err.message))
    .finally(() => hideLoader());
}

function addFlat() {
  const flatNum = document.getElementById('flatNum').value.trim();
  const rent = document.getElementById('rent').value.trim();
  const tenant = document.getElementById('tenant').value.trim();
  const today = new Date().toISOString().split('T')[0];

  if (!flatNum || !rent || !tenant) return alert("All fields required.");
  showLoader();

  postData({
    action: "add_flat",
    flatNumber: flatNum,
    tenantName: tenant
  })
  .then(() =>
    postData({
      action: "add_rent_history",
      flatNumber: flatNum,
      rent: rent,
      startDate: today
    })
  )
  .then(() => {
    alert("Flat added.");
    document.getElementById('flatNum').value = '';
    document.getElementById('rent').value = '';
    document.getElementById('tenant').value = '';
    loadFlats();
  })
  .catch(err => alert(err.message))
  .finally(() => hideLoader());
}

function updateRent() {
  const flat = document.getElementById('rent-flat-select').value;
  const newRent = document.getElementById('new-rent').value.trim();
  const today = new Date().toISOString().split('T')[0];

  if (!flat || !newRent) return alert("Both fields required.");
  showLoader();

  postData({
    action: "add_rent_history",
    flatNumber: flat,
    rent: newRent,
    startDate: today
  })
  .then(() => {
    alert("Rent updated.");
    document.getElementById('new-rent').value = '';
    loadFlats();
  })
  .catch(err => alert(err.message))
  .finally(() => hideLoader());
}

function updateTenant() {
  const flat = document.getElementById('tenant-flat-select').value;
  const newTenant = document.getElementById('new-tenant').value.trim();
  if (!flat || !newTenant) return alert("Both fields required.");
  showLoader();

  postData({
    action: "update_tenant",
    flatNumber: flat,
    tenantName: newTenant
  })
  .then(() => {
    alert("Tenant updated.");
    document.getElementById('new-tenant').value = '';
    loadFlats();
  })
  .catch(err => alert(err.message))
  .finally(() => hideLoader());
}

function addReading() {
  const flat = document.getElementById('reading-flat-select').value;
  const month = document.getElementById('month').value.trim();
  const reading = document.getElementById('reading').value.trim();

  if (!flat || !month || !reading) return alert("All fields required.");
  showLoader();

  postData({
    action: "add_reading",
    flatNumber: flat,
    month: month,
    reading: reading
  })
  .then(() => {
    alert("Reading saved.");
    document.getElementById('reading').value = '';
    fetchPreviousReading();
  })
  .catch(err => alert(err.message))
  .finally(() => hideLoader());
}

function addRate() {
  const month = document.getElementById('rate-month').value.trim();
  const rate = document.getElementById('rate-value').value.trim();

  if (!month || !rate) return alert("Both fields required.");
  showLoader();

  postData({
    action: "add_rate",
    month: month,
    rate: rate
  })
  .then(() => {
    alert("Rate saved.");
    document.getElementById('rate-month').value = '';
    document.getElementById('rate-value').value = '';
  })
  .catch(err => alert(err.message))
  .finally(() => hideLoader());
}

function fetchPreviousReading() {
  const flat = document.getElementById('reading-flat-select').value;
  const month = document.getElementById('month').value.trim();

  if (!flat || !month) {
    document.getElementById('previous-reading').textContent = '-';
    return;
  }

  fetch(`${API_URL}?action=get_previous_reading&flat=${flat}&month=${month}`)
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch previous reading.");
      return res.json();
    })
    .then(response => {
      if (!response.success) throw new Error("No previous reading found.");
      document.getElementById('previous-reading').textContent = response.value || '-';
    })
    .catch(err => {
      document.getElementById('previous-reading').textContent = '-';
      alert(err.message);
    });
}

async function generateReport() {
  try {
    showLoader();
    const flat = document.getElementById('report-flat-select').value;
    const month = document.getElementById('report-month').value.trim();
    const maintenance = parseFloat(document.getElementById('maintenance').value.trim() || 0);

    if (!flat || !month) return alert("Flat and month required.");

    const prevRes = await fetch(`${API_URL}?action=get_previous_reading&flat=${flat}&month=${month}`);
    if (!prevRes.ok) throw new Error("Error fetching previous reading.");
    const prevJson = await prevRes.json();
    if (!prevJson.success) throw new Error("No previous reading found.");
    const prevReading = parseFloat(prevJson.value) || 0;

    const currRes = await fetch(`${API_URL}?action=get_previous_reading&flat=${flat}&month=9999-99`);
    if (!currRes.ok) throw new Error("Error fetching current reading.");
    const currJson = await currRes.json();
    if (!currJson.success) throw new Error("No current reading found.");
    const currReadingApi = parseFloat(currJson.value) || 0;

    const currReading = document.getElementById('reading').value.trim()
      ? parseFloat(document.getElementById('reading').value)
      : currReadingApi || prevReading;

    const unitsUsed = currReading - prevReading;

    const rateRes = await fetch(`${API_URL}?action=get_rate&month=${month}`);
    if (!rateRes.ok) throw new Error("Error fetching rate.");
    const rateData = await rateRes.json();
    if (!rateData.success) throw new Error("Rate not found.");
    const rate = parseFloat(rateData.value) || 0;

    const electricityCharge = rate * unitsUsed;

    const rentRes = await fetch(`${API_URL}?action=get_rent_history&flat=${flat}`);
    if (!rentRes.ok) throw new Error("Error fetching rent history.");
    const rentHistoryData = await rentRes.json();
    if (!rentHistoryData.success) throw new Error("Rent history not found.");
    const rentHistory = rentHistoryData.data;

    const targetDate = new Date(month + '-01');
    const latestRent = rentHistory
      .filter(r => new Date(r.StartDate) <= targetDate)
      .sort((a, b) => new Date(b.StartDate) - new Date(a.StartDate))[0];
    const rent = latestRent ? parseFloat(latestRent.Rent) : 0;

    const totalCharge = rent + electricityCharge + maintenance;

    const reportDiv = document.createElement('div');
    reportDiv.className = 'report-card';
    reportDiv.innerHTML = `
      <h3>Rent Report - ${flat} (${month})</h3>
      <p>Rent: ₹${rent}</p>
      <p>Units Used: ${unitsUsed}</p>
      <p>Rate per Unit: ₹${rate}</p>
      <p>Electricity: ₹${electricityCharge}</p>
      <p>Maintenance: ₹${maintenance}</p>
      <h4>Total: ₹${totalCharge}</h4>
    `;

    const reportPreview = document.getElementById('report-preview');
    reportPreview.innerHTML = '';
    reportPreview.appendChild(reportDiv);

    postData({
      action: "save_report",
      flatNumber: flat,
      month,
      rent,
      unitsUsed,
      rate,
      electricityCharge,
      maintenance,
      totalCharge
    }).catch(err => alert("Error saving report: " + err.message));

    html2canvas(reportDiv).then(canvas => {
      const link = document.createElement('a');
      link.download = `Report_${flat}_${month}.jpeg`;
      link.href = canvas.toDataURL("image/jpeg");
      link.click();
    });
  } catch (err) {
    alert(err.message);
  } finally {
    hideLoader();
  }
}
