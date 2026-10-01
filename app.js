const tools = [];
const $ = id => document.getElementById(id);

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

function show(i) {
  const t = tools[i];
  $('app').innerHTML = t.html;
  $('app').querySelectorAll('input').forEach(el => el.oninput = t.run);
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
