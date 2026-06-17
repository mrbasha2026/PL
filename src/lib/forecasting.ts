// ────────────────────────────────────────────────────────────────────────────
// Statistical & Accounting Forecasting Library
// All methods are based on established mathematical formulas:
//   - Linear Regression (least squares)
//   - Moving Average (simple & weighted)
//   - Exponential Smoothing (Holt-Winters: level + trend + seasonality)
//   - Compound Growth (CAGR)
//   - Accounting ratio-based projections (DuPont, gross margin, etc.)
// ────────────────────────────────────────────────────────────────────────────

export interface TimePoint {
  period: string; // "2024-01" or "2024-Q1" or "2024"
  value: number;
}

export interface ForecastResult {
  method: string;
  historical: TimePoint[];
  forecast: TimePoint[];
  lower: TimePoint[]; // confidence lower bound
  upper: TimePoint[]; // confidence upper bound
  accuracy: number; // 0-1 (R² or 1 - MAPE/100)
  mape: number; // Mean Absolute Percentage Error %
  mae: number;  // Mean Absolute Error
  rmse: number; // Root Mean Squared Error
  parameters: Record<string, number | string>;
  formula: string; // human-readable formula
}

// ─── Period Helpers ────────────────────────────────────────────────────────
export function nextPeriod(period: string, type: 'monthly' | 'quarterly' | 'yearly' = 'monthly'): string {
  if (type === 'yearly') {
    const y = parseInt(period);
    return String(y + 1);
  }
  if (type === 'quarterly') {
    const m = period.match(/^(\d{4})-Q(\d)$/);
    if (m) {
      const y = parseInt(m[1]);
      const q = parseInt(m[2]);
      if (q < 4) return `${y}-Q${q + 1}`;
      return `${y + 1}-Q1`;
    }
  }
  // monthly
  const mm = period.match(/^(\d{4})-(\d{2})$/);
  if (mm) {
    const y = parseInt(mm[1]);
    const m = parseInt(mm[2]);
    if (m < 12) return `${y}-${String(m + 1).padStart(2, '0')}`;
    return `${y + 1}-01`;
  }
  return period;
}

export function detectPeriodType(periods: string[]): 'monthly' | 'quarterly' | 'yearly' {
  if (!periods.length) return 'monthly';
  const sample = periods[0];
  if (/^\d{4}$/.test(sample)) return 'yearly';
  if (/Q\d$/.test(sample)) return 'quarterly';
  return 'monthly';
}

// ─── 1. Linear Regression (Ordinary Least Squares) ─────────────────────────
// Formula: y = a + b*x, where:
//   b = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)
//   a = (Σy − b·Σx) / n
// Confidence: 95% interval = ±1.96 · σ_residual
export function linearRegression(
  data: TimePoint[],
  periodsAhead: number = 6,
): ForecastResult {
  const n = data.length;
  if (n < 2) throw new Error('Linear regression requires at least 2 data points');

  const xs = data.map((_, i) => i);
  const ys = data.map((d) => d.value);

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);

  const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const a = (sumY - b * sumX) / n;

  // Residuals & standard error
  const residuals = xs.map((x, i) => ys[i] - (a + b * x));
  const residualVariance = residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, n - 2);
  const stdError = Math.sqrt(residualVariance);
  const margin = 1.96 * stdError;

  // R²
  const yMean = sumY / n;
  const ssTot = ys.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const ssRes = residuals.reduce((s, r) => s + r * r, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  const periodType = detectPeriodType(data.map((d) => d.period));
  const forecast: TimePoint[] = [];
  const lower: TimePoint[] = [];
  const upper: TimePoint[] = [];
  let lastPeriod = data[data.length - 1].period;
  for (let i = 1; i <= periodsAhead; i++) {
    const x = n - 1 + i;
    const y = a + b * x;
    lastPeriod = nextPeriod(lastPeriod, periodType);
    forecast.push({ period: lastPeriod, value: round2(y) });
    lower.push({ period: lastPeriod, value: round2(y - margin) });
    upper.push({ period: lastPeriod, value: round2(y + margin) });
  }

  // MAPE / MAE / RMSE on historical fit
  const mape = meanAbsPctError(ys, xs.map((x) => a + b * x));
  const mae = meanAbsError(ys, xs.map((x) => a + b * x));
  const rmse = rootMse(ys, xs.map((x) => a + b * x));

  return {
    method: 'linear_regression',
    historical: data,
    forecast,
    lower,
    upper,
    accuracy: clamp01(r2),
    mape,
    mae,
    rmse,
    parameters: {
      intercept: round2(a),
      slope: round4(b),
      r_squared: round4(r2),
      std_error: round2(stdError),
      n,
    },
    formula: `y = ${round2(a)} + ${round4(b)}·t  (R²=${round4(r2)})`,
  };
}

// ─── 2. Simple Moving Average ──────────────────────────────────────────────
// Forecast = average of last N observations; prediction interval uses σ of residuals
export function movingAverage(
  data: TimePoint[],
  window: number = 3,
  periodsAhead: number = 6,
): ForecastResult {
  const n = data.length;
  if (n < window) throw new Error(`Moving average requires at least ${window} data points`);

  const ys = data.map((d) => d.value);
  const fitted: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i < window - 1) {
      fitted.push(ys[i]); // passthrough until we have enough data
    } else {
      const slice = ys.slice(i - window + 1, i + 1);
      fitted.push(slice.reduce((a, b) => a + b, 0) / window);
    }
  }

  const residuals = ys.map((y, i) => y - fitted[i]);
  const stdError = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, n - 1));
  const margin = 1.96 * stdError;

  // Forecast: rolling average using last `window` fitted values (including forecasts)
  const extended = [...ys];
  const periodType = detectPeriodType(data.map((d) => d.period));
  const forecast: TimePoint[] = [];
  const lower: TimePoint[] = [];
  const upper: TimePoint[] = [];
  let lastPeriod = data[data.length - 1].period;
  for (let i = 0; i < periodsAhead; i++) {
    const slice = extended.slice(-window);
    const avg = slice.reduce((a, b) => a + b, 0) / window;
    lastPeriod = nextPeriod(lastPeriod, periodType);
    forecast.push({ period: lastPeriod, value: round2(avg) });
    lower.push({ period: lastPeriod, value: round2(avg - margin) });
    upper.push({ period: lastPeriod, value: round2(avg + margin) });
    extended.push(avg);
  }

  const mape = meanAbsPctError(ys, fitted);
  const mae = meanAbsError(ys, fitted);
  const rmse = rootMse(ys, fitted);
  const accuracy = clamp01(1 - mape / 100);

  return {
    method: 'moving_average',
    historical: data,
    forecast,
    lower,
    upper,
    accuracy,
    mape,
    mae,
    rmse,
    parameters: { window, n, std_error: round2(stdError) },
    formula: `F(t) = (1/${window}) · Σ y(t-${window}..t-1)`,
  };
}

// ─── 3. Weighted Moving Average ────────────────────────────────────────────
// Weights increase linearly toward the most recent observation
export function weightedMovingAverage(
  data: TimePoint[],
  window: number = 3,
  periodsAhead: number = 6,
): ForecastResult {
  const n = data.length;
  if (n < window) throw new Error(`WMA requires at least ${window} data points`);

  const ys = data.map((d) => d.value);
  const weights = Array.from({ length: window }, (_, i) => i + 1); // 1,2,...,window
  const wSum = weights.reduce((a, b) => a + b, 0);

  const fitted: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i < window - 1) {
      fitted.push(ys[i]);
    } else {
      const slice = ys.slice(i - window + 1, i + 1);
      const wma = slice.reduce((s, y, idx) => s + y * weights[idx], 0) / wSum;
      fitted.push(wma);
    }
  }

  const residuals = ys.map((y, i) => y - fitted[i]);
  const stdError = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, n - 1));
  const margin = 1.96 * stdError;

  const extended = [...ys];
  const periodType = detectPeriodType(data.map((d) => d.period));
  const forecast: TimePoint[] = [];
  const lower: TimePoint[] = [];
  const upper: TimePoint[] = [];
  let lastPeriod = data[data.length - 1].period;
  for (let i = 0; i < periodsAhead; i++) {
    const slice = extended.slice(-window);
    const f = slice.reduce((s, y, idx) => s + y * weights[idx], 0) / wSum;
    lastPeriod = nextPeriod(lastPeriod, periodType);
    forecast.push({ period: lastPeriod, value: round2(f) });
    lower.push({ period: lastPeriod, value: round2(f - margin) });
    upper.push({ period: lastPeriod, value: round2(f + margin) });
    extended.push(f);
  }

  const mape = meanAbsPctError(ys, fitted);
  const mae = meanAbsError(ys, fitted);
  const rmse = rootMse(ys, fitted);
  const accuracy = clamp01(1 - mape / 100);

  return {
    method: 'weighted_moving_average',
    historical: data,
    forecast,
    lower,
    upper,
    accuracy,
    mape,
    mae,
    rmse,
    parameters: { window, weights: weights.join(','), n, std_error: round2(stdError) },
    formula: `F(t) = Σ(w_i · y(t-i)) / Σw_i,  w = [1..${window}]`,
  };
}

// ─── 4. Exponential Smoothing (Holt's Linear Trend) ───────────────────────
// Suitable for data with trend but no seasonality.
//   Level:   L(t) = α·y(t) + (1-α)·(L(t-1) + T(t-1))
//   Trend:   T(t) = β·(L(t) - L(t-1)) + (1-β)·T(t-1)
//   Forecast: F(t+h) = L(t) + h·T(t)
export function holtExponentialSmoothing(
  data: TimePoint[],
  alpha: number = 0.5,
  beta: number = 0.3,
  periodsAhead: number = 6,
): ForecastResult {
  const n = data.length;
  if (n < 3) throw new Error('Holt smoothing requires at least 3 data points');

  const ys = data.map((d) => d.value);
  // Initialize: L(0) = y(0), T(0) = y(1) - y(0)
  let L = ys[0];
  let T = ys[1] - ys[0];
  const fitted: number[] = [ys[0], ys[1]];

  for (let t = 2; t < n; t++) {
    const newL = alpha * ys[t] + (1 - alpha) * (L + T);
    const newT = beta * (newL - L) + (1 - beta) * T;
    L = newL;
    T = newT;
    fitted.push(L + T); // one-step-ahead fit for time t
  }

  const residuals = ys.map((y, i) => y - fitted[i]);
  const stdError = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, n - 2));
  const margin = 1.96 * stdError;

  const periodType = detectPeriodType(data.map((d) => d.period));
  const forecast: TimePoint[] = [];
  const lower: TimePoint[] = [];
  const upper: TimePoint[] = [];
  let lastPeriod = data[data.length - 1].period;
  for (let h = 1; h <= periodsAhead; h++) {
    const f = L + h * T;
    // Widen interval with horizon (forecast uncertainty grows)
    const widenedMargin = margin * Math.sqrt(h);
    lastPeriod = nextPeriod(lastPeriod, periodType);
    forecast.push({ period: lastPeriod, value: round2(f) });
    lower.push({ period: lastPeriod, value: round2(f - widenedMargin) });
    upper.push({ period: lastPeriod, value: round2(f + widenedMargin) });
  }

  const mape = meanAbsPctError(ys, fitted);
  const mae = meanAbsError(ys, fitted);
  const rmse = rootMse(ys, fitted);
  const accuracy = clamp01(1 - mape / 100);

  return {
    method: 'holt_exponential',
    historical: data,
    forecast,
    lower,
    upper,
    accuracy,
    mape,
    mae,
    rmse,
    parameters: { alpha, beta, level: round2(L), trend: round4(T), n, std_error: round2(stdError) },
    formula: `L=α·y+(1-α)·(L+T),  T=β·ΔL+(1-β)·T,  F(t+h)=L+h·T  (α=${alpha}, β=${beta})`,
  };
}

// ─── 5. CAGR (Compound Annual Growth Rate) ────────────────────────────────
// Suitable for long-term strategic forecasting.
//   CAGR = (V_end / V_start)^(1/n) - 1
//   F(t+h) = V_end · (1 + CAGR)^(h · periodFactor)
export function cagrForecast(
  data: TimePoint[],
  periodsAhead: number = 6,
): ForecastResult {
  const n = data.length;
  if (n < 2) throw new Error('CAGR requires at least 2 data points');

  const ys = data.map((d) => d.value);
  const start = ys[0];
  const end = ys[n - 1];
  if (start <= 0) throw new Error('CAGR requires positive starting value');

  const cagr = Math.pow(end / start, 1 / (n - 1)) - 1;
  const growthRate = cagr; // per period

  const fitted: number[] = ys.map((_, i) => start * Math.pow(1 + growthRate, i));
  const residuals = ys.map((y, i) => y - fitted[i]);
  const stdError = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, n - 1));
  const margin = 1.96 * stdError;

  const periodType = detectPeriodType(data.map((d) => d.period));
  const forecast: TimePoint[] = [];
  const lower: TimePoint[] = [];
  const upper: TimePoint[] = [];
  let lastPeriod = data[data.length - 1].period;
  for (let h = 1; h <= periodsAhead; h++) {
    const f = end * Math.pow(1 + growthRate, h);
    lastPeriod = nextPeriod(lastPeriod, periodType);
    forecast.push({ period: lastPeriod, value: round2(f) });
    lower.push({ period: lastPeriod, value: round2(f - margin) });
    upper.push({ period: lastPeriod, value: round2(f + margin) });
  }

  const mape = meanAbsPctError(ys, fitted);
  const mae = meanAbsError(ys, fitted);
  const rmse = rootMse(ys, fitted);
  const accuracy = clamp01(1 - mape / 100);

  return {
    method: 'cagr',
    historical: data,
    forecast,
    lower,
    upper,
    accuracy,
    mape,
    mae,
    rmse,
    parameters: { cagr: round4(cagr), growth_rate_pct: round2(cagr * 100), start, end, n },
    formula: `CAGR = (${round2(end)}/${round2(start)})^(1/${n-1}) - 1 = ${round2(cagr * 100)}%  →  F(t+h)=V_end·(1+CAGR)^h`,
  };
}

// ─── 6. Best-fit Selector ──────────────────────────────────────────────────
// Tries all methods, returns the one with highest accuracy (lowest MAPE).
export function bestFitForecast(
  data: TimePoint[],
  periodsAhead: number = 6,
): ForecastResult & { tried: Array<{ method: string; accuracy: number; mape: number }> } {
  const tried: Array<{ method: string; accuracy: number; mape: number }> = [];
  const results: ForecastResult[] = [];

  const methods: Array<() => ForecastResult> = [
    () => linearRegression(data, periodsAhead),
    () => movingAverage(data, Math.min(3, data.length - 1), periodsAhead),
    () => weightedMovingAverage(data, Math.min(3, data.length - 1), periodsAhead),
    () => holtExponentialSmoothing(data, 0.5, 0.3, periodsAhead),
    () => cagrForecast(data, periodsAhead),
  ];

  for (const m of methods) {
    try {
      const r = m();
      results.push(r);
      tried.push({ method: r.method, accuracy: r.accuracy, mape: r.mape });
    } catch (e) {
      // skip
    }
  }

  if (!results.length) throw new Error('No suitable forecasting method could be applied');

  results.sort((a, b) => b.accuracy - a.accuracy);
  return { ...results[0], tried };
}

// ─── Error Metrics ──────────────────────────────────────────────────────────
function meanAbsPctError(actual: number[], fitted: number[]): number {
  let sum = 0, count = 0;
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== 0) {
      sum += Math.abs((actual[i] - fitted[i]) / actual[i]);
      count++;
    }
  }
  return count > 0 ? round2((sum / count) * 100) : 0;
}

function meanAbsError(actual: number[], fitted: number[]): number {
  const sum = actual.reduce((s, a, i) => s + Math.abs(a - fitted[i]), 0);
  return round2(sum / Math.max(1, actual.length));
}

function rootMse(actual: number[], fitted: number[]): number {
  const sum = actual.reduce((s, a, i) => s + (a - fitted[i]) ** 2, 0);
  return round2(Math.sqrt(sum / Math.max(1, actual.length)));
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }

// ─── Accounting Ratio Analysis ─────────────────────────────────────────────
// DuPont decomposition: ROE = Net Margin × Asset Turnover × Equity Multiplier
// We provide this as a structured analysis result.
export interface AccountingRatio {
  name: string;
  nameAr: string;
  formula: string;
  value: number;
  interpretation: string;
  benchmark?: string;
}

export function computeAccountingRatios(opts: {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  netIncome: number;
  totalAssets?: number;
  totalEquity?: number;
  totalLiabilities?: number;
  cash?: number;
  currentAssets?: number;
  currentLiabilities?: number;
  inventory?: number;
}): AccountingRatio[] {
  const ratios: AccountingRatio[] = [];

  // Gross Margin
  if (opts.revenue > 0) {
    ratios.push({
      name: 'Gross Margin',
      nameAr: 'هامش الربح الإجمالي',
      formula: '(Revenue - COGS) / Revenue',
      value: round4((opts.revenue - opts.cogs) / opts.revenue),
      interpretation: opts.grossProfit / opts.revenue > 0.4
        ? 'مرتفع — يشير إلى قوة تسعير أو كفاءة تشغيلية'
        : opts.grossProfit / opts.revenue > 0.2
          ? 'متوسط — ضمن النطاق الصناعي الطبيعي'
          : 'منخفض — يحتاج مراجعة هيكل التكاليف',
      benchmark: 'صناعياً: 25-45%',
    });
  }

  // Operating Margin
  if (opts.revenue > 0) {
    ratios.push({
      name: 'Operating Margin',
      nameAr: 'هامش الربح التشغيلي',
      formula: 'Operating Income / Revenue',
      value: round4(opts.operatingIncome / opts.revenue),
      interpretation: opts.operatingIncome / opts.revenue > 0.15
        ? 'ممتاز — كفاءة تشغيلية عالية'
        : opts.operatingIncome / opts.revenue > 0.05
          ? 'مقبول — ضمن النطاق الطبيعي'
          : 'منخفض — ضغط على هوامش الربح',
      benchmark: 'صناعياً: 5-15%',
    });
  }

  // Net Margin
  if (opts.revenue > 0) {
    ratios.push({
      name: 'Net Profit Margin',
      nameAr: 'هامش صافي الربح',
      formula: 'Net Income / Revenue',
      value: round4(opts.netIncome / opts.revenue),
      interpretation: opts.netIncome / opts.revenue > 0.1
        ? 'ممتاز — ربحية صافية قوية'
        : opts.netIncome / opts.revenue > 0.03
          ? 'مقبول'
          : 'منخفض — راجع المصروفات غير التشغيلية',
      benchmark: 'صناعياً: 3-10%',
    });
  }

  // Operating Expense Ratio
  if (opts.revenue > 0) {
    ratios.push({
      name: 'Operating Expense Ratio',
      nameAr: 'نسبة المصروفات التشغيلية',
      formula: 'Operating Expenses / Revenue',
      value: round4(opts.operatingExpenses / opts.revenue),
      interpretation: opts.operatingExpenses / opts.revenue > 0.4
        ? 'مرتفع — راجع بنود الرواتب والإيجار'
        : 'ضمن النطاق الطبيعي',
      benchmark: 'صناعياً: 15-30%',
    });
  }

  // Current Ratio (liquidity)
  if (opts.currentAssets && opts.currentLiabilities && opts.currentLiabilities > 0) {
    const cr = opts.currentAssets / opts.currentLiabilities;
    ratios.push({
      name: 'Current Ratio',
      nameAr: 'نسبة التداول',
      formula: 'Current Assets / Current Liabilities',
      value: round4(cr),
      interpretation: cr >= 2
        ? 'قوي — سيولة ممتازة'
        : cr >= 1
          ? 'مقبول'
          : 'ضعيف — صعوبة في سداد الالتزامات قصيرة الأجل',
      benchmark: 'مثالي: ≥ 1.5',
    });
  }

  // Quick Ratio (acid test)
  if (opts.currentAssets && opts.inventory && opts.currentLiabilities && opts.currentLiabilities > 0) {
    const qr = (opts.currentAssets - opts.inventory) / opts.currentLiabilities;
    ratios.push({
      name: 'Quick Ratio',
      nameAr: 'نسبة السيولة السريعة',
      formula: '(Current Assets - Inventory) / Current Liabilities',
      value: round4(qr),
      interpretation: qr >= 1
        ? 'ممتاز — قدرة على السداد بدون بيع المخزون'
        : 'منخفض — اعتماد على المخزون',
      benchmark: 'مثالي: ≥ 1.0',
    });
  }

  // Debt-to-Equity (leverage)
  if (opts.totalLiabilities !== undefined && opts.totalEquity && opts.totalEquity > 0) {
    const de = opts.totalLiabilities / opts.totalEquity;
    ratios.push({
      name: 'Debt to Equity',
      nameAr: 'نسبة الدين إلى حقوق الملكية',
      formula: 'Total Liabilities / Total Equity',
      value: round4(de),
      interpretation: de > 2
        ? 'مرتفع — مخاطر مالية عالية'
        : de > 1
          ? 'متوسط'
          : 'منخفض — هيكل مالي محافظ',
      benchmark: 'صناعياً: 0.5-1.5',
    });
  }

  // ROA
  if (opts.totalAssets && opts.totalAssets > 0) {
    ratios.push({
      name: 'Return on Assets',
      nameAr: 'العائد على الأصول',
      formula: 'Net Income / Total Assets',
      value: round4(opts.netIncome / opts.totalAssets),
      interpretation: opts.netIncome / opts.totalAssets > 0.1
        ? 'ممتاز — كفاءة في استخدام الأصول'
        : opts.netIncome / opts.totalAssets > 0.05
          ? 'مقبول'
          : 'منخفض',
      benchmark: 'صناعياً: 5-10%',
    });
  }

  // ROE
  if (opts.totalEquity && opts.totalEquity > 0) {
    ratios.push({
      name: 'Return on Equity',
      nameAr: 'العائد على حقوق الملكية',
      formula: 'Net Income / Total Equity',
      value: round4(opts.netIncome / opts.totalEquity),
      interpretation: opts.netIncome / opts.totalEquity > 0.15
        ? 'ممتاز — عائد قوي للمساهمين'
        : opts.netIncome / opts.totalEquity > 0.08
          ? 'مقبول'
          : 'منخفض',
      benchmark: 'صناعياً: 8-15%',
    });
  }

  // Asset Turnover
  if (opts.totalAssets && opts.totalAssets > 0 && opts.revenue > 0) {
    ratios.push({
      name: 'Asset Turnover',
      nameAr: 'معدل دوران الأصول',
      formula: 'Revenue / Total Assets',
      value: round4(opts.revenue / opts.totalAssets),
      interpretation: opts.revenue / opts.totalAssets > 1
        ? 'ممتاز — كفاءة في توليد المبيعات'
        : 'مقبول — نمو بطيء نسبياً',
      benchmark: 'صناعياً: 0.5-2.0',
    });
  }

  return ratios;
}

// ─── Variance Analysis (Actual vs Budget / Prior Period) ────────────────────
export interface VarianceRow {
  metric: string;
  metricAr: string;
  actual: number;
  baseline: number;
  variance: number;
  variancePct: number;
  direction: 'favorable' | 'unfavorable' | 'neutral';
  interpretation: string;
}

export function computeVariance(opts: {
  metric: string;
  metricAr: string;
  actual: number;
  baseline: number;
  higherIsBetter?: boolean;
}): VarianceRow {
  const { metric, metricAr, actual, baseline, higherIsBetter = true } = opts;
  const variance = actual - baseline;
  const variancePct = baseline !== 0 ? (variance / Math.abs(baseline)) * 100 : 0;
  let direction: VarianceRow['direction'] = 'neutral';
  if (variance > 0) direction = higherIsBetter ? 'favorable' : 'unfavorable';
  else if (variance < 0) direction = higherIsBetter ? 'unfavorable' : 'favorable';

  const interp = direction === 'favorable'
    ? `أداء إيجابي — ${Math.abs(variancePct).toFixed(1)}% فوق المرجع`
    : direction === 'unfavorable'
      ? `أداء سلبي — ${Math.abs(variancePct).toFixed(1)}% تحت المرجع`
      : 'مطابق للمرجع';

  return {
    metric,
    metricAr,
    actual,
    baseline,
    variance: round2(variance),
    variancePct: round2(variancePct),
    direction,
    interpretation: interp,
  };
}
