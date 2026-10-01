const tools = [];
const $ = id => document.getElementById(id);
const ld = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } };
const sv = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const FIELD = 'display:block;width:100%;padding:10px;margin-top:4px;font-size:16px;border-radius:8px;border:1px solid #2a3e4f;background:#172733;color:#e6eef4;box-sizing:border-box';
const BTN = 'padding:10px 16px;font-size:16px;border-radius:8px;border:0;background:#4cc3cc;color:#0f1b27;margin-right:8px';

tools.push({
  name: 'Kelly',
  html: `
    <label>Bankroll <input id="bank" type="number" value="1000"></label>
    <label>Decimal odds <input id="odds" type="number" value="2.1" step="0.01"></label>
    <label>Your win chance (%) <input id="prob" type="number" value="52"></label>
    <label>Kelly fraction (%) <input id="frac" type="number" value="25"></label>
    <div id="out"></div>`,
  run() {
    const bank = +$('bank').value, odds = +$('odds').value;
    const p = +$('prob').value / 100, frac = +$('frac').value / 100;
    const b = odds - 1;
    const kelly = (b * p - (1 - p)) / b;
    $('out').innerHTML = kelly > 0
      ? `Stake: <strong>${(bank * kelly * frac).toFixed(2)}</strong><br>Edge: ${((p * b - (1 - p)) * 100).toFixed(1)}%`
      : 'No edge at these odds. Skip it.';
  }
});

tools.push({
  name: 'Poisson',
  html: `
    <label>Home expected goals <input id="lh" type="number" value="1.6" step="0.05"></label>
    <label>Away expected goals <input id="la" type="number" value="1.1" step="0.05"></label>
    <div id="out"></div>`,
  run() {
    const pm = (l, k) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
    const lh = +$('lh').value, la = +$('la').value;
    let H = 0, D = 0, A = 0, O = 0, B = 0;
    for (let i = 0; i <= 9; i++) for (let j = 0; j <= 9; j++) {
      const p = pm(lh, i) * pm(la, j);
      if (i > j) H += p; else if (i === j) D += p; else A += p;
      if (i + j > 2) O += p;
      if (i && j) B += p;
    }
    const row = (n, p) => `${n}: <strong>${(p * 100).toFixed(1)}%</strong> (fair odds ${(1 / p).toFixed(2)})<br>`;
    $('out').innerHTML = row('Home win', H) + row('Draw', D) + row('Away win', A)
      + row('Over 2.5', O) + row('Under 2.5', 1 - O) + row('Both teams score', B);
  }
});

let bets = [];
try { bets = JSON.parse(ld('bets', '[]')); } catch (e) {}
const money = v => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const betPL = b => b.r === 'W' ? b.s * (b.o - 1) : b.r === 'L' ? -b.s : 0;

tools.push({
  name: 'Tracker',
  html: `
    <div id="out" class="dash"></div>
    <div class="divider" style="grid-column:1/-1"></div>
    <div class="sec">Log a bet</div>
    <label>Starting bankroll <input id="tb" type="number" value="${ld('tb', 1000)}"></label>
    <label>Stake <input id="ts" type="number" value="20"></label>
    <label>Decimal odds <input id="to" type="number" value="1.9" step="0.01"></label>
    <label>Result
      <select id="tr" style="${FIELD}">
        <option value="W">Won</option>
        <option value="L">Lost</option>
        <option value="V">Void</option>
      </select>
    </label>
    <button id="tadd" style="${BTN}">Add bet</button>
    <button id="tundo" style="${BTN}">Undo last</button>`,
  init() {
    $('tadd').onclick = () => {
      const s = +$('ts').value, o = +$('to').value;
      if (!(s > 0 && o > 1)) return;
      bets.push({ s, o, r: $('tr').value });
      sv('bets', JSON.stringify(bets));
      this.run();
    };
    $('tundo').onclick = () => {
      bets.pop();
      sv('bets', JSON.stringify(bets));
      this.run();
    };
  },
  run() {
    const s0 = +$('tb').value || 0;
    sv('tb', s0);
    let cur = s0, pts = [s0], staked = 0, wins = 0, count = 0, peak = s0, dd = 0;
    bets.forEach(b => {
      cur += betPL(b);
      pts.push(cur);
      peak = Math.max(peak, cur);
      dd = Math.max(dd, peak - cur);
      if (b.r !== 'V') { staked += b.s; count++; if (b.r === 'W') wins++; }
    });
    const profit = cur - s0;
    const up = profit >= 0;
    const col = up ? '#3dbe8b' : '#e5675a';
    const roi = staked ? profit / staked * 100 : 0;
    const sign = v => (v >= 0 ? '+' : '-') + money(Math.abs(v));

    let chart = '<div class="empty">Log your first bet to start the bankroll curve.</div>';
    if (pts.length > 1) {
      const W = 320, H = 156, P = 16;
      const mn = Math.min(...pts), mx = Math.max(...pts), r = (mx - mn) || 1;
      const X = i => P + (i / (pts.length - 1)) * (W - 2 * P);
      const Y = v => H - P - ((v - mn) / r) * (H - 2 * P);
      const line = pts.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
      const area = `M${X(0)},${H - P} L${line.replace(/ /g, ' L')} L${X(pts.length - 1)},${H - P} Z`;
      const lx = X(pts.length - 1), ly = Y(cur);
      const grid = [0, .5, 1].map(f => `<line x1="${P}" x2="${W - P}" y1="${Y(mn + r * f).toFixed(1)}" y2="${Y(mn + r * f).toFixed(1)}" stroke="#24394b" stroke-width="1"/>`).join('');
      chart = `<svg viewBox="0 0 ${W} ${H}">
        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${col}" stop-opacity=".38"/><stop offset="1" stop-color="${col}" stop-opacity="0"/>
        </linearGradient></defs>
        ${grid}
        <text x="${P}" y="${Y(mx) - 5}" font-size="9" fill="#6f8798">${money(mx)}</text>
        <text x="${P}" y="${Y(mn) + 12}" font-size="9" fill="#6f8798">${money(mn)}</text>
        <line x1="${P}" x2="${W - P}" y1="${Y(s0).toFixed(1)}" y2="${Y(s0).toFixed(1)}" stroke="#8aa0b2" stroke-width="1" stroke-dasharray="4 4" opacity=".6"/>
        <path d="${area}" fill="url(#ag)"/>
        <polyline points="${line}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${lx}" cy="${ly}" r="9" fill="${col}" opacity=".18"/>
        <circle cx="${lx}" cy="${ly}" r="4.5" fill="${col}" stroke="#0f1b27" stroke-width="2.5"/>
      </svg>`;
    }

    const recent = bets.slice(-5).reverse().map(b => {
      const p = betPL(b);
      const word = b.r === 'W' ? 'Won' : b.r === 'L' ? 'Lost' : 'Void';
      return `<div class="r"><div class="tag ${b.r}">${b.r}</div>
        <div class="d">${word} · ${money(b.s)} @ ${b.o}</div>
        <div class="v ${p > 0 ? 'up' : p < 0 ? 'dn' : ''}">${b.r === 'V' ? '0.00' : sign(p)}</div></div>`;
    }).join('');

    $('out').innerHTML = `
      <div class="hero">
        <small>Bankroll</small>
        <div class="amt">${money(cur)}</div>
        <span class="pill ${up ? 'up' : 'dn'}">${sign(profit)}${staked ? ' · ' + roi.toFixed(1) + '% ROI' : ''}</span>
      </div>
      <div class="chart">${chart}</div>
      <div class="tiles">
        <div class="tile"><span>ROI</span><b class="${up ? 'up' : 'dn'}">${staked ? roi.toFixed(1) + '%' : '-'}</b></div>
        <div class="tile"><span>Hit rate</span><b>${count ? (wins / count * 100).toFixed(0) + '%' : '-'}</b>${count ? `<i>${wins}/${count}</i>` : ''}</div>
        <div class="tile"><span>Total staked</span><b>${money(staked)}</b></div>
        <div class="tile"><span>Max drawdown</span><b class="${dd ? 'dn' : ''}">${dd ? '-' + money(dd) : '0.00'}</b></div>
      </div>
      ${recent ? `<div class="hist"><h3>Recent bets</h3>${recent}</div>` : ''}`;
  }
});

tools.push({
  name: 'Surebet',
  html: `
    <label>Odds, outcome 1 <input id="a1" type="number" value="2.15" step="0.01"></label>
    <label>Odds, outcome 2 <input id="a2" type="number" value="2.05" step="0.01"></label>
    <label>Odds, outcome 3 (optional) <input id="a3" type="number" step="0.01"></label>
    <label>Total stake <input id="a4" type="number" value="100"></label>
    <div id="out"></div>`,
  run() {
    const od = ['a1', 'a2', 'a3'].map(id => +$(id).value).filter(x => x > 1);
    const T = +$('a4').value;
    if (od.length < 2) { $('out').textContent = 'Enter at least two odds above 1.'; return; }
    const sum = od.reduce((a, o) => a + 1 / o, 0);
    const ret = T / sum;
    const stakes = od.map((o, i) => `Stake on outcome ${i + 1} @ ${o}: <strong>${(T / sum / o).toFixed(2)}</strong><br>`).join('');
    $('out').innerHTML = sum < 1
      ? `Guaranteed profit: <strong style="color:#3dbe8b">${(ret - T).toFixed(2)}</strong> (${((1 / sum - 1) * 100).toFixed(2)}%)<br>${stakes}Payout either way: ${ret.toFixed(2)}`
      : `No surebet. Combined implied probability is ${(sum * 100).toFixed(1)}%, and it needs to be under 100%.`;
  }
});

function show(i) {
  const t = tools[i];
  $('app').innerHTML = t.html;
  $('app').querySelectorAll('input').forEach(el => el.oninput = () => t.run());
  if (t.init) t.init();
  t.run();
  [...$('nav').children].forEach((b, j) => b.classList.toggle('on', i === j));
}

tools.forEach((t, i) => {
  const b = document.createElement('button');
  b.textContent = t.name;
  b.onclick = () => show(i);
  $('nav').appendChild(b);
});
show(0);
