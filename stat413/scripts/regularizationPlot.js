// ============================================================================
// regularizationPlot.js — shared renderer for the Ridge and Lasso applets.
//
//   buildRegApplet('ridge' | 'lasso')   (global function, called on window load)
//
// Both pages render an IDENTICAL set of four panels; only the penalty differs:
//   1. Coefficient paths vs lambda ("the trace")  — ridge shrinks smoothly,
//      lasso hits exactly 0 (sparsity).
//   2. Data + fitted degree-8 polynomial, controlled by a lambda slider.
//   3. k-fold CV: training & validation MSE vs lambda, with the CV-optimal
//      and the current lambda marked.
//   4. Geometric view in a 2-feature (beta1,beta2) plane: RSS contours, the OLS
//      solution, the constrained solution, and the constraint region
//      (circle for ridge, diamond for lasso).
//
// Uses the global `Reg` math engine (regression.js) and the global `loadCSV`
// (dataLoader.js). All features are real standardized polynomial features of
// simple_data.csv; y is not standardized (the engine fits the intercept b0).
// ============================================================================

(function () {

  // -------------------------------------------------------------- constants
  const DATA_URL = "https://raw.githubusercontent.com/lorenzoluzi/public_data/master/simple_data.csv";
  const DEGREE = 8;        // polynomial degree (real standardized features)
  const NGRID = 60;        // lambda grid length (slider index 0..NGRID-1)
  const KFOLD = 5;         // CV folds

  // panel geometry (mirrors gradient-descent.html)
  const W = 360, H = 300, M = { top: 16, right: 18, bottom: 46, left: 56 };

  // a distinct colour per coefficient j = 1..8 (Tableau-ish, colour-safe-ish)
  const COEF_COLORS = [
    "#1f77b4", "#d62728", "#2ca02c", "#9467bd",
    "#ff7f0e", "#17becf", "#8c564b", "#e377c2"
  ];
  const C = {
    data: "#3070B7", fit: "#D55E00", train: "#0072BD", val: "#D55E00",
    ols: "#377e22", point: "#111", cur: "#7a1fa2", region: "#7a1fa2",
    grid: "#bbb", zero: "#999"
  };

  // -------------------------------------------------------------- error banner
  function showError(err) {
    console.error(err);
    let el = document.getElementById("reg-error");
    if (!el) {
      el = document.createElement("div");
      el.id = "reg-error";
      el.style.cssText = "background:#ffe2e2;border:1px solid #d33;color:#900;" +
        "padding:10px 14px;margin:10px 0;border-radius:6px;font-weight:bold;";
      document.body.prepend(el);
    }
    el.textContent = "Regularization applet error: " + ((err && err.message) || err);
  }

  // -------------------------------------------------------------- helpers
  function clear(sel) { d3.select(sel).selectAll("*").remove(); }

  function svgIn(sel) {
    return d3.select(sel).append("svg")
      .attr("width", W + M.left + M.right)
      .attr("height", H + M.top + M.bottom)
      .append("g").attr("transform", `translate(${M.left},${M.top})`);
  }

  function typesetEq(el) {
    if (!el) return;
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([el]).catch(() => {});
    } else if (window.MathJax && MathJax.startup && MathJax.startup.promise) {
      MathJax.startup.promise.then(() => MathJax.typesetPromise([el])).catch(() => {});
    }
  }

  // =========================================================================
  // main entry point
  // =========================================================================
  function buildRegApplet(penalty) {
    try {
      if (typeof d3 === "undefined")
        throw new Error("d3 did not load — check the d3 <script> tag / your network.");
      if (typeof d3.contours !== "function" || typeof d3.interpolateBlues !== "function")
        throw new Error("this d3 build is missing d3.contours / d3.interpolateBlues.");
      if (typeof Reg === "undefined")
        throw new Error("../scripts/regression.js did not load.");
      if (typeof loadCSV !== "function")
        throw new Error("../scripts/dataLoader.js did not load.");
      if (penalty !== "ridge" && penalty !== "lasso")
        throw new Error("buildRegApplet: penalty must be 'ridge' or 'lasso'.");

      loadCSV(DATA_URL).then(rows => {
        try { render(rows, penalty); }
        catch (err) { showError(err); }
      }).catch(err =>
        showError(new Error("could not load data from " + DATA_URL + " — " + ((err && err.message) || err)))
      );
    } catch (err) {
      showError(err);
    }
  }

  // =========================================================================
  // render everything once the data has loaded
  // =========================================================================
  function render(rows, penalty) {
    const isRidge = penalty === "ridge";

    // ---- data (raw; engine standardizes the feature columns internally) ----
    const xs = rows.map(r => +r.x);
    const ys = rows.map(r => +r.y);

    // ---- shared design / lambda grid (degree 8) ----
    const D = Reg.polyDesign(xs, DEGREE);
    const lmax = Reg.lassoLambdaMax(D.Z, ys);
    const grid = Reg.lambdaGrid(lmax, NGRID);          // grid[0] = lmax (most regularized)

    // full coefficient path + CV over that SAME grid
    const path = Reg.coefPath(D.Z, ys, penalty, grid); // [{lambda, beta, b0}]
    const cv = Reg.kFoldCV(xs, ys, DEGREE, penalty, grid, KFOLD); // [{lambda,trainMSE,valMSE}]

    // CV-optimal grid index (default slider position)
    let cvBest = 0;
    for (let i = 1; i < cv.length; i++) if (cv[i].valMSE < cv[cvBest].valMSE) cvBest = i;

    // ---- 2-feature design for the geometric panel ----
    const D2 = Reg.polyDesign(xs, 2);
    const ols2 = Reg.fitCD(D2.Z, ys, 0, "none");       // OLS (beta1,beta2)
    const b0fixed = Reg.mean(ys);                      // fix intercept for the RSS surface

    // current slider state
    let cur = cvBest;                                   // index into grid
    const lambdaAt = i => grid[i];

    // -------------------------------------------------- build static skeletons
    ["#reg-paths", "#reg-fit", "#reg-cv", "#reg-geo"].forEach(clear);

    const P = buildPaths(grid, path);
    const F = buildFit(xs, ys, D);
    const V = buildCV(grid, cv, cvBest);
    const G = buildGeo(D2, ys, ols2, b0fixed, isRidge);

    // -------------------------------------------------- dynamic redraw
    function redraw() {
      const lambda = lambdaAt(cur);
      P.update(cur);
      F.update(lambda, penalty);
      V.update(cur);
      G.update(lambda, penalty);
      // slider readout
      const out = document.getElementById("reg-lambda-out");
      if (out) out.textContent = lambda.toPrecision(3) + "  (index " + cur + " / " + (grid.length - 1) + ")";
    }

    // -------------------------------------------------- wire the slider
    const slider = document.getElementById("reg-lambda");
    if (slider) {
      slider.min = 0;
      slider.max = grid.length - 1;
      slider.step = 1;
      slider.value = cur;
      slider.addEventListener("input", e => { cur = +e.target.value; redraw(); });
    }

    // -------------------------------------------------- equations
    writeEquation(isRidge);

    redraw();
  }

  // =========================================================================
  // PANEL 1 — coefficient paths vs lambda (the "trace")
  // =========================================================================
  function buildPaths(grid, path) {
    const g = svgIn("#reg-paths");

    // log x over the lambda grid; y over the full range of coefficient values
    const lamExtent = d3.extent(grid);
    const x = d3.scaleLog().domain([lamExtent[0], lamExtent[1]]).range([0, W]);
    let lo = Infinity, hi = -Infinity;
    for (const p of path) for (const b of p.beta) { if (b < lo) lo = b; if (b > hi) hi = b; }
    const pad = 0.08 * (hi - lo || 1);
    const y = d3.scaleLinear().domain([lo - pad, hi + pad]).range([H, 0]);

    g.append("g").call(d3.axisLeft(y).ticks(6));
    g.append("g").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x).ticks(5, "~g"));
    g.append("text").attr("x", W / 2).attr("y", H + 38).attr("text-anchor", "middle")
      .attr("font-size", 13).text("λ  (log scale)");
    g.append("text").attr("transform", "rotate(-90)").attr("x", -H / 2).attr("y", -42)
      .attr("text-anchor", "middle").attr("font-size", 13).text("coefficient  βⱼ");

    // light horizontal line at 0
    g.append("line").attr("x1", 0).attr("x2", W).attr("y1", y(0)).attr("y2", y(0))
      .attr("stroke", C.zero).attr("stroke-dasharray", "3,3").attr("stroke-width", 1);

    // one line per coefficient j = 0..d-1  (label j+1 = polynomial power)
    const d = path[0].beta.length;
    const line = d3.line().x(p => x(p.lambda)).y(p => y(p.beta));
    for (let j = 0; j < d; j++) {
      const series = path.map(p => ({ lambda: p.lambda, beta: p.beta[j] }));
      g.append("path").datum(series).attr("fill", "none")
        .attr("stroke", COEF_COLORS[j % COEF_COLORS.length])
        .attr("stroke-width", 1.8).attr("opacity", 0.9).attr("d", line);
    }

    // small legend (powers 1..d)
    const leg = g.append("g").attr("transform", `translate(${W - 64},6)`);
    for (let j = 0; j < d; j++) {
      const row = leg.append("g").attr("transform", `translate(0,${j * 13})`);
      row.append("line").attr("x1", 0).attr("x2", 14).attr("y1", 0).attr("y2", 0)
        .attr("stroke", COEF_COLORS[j % COEF_COLORS.length]).attr("stroke-width", 2);
      row.append("text").attr("x", 18).attr("y", 3).attr("font-size", 9)
        .text("β" + subscript(j + 1));
    }

    // moving vertical line at the current lambda
    const vline = g.append("line").attr("y1", 0).attr("y2", H)
      .attr("stroke", C.cur).attr("stroke-width", 1.6).attr("opacity", 0.85);

    return {
      update(idx) {
        const lx = x(grid[idx]);
        vline.attr("x1", lx).attr("x2", lx);
      }
    };
  }

  // =========================================================================
  // PANEL 2 — data + fitted polynomial, controlled by the lambda slider
  // =========================================================================
  function buildFit(xs, ys, D) {
    const g = svgIn("#reg-fit");

    const xpad = 0.06 * (d3.max(xs) - d3.min(xs));
    const ypad = 0.08 * (d3.max(ys) - d3.min(ys));
    const x = d3.scaleLinear().domain([d3.min(xs) - xpad, d3.max(xs) + xpad]).range([0, W]);
    const y = d3.scaleLinear().domain([d3.min(ys) - ypad, d3.max(ys) + ypad]).range([H, 0]);

    g.append("g").call(d3.axisLeft(y).ticks(6));
    g.append("g").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x).ticks(6));
    g.append("text").attr("x", W / 2).attr("y", H + 38).attr("text-anchor", "middle")
      .attr("font-size", 13).text("x");
    g.append("text").attr("transform", "rotate(-90)").attr("x", -H / 2).attr("y", -42)
      .attr("text-anchor", "middle").attr("font-size", 13).text("y");

    // clip so the curve never escapes the plotting area
    g.append("defs").append("clipPath").attr("id", "reg-fit-clip")
      .append("rect").attr("width", W).attr("height", H);

    // scatter
    g.selectAll("circle.pt").data(xs.map((xi, i) => [xi, ys[i]])).join("circle")
      .attr("class", "pt").attr("cx", d => x(d[0])).attr("cy", d => y(d[1]))
      .attr("r", 3.4).attr("fill", C.data).attr("opacity", 0.8);

    const gCurve = g.append("g").attr("clip-path", "url(#reg-fit-clip)");

    // ~120 grid x for the fitted curve
    const NX = 120;
    const xg = [];
    const x0 = x.domain()[0], x1 = x.domain()[1];
    for (let k = 0; k < NX; k++) xg.push(x0 + (x1 - x0) * (k / (NX - 1)));

    const line = d3.line().x(d => x(d[0])).y(d => y(d[1]));

    return {
      update(lambda, penalty) {
        const fit = Reg.fitCD(D.Z, ys, lambda, penalty);
        const curve = xg.map(xv => [xv, Reg.predictX(fit.beta, fit.b0, xv, D.colMean, D.colSd)]);
        gCurve.selectAll("path.fit").data([curve]).join("path")
          .attr("class", "fit").attr("fill", "none").attr("stroke", C.fit)
          .attr("stroke-width", 2.5).attr("d", line);
      }
    };
  }

  // =========================================================================
  // PANEL 3 — k-fold CV: training & validation MSE vs lambda
  // =========================================================================
  function buildCV(grid, cv, cvBest) {
    const g = svgIn("#reg-cv");

    const lamExtent = d3.extent(grid);
    const x = d3.scaleLog().domain([lamExtent[0], lamExtent[1]]).range([0, W]);
    const allMSE = cv.flatMap(d => [d.trainMSE, d.valMSE]).filter(v => isFinite(v));
    const ymax = d3.max(allMSE), ymin = d3.min(allMSE);
    const pad = 0.10 * (ymax - ymin || 1);
    const y = d3.scaleLinear().domain([Math.max(0, ymin - pad), ymax + pad]).range([H, 0]);

    g.append("g").call(d3.axisLeft(y).ticks(6));
    g.append("g").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x).ticks(5, "~g"));
    g.append("text").attr("x", W / 2).attr("y", H + 38).attr("text-anchor", "middle")
      .attr("font-size", 13).text("λ  (log scale)");
    g.append("text").attr("transform", "rotate(-90)").attr("x", -H / 2).attr("y", -42)
      .attr("text-anchor", "middle").attr("font-size", 13).text("mean squared error");

    const lineTrain = d3.line().x(d => x(d.lambda)).y(d => y(d.trainMSE));
    const lineVal = d3.line().x(d => x(d.lambda)).y(d => y(d.valMSE));
    g.append("path").datum(cv).attr("fill", "none").attr("stroke", C.train)
      .attr("stroke-width", 2).attr("d", lineTrain);
    g.append("path").datum(cv).attr("fill", "none").attr("stroke", C.val)
      .attr("stroke-width", 2).attr("d", lineVal);

    // CV-optimal lambda (fixed marker + label)
    const bx = x(grid[cvBest]);
    g.append("line").attr("x1", bx).attr("x2", bx).attr("y1", 0).attr("y2", H)
      .attr("stroke", C.ols).attr("stroke-width", 1.5).attr("stroke-dasharray", "5,4");
    g.append("text").attr("x", bx).attr("y", -4).attr("text-anchor", "middle")
      .attr("font-size", 10).attr("fill", C.ols).text("CV min");

    // legend
    const leg = g.append("g").attr("transform", `translate(${W - 96},6)`);
    [["train MSE", C.train, 0], ["validation MSE", C.val, 14]].forEach(([t, c, dy]) => {
      const r = leg.append("g").attr("transform", `translate(0,${dy})`);
      r.append("line").attr("x1", 0).attr("x2", 16).attr("y1", 0).attr("y2", 0)
        .attr("stroke", c).attr("stroke-width", 2);
      r.append("text").attr("x", 20).attr("y", 3).attr("font-size", 10).text(t);
    });

    // moving vertical line at the current lambda
    const vline = g.append("line").attr("y1", 0).attr("y2", H)
      .attr("stroke", C.cur).attr("stroke-width", 1.6).attr("opacity", 0.85);

    return {
      update(idx) {
        const lx = x(grid[idx]);
        vline.attr("x1", lx).attr("x2", lx);
      }
    };
  }

  // =========================================================================
  // PANEL 4 — geometric view in the (beta1, beta2) plane
  // =========================================================================
  function buildGeo(D2, ys, ols2, b0fixed, isRidge) {
    const g = svgIn("#reg-geo");

    // window centred on the OLS solution, padded to include the origin
    const ox = ols2.beta[0], oy = ols2.beta[1];
    const hw = Math.max(2.0, Math.abs(ox) + 1.0, Math.abs(oy) + 1.0); // half-width
    const xDom = [Math.min(ox, 0) - 1.0, Math.max(ox, 0) + 1.0];
    const yDom = [Math.min(oy, 0) - 1.0, Math.max(oy, 0) + 1.0];
    // symmetric-ish window that always contains origin and OLS
    const loX = Math.min(0, ox) - 0.6 * hw, hiX = Math.max(0, ox) + 0.6 * hw;
    const loY = Math.min(0, oy) - 0.6 * hw, hiY = Math.max(0, oy) + 0.6 * hw;

    const x = d3.scaleLinear().domain([loX, hiX]).range([0, W]);
    const y = d3.scaleLinear().domain([loY, hiY]).range([H, 0]);

    g.append("g").call(d3.axisLeft(y).ticks(6));
    g.append("g").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x).ticks(6));
    g.append("text").attr("x", W / 2).attr("y", H + 38).attr("text-anchor", "middle")
      .attr("font-size", 13).text("β₁");
    g.append("text").attr("transform", "rotate(-90)").attr("x", -H / 2).attr("y", -42)
      .attr("text-anchor", "middle").attr("font-size", 13).text("β₂");

    // dashed axes through the origin
    g.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", 0).attr("y2", H)
      .attr("stroke", C.grid).attr("stroke-dasharray", "3,3");
    g.append("line").attr("x1", 0).attr("x2", W).attr("y1", y(0)).attr("y2", y(0))
      .attr("stroke", C.grid).attr("stroke-dasharray", "3,3");

    // ---- RSS contours on a 60x60 grid (b0 fixed at mean(y)) ----
    const NXg = 60, NYg = 60;
    const values = new Array(NXg * NYg);
    let zmin = Infinity, zmax = -Infinity;
    for (let jb = 0; jb < NYg; jb++) {
      const b2 = loY + (jb / (NYg - 1)) * (hiY - loY);
      for (let ib = 0; ib < NXg; ib++) {
        const b1 = loX + (ib / (NXg - 1)) * (hiX - loX);
        const z = Reg.mseRows(D2.Z, ys, [b1, b2], b0fixed);
        values[jb * NXg + ib] = z;
        if (z < zmin) zmin = z;
        if (z > zmax) zmax = z;
      }
    }
    const zcap = zmin + 0.85 * (zmax - zmin);
    const levels = d3.range(1, 13).map(k => zmin + (zcap - zmin) * Math.pow(k / 13, 1.7));
    const contours = d3.contours().size([NXg, NYg]).thresholds(levels)(values);
    const sx = d3.scaleLinear([0, NXg - 1], [0, W]);
    const sy = d3.scaleLinear([0, NYg - 1], [H, 0]);
    const toPath = (c) => {
      let p = "";
      for (const poly of c.coordinates)
        for (const ring of poly) {
          ring.forEach((pt, k) => { p += (k === 0 ? "M" : "L") + sx(pt[0]) + "," + sy(pt[1]); });
          p += "Z";
        }
      return p;
    };
    g.selectAll("path.iso").data(contours).join("path").attr("class", "iso")
      .attr("d", toPath).attr("fill", "none")
      .attr("stroke", (d, i) => d3.interpolateBlues(0.30 + 0.6 * (i / levels.length)))
      .attr("stroke-width", 1.1);

    // ---- OLS solution marker (green star) ----
    g.append("path").attr("d", d3.symbol(d3.symbolStar, 150)())
      .attr("transform", `translate(${x(ox)},${y(oy)})`)
      .attr("fill", C.ols).attr("stroke", "#fff").attr("stroke-width", 1);
    g.append("text").attr("x", x(ox) + 8).attr("y", y(oy) - 6)
      .attr("font-size", 10).attr("fill", C.ols).text("OLS");

    // ---- dynamic layers: constraint region + constrained point ----
    const gRegion = g.append("g");
    const gPoint = g.append("g");

    return {
      update(lambda, penalty) {
        const c = Reg.fitCD(D2.Z, ys, lambda, penalty);
        const b1 = c.beta[0], b2 = c.beta[1];

        // constraint region passing through (b1,b2):
        //   ridge  -> circle of radius t = sqrt(b1^2 + b2^2)
        //   lasso  -> diamond |x| + |y| = t,  t = |b1| + |b2|
        let regionPath;
        if (isRidge) {
          const t = Math.sqrt(b1 * b1 + b2 * b2);
          const pts = [];
          const N = 80;
          for (let k = 0; k <= N; k++) {
            const a = (k / N) * 2 * Math.PI;
            pts.push([x(t * Math.cos(a)), y(t * Math.sin(a))]);
          }
          regionPath = "M" + pts.map(p => p.join(",")).join("L") + "Z";
        } else {
          const t = Math.abs(b1) + Math.abs(b2);
          const corners = [[t, 0], [0, t], [-t, 0], [0, -t]];
          regionPath = "M" + corners.map(p => x(p[0]) + "," + y(p[1])).join("L") + "Z";
        }
        gRegion.selectAll("path.region").data([0]).join("path").attr("class", "region")
          .attr("d", regionPath).attr("fill", C.region).attr("fill-opacity", 0.08)
          .attr("stroke", C.region).attr("stroke-width", 1.6);

        // constrained solution (moving point)
        gPoint.selectAll("circle.cur").data([0]).join("circle").attr("class", "cur")
          .attr("cx", x(b1)).attr("cy", y(b2)).attr("r", 5)
          .attr("fill", C.cur).attr("stroke", "#fff").attr("stroke-width", 1.5);
      }
    };
  }

  // =========================================================================
  // equation panel
  // =========================================================================
  function writeEquation(isRidge) {
    const el = document.getElementById("reg-eq");
    if (!el) return;
    if (isRidge) {
      el.innerHTML =
        '<div>objective:&nbsp; \\( \\dfrac{1}{2n}\\sum_i (y_i-\\hat{y}_i)^2 + \\dfrac{\\lambda}{2}\\sum_j \\beta_j^2 \\)</div>' +
        '<div>coordinate update:&nbsp; \\( \\beta_j \\leftarrow \\dfrac{\\rho_j}{1+\\lambda} \\)&nbsp;,&nbsp; ' +
          '\\( \\rho_j = \\dfrac{1}{n}\\sum_i z_{ij}\\,(r_i + \\beta_j z_{ij}) \\)</div>' +
        '<div class="muted">features standardized so \\( \\frac{1}{n}\\sum_i z_{ij}^2 = 1 \\); ridge shrinks every \\( \\beta_j \\) toward 0 but not exactly to 0.</div>' +
        '<div class="muted">the intercept \\( \\beta_0 \\) is not penalized.</div>';
    } else {
      el.innerHTML =
        '<div>objective:&nbsp; \\( \\dfrac{1}{2n}\\sum_i (y_i-\\hat{y}_i)^2 + \\lambda\\sum_j |\\beta_j| \\)</div>' +
        '<div>coordinate update:&nbsp; \\( \\beta_j \\leftarrow S_{\\lambda}(\\rho_j) \\)&nbsp;,&nbsp; ' +
          '\\( \\rho_j = \\dfrac{1}{n}\\sum_i z_{ij}\\,(r_i + \\beta_j z_{ij}) \\)</div>' +
        '<div>soft-threshold:&nbsp; \\( S_{\\lambda}(z) = \\operatorname{sign}(z)\\,\\max(|z|-\\lambda,\\,0) \\) ' +
          '<span class="muted">&rarr; drives coefficients to exactly 0 (sparsity).</span></div>' +
        '<div class="muted">features standardized so \\( \\frac{1}{n}\\sum_i z_{ij}^2 = 1 \\); the intercept \\( \\beta_0 \\) is not penalized.</div>';
    }
    typesetEq(el);
  }

  // unicode subscript digits for the small legend (1..8)
  function subscript(n) {
    const map = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
                  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
    return String(n).split("").map(d => map[d] || d).join("");
  }

  // expose globally (called from the page on window load)
  window.buildRegApplet = buildRegApplet;

})();
