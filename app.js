const tools = [];
const $ = id => document.getElementById(id);
const ld = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } };
const sv = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const FIELD = 'display:block;width:100%;padding:10px;margin-top:4px;font-size:16px;border-radius:8px;border:1px solid #2a3e4f;background:#172733;color:#e6eef4;box-sizing:border-box';
const BTN = 'padding:10px 16px;font-size:16px;border-radius:8px;border:0;background:#4cc3cc;color:#0f1a24;margin-right:8px';

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

tools.push({
  name: 'Tracker',
  html: `
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
    <button id="tundo" style="${BTN};background:#172733;color:#e6eef4;border:1px solid #2a3e4f">Undo last</button>
    <div id="out" style="margin-top:14px"></div>`,
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
    let cur = s0, pts = [s0], staked = 0, wins = 0, count = 0;
    bets.forEach(b => {
      const p = b.r === 'W' ? b.s * (b.o - 1) : b.r === 'L' ? -b.s : 0;
      cur += p;
      pts.push(cur);
      if (b.r !== 'V') { staked += b.s; count++; if (b.r === 'W') wins++; }
    });
    const profit = cur - s0;
    const col = profit >= 0 ? '#3dbe8b' : '#e5675a';
    let chart = '';
    if (pts.length > 1) {
      const mn = Math.min(...pts), mx = Math.max(...pts), r = (mx - mn) || 1;
      const line = pts.map((v, i) => `${(i / (pts.length - 1)) * 300},${104 - ((v - mn) / r) * 98}`).join(' ');
      chart = `<svg viewBox="0 0 300 110" width="100%" height="140"><polyline points="${line}" fill="none" stroke="${col}" stroke-width="2.5"/></svg>`;
    }
    $('out').innerHTML = chart
      + `Bankroll: <strong>${cur.toFixed(2)}</strong><br>`
      + `Profit: <strong style="color:${col}">${profit.toFixed(2)}</strong><br>`
      + `ROI: <strong>${staked ? (profit / staked * 100).toFixed(1) + '%' : '-'}</strong><br>`
      + `Hit rate: <strong>${count ? (wins / count * 100).toFixed(0) + '% (' + wins + '/' + count + ')' : '-'}</strong><br>`
      + `Bets logged: ${bets.length}`;
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
