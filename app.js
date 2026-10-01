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
