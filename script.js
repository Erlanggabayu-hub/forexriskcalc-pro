// ─── Instrument Configuration ───────────────────────────────────────────────
const INSTRUMENTS = {
  XAUUSD: {
    label: 'XAUUSD — Gold',
    pipSize: 0.01,
    pipValuePerLot: 1,     // $1 per pip per standard lot (100 oz)
    contractSize: 100,
    decimals: 2,
  },
  EURUSD: {
    label: 'EURUSD',
    pipSize: 0.0001,
    pipValuePerLot: 10,    // $10 per pip per standard lot (100,000 units)
    contractSize: 100000,
    decimals: 5,
  },
  GBPUSD: {
    label: 'GBPUSD',
    pipSize: 0.0001,
    pipValuePerLot: 10,
    contractSize: 100000,
    decimals: 5,
  },
  USDJPY: {
    label: 'USDJPY',
    pipSize: 0.01,
    pipValuePerLot: 6.5,   // Approx $6.50 per pip (varies with USD/JPY rate)
    contractSize: 100000,
    decimals: 3,
  },
  US30: {
    label: 'US30 — Dow Jones',
    pipSize: 1.0,
    pipValuePerLot: 1,     // $1 per pip (1 point) per standard lot
    contractSize: 1,
    decimals: 0,
  },
};

// ─── State ──────────────────────────────────────────────────────────────────
let riskMode = 'percent'; // 'percent' | 'dollar'

// ─── DOM Elements ───────────────────────────────────────────────────────────
const els = {
  instrument:     document.getElementById('instrument'),
  balance:        document.getElementById('balance'),
  risk:           document.getElementById('risk'),
  openPrice:      document.getElementById('openPrice'),
  slPrice:        document.getElementById('slPrice'),
  tpPrice:        document.getElementById('tpPrice'),
  pipSizeDisplay: document.getElementById('pipSizeDisplay'),
  pipValueDisplay:document.getElementById('pipValueDisplay'),
  riskPrefix:     document.getElementById('riskPrefix'),
  riskSuffix:     document.getElementById('riskSuffix'),
  riskEquivalent: document.getElementById('riskEquivalent'),
  togglePercent:  document.getElementById('togglePercent'),
  toggleDollar:   document.getElementById('toggleDollar'),
  directionBadge: document.getElementById('directionBadge'),
  directionDot:   document.getElementById('directionDot'),
  directionText:  document.getElementById('directionText'),
  resultLotSize:  document.getElementById('resultLotSize'),
  resultRiskAmt:  document.getElementById('resultRiskAmt'),
  resultRiskPct:  document.getElementById('resultRiskPct'),
  resultRR:       document.getElementById('resultRR'),
  resultRRLabel:  document.getElementById('resultRRLabel'),
  resultSLPips:   document.getElementById('resultSLPips'),
  resultTPPips:   document.getElementById('resultTPPips'),
  resultNetLoss:  document.getElementById('resultNetLoss'),
  resultNetProfit:document.getElementById('resultNetProfit'),
  rrBarLoss:      document.getElementById('rrBarLoss'),
  rrBarProfit:    document.getElementById('rrBarProfit'),
  rrBarLossLabel: document.getElementById('rrBarLossLabel'),
  rrBarProfitLabel:document.getElementById('rrBarProfitLabel'),
  rrRatioSmall:   document.getElementById('rrRatioSmall'),
  tbBalance:      document.getElementById('tbBalance'),
  tbRisk:         document.getElementById('tbRisk'),
  tbSLPips:       document.getElementById('tbSLPips'),
  tbTPPips:       document.getElementById('tbTPPips'),
  tbPipVal:       document.getElementById('tbPipVal'),
  tbLot:          document.getElementById('tbLot'),
  tbUnits:        document.getElementById('tbUnits'),
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmt(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtUSD(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return '$' + fmt(Math.abs(n), 2);
}

function getInstrument() {
  return INSTRUMENTS[els.instrument.value];
}

function getVal(el) {
  const v = parseFloat(el.value);
  return isNaN(v) ? null : v;
}

// ─── Risk Mode Toggle ──────────────────────────────────────────────────────
function setRiskMode(mode) {
  riskMode = mode;

  if (mode === 'percent') {
    els.togglePercent.classList.add('active');
    els.togglePercent.classList.remove('text-muted');
    els.toggleDollar.classList.remove('active');
    els.toggleDollar.classList.add('text-muted');
    els.riskPrefix.textContent = '';
    els.riskSuffix.textContent = '%';
    els.risk.value = '2';
    els.risk.step = '0.1';
    els.risk.placeholder = 'e.g. 2';
  } else {
    els.toggleDollar.classList.add('active');
    els.toggleDollar.classList.remove('text-muted');
    els.togglePercent.classList.remove('active');
    els.togglePercent.classList.add('text-muted');
    els.riskPrefix.textContent = '$';
    els.riskSuffix.textContent = '';
    els.risk.value = '200';
    els.risk.step = '10';
    els.risk.placeholder = 'e.g. 200';
  }

  calculate();
}

// Expose to global for onclick
window.setRiskMode = setRiskMode;

// ─── Instrument Change ──────────────────────────────────────────────────────
function onInstrumentChange() {
  const inst = getInstrument();
  els.pipSizeDisplay.textContent = inst.pipSize.toString();
  els.pipValueDisplay.textContent = '$' + fmt(inst.pipValuePerLot, 2);

  // Update placeholders based on instrument
  const placeholders = {
    XAUUSD: { open: '2650.00', sl: '2640.00', tp: '2670.00' },
    EURUSD: { open: '1.08500', sl: '1.08200', tp: '1.09000' },
    GBPUSD: { open: '1.26500', sl: '1.26200', tp: '1.27000' },
    USDJPY: { open: '149.500', sl: '149.200', tp: '150.000' },
    US30:   { open: '42000', sl: '41950', tp: '42100' },
  };

  const ph = placeholders[els.instrument.value] || placeholders.XAUUSD;
  els.openPrice.placeholder = 'e.g. ' + ph.open;
  els.slPrice.placeholder = 'e.g. ' + ph.sl;
  els.tpPrice.placeholder = 'e.g. ' + ph.tp;

  calculate();
}

// ─── Core Calculation ───────────────────────────────────────────────────────
function calculate() {
  const inst = getInstrument();
  const balance = getVal(els.balance);
  const riskInput = getVal(els.risk);
  const openPrice = getVal(els.openPrice);
  const slPrice = getVal(els.slPrice);
  const tpPrice = getVal(els.tpPrice);

  // Risk Amount
  let riskAmount = null;
  if (riskMode === 'percent' && balance !== null && riskInput !== null) {
    riskAmount = (riskInput / 100) * balance;
  } else if (riskMode === 'dollar' && riskInput !== null) {
    riskAmount = riskInput;
  }

  // Risk equivalent text
  if (riskMode === 'percent' && riskAmount !== null) {
    els.riskEquivalent.textContent = '= ' + fmtUSD(riskAmount) + ' at risk';
  } else if (riskMode === 'dollar' && balance !== null && riskInput !== null) {
    const pct = (riskInput / balance) * 100;
    els.riskEquivalent.textContent = '= ' + fmt(pct, 2) + '% of balance';
  } else {
    els.riskEquivalent.textContent = '';
  }

  // SL/TP Pips
  let slPips = null;
  let tpPips = null;

  if (openPrice !== null && slPrice !== null) {
    slPips = Math.abs(openPrice - slPrice) / inst.pipSize;
  }
  if (openPrice !== null && tpPrice !== null) {
    tpPips = Math.abs(tpPrice - openPrice) / inst.pipSize;
  }

  // Direction detection
  if (openPrice !== null && slPrice !== null) {
    const isLong = slPrice < openPrice;
    els.directionBadge.classList.remove('hidden');
    if (isLong) {
      els.directionDot.className = 'w-2 h-2 rounded-full bg-profit';
      els.directionText.textContent = 'Long Position';
      els.directionText.className = 'text-[11px] font-semibold uppercase tracking-wider text-profit';
    } else {
      els.directionDot.className = 'w-2 h-2 rounded-full bg-loss';
      els.directionText.textContent = 'Short Position';
      els.directionText.className = 'text-[11px] font-semibold uppercase tracking-wider text-loss';
    }
  } else {
    els.directionBadge.classList.add('hidden');
  }

  // Lot Size
  let lotSize = null;
  if (riskAmount !== null && slPips !== null && slPips > 0) {
    lotSize = riskAmount / (slPips * inst.pipValuePerLot);
  }

  // Round lot size to 2 decimal places (standard lot precision)
  if (lotSize !== null) {
    lotSize = Math.floor(lotSize * 100) / 100;
  }

  // Net Loss / Profit
  let netLoss = null;
  let netProfit = null;
  if (lotSize !== null && slPips !== null) {
    netLoss = slPips * lotSize * inst.pipValuePerLot;
  }
  if (lotSize !== null && tpPips !== null) {
    netProfit = tpPips * lotSize * inst.pipValuePerLot;
  }

  // Risk : Reward ratio
  let rrRatio = null;
  if (slPips !== null && tpPips !== null && slPips > 0) {
    rrRatio = tpPips / slPips;
  }

  // ─── Update UI ──────────────────────────────────────────────────────────

  // Primary Results
  els.resultLotSize.textContent = lotSize !== null ? fmt(lotSize, 2) : '—';
  els.resultRiskAmt.textContent = riskAmount !== null ? fmtUSD(riskAmount) : '—';

  if (riskMode === 'percent' && riskInput !== null) {
    els.resultRiskPct.textContent = fmt(riskInput, 1) + '% of balance';
  } else if (riskMode === 'dollar' && balance !== null && riskInput !== null) {
    els.resultRiskPct.textContent = fmt((riskInput / balance) * 100, 2) + '% of balance';
  } else {
    els.resultRiskPct.textContent = '—';
  }

  // R:R
  if (rrRatio !== null) {
    els.resultRR.textContent = '1:' + fmt(rrRatio, 1);
    if (rrRatio >= 2) {
      els.resultRR.className = 'text-xl sm:text-2xl font-bold font-mono text-profit';
      els.resultRRLabel.textContent = 'Favorable';
    } else if (rrRatio >= 1) {
      els.resultRR.className = 'text-xl sm:text-2xl font-bold font-mono text-accent';
      els.resultRRLabel.textContent = 'Neutral';
    } else {
      els.resultRR.className = 'text-xl sm:text-2xl font-bold font-mono text-warn';
      els.resultRRLabel.textContent = 'Unfavorable';
    }
  } else {
    els.resultRR.textContent = '—';
    els.resultRR.className = 'text-xl sm:text-2xl font-bold font-mono text-accent';
    els.resultRRLabel.textContent = 'Risk / Reward';
  }

  // SL / TP Pips
  els.resultSLPips.textContent = slPips !== null ? fmt(slPips, 1) + ' pips' : '— pips';
  els.resultTPPips.textContent = tpPips !== null ? fmt(tpPips, 1) + ' pips' : '— pips';

  // Net Loss / Profit
  els.resultNetLoss.textContent = netLoss !== null ? '-' + fmtUSD(netLoss) : '—';
  els.resultNetProfit.textContent = netProfit !== null ? '+' + fmtUSD(netProfit) : '—';

  // R:R Visual Bar
  if (slPips !== null && tpPips !== null && slPips > 0 && tpPips > 0) {
    const total = slPips + tpPips;
    const lossPct = Math.max(15, (slPips / total) * 100);
    const profitPct = Math.max(15, (tpPips / total) * 100);
    const normTotal = lossPct + profitPct;

    els.rrBarLoss.style.width = ((lossPct / normTotal) * 100) + '%';
    els.rrBarProfit.style.width = ((profitPct / normTotal) * 100) + '%';
    els.rrBarLossLabel.textContent = netLoss !== null ? '-' + fmtUSD(netLoss) : fmt(slPips, 1) + 'p';
    els.rrBarProfitLabel.textContent = netProfit !== null ? '+' + fmtUSD(netProfit) : fmt(tpPips, 1) + 'p';
    els.rrRatioSmall.textContent = rrRatio !== null ? '1:' + fmt(rrRatio, 1) : '—';
  } else {
    els.rrBarLoss.style.width = '50%';
    els.rrBarProfit.style.width = '50%';
    els.rrBarLossLabel.textContent = '—';
    els.rrBarProfitLabel.textContent = '—';
    els.rrRatioSmall.textContent = '—';
  }

  // Breakdown Table
  els.tbBalance.textContent = balance !== null ? fmtUSD(balance) : '—';
  els.tbRisk.textContent = riskAmount !== null ? fmtUSD(riskAmount) : '—';
  els.tbSLPips.textContent = slPips !== null ? fmt(slPips, 1) : '—';
  els.tbTPPips.textContent = tpPips !== null ? fmt(tpPips, 1) : '—';
  els.tbPipVal.textContent = '$' + fmt(inst.pipValuePerLot, 2);
  els.tbLot.textContent = lotSize !== null ? fmt(lotSize, 2) + ' lots' : '—';
  els.tbUnits.textContent = lotSize !== null ? Math.round(lotSize * inst.contractSize).toLocaleString('en-US') : '—';
}

// ─── Event Listeners ────────────────────────────────────────────────────────
els.instrument.addEventListener('change', onInstrumentChange);

[els.balance, els.risk, els.openPrice, els.slPrice, els.tpPrice].forEach(input => {
  input.addEventListener('input', calculate);
});

// Keyboard shortcut: Tab through inputs smoothly
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.activeElement.blur();
  }
});

// ─── Initialize ─────────────────────────────────────────────────────────────
onInstrumentChange();
calculate();