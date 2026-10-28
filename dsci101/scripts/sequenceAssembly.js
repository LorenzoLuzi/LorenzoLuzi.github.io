/* ==========================================================================
   sequenceAssembly.js  —  shared engine for the DRAFT "sequence-assembly"
   applet type (ordering / assembly tasks: decode & build).

   One page = one SEQ object (see draft-skill-type-sequence-assembly.md).
   Call buildSeqApplet(SEQ) after DOM load. Everything (bank, slots, grading,
   feedback, tiers, progress) derives from SEQ.

   NOTE (draft stage): this engine injects its own structural CSS so the three
   example pages can stay thin. When the type is promoted into the skill, that
   CSS should move into the project's shared global.css and the template asset
   should link it, per the SKILL.md "one shared stylesheet" rule.
   ========================================================================== */
(function () {
  "use strict";

  // ---- small utils ---------------------------------------------------------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (tag, cls, txt) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };
  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }
  function shuffleNotEqual(a) {          // shuffle so display order != given order
    if (a.length < 2) return a.slice();
    let r = shuffle(a), guard = 0;
    while (r.join("|") === a.join("|") && guard++ < 50) r = shuffle(a);
    return r;
  }
  const uniq = arr => [...new Set(arr)];

  // ---- one-time CSS (see note above) --------------------------------------
  function injectCSS() {
    if (document.getElementById("seq-css")) return;
    const s = el("style"); s.id = "seq-css";
    s.textContent = `
    #seq { max-width: 900px; margin: 0 auto; }
    #seq .prompt { font-size: 1.12em; line-height: 1.5; background: #f4f7fb;
      border-left: 4px solid #0072BD; padding: 12px 16px; margin: 14px 0; border-radius: 4px; }
    #seq .passage { font-style: italic; background: #fdf6e3; border-left: 4px solid #c9a227;
      padding: 10px 14px; margin: 10px 0; border-radius: 4px; }
    #seq .passage .hint { display:block; font-style: normal; font-size: .86em; color:#7a6a1f; margin-top:6px; }
    #seq .toolbar { display: flex; flex-wrap: wrap; gap: 14px; align-items: center;
      margin: 12px 0; padding: 10px 0; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; }
    #seq .toolbar .group { display: flex; align-items: center; gap: 6px; }
    #seq .toolbar label { font-size: .82em; color:#555; text-transform: uppercase; letter-spacing:.03em; }
    #seq .seg { display:inline-flex; border:1px solid #0072BD; border-radius:6px; overflow:hidden; }
    #seq .seg button { border:none; background:#fff; color:#0072BD; padding:5px 12px; cursor:pointer; font-size:.95em; }
    #seq .seg button.on { background:#0072BD; color:#fff; }
    #seq select { padding:4px 6px; font-size:.95em; }
    #seq .progress { margin-left:auto; font-size:.9em; color:#555; }

    /* BUILD mode */
    #seq .colwrap { display:flex; gap:26px; flex-wrap:wrap; align-items:flex-start; }
    #seq .col { flex:1 1 300px; }
    #seq .col h3 { font-size:.95em; text-transform:uppercase; letter-spacing:.04em; color:#666; margin:.2em 0 .5em; }
    #seq .bank, #seq .slots { min-height:60px; }
    #seq .tile { display:block; width:100%; text-align:left; margin:6px 0; padding:9px 12px;
      border:1px solid #bbb; border-radius:6px; background:#fff; cursor:pointer; font-size:1em; line-height:1.35; }
    #seq .tile:hover { border-color:#0072BD; background:#f0f6fc; }
    #seq .slots { counter-reset: slot; }
    #seq .slot { display:flex; align-items:flex-start; gap:8px; margin:6px 0; }
    #seq .slot .n { flex:0 0 1.6em; height:1.6em; line-height:1.6em; text-align:center; border-radius:50%;
      background:#0072BD; color:#fff; font-weight:bold; font-size:.85em; margin-top:6px; }
    #seq .slot .tile { margin:0; flex:1; }
    #seq .slot .empty { flex:1; border:1px dashed #bbb; border-radius:6px; padding:9px 12px; color:#aaa; font-style:italic; }
    #seq .slot .arrows { display:flex; flex-direction:column; margin-top:4px; }
    #seq .slot .arrows button { border:1px solid #ccc; background:#fff; cursor:pointer; width:1.6em; height:1.2em; line-height:1; padding:0; font-size:.7em; }
    #seq .tile.bad { border-color:#B03030; background:#FFE5E5; }
    #seq .tile.good { border-color:#2E7D32; background:#E7F5E8; }

    /* DECODE mode */
    #seq table.decode { border-collapse:collapse; width:100%; margin-top:6px; }
    #seq table.decode th, #seq table.decode td { border:1px solid #ccc; padding:8px 10px; text-align:left; vertical-align:top; }
    #seq table.decode th { background:#f4f7fb; font-size:.85em; text-transform:uppercase; letter-spacing:.03em; color:#555; }
    #seq table.decode .part { font-weight:bold; font-size:1.05em; }
    #seq table.decode td.right { background:#E7F5E8; }
    #seq table.decode td.wrong { background:#FFE5E5; }

    #seq .controls { margin:16px 0 6px; }
    #seq .controls button { margin-right:8px; padding:7px 16px; font-size:.95em; cursor:pointer; }
    #seq .btn-primary { background:#0072BD; color:#fff; border:1px solid #0072BD; border-radius:6px; }
    #seq .btn-plain { background:#fff; border:1px solid #bbb; border-radius:6px; }

    /* FREE RESPONSE mode (ungraded) */
    #seq .freenote { font-size:.9em; color:#7a6a1f; background:#fdf6e3; border-left:4px solid #c9a227; padding:8px 12px; margin:8px 0; border-radius:4px; }
    #seq .free-row { display:flex; align-items:center; gap:10px; margin:8px 0; }
    #seq .free-row input { flex:1; padding:8px 10px; font-size:1em; border:1px solid #bbb; border-radius:6px; }
    #seq .free-answer { color:#2E7D32; font-weight:bold; }
    #seq table.decode input { width:100%; padding:6px 8px; font-size:.95em; border:1px solid #bbb; border-radius:5px; box-sizing:border-box; }
    #seq table.decode td.answer-cell { color:#2E7D32; }

    #seq #status { min-height:1.4em; font-weight:bold; margin:8px 0; }
    #seq .feedback { margin-top:10px; }
    #seq .feedback .msg { margin:5px 0; padding:8px 12px; border-radius:4px; font-size:.95em; }
    #seq .feedback .err { background:#FFE5E5; border-left:4px solid #B03030; }
    #seq .feedback .ok  { background:#E7F5E8; border-left:4px solid #2E7D32; }
    `;
    document.head.appendChild(s);
  }

  // ==========================================================================
  function buildSeqApplet(SEQ) {
    injectCSS();
    const root = $("#seq");
    const parts = SEQ.schema.parts;                 // shared vocabulary
    const roleLabel = SEQ.schema.roleLabel || "Role";

    // per-item merged part pool (schema parts + item distractors)
    function pool(item) {
      const p = Object.assign({}, parts);
      (item.distractors || []).forEach(d => { p[d.key] = d; });
      return p;
    }
    const partLabel = (item, k) => (pool(item)[k] || {}).label || k;

    // state
    const state = { mode: "build", tier: 1, i: 0, placed: [], bank: [], decode: {} };

    // ---- header + toolbar --------------------------------------------------
    $("#seq-title").textContent = SEQ.title;
    $("#seq-intro").textContent = SEQ.intro;

    const toolbar = el("div", "toolbar");
    const modeSeg = el("div", "seg");
    const mkModeBtn = (m, label) => {
      const b = el("button", null, label);
      b.dataset.mode = m;
      b.addEventListener("click", () => { state.mode = m; resetWork(); render(); });
      return b;
    };
    modeSeg.appendChild(mkModeBtn("build", "Build"));
    modeSeg.appendChild(mkModeBtn("decode", "Decode"));
    const modeGroup = el("div", "group");
    modeGroup.appendChild(el("label", null, "Mode"));
    modeGroup.appendChild(modeSeg);

    const tierSel = el("select");
    const TIERS = [
      [1, "1 · Arrange (correct parts only)"],
      [2, "2 · Full bank (whole vocabulary)"],
      [3, "3 · Free response (type it yourself)"],
    ];
    TIERS.forEach(([v, t]) => {
      const o = el("option", null, t); o.value = v; tierSel.appendChild(o);
    });
    tierSel.addEventListener("change", () => { state.tier = +tierSel.value; resetWork(); render(); });
    const tierGroup = el("div", "group");
    tierGroup.appendChild(el("label", null, "Difficulty"));
    tierGroup.appendChild(tierSel);

    const navGroup = el("div", "group");
    const prevBtn = el("button", "btn-plain", "‹ Prev");
    const nextBtn = el("button", "btn-plain", "Next ›");
    prevBtn.addEventListener("click", () => { step(-1); });
    nextBtn.addEventListener("click", () => { step(1); });
    navGroup.appendChild(prevBtn);
    navGroup.appendChild(nextBtn);

    const progress = el("div", "progress");

    toolbar.append(modeGroup, tierGroup, navGroup, progress);
    root.querySelector("#seq-toolbar").replaceWith(toolbar);
    toolbar.id = "seq-toolbar";

    function step(d) {
      state.i = (state.i + d + SEQ.items.length) % SEQ.items.length;
      resetWork(); render();
    }

    // ---- work area ---------------------------------------------------------
    const promptBox = $("#seq-prompt");
    const work = $("#seq-work");
    const statusBox = $("#status");
    const feedback = $("#seq-feedback");

    function item() { return SEQ.items[state.i]; }

    function bankKeysForTier(it) {
      const correct = it.target.slice();
      if (state.tier === 1) return correct;                  // arrange: correct parts only
      // tier 2 (full bank): whole vocabulary + this item's distractors
      const all = uniq(Object.keys(parts).concat((it.distractors || []).map(d => d.key)));
      return uniq(correct.concat(all));
    }
    const isFreeTier = () => state.tier === 3;               // free response: no bank, ungraded

    function resetWork() {
      const it = item();
      state.placed = [];
      state.bank = shuffleNotEqual(bankKeysForTier(it));
      state.decode = {};
      if (statusBox) { statusBox.textContent = ""; }
      if (feedback) feedback.innerHTML = "";
    }

    // ---- render ------------------------------------------------------------
    function render() {
      const it = item();
      const free = isFreeTier();
      // toolbar active states
      [...modeSeg.children].forEach(b => b.classList.toggle("on", b.dataset.mode === state.mode));
      tierSel.value = state.tier;
      progress.textContent = `Item ${state.i + 1} of ${SEQ.items.length}`;

      // prompt
      promptBox.innerHTML = "";
      const pr = el("div", "prompt");
      pr.textContent = (state.mode === "build" ? "Build: " : "Decode: ") +
        (state.mode === "build" ? it.prompt : (it.decodePrompt || it.prompt));
      promptBox.appendChild(pr);
      if (free) {
        promptBox.appendChild(el("div", "freenote",
          "Free response — type your answer from memory, then press Reveal to see a correct answer beside yours (not graded)."));
      }

      // Check is meaningless in the ungraded free tier
      checkBtn.style.display = free ? "none" : "";

      work.innerHTML = "";
      feedback.innerHTML = "";
      statusBox.textContent = "";
      if (state.mode === "build") (free ? renderBuildFree(it) : renderBuild(it));
      else (free ? renderDecodeFree(it) : renderDecode(it));
    }

    // ---- BUILD -------------------------------------------------------------
    function renderBuild(it) {
      const wrap = el("div", "colwrap");

      const bankCol = el("div", "col");
      bankCol.appendChild(el("h3", null, "Parts bank"));
      const bank = el("div", "bank"); bank.id = "seq-bank";
      bankCol.appendChild(bank);

      const slotCol = el("div", "col");
      slotCol.appendChild(el("h3", null, "Your sequence"));
      const slots = el("div", "slots"); slots.id = "seq-slots";
      slotCol.appendChild(slots);

      wrap.append(bankCol, slotCol);
      work.appendChild(wrap);
      drawBuild(it);
    }

    function drawBuild(it) {
      const bank = $("#seq-bank"), slots = $("#seq-slots");
      bank.innerHTML = ""; slots.innerHTML = "";

      state.bank.forEach(k => {
        if (state.placed.includes(k)) return;
        const t = el("button", "tile", partLabel(it, k));
        t.addEventListener("click", () => { state.placed.push(k); drawBuild(it); });
        bank.appendChild(t);
      });
      if (!bank.children.length) bank.appendChild(el("div", "empty", "(all parts placed)"));

      const n = Math.max(it.target.length, state.placed.length);
      for (let idx = 0; idx < n; idx++) {
        const row = el("div", "slot");
        row.appendChild(el("span", "n", String(idx + 1)));
        const k = state.placed[idx];
        if (k == null) {
          row.appendChild(el("div", "empty", "click a part to place it here"));
        } else {
          const t = el("button", "tile", partLabel(it, k));
          t.addEventListener("click", () => {           // return to bank
            state.placed.splice(idx, 1); drawBuild(it);
          });
          row.appendChild(t);
          const arrows = el("div", "arrows");
          const up = el("button", null, "▲"), dn = el("button", null, "▼");
          up.disabled = idx === 0;
          dn.disabled = idx === state.placed.length - 1;
          up.addEventListener("click", e => { e.stopPropagation();
            [state.placed[idx - 1], state.placed[idx]] = [state.placed[idx], state.placed[idx - 1]]; drawBuild(it); });
          dn.addEventListener("click", e => { e.stopPropagation();
            [state.placed[idx + 1], state.placed[idx]] = [state.placed[idx], state.placed[idx + 1]]; drawBuild(it); });
          arrows.append(up, dn);
          row.appendChild(arrows);
        }
        slots.appendChild(row);
      }
    }

    // Grade a build attempt against the partial order. Returns {solved, msgs[]}.
    function gradeBuild(it) {
      const placed = state.placed, tset = new Set(it.target);
      const msgs = [];
      const extras = placed.filter(k => !tset.has(k));
      const missing = it.target.filter(k => !placed.includes(k));
      const p = pool(it);

      extras.forEach(k => {
        const d = p[k] || {};
        msgs.push({ type: "err",
          text: `“${d.label || k}” doesn't belong here` +
            (d.feedback ? ` — ${d.feedback}` : (d.misconception ? ` (${d.misconception})` : ".")) });
      });
      if (missing.length)
        msgs.push({ type: "err", text: `${missing.length} required part(s) still missing from your sequence.` });

      // constraint violations (only when both endpoints placed)
      let violations = 0;
      (it.constraints || []).forEach(([a, b, reason]) => {
        const ia = placed.indexOf(a), ib = placed.indexOf(b);
        if (ia !== -1 && ib !== -1 && ia > ib) {
          violations++;
          msgs.push({ type: "err",
            text: `Order problem: “${partLabel(it, a)}” should come before “${partLabel(it, b)}” — ${reason}` });
        }
      });

      const solved = !extras.length && !missing.length && !violations && placed.length === it.target.length;
      if (solved) msgs.unshift({ type: "ok", text: "Correct — this is a valid ordering." });
      return { solved, msgs };
    }

    // ---- DECODE ------------------------------------------------------------
    function renderDecode(it) {
      const table = el("table", "decode");
      const head = el("tr");
      head.append(el("th", null, "Part"), el("th", null, roleLabel), el("th", null, "Meaning"));
      table.appendChild(head);

      const roleOpts = SEQ.schema.roles;
      let meaningOpts = uniq(it.target.map(k => parts[k].meaning));
      if (state.tier >= 2) {   // full-bank tier: offer the whole vocabulary's meanings
        meaningOpts = uniq(meaningOpts.concat(Object.values(parts).map(pp => pp.meaning)));
      }
      meaningOpts = shuffle(meaningOpts);

      it.target.forEach((k, idx) => {
        const tr = el("tr"); tr.dataset.key = k;
        tr.appendChild(el("td", "part", parts[k].label));

        const roleTd = el("td");
        roleTd.appendChild(mkSelect(roleOpts, v => { (state.decode[k] = state.decode[k] || {}).role = v; }));
        tr.appendChild(roleTd);

        const meanTd = el("td");
        meanTd.appendChild(mkSelect(meaningOpts, v => { (state.decode[k] = state.decode[k] || {}).meaning = v; }));
        tr.appendChild(meanTd);

        table.appendChild(tr);
      });
      work.appendChild(table);
    }
    function mkSelect(options, onChange) {
      const s = el("select");
      s.appendChild(el("option", null, "— choose —")).value = "";
      options.forEach(o => { const op = el("option", null, o); op.value = o; s.appendChild(op); });
      s.addEventListener("change", () => onChange(s.value));
      return s;
    }
    function gradeDecode(it) {
      let correct = 0; const total = it.target.length * 2;
      const rows = work.querySelectorAll("tr[data-key]");
      rows.forEach(tr => {
        const k = tr.dataset.key, ans = state.decode[k] || {};
        const tds = tr.querySelectorAll("td");
        const rok = ans.role === parts[k].role;
        const mok = ans.meaning === parts[k].meaning;
        tds[1].className = ans.role ? (rok ? "right" : "wrong") : "";
        tds[2].className = ans.meaning ? (mok ? "right" : "wrong") : "";
        correct += (rok ? 1 : 0) + (mok ? 1 : 0);
      });
      return { correct, total, solved: correct === total };
    }
    function revealDecode(it) {
      const rows = work.querySelectorAll("tr[data-key]");
      rows.forEach(tr => {
        const k = tr.dataset.key;
        const sels = tr.querySelectorAll("select");
        sels[0].value = parts[k].role; state.decode[k] = { role: parts[k].role, meaning: parts[k].meaning };
        sels[1].value = parts[k].meaning;
        tr.querySelectorAll("td")[1].className = "right";
        tr.querySelectorAll("td")[2].className = "right";
      });
    }

    // ---- FREE RESPONSE (ungraded; Reveal shows the correct text to compare) --
    function renderBuildFree(it) {
      const box = el("div", "freewrap");
      it.target.forEach((k, idx) => {
        const row = el("div", "free-row");
        row.appendChild(el("span", "n", String(idx + 1)));
        const inp = el("input"); inp.type = "text"; inp.placeholder = "type step " + (idx + 1) + "…";
        row.appendChild(inp);
        const ans = el("span", "free-answer"); ans.dataset.idx = idx;   // filled on reveal
        row.appendChild(ans);
        box.appendChild(row);
      });
      work.appendChild(box);
    }
    function renderDecodeFree(it) {
      const table = el("table", "decode");
      const head = el("tr");
      head.append(el("th", null, "Part"), el("th", null, "Your " + roleLabel.toLowerCase()),
                  el("th", null, "Your meaning"), el("th", null, "Correct answer (on Reveal)"));
      table.appendChild(head);
      it.target.forEach(k => {
        const tr = el("tr"); tr.dataset.key = k;
        tr.appendChild(el("td", "part", parts[k].label));
        const r = el("td"), m = el("td"), c = el("td", "answer-cell");
        const ri = el("input"); ri.type = "text"; const mi = el("input"); mi.type = "text";
        r.appendChild(ri); m.appendChild(mi);
        tr.append(r, m, c);
        table.appendChild(tr);
      });
      work.appendChild(table);
    }
    function revealFree(it) {
      if (state.mode === "build") {
        work.querySelectorAll(".free-answer").forEach(sp =>
          sp.textContent = "→ " + partLabel(it, it.target[+sp.dataset.idx]));
      } else {
        work.querySelectorAll("tr[data-key]").forEach(tr => {
          const k = tr.dataset.key;
          tr.querySelector(".answer-cell").innerHTML =
            "<strong>" + parts[k].role + "</strong> · " + parts[k].meaning;
        });
      }
    }

    // ---- controls ----------------------------------------------------------
    const checkBtn = $("#seq-check");
    function showFeedback(msgs) {
      feedback.innerHTML = "";
      msgs.forEach(m => feedback.appendChild(el("div", "msg " + (m.type === "ok" ? "ok" : "err"), m.text)));
    }
    checkBtn.addEventListener("click", () => {
      if (isFreeTier()) return;                 // free tier is ungraded
      const it = item();
      if (state.mode === "build") {
        const r = gradeBuild(it);
        statusBox.textContent = r.solved ? "Solved!" :
          (state.placed.length < it.target.length ? "Keep going — sequence not complete." : "Not quite — see notes below.");
        statusBox.style.color = r.solved ? "#2E7D32" : "#B03030";
        showFeedback(r.msgs);
      } else {
        const r = gradeDecode(it);
        statusBox.textContent = r.solved ? "All correct!" : `${r.correct} / ${r.total} correct — red cells are wrong.`;
        statusBox.style.color = r.solved ? "#2E7D32" : "#B03030";
      }
    });
    $("#seq-reveal").addEventListener("click", () => {
      const it = item();
      if (isFreeTier()) {
        revealFree(it);
        statusBox.textContent = "Correct answer shown for comparison."; statusBox.style.color = "";
        return;
      }
      if (state.mode === "build") {
        state.placed = it.target.slice(); drawBuild(it);
        showFeedback([{ type: "ok", text: "Revealed one valid ordering (others may also be valid)." }]);
        statusBox.textContent = "Solution revealed."; statusBox.style.color = "";
      } else {
        revealDecode(it);
        statusBox.textContent = "Solution revealed."; statusBox.style.color = "";
      }
    });
    $("#seq-clear").addEventListener("click", () => { resetWork(); render(); });

    // ---- go ----------------------------------------------------------------
    resetWork();
    render();
  }

  window.buildSeqApplet = buildSeqApplet;
})();
