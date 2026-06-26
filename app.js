// === Kang SIM Info — app.js ===

let simDatabase = [];

// Load and parse CSV on page load
window.addEventListener('DOMContentLoaded', () => {
  fetch('simdata.csv')
    .then(res => {
      if (!res.ok) throw new Error('CSV not found');
      return res.text();
    })
    .then(csvText => {
      simDatabase = parseCSV(csvText);
      const statsEl = document.getElementById('stats');
      const totalEl = document.getElementById('totalCount');
      if (simDatabase.length > 0) {
        statsEl.classList.remove('hidden');
        totalEl.textContent = `✅ Database loaded — ${simDatabase.length} records`;
      }
    })
    .catch(err => {
      console.warn('CSV load error:', err.message);
      // Show helpful message if CSV missing
      document.getElementById('stats').classList.remove('hidden');
      document.getElementById('totalCount').textContent =
        '⚠️ simdata.csv not found — please upload your CSV file';
    });

  // Allow Enter key to search
  document.getElementById('simInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchSIM();
  });
});

// Parse CSV into array of objects
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Get headers from first row, normalize them
  const headers = lines[0].split(',').map(h =>
    h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  );

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle values with commas inside quotes
    const values = splitCSVLine(line);
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = (values[idx] || '').trim();
    });
    records.push(record);
  }
  return records;
}

// Smart CSV line splitter (handles quoted commas)
function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// Main search function
function searchSIM() {
  const input = document.getElementById('simInput').value.trim();
  const resultEl = document.getElementById('result');

  // Validation
  if (!input) {
    showError('Please enter a SIM number.');
    return;
  }
  if (!/^0\d{10}$/.test(input)) {
    showError('Enter a valid 11-digit number starting with 0 (e.g. 03001234567)');
    return;
  }

  if (simDatabase.length === 0) {
    showError('Database not loaded. Make sure simdata.csv is uploaded.');
    return;
  }

  // Search — try matching common column name variations
  const match = simDatabase.find(row => {
    const simVal =
      row['sim_number'] || row['sim'] || row['number'] ||
      row['mobile'] || row['phone'] || row['mobile_number'] ||
      row['sim_no'] || Object.values(row)[0]; // fallback to first column
    return simVal && simVal.replace(/\s|-/g, '') === input;
  });

  if (match) {
    showResult(match, input);
  } else {
    showNotFound(input);
  }
}

// Display found result
function showResult(data, simNumber) {
  const resultEl = document.getElementById('result');
  resultEl.className = 'result-area';
  resultEl.classList.remove('hidden');

  // Detect network from SIM prefix
  const network = detectNetwork(simNumber);
  const networkBadge = getNetworkBadge(network);

  // Get field values with fallbacks for different column name styles
  const ownerName = data['owner_name'] || data['name'] || data['owner'] || data['full_name'] || '—';
  const cnic = data['cnic'] || data['cnic_number'] || data['id'] || '—';
  const address = data['address'] || data['addr'] || data['location'] || '—';
  const networkFromCSV = data['network'] || data['operator'] || data['carrier'] || network;

  resultEl.innerHTML = `
    <div class="result-title">📋 SIM Record Found</div>
    <div class="info-grid">
      <div class="info-item full-width">
        <div class="info-label">SIM Number</div>
        <div class="info-value sim-num">${simNumber}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Owner Name</div>
        <div class="info-value">${escapeHTML(ownerName)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Network</div>
        <div class="info-value">${getNetworkBadge(networkFromCSV)}</div>
      </div>
      <div class="info-item full-width">
        <div class="info-label">CNIC</div>
        <div class="info-value">${escapeHTML(cnic)}</div>
      </div>
      <div class="info-item full-width">
        <div class="info-label">Address</div>
        <div class="info-value">${escapeHTML(address)}</div>
      </div>
    </div>
  `;
}

// Display not found
function showNotFound(simNumber) {
  const resultEl = document.getElementById('result');
  resultEl.className = 'result-area not-found';
  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `
    <div class="nf-icon">🔍</div>
    <strong>No record found</strong>
    <p style="margin-top:8px;font-size:13px;color:#888;">
      "${simNumber}" is not in the database.
    </p>
  `;
}

// Display error
function showError(msg) {
  const resultEl = document.getElementById('result');
  resultEl.className = 'result-area not-found';
  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `
    <div class="nf-icon">⚠️</div>
    <strong>${escapeHTML(msg)}</strong>
  `;
}

// Detect network from SIM prefix
function detectNetwork(num) {
  const prefix = num.substring(0, 4);
  const jazz   = ['0300','0301','0302','0303','0304','0305','0306','0307','0308','0311','0312','0313','0314','0315','0316','0317','0318','0319'];
  const zong   = ['0310','0320','0321','0322','0323','0324','0325','0326','0327','0328','0329'];
  const telenor= ['0340','0341','0342','0343','0344','0345','0346','0347','0348','0349'];
  const ufone  = ['0333','0331','0332','0334','0335','0336','0337','0338','0339'];

  if (jazz.includes(prefix))    return 'Jazz';
  if (zong.includes(prefix))    return 'Zong';
  if (telenor.includes(prefix)) return 'Telenor';
  if (ufone.includes(prefix))   return 'Ufone';
  return 'Unknown';
}

// Get styled network badge HTML
function getNetworkBadge(network) {
  const n = (network || '').toLowerCase();
  let cls = 'net-other';
  if (n.includes('jazz') || n.includes('mobilink')) cls = 'net-jazz';
  else if (n.includes('telenor')) cls = 'net-telenor';
  else if (n.includes('zong'))    cls = 'net-zong';
  else if (n.includes('ufone'))   cls = 'net-ufone';
  return `<span class="network-badge ${cls}">${escapeHTML(network || 'Unknown')}</span>`;
}

// Prevent XSS
function escapeHTML(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
