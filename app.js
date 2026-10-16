(() => {
  const state = {
    mission: 0,
    method: 'left',
    count: 4,
    savedCounts: [4, 50, 12],
    unlocked: false,
    freeUnlocked: false,
    completed: [false, false],
    degree: 2,
    coefficients: [1, 0.5, 0.5, 0, 0],
    a: -1,
    b: 1
  };
  const $ = (id) => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const range = $('partitionRange');
  const W = 640, H = 352, left = 66, right = 20, top = 20, bottom = 47;
  const plotW = W - left - right, plotH = H - top - bottom;
  let view = { xmin: 0, xmax: 1, ymin: 0, ymax: 1 };

  function domain() {
    return state.mission === 2 ? { a: state.a, b: state.b } : { a: 0, b: 1 };
  }

  function fn(x) {
    if (state.mission === 0) return x;
    if (state.mission === 1) return x * x;
    return state.coefficients.slice(0, state.degree + 1).reduce((sum, coefficient, power) => sum + coefficient * (x ** power), 0);
  }

  function px(x) { return left + ((x - view.xmin) / (view.xmax - view.xmin)) * plotW; }
  function py(y) { return top + ((view.ymax - y) / (view.ymax - view.ymin)) * plotH; }
  function formatNumber(value, places = 2) {
    const clean = Math.abs(value) < 1e-9 ? 0 : value;
    return clean.toFixed(places).replace(/0+$/, '').replace(/\.$/, '');
  }

  function formatPolynomial() {
    const superscripts = ['⁰', '¹', '²', '³', '⁴'];
    const terms = [];
    for (let power = state.degree; power >= 0; power--) {
      const coefficient = state.coefficients[power] || 0;
      if (Math.abs(coefficient) < 1e-9) continue;
      const absolute = Math.abs(coefficient);
      const coefficientText = power > 0 && Math.abs(absolute - 1) < 1e-9 ? '' : formatNumber(absolute);
      const variable = power === 0 ? '' : power === 1 ? 'x' : `x${superscripts[power]}`;
      const term = `${coefficientText}${variable}` || formatNumber(absolute);
      terms.push(`${terms.length === 0 ? (coefficient < 0 ? '−' : '') : (coefficient < 0 ? ' − ' : ' + ')}${term}`);
    }
    return `p(x) = ${terms.length ? terms.join('') : '0'}`;
  }

  function calculateView() {
    const { a, b } = domain();
    if (state.mission < 2) {
      view = { xmin: 0, xmax: 1, ymin: 0, ymax: 1 };
      return;
    }
    let low = 0, high = 0;
    for (let i = 0; i <= 200; i++) {
      const y = fn(a + (b - a) * i / 200);
      low = Math.min(low, y); high = Math.max(high, y);
    }
    if (Math.abs(high - low) < 1e-6) { low -= 0.5; high += 0.5; }
    else { const pad = (high - low) * 0.12; low -= pad; high += pad; }
    view = { xmin: a, xmax: b, ymin: low, ymax: high };
  }

  function pathForCurve() {
    const { a, b } = domain();
    let d = '';
    for (let i = 0; i <= 120; i++) {
      const x = a + (b - a) * i / 120;
      d += `${i === 0 ? 'M' : 'L'} ${px(x).toFixed(2)} ${py(fn(x)).toFixed(2)} `;
    }
    return d;
  }

  function svgElement(name, attrs = {}) {
    const element = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  function drawGrid() {
    const grid = $('gridLayer'), axes = $('axisLayer'), labels = $('labelLayer');
    grid.replaceChildren(); axes.replaceChildren(); labels.replaceChildren();
    for (let i = 0; i <= 4; i++) {
      const y = view.ymax - (view.ymax - view.ymin) * i / 4;
      const yy = py(y);
      grid.append(svgElement('line', { x1: left, x2: W - right, y1: yy, y2: yy, class: 'grid-line' }));
      const label = svgElement('text', { x: left - 12, y: yy + 3, 'text-anchor': 'end', class: 'grid-text' });
      label.textContent = formatNumber(y); labels.append(label);
    }
    for (let i = 0; i <= 4; i++) {
      const x = view.xmin + (view.xmax - view.xmin) * i / 4;
      const xx = px(x);
      grid.append(svgElement('line', { x1: xx, x2: xx, y1: top, y2: H - bottom, class: 'grid-line' }));
      axes.append(svgElement('line', { x1: xx, x2: xx, y1: H - bottom, y2: H - bottom + 5, class: 'tick-line' }));
      const label = svgElement('text', { x: xx, y: H - bottom + 18, 'text-anchor': 'middle', class: 'axis-text' });
      label.textContent = formatNumber(x); labels.append(label);
    }
    const yAxisY = Math.min(H - bottom, Math.max(top, py(0)));
    const xAxisX = Math.min(W - right, Math.max(left, px(0)));
    axes.append(svgElement('line', { x1: left, x2: W - right, y1: yAxisY, y2: yAxisY, class: 'axis-line' }));
    axes.append(svgElement('line', { x1: xAxisX, x2: xAxisX, y1: top, y2: H - bottom, class: 'axis-line' }));
    const xLabel = svgElement('text', { x: W - right, y: H - 8, 'text-anchor': 'end', class: 'axis-text' });
    xLabel.textContent = 'x'; labels.append(xLabel);
  }

  function sumValue() {
    const { a, b } = domain(), n = state.count, dx = (b - a) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const x = a + (i + (state.method === 'right' ? 1 : 0)) * dx;
      sum += fn(x) * dx;
    }
    return sum;
  }

  function drawRectangles() {
    const layer = $('rectLayer'); layer.replaceChildren();
    const { a, b } = domain(), dx = (b - a) / state.count, baseline = py(0);
    for (let i = 0; i < state.count; i++) {
      const x0 = a + i * dx;
      const sample = state.method === 'left' ? x0 : x0 + dx;
      const heightValue = fn(sample), sampleY = py(heightValue);
      const rect = svgElement('rect', {
        x: px(x0), y: Math.min(sampleY, baseline),
        width: px(x0 + dx) - px(x0), height: Math.abs(baseline - sampleY),
        class: `rect-shape${heightValue < 0 ? ' below-axis' : ''}`
      });
      const title = svgElement('title');
      title.textContent = `${i + 1}번째 직사각형, 폭 ${dx.toFixed(3)}, 높이 ${heightValue.toFixed(3)}`;
      rect.append(title); layer.append(rect);
    }
  }

  function exact() { return state.mission === 0 ? 0.5 : 1 / 3; }

  function clearAnswer() {
    $('guessInput').value = '';
    $('revealResult').hidden = true;
    $('nextRow').hidden = true;
    $('inputNote').classList.remove('error');
    $('inputNote').textContent = '0과 1 사이의 수로 적어 보세요.';
  }

  function updateNavigation() {
    const tabs = [$('tabLinear'), $('tabQuadratic'), $('tabExplore')];
    const locked = [false, !state.unlocked, !state.freeUnlocked];
    tabs.forEach((tab, index) => {
      tab.classList.toggle('active', state.mission === index);
      tab.classList.toggle('locked', locked[index]);
      tab.classList.toggle('complete', index < 2 && state.completed[index]);
      tab.setAttribute('aria-disabled', String(locked[index]));
      tab.setAttribute('aria-current', state.mission === index ? 'step' : 'false');
    });
    $('tabQuadratic').title = state.unlocked ? '포물선 미션 보기' : '첫 미션을 마치면 열려요';
    $('tabExplore').title = state.freeUnlocked ? '자유 탐구 열기' : '포물선 미션을 마치면 열려요';
    const progress = state.mission === 0 ? (state.completed[0] ? 50 : 20)
      : state.mission === 1 ? (state.completed[1] ? 82 : 60) : 100;
    $('progressText').textContent = `미션 ${state.mission + 1} / 3`;
    $('progressHint').textContent = state.mission === 2 ? '자유롭게 탐험해요' : state.completed[1] ? '자유 탐구가 열렸어요' : state.completed[0] ? '다음 미션이 열렸어요' : '탐험을 시작해요';
    $('progressFill').style.width = `${progress}%`;
  }

  function renderCoefficientInputs() {
    const degree = Number($('degreeSelect').value), container = $('coefficientInputs');
    container.replaceChildren();
    for (let power = degree; power >= 0; power--) {
      const label = document.createElement('label');
      label.textContent = power === 0 ? '상수항' : `x${power === 1 ? '' : `^${power}`} 계수`;
      const input = document.createElement('input');
      input.type = 'number'; input.min = '-3'; input.max = '3'; input.step = '0.5';
      input.value = state.coefficients[power] ?? 0; input.dataset.power = String(power); input.className = 'setting-input coefficient-input';
      input.setAttribute('aria-label', label.textContent);
      label.append(input); container.append(label);
    }
  }

  function renderControls() {
    $('partitionValue').textContent = `${state.count}개`;
    $('sumValue').textContent = sumValue().toFixed(3);
    const pct = ((state.count - 1) / 49) * 100;
    range.value = String(state.count);
    range.style.background = `linear-gradient(90deg,#70d5aa ${pct}%,#3b4a60 ${pct}%)`;
    $('rangeMaximum').textContent = '50개';
    document.querySelectorAll('.method-button').forEach(button => {
      const selected = button.dataset.method === state.method;
      button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    });
    $('freeControls').hidden = state.mission !== 2;
    $('predictionCard').hidden = state.mission === 2;
    $('finishCard').hidden = state.mission !== 2;
    $('readoutLabel').textContent = state.mission === 2 ? '현재 직사각형 넓이 합' : '현재 발판 넓이의 합';
    $('readoutSub').textContent = state.mission === 2 ? 'x축 아래 값은 음수로 합산' : '계산된 근삿값';
  }

  function renderMission() {
    const mission = state.mission;
    const labels = [
      { badge: 'f', title: '직선 아래를 채워 보자!', prompt: '일차함수의 그래프와 직사각형 발판을 함께 살펴봐요.', icon: '↗', kicker: 'MISSION 01 · 직선 발판' },
      { badge: 'g', title: '포물선 발판을 50개까지 늘려 보자!', prompt: '발판을 잘게 나누면 넓이의 합이 어떻게 달라지는지 살펴봐요.', icon: '⌒', kicker: 'MISSION 02 · 포물선 발판' },
      { badge: 'p', title: '나만의 다항함수를 탐험해요!', prompt: '차수와 계수, 구간을 바꾸며 넓이의 합을 자유롭게 관찰해요.', icon: '✳', kicker: 'MISSION 03 · 자유 탐구' }
    ][mission];
    const formula = mission === 0 ? 'y = x' : mission === 1 ? 'y = x²' : formatPolynomial();
    const { a, b } = domain();
    $('functionBadge').textContent = labels.badge;
    $('functionLabel').textContent = formula;
    $('intervalLabel').textContent = `${formatNumber(a)} ≤ x ≤ ${formatNumber(b)}`;
    $('missionKicker').textContent = labels.kicker;
    $('missionTitle').textContent = labels.title;
    $('missionPrompt').textContent = labels.prompt;
    $('missionIcon').textContent = labels.icon;
    $('missionStamp').textContent = `0${mission + 1}`;
    $('fieldNoteText').textContent = mission === 0
      ? '일차함수 아래의 넓이를 발판으로 채우며, 분할 개수와 끝점 위치가 합에 어떤 변화를 주는지 살펴봐요.'
      : mission === 1
        ? '이차함수 그래프에서 발판을 50개 가까이 늘려 보세요. 4개일 때와 비교해 넓이의 합이 얼마나 달라지는지 관찰해요.'
        : '차수, 계수, 구간을 바꾸고 발판 개수와 끝점 방식을 조절해 보세요. 그래프가 x축 아래에 있으면 그 부분은 음수로 합산됩니다.';
    $('graphHint').textContent = mission === 2
      ? '함수의 모양과 구간을 바꾸며 발판 넓이의 합이 어떻게 달라지는지 살펴보세요.'
      : state.method === 'left'
        ? '각 발판의 높이를 왼쪽 끝점에서 정했어요. 곡선과 발판 사이를 살펴보세요.'
        : '각 발판의 높이를 오른쪽 끝점에서 정했어요. 곡선과 발판 사이를 살펴보세요.';
    calculateView();
    $('curvePath').setAttribute('d', pathForCurve());
    $('graphDescription').textContent = `${formula} 그래프에서 ${state.count}개의 ${state.method === 'left' ? '왼쪽 끝점' : '오른쪽 끝점'} 직사각형을 관찰합니다. 구간 ${formatNumber(a)}부터 ${formatNumber(b)}까지입니다.`;
    $('graphTitle').textContent = `${formula} 구분구적법 그래프`;
    drawGrid(); drawRectangles(); clearAnswer(); renderControls(); updateNavigation();
  }

  function switchMission(next) {
    if (next === 1 && !state.unlocked) return;
    if (next === 2 && !state.freeUnlocked) return;
    state.savedCounts[state.mission] = state.count;
    state.mission = next;
    state.count = state.savedCounts[next];
    renderMission();
  }

  $('helpButton').addEventListener('click', () => {
    const pop = $('helpPopover'), open = pop.hidden;
    pop.hidden = !open; $('helpButton').setAttribute('aria-expanded', String(open));
  });

  range.addEventListener('input', () => {
    state.count = Number(range.value); state.savedCounts[state.mission] = state.count;
    renderControls(); drawRectangles();
    $('graphDescription').textContent = `${state.count}개의 직사각형 발판으로 곡선 아래 넓이를 근사합니다.`;
  });

  document.querySelectorAll('.method-button').forEach(button => button.addEventListener('click', () => {
    state.method = button.dataset.method; renderControls(); drawRectangles();
    $('graphDescription').textContent = `${state.count}개의 ${state.method === 'left' ? '왼쪽 끝점' : '오른쪽 끝점'} 직사각형 발판으로 곡선 아래 넓이를 근사합니다.`;
  }));

  $('degreeSelect').addEventListener('change', renderCoefficientInputs);
  $('applySettings').addEventListener('click', () => {
    const degree = Number($('degreeSelect').value);
    const a = Number($('intervalStart').value), b = Number($('intervalEnd').value);
    const coeffs = [0, 0, 0, 0, 0];
    let valid = Number.isFinite(a) && Number.isFinite(b) && a < b;
    document.querySelectorAll('.coefficient-input').forEach(input => {
      const value = Number(input.value), power = Number(input.dataset.power);
      if (!Number.isFinite(value) || value < -3 || value > 3) valid = false;
      coeffs[power] = value;
    });
    if (!valid) {
      $('settingHelp').textContent = '구간은 시작값보다 끝값이 커야 하고, 계수는 −3부터 3 사이여야 해요.';
      $('settingHelp').classList.add('error'); return;
    }
    state.degree = degree; state.coefficients = coeffs; state.a = a; state.b = b;
    $('settingHelp').classList.remove('error');
    renderMission();
    $('settingHelp').textContent = `${formatPolynomial()}, 구간 [${formatNumber(a)}, ${formatNumber(b)}]`;
  });

  $('guessForm').addEventListener('submit', event => {
    event.preventDefault();
    const input = $('guessInput'), guess = Number(input.value);
    if (!input.value || !Number.isFinite(guess) || guess < 0 || guess > 1) {
      $('inputNote').textContent = '0 이상 1 이하의 수를 입력해 주세요.';
      $('inputNote').classList.add('error'); input.focus(); return;
    }
    const target = exact(), precise = Math.abs(guess - target) < 0.015;
    $('resultIcon').textContent = precise ? '✦' : '↗';
    $('resultTitle').textContent = precise ? '예상한 넓이가 아주 가까워요!' : '예상과 실제 넓이를 비교해 봐요.';
    const relation = guess < target ? '실제보다 작게' : guess > target ? '실제보다 크게' : '정확하게';
    $('resultText').textContent = `내 예상 ${guess.toFixed(3)}은 실제 넓이를 ${relation} 예상했어요. 현재 발판 넓이의 합과도 비교해 보세요.`;
    $('exactValue').textContent = state.mission === 0 ? '0.500 (1/2)' : '약 0.333 (1/3)';
    $('revealResult').hidden = false; $('nextRow').hidden = false;
    $('inputNote').classList.remove('error'); $('inputNote').textContent = '예상값을 기록했어요.';
    state.completed[state.mission] = true;
    if (state.mission === 0) state.unlocked = true;
    if (state.mission === 1) state.freeUnlocked = true;
    updateNavigation();
    $('nextMessage').textContent = state.mission === 0 ? '직선 발판 탐험을 마쳤어요.' : '이제 나만의 함수로 자유 탐구를 해봐요.';
    $('nextButton').innerHTML = state.mission === 0 ? '다음 미션으로 <span aria-hidden="true">→</span>' : '자유 탐구 시작 <span aria-hidden="true">→</span>';
    $('nextButton').disabled = false;
  });

  $('nextButton').addEventListener('click', () => switchMission(state.mission === 0 ? 1 : 2));
  $('tabLinear').addEventListener('click', () => switchMission(0));
  $('tabQuadratic').addEventListener('click', () => switchMission(1));
  $('tabExplore').addEventListener('click', () => switchMission(2));
  $('replayButton').addEventListener('click', () => {
    state.mission = 0; state.method = 'left'; state.count = 4; state.savedCounts = [4, 50, 12];
    state.unlocked = false; state.freeUnlocked = false; state.completed = [false, false];
    state.degree = 2; state.coefficients = [1, 0.5, 0.5, 0, 0]; state.a = -1; state.b = 1;
    $('degreeSelect').value = '2'; $('intervalStart').value = '-1'; $('intervalEnd').value = '1';
    renderCoefficientInputs(); renderMission(); window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('intervalStart').value = String(state.a); $('intervalEnd').value = String(state.b);
  renderCoefficientInputs(); renderMission();
})();

