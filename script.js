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
        li.style.padding = '10px';
        li.style.border = '1px solid #ccc';
        li.style.borderRadius = '8px';
        li.style.marginBottom = '8px';
        li.style.backgroundColor = '#f9f9f9';
        li.style.listStyle = 'none';

        const flatNumber = document.createElement('div');
        flatNumber.innerHTML = `<strong>Flat No:</strong> ${flat.FlatNumber}`;

        const tenantName = document.createElement('div');
        tenantName.innerHTML = `<strong>Tenant:</strong> ${flat.TenantName || '—'}`;

        const rent = document.createElement('div');
        rent.innerHTML = `<strong>Rent:</strong> ${flat.LatestRent ? `₹${flat.LatestRent}` : 'No Rent Info'}`;

        li.appendChild(flatNumber);
        li.appendChild(tenantName);
        li.appendChild(rent);

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
  const rate = document.getElementById('rate-value').value.trim();

  if (!rate) return alert("Rate fields required.");
  showLoader();

  postData({
    action: "add_rate",
    rate: rate
  })
  .then(() => {
    alert("Rate saved.");
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

function getPreviousMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const prevMonthDate = new Date(year, month - 2); // JS months are 0-based
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
  return `${prevYear}-${prevMonth}`;
}

function formatMonthYear(ymStr) {
  const [year, month] = ymStr.split('-').map(Number);
  const date = new Date(year, month - 1); // JS months are 0-based
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
}

async function generateReport() {
  try {
    showLoader();
    const flat = document.getElementById('report-flat-select').value;
    const month = document.getElementById('report-month').value.trim();
    const maintenance = parseFloat(document.getElementById('maintenance').value.trim() || 0);
    const tenantRes = await fetch(`${API_URL}?action=get_tenant&flat=${flat}`);
    if (!tenantRes.ok) throw new Error("Error fetching tenant name.");
    const tenantData = await tenantRes.json();
    const tenantName = tenantData.success ? tenantData.name : 'N/A';

    if (!flat || !month) return alert("Flat and month required.");

    const prevMonth = getPreviousMonth(month);

    const prevRes = await fetch(`${API_URL}?action=get_previous_reading&flat=${flat}&month=${prevMonth}`);
    if (!prevRes.ok) throw new Error("Error fetching previous month's reading.");
    const prevJson = await prevRes.json();
    if (!prevJson.success) throw new Error("No previous month's reading found.");
    const prevReading = parseFloat(prevJson.value) || 0;

    const currRes = await fetch(`${API_URL}?action=get_previous_reading&flat=${flat}&month=${month}`);
    if (!currRes.ok) throw new Error("Error fetching current month's reading.");
    const currJson = await currRes.json();
    if (!currJson.success) throw new Error("No current month's reading found.");
    const currReadingApi = parseFloat(currJson.value) || 0;

    const currReading = document.getElementById('reading').value.trim()
      ? parseFloat(document.getElementById('reading').value)
      : currReadingApi || prevReading;

    const unitsUsed = currReading - prevReading;

    const rateRes = await fetch(`${API_URL}?action=get_rate`);
    if (!rateRes.ok) throw new Error("Error fetching rate.");
    const rateData = await rateRes.json();
    if (!rateData.success) throw new Error("Rate not found.");
    const rate = parseFloat(rateData.value) || 0;

    const electricityCharge = rate * unitsUsed;

    const rentRes = await fetch(`${API_URL}?action=get_latest_rent&flat=${flat}`);
    if (!rentRes.ok) throw new Error("Error fetching latest rent.");
    const rentData = await rentRes.json();
    if (!rentData.success) throw new Error("Rent not found.");
    const latestRent = rentData.data;

    const targetDate = new Date(month + '-01');
    const rent = latestRent ? parseFloat(latestRent) : 0;

    const totalCharge = rent + electricityCharge + maintenance;

    const reportDiv = document.createElement('div');
    reportDiv.className = 'report-card';
    reportDiv.innerHTML = `
    <div style="font-family: Arial, sans-serif; border: 1px solid #ccc; border-radius: 8px; padding: 10px; max-width: 500px; background: #f9f9f9;">
      <h2 style="margin-top: 0; color: #2c3e50;">🏠 Rent Report</h2>
      <h3 style="color: #34495e;">Flat: <strong>${flat}</strong></h3>
      <h3 style="color: #34495e;">Tenant: <strong>${tenantName}</strong></h3>
      <h4 style="color: #7f8c8d;">Month: <strong>${formatMonthYear(month)}</strong></h4>
      <hr />
      <p><strong>📊 Rent:</strong> ₹${rent.toFixed(2)}</p>
      <p><strong>⚡ Units Used:</strong> ${unitsUsed} units</p>
      <p><strong>⚡ Electricity Charge:</strong> ₹${electricityCharge.toFixed(2)}</p>
      <p><strong>🛠️ Maintenance:</strong> ₹${maintenance.toFixed(2)}</p>
      <hr />
      <h3 style="color: #2c3e50;">Total Amount: ₹${totalCharge.toFixed(2)}</h3>
    </div>
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
