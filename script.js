const API_BASE = 'https://script.google.com/macros/s/AKfycbz_rsdyc-R7Vj95TzpIKh18Dqbsl5InnJDZcqexrdek8r4Z-mNtNGYyGPj4ZBFUK4zqKw/exec'

document.addEventListener('DOMContentLoaded', () => {
  loadFlats();
});

// ---------- FLATS ----------
function loadFlats() {
  fetch(`${API_BASE}?action=getFlats`)
    .then(res => res.json())
    .then(data => {
      const flatOptions = data.map(flat => `<option value="${flat.FlatNumber}">${flat.FlatNumber}</option>`).join('');
      const flatList = data.map(flat => `<li>${flat.FlatNumber} - ${flat.Location}, ₹${flat.Rent}, ${flat.TenantName}</li>`).join('');
      document.getElementById('rent-flat-select').innerHTML = flatOptions;
      document.getElementById('tenant-flat-select').innerHTML = flatOptions;
      document.getElementById('reading-flat-select').innerHTML = flatOptions;
      document.getElementById('report-flat-select').innerHTML = flatOptions;
      document.getElementById('existing-flats').innerHTML = flatList;
    });
}

function addFlat() {
  const payload = {
    FlatNumber: document.getElementById('flatNum').value,
    Location: document.getElementById('location').value,
    Rent: document.getElementById('rent').value,
    TenantName: document.getElementById('tenant').value
  };
  fetch(`${API_BASE}?action=addFlat`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }).then(() => {
    alert('Flat added!');
    loadFlats();
  });
}

function updateRent() {
  const payload = {
    FlatNumber: document.getElementById('rent-flat-select').value,
    Rent: document.getElementById('new-rent').value
  };
  fetch(`${API_BASE}?action=updateRent`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }).then(() => alert('Rent updated!'));
}

function updateTenant() {
  const payload = {
    FlatNumber: document.getElementById('tenant-flat-select').value,
    TenantName: document.getElementById('new-tenant').value
  };
  fetch(`${API_BASE}?action=updateTenant`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }).then(() => alert('Tenant updated!'));
}

// ---------- ELECTRICITY ----------
function addReading() {
  const payload = {
    FlatNumber: document.getElementById('reading-flat-select').value,
    Month: document.getElementById('month').value,
    Reading: document.getElementById('reading').value
  };
  fetch(`${API_BASE}?action=addReading`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }).then(() => {
    alert('Reading added!');
    document.getElementById('reading').value = '';
    document.getElementById('previous-reading').innerText = '-';
  });
}

function fetchPreviousReading() {
  const flat = document.getElementById('reading-flat-select').value;
  const month = document.getElementById('month').value;
  if (!flat || !month) return;
  fetch(`${API_BASE}?action=getPreviousReading&flat=${flat}&month=${month}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('previous-reading').innerText = data.previousReading ?? 'N/A';
    });
}

// ---------- RATE ----------
function addRate() {
  const payload = {
    Month: document.getElementById('rate-month').value,
    RatePerUnit: document.getElementById('rate-value').value
  };
  fetch(`${API_BASE}?action=addRate`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }).then(() => alert('Rate saved!'));
}

// ---------- REPORT GENERATION ----------
function generateReport() {
  const flat = document.getElementById('report-flat-select').value;
  const month = document.getElementById('report-month').value;
  const maintenance = parseFloat(document.getElementById('maintenance').value || 0);
  
  Promise.all([
    fetch(`${API_BASE}?action=getFlats`).then(res => res.json()),
    fetch(`${API_BASE}?action=getReadings&flat=${flat}`).then(res => res.json()),
    fetch(`${API_BASE}?action=getPreviousReading&flat=${flat}&month=${month}`).then(res => res.json())
  ]).then(([flats, readings, prevData]) => {
    const flatData = flats.find(f => f.FlatNumber === flat);
    const currentReading = readings.find(r => r.Month === month)?.Reading;
    const prevReading = prevData.previousReading;
    const rate = parseFloat(document.getElementById('rate-value').value || 0);
    
    const elecUnits = currentReading - prevReading;
    const elecCharge = elecUnits * rate;
    const rent = parseFloat(flatData.Rent || 0);
    const total = rent + elecCharge + maintenance;

    const html = `
      <div id="report-card" style="border:1px solid #ccc;padding:10px;width:300px">
        <h3>Rent Report for ${flat}</h3>
        <p>Tenant: ${flatData.TenantName}</p>
        <p>Month: ${month}</p>
        <p>Flat Rent: ₹${rent}</p>
        <p>Electricity: ${elecUnits} units × ₹${rate} = ₹${elecCharge.toFixed(2)}</p>
        <p>Maintenance: ₹${maintenance}</p>
        <h4>Total: ₹${total.toFixed(2)}</h4>
      </div>
    `;
    document.getElementById('report-preview').innerHTML = html;

    // Save total to backend
    fetch(`${API_BASE}?action=saveTotalCharges`, {
      method: 'POST',
      body: JSON.stringify({
        FlatNumber: flat,
        Month: month,
        Rent: rent,
        ElectricityCharge: elecCharge,
        Maintenance: maintenance,
        Total: total
      })
    });

    // Download report
    html2canvas(document.getElementById('report-card')).then(canvas => {
      const link = document.createElement('a');
      link.download = `Report_${flat}_${month}.jpg`;
      link.href = canvas.toDataURL('image/jpeg');
      link.click();
    });
  });
}
function toggleSection(headerElement) {
  const section = headerElement.parentElement;
  section.classList.toggle('collapsed');
}
