// ============================================================================
// regression.js — matrix-free polynomial regression with Ridge / Lasso, fit by
// coordinate descent. Shared by the Ridge, Lasso, and Bias-Variance applets.
//
// No linear algebra libraries / matrix inverses: everything is scalar loops and
// dot products. Coordinate descent is the natural matrix-free solver for Lasso
// (soft-thresholding) and works for Ridge too.
//
// Objective (per-sample scaled, features standardized so lambda is comparable):
//     (1/2n) * sum_i (y_i - b0 - sum_j beta_j z_ij)^2
//        + lambda * sum_j |beta_j|              (lasso)
//        + (lambda/2) * sum_j beta_j^2          (ridge)
// The intercept b0 is never penalized.
// ============================================================================

const Reg = (function () {

  function mean(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
  function sd(a, m) { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return Math.sqrt(s / a.length); }
  const soft = (z, t) => Math.sign(z) * Math.max(Math.abs(z) - t, 0);

  // Standardized polynomial design matrix (no intercept column).
  //   returns { Z (n x d), colMean[d], colSd[d], degree }
  function polyDesign(xs, degree) {
    const n = xs.length;
    const colMean = [], colSd = [];
    const cols = [];
    for (let j = 1; j <= degree; j++) {
      const c = new Array(n);
      for (let i = 0; i < n; i++) c[i] = Math.pow(xs[i], j);
      const m = mean(c), s = sd(c, m) || 1;
      for (let i = 0; i < n; i++) c[i] = (c[i] - m) / s;
      colMean.push(m); colSd.push(s); cols.push(c);
    }
    const Z = new Array(n);
    for (let i = 0; i < n; i++) { const row = new Array(degree); for (let j = 0; j < degree; j++) row[j] = cols[j][i]; Z[i] = row; }
    return { Z, colMean, colSd, degree };
  }

  // Standardized feature row for a NEW raw x (uses training colMean/colSd).
  function designRow(x, colMean, colSd) {
    const d = colMean.length, row = new Array(d);
    for (let j = 0; j < d; j++) row[j] = (Math.pow(x, j + 1) - colMean[j]) / colSd[j];
    return row;
  }

  function predictRow(beta, b0, zrow) { let p = b0; for (let j = 0; j < beta.length; j++) p += beta[j] * zrow[j]; return p; }
  function predictX(beta, b0, x, colMean, colSd) { return predictRow(beta, b0, designRow(x, colMean, colSd)); }

  // Coordinate-descent fit. penalty: 'ridge' | 'lasso' | 'none'.
  //   warmBeta (optional) enables warm starts along a lambda path.
  //   returns { beta[d], b0 }
  function fitCD(Z, y, lambda, penalty, warmBeta) {
    const n = Z.length, d = Z[0].length;
    const zz = new Array(d).fill(0);                 // (1/n) sum z_ij^2  (= 1 when standardized)
    for (let j = 0; j < d; j++) { let s = 0; for (let i = 0; i < n; i++) s += Z[i][j] * Z[i][j]; zz[j] = s / n; }
    const beta = warmBeta ? warmBeta.slice() : new Array(d).fill(0);
    let b0 = mean(y);
    const r = new Array(n);                          // residuals
    for (let i = 0; i < n; i++) { r[i] = y[i] - predictRow(beta, b0, Z[i]); }
    for (let it = 0; it < 300; it++) {
      let maxChange = 0;
      // intercept (unpenalized): shift by mean residual
      let rm = 0; for (let i = 0; i < n; i++) rm += r[i]; rm /= n;
      b0 += rm; for (let i = 0; i < n; i++) r[i] -= rm;
      for (let j = 0; j < d; j++) {
        let zr = 0; for (let i = 0; i < n; i++) zr += Z[i][j] * r[i];
        const rho = zr / n + beta[j] * zz[j];        // partial correlation incl. current beta_j
        let bjNew;
        if (penalty === 'lasso')      bjNew = soft(rho, lambda) / zz[j];
        else if (penalty === 'ridge') bjNew = rho / (zz[j] + lambda);
        else                          bjNew = rho / zz[j];
        const diff = bjNew - beta[j];
        if (diff !== 0) { for (let i = 0; i < n; i++) r[i] -= diff * Z[i][j]; beta[j] = bjNew; if (Math.abs(diff) > maxChange) maxChange = Math.abs(diff); }
      }
      if (maxChange < 1e-8) break;
    }
    return { beta, b0 };
  }

  // Smallest lambda that zeros every Lasso coefficient: max_j |(1/n) z_j . (y - ybar)|
  function lassoLambdaMax(Z, y) {
    const n = Z.length, d = Z[0].length, yb = mean(y);
    let lmax = 0;
    for (let j = 0; j < d; j++) { let s = 0; for (let i = 0; i < n; i++) s += Z[i][j] * (y[i] - yb); s = Math.abs(s / n); if (s > lmax) lmax = s; }
    return lmax;
  }

  // Log-spaced lambda grid (descending), from lmax down to lmax*ratio.
  function lambdaGrid(lmax, nGrid, ratio) {
    nGrid = nGrid || 60; ratio = ratio || 1e-3;
    const hi = Math.log(lmax), lo = Math.log(lmax * ratio), out = [];
    for (let k = 0; k < nGrid; k++) out.push(Math.exp(hi - (hi - lo) * (k / (nGrid - 1))));
    return out;                                       // grid[0] = lmax (all zero), increasing flexibility after
  }

  // Coefficient path over a lambda grid (warm-started). Returns [{lambda, beta, b0}].
  function coefPath(Z, y, penalty, grid) {
    const out = []; let warm = null;
    for (let k = 0; k < grid.length; k++) { const f = fitCD(Z, y, grid[k], penalty, warm); warm = f.beta; out.push({ lambda: grid[k], beta: f.beta.slice(), b0: f.b0 }); }
    return out;
  }

  function mseRows(Z, y, beta, b0) { let s = 0; for (let i = 0; i < Z.length; i++) { const e = y[i] - predictRow(beta, b0, Z[i]); s += e * e; } return s / Z.length; }

  // k-fold CV. Refits per fold using each fold's OWN standardization (honest CV).
  // Returns [{lambda, trainMSE, valMSE}] aligned to grid.
  function kFoldCV(xs, ys, degree, penalty, grid, k) {
    k = k || 5;
    const n = xs.length, idx = []; for (let i = 0; i < n; i++) idx.push(i);
    // deterministic shuffle (LCG) so results are stable
    let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    const train = grid.map(() => 0), val = grid.map(() => 0);
    for (let fold = 0; fold < k; fold++) {
      const valIdx = idx.filter((_, p) => p % k === fold), trIdx = idx.filter((_, p) => p % k !== fold);
      const xtr = trIdx.map(i => xs[i]), ytr = trIdx.map(i => ys[i]);
      const xva = valIdx.map(i => xs[i]), yva = valIdx.map(i => ys[i]);
      const D = polyDesign(xtr, degree);
      const Ztr = D.Z, Zva = xva.map(x => designRow(x, D.colMean, D.colSd));
      let warm = null;
      for (let g = 0; g < grid.length; g++) {
        const f = fitCD(Ztr, ytr, grid[g], penalty, warm); warm = f.beta;
        train[g] += mseRows(Ztr, ytr, f.beta, f.b0);
        val[g]   += mseRows(Zva, yva, f.beta, f.b0);
      }
    }
    return grid.map((lam, g) => ({ lambda: lam, trainMSE: train[g] / k, valMSE: val[g] / k }));
  }

  return { mean, sd, polyDesign, designRow, predictRow, predictX, fitCD, lassoLambdaMax, lambdaGrid, coefPath, mseRows, kFoldCV };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Reg;   // for Node testing
