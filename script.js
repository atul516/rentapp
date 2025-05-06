const API_URL = 'https://script.google.com/macros/s/AKfycbz_rsdyc-R7Vj95TzpIKh18Dqbsl5InnJDZcqexrdek8r4Z-mNtNGYyGPj4ZBFUK4zqKw/exec';

document.addEventListener('DOMContentLoaded', () => {
  loadFlats();
});

// -----------------------------
// Collapsible Section Toggle
function toggleSection(header) {
  const section = header.parentElement;
  section.classList.toggle('collapsed');
}

// -----------------------------
// Load flats and populate selects
function loadFlats() {
  fetch(`${API_URL}?action=get_flats`)
    .then(res => res.json())
    .then(flats => {
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
        li.textContent = `${flat.FlatNumber} - ${flat.TenantName}`;
        ul.appendChild(li);
      });
    });
}

// -----------------------------
// Add New Flat
function addFlat() {
  const flatNum = document.getElementById('flatNum').value.trim();
  const rent = document.getElementById('rent').value.trim();
  const tenant = document.getElementById('tenant').value.trim();
  const today = new Date().toISOString().split('T')[0];

  if (!flatNum || !rent || !tenant) return alert("All fields required.");

  fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: "add_flat",
      flatNumber: flatNum,
      tenantName: tenant
    }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(() =>
    fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: "add_rent_history",
        flatNumber: flatNum,
        rent: parseFloat(rent),
        startDate: today
      }),
      headers: { 'Content-Type': 'application/json' }
    })
  )
  .then(() => {
    alert("Flat added.");
    document.getElementById('flatNum').value = '';
    document.getElementById('rent').value = '';
    document.getElementById('tenant').value = '';
    loadFlats();
  });
}

// -----------------------------
// Update Rent (append to history)
function updateRent() {
  const flat = document.getElementById('rent-flat-select').value;
  const newRent = document.getElementById('new-rent').value.trim();
  const today = new Date().toISOString().split('T')[0];

  if (!flat || !newRent) return alert("Both fields required.");

  fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: "add_rent_history",
      flatNumber: flat,
      rent: parseFloat(newRent),
      startDate: today
    }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(() => {
    alert("Rent updated.");
    document.getElementById('new-rent').value = '';
  });
}

// -----------------------------
// Update Tenant
function updateTenant() {
  const flat = document.getElementById('tenant-flat-select').value;
  const newTenant = document.getElementById('new-tenant').value.trim();
  if (!flat || !newTenant) return alert("Both fields required.");

  fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: "update_tenant",
      flatNumber: flat,
      tenantName: newTenant
    }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(() => {
    alert("Tenant updated.");
    document.getElementById('new-tenant').value = '';
    loadFlats();
  });
}

// -----------------------------
// Add Electricity Reading
function addReading() {
  const flat = document.getElementById('reading-flat-select').value;
  const month = document.getElementById('month').value.trim();
  const reading = document.getElementById('reading').value.trim();

  if (!flat || !month || !reading) return alert("All fields required.");

  fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: "add_reading",
      flatNumber: flat,
      month: month,
      reading: parseFloat(reading)
    }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(() => {
    alert("Reading saved.");
    document.getElementById('reading').value = '';
    fetchPreviousReading();
  });
}

// -----------------------------
// Add Electricity Rate
function addRate() {
  const month = document.getElementById('rate-month').value.trim();
  const rate = document.getElementById('rate-value').value.trim();

  if (!month || !rate) return alert("Both fields required.");

  fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: "add_rate",
      month: month,
      rate: parseFloat(rate)
    }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(() => {
    alert("Rate saved.");
    document.getElementById('rate-month').value = '';
    document.getElementById('rate-value').value = '';
  });
}

// -----------------------------
// Fetch Previous Reading
function fetchPreviousReading() {
  const flat = document.getElementById('reading-flat-select').value;
  const month = document.getElementById('month').value.trim();

  if (!flat || !month) {
    document.getElementById('previous-reading').textContent = '-';
    return;
  }

  fetch(`${API_URL}?action=get_previous_reading&flat=${flat}&month=${month}`)
    .then(res => res.text())
    .then(reading => {
      document.getElementById('previous-reading').textContent = reading;
    });
}

// -----------------------------
// Generate Report
async function generateReport() {
  const flat = document.getElementById('report-flat-select').value;
  const month = document.getElementById('report-month').value.trim();
  const maintenance = parseFloat(document.getElementById('maintenance').value.trim() || 0);

  if (!flat || !month) return alert("Flat and month required.");

  // Get readings
  const prevRes = await fetch(`${API_URL}?action=get_previous_reading&flat=${flat}&month=${month}`);
  const prevReading = parseFloat(await prevRes.text()) || 0;

  const readSheet = await fetch(`${API_URL}?action=get_previous_reading&flat=${flat}&month=9999-99`);
  const currReading = document.getElementById('reading').value.trim()
    ? parseFloat(document.getElementById('reading').value)
    : prevReading;

  const unitsUsed = currReading - prevReading;

  // Get rate
  const rateRes = await fetch(`${API_URL}?action=get_rate&month=${month}`);
  const rate = parseFloat(await rateRes.text()) || 0;
  const electricityCharge = rate * unitsUsed;

  // Get latest rent
  const rentRes = await fetch(`${API_URL}?action=get_rent_history&flat=${flat}`);
  const rentHistory = await rentRes.json();
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

  // Save to backend
  fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: "save_report",
      flatNumber: flat,
      month,
      rent,
      unitsUsed,
      rate,
      electricityCharge,
      maintenance,
      totalCharge
    }),
    headers: { 'Content-Type': 'application/json' }
  });

  // Download as JPEG
  html2canvas(reportDiv).then(canvas => {
    const link = document.createElement('a');
    link.download = `Report_${flat}_${month}.jpeg`;
    link.href = canvas.toDataURL("image/jpeg");
    link.click();
  });
}
