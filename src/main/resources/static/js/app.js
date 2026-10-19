/* ============================================================
   Worker Simulator · 前端脚本
   index：角色创建向导 + 读档
   game ：xterm.js 终端 + HUD 渲染 + 状态轮询
   ============================================================ */

/* ---------------- 通用 ---------------- */
let TOAST_TIMER = null;
function toast(msg, type) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show ' + (type || '');
  clearTimeout(TOAST_TIMER);
  TOAST_TIMER = setTimeout(function () { t.className = 'toast'; }, 2600);
}

function closeModal(id) { closeModalWithAnim(id); }

function api(url, data) {
  return $.ajax({
    url: url,
    type: data ? 'POST' : 'GET',
    contentType: 'application/json',
    data: data ? JSON.stringify(data) : undefined
  });
}

/* ============================================================
   INDEX 页：创建角色向导
   ============================================================ */
var CFG = null;                 // 基础配置
var wizardState = {
  step: 1,
  name: '',
  gender: 'male',
  personalityId: null,
  educationId: null,
  majorId: null,
  pts: { str: 0, intel: 0, charm: 0, luck: 0 }
};

function openWizard() {
  if (!CFG) {
    api('/api/game/config').done(function (r) {
      if (r.ok) { CFG = r; showWizard(); }
      else toast('配置加载失败', 'err');
    });
  } else {
    showWizard();
  }
}

function showWizard() {
  wizardState.step = 1;
  wizardState.personalityId = CFG.personalities[0].id;
  wizardState.educationId = CFG.education[2].id;   // 默认高中
  wizardState.majorId = CFG.majors[0].id;
  wizardState.pts = { str: 0, intel: 0, charm: 0, luck: 0 };
  showModalBox(document.getElementById('wizard-mask'));
  renderWizard();
}

function wizardPrev() {
  if (wizardState.step > 1) { wizardState.step--; renderWizard(); }
}
function wizardNext() {
  var s = wizardState;
  if (s.step === 1) {
    s.name = (document.getElementById('w-name').value || '').trim();
    if (!s.name) s.name = '';
    // 性别已由 pickGender 实时写入 wizardState.gender，无需再读取
  } else if (s.step === 2) {
    var sel = document.querySelector('.wiz-opt.sel[data-ptype]');
    if (sel) s.personalityId = sel.getAttribute('data-ptype');
  } else if (s.step === 3) {
    var e = document.querySelector('.wiz-opt.sel[data-edu]');
    var m = document.querySelector('.wiz-opt.sel[data-major]');
    if (e) s.educationId = e.getAttribute('data-edu');
    if (m) s.majorId = m.getAttribute('data-major');
    // 换学历后重置加点
    s.pts = { str: 0, intel: 0, charm: 0, luck: 0 };
  } else if (s.step === 4) {
    s.pts.str = +document.getElementById('p-str').value;
    s.pts.intel = +document.getElementById('p-intel').value;
    s.pts.charm = +document.getElementById('p-charm').value;
    s.pts.luck = +document.getElementById('p-luck').value;
  } else if (s.step === 5) {
    doStartGame();
    return;
  }
  if (s.step < 5) { s.step++; renderWizard(); }
}

function doStartGame() {
  var s = wizardState;
  var payload = {
    name: s.name || '铁蛋',
    gender: s.gender,
    personalityId: s.personalityId,
    educationId: s.educationId,
    majorId: s.majorId,
    str: s.pts.str, intel: s.pts.intel, charm: s.pts.charm, luck: s.pts.luck
  };
  api('/api/game/start', payload).done(function (r) {
    if (r.ok) {
      toast('欢迎来到城市，' + payload.name + '！', 'ok');
      setTimeout(function () { location.href = '/game'; }, 600);
    } else {
      toast((r.lines && r.lines[0]) || '创建失败', 'err');
    }
  }).fail(function () { toast('网络错误', 'err'); });
}

function eduById(id) {
  return CFG.education.find(function (e) { return e.id === id; });
}
function eduPoints() {
  return eduById(wizardState.educationId).points;
}

function renderWizard() {
  var s = wizardState;
  document.getElementById('wizard-step').textContent = '第 ' + s.step + ' / 5 步';
  var prev = document.getElementById('wizard-prev');
  prev.style.display = s.step > 1 ? 'inline-block' : 'none';
  var next = document.getElementById('wizard-next');
  next.innerHTML = s.step === 5 ? '🚀 开始打工！' : '下一步 →';
  var body = document.getElementById('wizard-body');

  if (s.step === 1) {
    body.innerHTML =
      '<div class="wiz-title">给自己起个名，选个性别</div>' +
      '<p class="wiz-desc">名字会出现在这座城市的每一个角落。</p>' +
      '<div class="input-row">' +
      '  <div class="input-box"><label>姓名</label>' +
      '    <input type="text" id="w-name" maxlength="8" placeholder="例如：铁蛋 / 王小虎" value="' + esc(s.name) + '"></div>' +
      '</div>' +
      '<div style="height:14px"></div>' +
      '<div class="gender-row">' +
      '  <div class="gender-opt' + (s.gender === 'male' ? ' sel' : '') + '" onclick="pickGender(this,\'male\')">👨<span>男</span></div>' +
      '  <div class="gender-opt' + (s.gender === 'female' ? ' sel' : '') + '" onclick="pickGender(this,\'female\')">👩<span>女</span></div>' +
      '</div>';
  } else if (s.step === 2) {
    var h = '<div class="wiz-title">你的性格是？</div><p class="wiz-desc">性格会带来不同的属性加成与成长偏向。</p><div class="wiz-grid">';
    CFG.personalities.forEach(function (p) {
      h += '<div class="wiz-opt' + (s.personalityId === p.id ? ' sel' : '') + '" data-ptype="' + p.id + '" onclick="pickOpt(this)">' +
        '<span class="opt-check">✔</span><div class="opt-name">' + p.name + '</div>' +
        '<div class="opt-desc">' + p.desc + '</div><div class="opt-bonus">' + bonusText(p) + '</div></div>';
    });
    body.innerHTML = h + '</div>';
  } else if (s.step === 3) {
    var h3 = '<div class="wiz-title">学历与专业</div><p class="wiz-desc">学历决定可分配的技能点总量，专业带来定向加成。</p>' +
      '<div class="wiz-title" style="font-size:14px;color:#8b95a7">🎓 学历</div><div class="wiz-grid" style="margin-bottom:16px">';
    CFG.education.forEach(function (e) {
      h3 += '<div class="wiz-opt' + (s.educationId === e.id ? ' sel' : '') + '" data-edu="' + e.id + '" onclick="pickOpt(this)">' +
        '<span class="opt-check">✔</span><div class="opt-name">' + e.name + '</div>' +
        '<div class="opt-desc">' + e.desc + '</div><div class="opt-bonus">技能点 ' + e.points + ' ｜ 基础 力' + e.str + ' 智' + e.intel + ' 魅' + e.charm + ' 运' + e.luck + '</div></div>';
    });
    h3 += '</div><div class="wiz-title" style="font-size:14px;color:#8b95a7">📖 专业</div><div class="wiz-grid">';
    CFG.majors.forEach(function (m) {
      h3 += '<div class="wiz-opt' + (s.majorId === m.id ? ' sel' : '') + '" data-major="' + m.id + '" onclick="pickOpt(this)">' +
        '<span class="opt-check">✔</span><div class="opt-name">' + m.name + '</div>' +
        '<div class="opt-desc">' + m.desc + '</div><div class="opt-bonus">' + majorBonusText(m) + '</div></div>';
    });
    body.innerHTML = h3 + '</div>';
  } else if (s.step === 4) {
    var budget = eduPoints();
    var used = s.pts.str + s.pts.intel + s.pts.charm + s.pts.luck;
    body.innerHTML =
      '<div class="wiz-title">分配技能点（剩余 ' + (budget - used) + ' / ' + budget + '）</div>' +
      '<p class="wiz-desc">体力干活、智力学习考试、魅力社交销售、运气捡漏暴富。</p>' +
      attrRow('str', '💪', '体力', s.pts.str, budget) +
      attrRow('intel', '🧠', '智力', s.pts.intel, budget) +
      attrRow('charm', '✨', '魅力', s.pts.charm, budget) +
      attrRow('luck', '🍀', '运气', s.pts.luck, budget) +
      '<div class="points-left" id="pts-left">剩余可分配：<b>' + (budget - used) + '</b> 点</div>' +
      '<div class="preview-attr" id="attr-preview"></div>';
    refreshAttrUI();
  } else if (s.step === 5) {
    var edu = eduById(s.educationId);
    var per = CFG.personalities.find(function (p) { return p.id === s.personalityId; });
    var maj = CFG.majors.find(function (m) { return m.id === s.majorId; });
    var finalStr = edu.str + per.str + maj.str + s.pts.str;
    var finalIntel = edu.intel + per.intel + maj.intel + s.pts.intel;
    var finalCharm = edu.charm + per.charm + maj.charm + s.pts.charm;
    var finalLuck = edu.luck + per.luck + maj.luck + s.pts.luck;
    body.innerHTML =
      '<div class="wiz-title">确认你的打工人档案</div><p class="wiz-desc">「从一无所有开始，在这座城市活下去。」</p>' +
      '<div class="wiz-opt" style="cursor:default">' +
      '  <div class="opt-name">' + (s.gender === 'male' ? '👨' : '👩') + ' ' + (s.name || '铁蛋') + '</div>' +
      '  <div class="opt-desc">' + edu.name + '学历 · ' + per.name + ' · 专业：' + maj.name + '</div>' +
      '  <div class="opt-bonus">💪体力 ' + finalStr + ' ｜ 🧠智力 ' + finalIntel + ' ｜ ✨魅力 ' + finalCharm + ' ｜ 🍀运气 ' + finalLuck + '</div>' +
      '</div>' +
      '<p style="margin-top:14px;font-size:12.5px;color:#8b95a7">开局携带 <b style="color:#ffd76e">500 元</b>，今晚可能睡大街。先 <b>move 人才市场</b> 找工作，或 <b>scrap</b> 捡废品。</p>';
  }
}

function attrRow(id, ico, name, val, budget) {
  return '<div class="attr-row">' +
    '<span class="attr-ico">' + ico + '</span>' +
    '<span class="attr-name">' + name + '</span>' +
    '<input type="range" id="p-' + id + '" min="0" max="' + budget + '" value="' + val + '" oninput="onAttrChange(\'' + id + '\')">' +
    '<span class="attr-pts" id="pts-' + id + '">' + val + '</span></div>';
}

function onAttrChange(id) {
  var budget = eduPoints();
  var other = 0;
  ['str', 'intel', 'charm', 'luck'].forEach(function (k) {
    if (k !== id) other += +document.getElementById('p-' + k).value;
  });
  var v = +document.getElementById('p-' + id).value;
  var max = Math.max(0, budget - other);
  if (v > max) { v = max; document.getElementById('p-' + id).value = max; }
  document.getElementById('pts-' + id).textContent = v;
  refreshAttrUI();
}

function refreshAttrUI() {
  var budget = eduPoints();
  var sum = ['str', 'intel', 'charm', 'luck'].reduce(function (a, k) { return a + +document.getElementById('p-' + k).value; }, 0);
  var left = budget - sum;
  var el = document.getElementById('pts-left');
  if (el) {
    el.innerHTML = '剩余可分配：<b>' + left + '</b> 点';
    el.className = 'points-left' + (left < 0 ? ' warn' : '');
  }
  var edu = eduById(wizardState.educationId);
  var per = CFG.personalities.find(function (p) { return p.id === wizardState.personalityId; });
  var maj = CFG.majors.find(function (m) { return m.id === wizardState.majorId; });
  var g = function (k) { return +document.getElementById('p-' + k).value; };
  var preview = document.getElementById('attr-preview');
  if (preview) {
    preview.innerHTML = '最终属性：💪' + (edu.str + per.str + maj.str + g('str')) +
      ' ｜ 🧠' + (edu.intel + per.intel + maj.intel + g('intel')) +
      ' ｜ ✨' + (edu.charm + per.charm + maj.charm + g('charm')) +
      ' ｜ 🍀' + (edu.luck + per.luck + maj.luck + g('luck'));
  }
}

function pickOpt(el) {
  var box = el.closest('.wiz-grid');
  box.querySelectorAll('.wiz-opt').forEach(function (x) { x.classList.remove('sel'); });
  el.classList.add('sel');
  if (wizardState.step === 3) {
    // 学历变更时重置加点
    if (el.hasAttribute('data-edu')) {
      wizardState.educationId = el.getAttribute('data-edu');
      wizardState.pts = { str: 0, intel: 0, charm: 0, luck: 0 };
    }
    if (el.hasAttribute('data-major')) wizardState.majorId = el.getAttribute('data-major');
  }
}
function pickGender(el, g) {
  document.querySelectorAll('.gender-opt').forEach(function (x) { x.classList.remove('sel'); });
  el.classList.add('sel');
  wizardState.gender = g;
}

function bonusText(p) {
  var a = [];
  if (p.str) a.push('力+' + p.str);
  if (p.intel) a.push('智+' + p.intel);
  if (p.charm) a.push('魅+' + p.charm);
  if (p.luck) a.push('运+' + p.luck);
  if (p.stamina) a.push('体力+' + p.stamina);
  if (p.socialBonus) a.push('社交+' + Math.round(p.socialBonus * 100) + '%');
  if (p.workBonus) a.push('打工+' + Math.round(p.workBonus * 100) + '%');
  if (p.learnBonus) a.push('学习+' + Math.round(p.learnBonus * 100) + '%');
  if (p.riskBonus) a.push('冒险+' + Math.round(p.riskBonus * 100) + '%');
  return a.join('  ') || '无加成';
}
function majorBonusText(m) {
  var a = [];
  if (m.str) a.push('力+' + m.str);
  if (m.intel) a.push('智+' + m.intel);
  if (m.charm) a.push('魅+' + m.charm);
  if (m.luck) a.push('运+' + m.luck);
  if (m.courseAffinity) a.push(m.name + '课程学习+25%');
  return a.join('  ') || '无加成';
}
function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------------- 读档 ---------------- */
function openLoad() {
  api('/api/game/slots').done(function (r) {
    var h = '';
    (r.slots || []).forEach(function (s) {
      h += '<div class="save-item' + (s.exists ? '' : ' empty') + '" ' + (s.exists ? 'onclick="doLoadSlot(' + s.slot + ')"' : '') + '>' +
        '<div><div class="s-name">' + s.name + '</div><div class="s-summary">' + (s.exists ? esc(s.summary) : '（空）') + '</div></div>' +
        '<span class="s-load">' + (s.exists ? '载入 →' : '空槽位') + '</span></div>';
    });
    h += '<div class="save-item' + (r.hasAuto ? '' : ' empty') + '" ' + (r.hasAuto ? 'onclick="doLoadSlot(0)"' : '') + '>' +
      '<div><div class="s-name">▣ 自动存档</div><div class="s-summary">' + (r.hasAuto ? '每日清晨自动保存' : '（无）') + '</div></div>' +
      '<span class="s-load">' + (r.hasAuto ? '载入 →' : '—') + '</span></div>';
    document.getElementById('load-body').innerHTML = h;
    showModalBox(document.getElementById('load-mask'));
  }).fail(function () { toast('读取失败', 'err'); });
}

function doLoadSlot(slot) {
  api('/api/game/load', { slot: slot }).done(function (r) {
    if (r.ok) {
      toast('读档成功，欢迎回来！', 'ok');
      setTimeout(function () { location.href = '/game' + location.search; }, 500);
    } else {
      toast((r.lines && r.lines[0]) || '读档失败', 'err');
    }
  });
}

/* ============================================================
   GAME 页：终端 + HUD
   ============================================================ */
/* ============================================================
   自由模式：当前页面跳转 /free（第三人称 3D 城市漫游）
   ============================================================ */
function openFreeMode() {
  // v175：把终端模式的当前游戏时间（第N天 HH:MM）作为 ?h= 参数传给自由模式，
  // 自由模式启动时用它初始化昼夜小时，保证进入时两个模式时间一致。
  var hud = window.__lastHud || {};
  var m = /第\d+天\s+(\d{1,2}):(\d{2})/.exec(hud.fullTime || '');
  if (m) {
    var hh = parseInt(m[1], 10), mm = parseInt(m[2], 10);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      window.location.href = '/free?h=' + (hh + mm / 60);
      return;
    }
  }
  window.location.href = '/free';
}
/* 自由模式进入地点：?goto=<id> → 自动 move 到该地点 */
function applyGotoParam() {
  var m = location.search.match(/[?&]goto=([a-z0-9]+)/i);
  if (!m) return;
  var loc = null;
  for (var i = 0; i < MAP_LOCS.length; i++) {
    if (MAP_LOCS[i].id === m[1]) { loc = MAP_LOCS[i]; break; }
  }
  if (!loc) return;
  setTimeout(function () {
    api('/api/game/state').done(function (r) {
      if (r && r.hud && r.hud.started) {
        runCmd(loc.cmd);
      } else {
        // 会话未激活：自动读档后前往目标地点
        api('/api/game/load', { slot: 1 }).done(function (r2) {
          if (r2 && r2.ok) {
            toast('已自动读档，正在进入城市…', 'ok');
            setTimeout(function () { location.href = '/game?goto=' + loc.id; }, 900);
          } else {
            toast('自由模式：请先读档进入城市', 'warn');
          }
        });
      }
    });
  }, 1600);
}

var term = null;
var fitAddon = null;
var inputBuf = '';
var cmdHistory = [];
var cmdHistoryIdx = -1;
var pollTimer = null;
var sse = null;   // SSE 实时推送连接
var _lastSseTs = 0;   // 最近一次 SSE 消息时间戳（僵尸连接检测）
var _sseWatch = null;

function initTerminal() {
  term = new Terminal({
    cursorBlink: true,
    fontSize: 12.5,
    lineHeight: 1.3,
    fontFamily: '"SFMono-Regular","JetBrains Mono",Menlo,Monaco,Consolas,monospace',
    theme: {
      background: '#0c1018',
      foreground: '#dce3ef',
      cursor: '#ffb454',
      selectionBackground: 'rgba(255,180,84,.28)',
      black: '#0c1018', red: '#ff6b6b', green: '#7ee787', yellow: '#ffb454',
      blue: '#79c0ff', magenta: '#ffa8cc', cyan: '#79c0ff', white: '#dce3ef',
      brightBlack: '#5c6678', brightRed: '#ff8585', brightGreen: '#9ef2a8',
      brightYellow: '#ffd76e', brightBlue: '#9cc8ff', brightMagenta: '#ffc1d9',
      brightCyan: '#9cc8ff', brightWhite: '#ffffff'
    },
    scrollback: 2000,
    convertEol: false
  });
  fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(document.getElementById('terminal'));
  fitTerminal();

  // 等宽字体加载完成后重新测量行高，避免行数偏差导致底部内容被遮
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { setTimeout(fitTerminal, 80); });
  }

  // 键盘输入：普通字符/IME 组合全部交给 xterm 原生处理（显示 + 中文输入法），
  // 这里只拦截需要自管的按键（回车提交、退格删除、上下历史、Tab=空格），
  // 避免抢焦点导致录入卡顿、退格失灵。
  term.attachCustomKeyEventHandler(function (e) {
    if (e.type !== 'keydown') return true;
    var key = e.key || '';
    var code = e.keyCode || e.which || 0;
    if (e.ctrlKey || e.metaKey || e.altKey) return true;   // 系统快捷键/粘贴放行
    if (e.isComposing || code === 229) return true;        // IME 组合中放行给 xterm
    if (key === 'Enter' || key === 'Return' || code === 13) {
      e.preventDefault();
      submitTermInput();
      return false;
    }
    if (code === 8) {                                      // 退格
      e.preventDefault();
      backspaceInput();
      return false;
    }
    if (code === 38) {                                     // 上（历史）
      e.preventDefault();
      if (cmdHistoryIdx < cmdHistory.length - 1) { cmdHistoryIdx++; replaceInput(cmdHistory[cmdHistoryIdx]); }
      return false;
    }
    if (code === 40) {                                     // 下（历史）
      e.preventDefault();
      if (cmdHistoryIdx > 0) { cmdHistoryIdx--; replaceInput(cmdHistory[cmdHistoryIdx]); }
      else { cmdHistoryIdx = -1; replaceInput(''); }
      return false;
    }
    if (code === 9) {                                      // Tab 当作空格
      e.preventDefault();
      inputBuf += ' ';
      term.write(' ');
      return false;
    }
    return true;   // 普通字符交给 xterm 原生显示，onData 记录 inputBuf
  });

  // onData：xterm 原生输入链路（普通字符 / IME 组合结果 / 粘贴文本）统一在此记录，
  // 并手动回显到终端（xterm 原生输入不会自动 echo，必须 term.write 才能实时看到录入内容）
  term.onData(function (data) {
    if (data === '\x7f') {                 // xterm 原生退格兜底：回显删除
      backspaceInput();
    } else if (data === '\u001b[A') {      // 上（历史）
      if (cmdHistoryIdx < cmdHistory.length - 1) {
        cmdHistoryIdx++;
        replaceInput(cmdHistory[cmdHistoryIdx]);
      }
    } else if (data === '\u001b[B') {      // 下（历史）
      if (cmdHistoryIdx > 0) { cmdHistoryIdx--; replaceInput(cmdHistory[cmdHistoryIdx]); }
      else { cmdHistoryIdx = -1; replaceInput(''); }
    } else if (data === '\r' || data === '\n') {   // 回车兜底（正常路径已被 keydown 拦截）
      submitTermInput();
    } else if (data >= ' ' || data === '\t') {
      if (data === '\t') data = ' ';
      inputBuf += data;
      term.write(data);                    // 实时回显录入内容
      try { term.scrollToBottom(); } catch (e) {}
    }
  });

  // 终端输出中的命令可点击：监听鼠标点击 + 单元格坐标定位命令
  var CMD_RE = /(?:\b(?:lottery)\s+buy\s+\d+|\b(?:sign|work|eat|train|exam|buy|buyhouse|buycar|talk|treat|gift|confess|propose|save|load|scratch|housing|rent|help|jobs|shop|assets|achievements|social|loan|finance|borrow)\s+\d+|\b(?:bank|withdraw)\s+\d+|\bcollege\s+(?:enroll|study|exam|answer)\s+[\w\d]+|\bmove\s+(?:人才市场|大街|培训中心|成人大学|商场|美食街|住处|工作地点|彩票店|百味鸡|地摊麻辣烫|饺子馆|火锅店|菜市场|小商品批发|银行|交易大厅|4S店|房产中介|城市公园|夜市|鬼市|花店|酒吧|台球厅|会所)|\b(?:help|status|jobs|resign|scrap|stall|sleep|shop|social|scratch|achievements|pause|resume|assets|slots|housing|train|lottery|wholesale|bj|blackjack|gomoku|gobang|eat|ringtoss|antique|fortune|meditate|spa|practice|worship|newgame|restart|gig|bargain|arrange|battle|network|news|balloon|goldfish|match|pigeon|quest|weather|loan|finance|college|answer|conv|bulletin|tryon|taste|flowerwork|music|snooker|lounge|studylotto|marketwork|lobby|testdrive|viewhome|stroll|nightwalk|ghosttalk|help_npc|borrow|learn_npc|gossip|fun)\b)/g;
  (function bindTermClick() {
    if (!term || !term._core || !term._core._renderService) return;
    var el = term._core.element;
    if (!el || el.__wsClickBound) return;
    el.__wsClickBound = true;
    el.addEventListener('click', function (e) {
      if (e.button !== 0) return;
      var rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var cellW = el.clientWidth / term.cols;
      var cellH = el.clientHeight / term.rows;
      if (!cellW || !cellH) return;
      var col = Math.floor((e.clientX - rect.left) / cellW) + 1;
      var row = Math.floor((e.clientY - rect.top) / cellH) + 1;
      var buf = term.buffer.active;
      var lineIndex = buf.viewportY + row - 1;
      var line = buf.getLine(lineIndex);
      if (!line) return;
      var text = line.translateToString(true);
      if (!text || text.trim() === '') return;
      CMD_RE.lastIndex = 0;
      var m;
      while ((m = CMD_RE.exec(text)) !== null) {
        var startCol = 0, endCol = 0, colPos = 0;
        for (var i = 0; i < text.length; i++) {
          if (i === m.index) startCol = colPos + 1;
          colPos += text.charCodeAt(i) > 255 ? 2 : 1;
          if (i === m.index + m[0].length - 1) { endCol = colPos; break; }
        }
        if (col >= startCol && col <= endCol) {
          runCmd(m[0]);
          e.preventDefault();
          return;
        }
      }
    }, false);
  })();

  window.addEventListener('resize', function () {
    try { fitTerminal(); } catch (e) {}
    sigReset();   // 尺寸变化：清空脏检查缓存，强制重绘 canvas 等依赖尺寸的内容
  });
}

/** 重算终端尺寸并滚动到底部，保证最新输出与输入光标始终可见 */
function fitTerminal() {
  if (!fitAddon || !term) return;
  try {
    fitAddon.fit();
  } catch (e) {}
  try {
    // xterm 滚动由 JS 模拟：可视行数少渲染一行，滚动到底时
    // 输入光标行上方/下方留出完整一行空白，不被底部边框裁切。
    var r = term.rows;
    if (r > 6 && term.cols > 20) term.resize(term.cols, r - 1);
    term.scrollToBottom();
  } catch (e) {}
}

/** 点击终端命令：填入输入并立即执行 */
function runCmd(cmd) {
  if (!term || !cmd) return;
  inputBuf = cmd;
  term.write(cmd);
  submitTermInput();
}

/** 退格删除：按字符显示宽度删除（中文占 2 列，需发两次退格序列） */
function backspaceInput() {
  if (!inputBuf.length) return;
  var chars = Array.from(inputBuf);
  var ch = chars[chars.length - 1];
  var w = ch.codePointAt(0) > 255 ? 2 : 1;
  chars.pop();
  inputBuf = chars.join('');
  var s = '';
  for (var i = 0; i < w; i++) s += '\b \b';
  term.write(s);
}

function replaceInput(text) {
  while (inputBuf.length > 0) { backspaceInput(); }
  inputBuf = text;
  term.write(text);
}

/** 命令执行脉冲：终端边框光晕瞬间点亮（0.65s 后自动恢复呼吸动画） */
function terminalPulse() {
  var tc = document.querySelector('.terminal-card');
  if (!tc) return;
  tc.classList.remove('pulse');
  void tc.offsetWidth;   // 强制 reflow，确保动画可重复触发
  tc.classList.add('pulse');
  setTimeout(function () { tc.classList.remove('pulse'); }, 700);
}

function submitTermInput() {
  var cmd = inputBuf.trim();
  term.write('\r\n');
  inputBuf = '';
  terminalPulse();
  if (cmd) {
    cmdHistory.unshift(cmd);
    if (cmdHistory.length > 50) cmdHistory.pop();
    cmdHistoryIdx = -1;
    sendCommand(cmd);
  } else {
    term.write('$ ');
  }
  try { term.scrollToBottom(); } catch (e) {}
}

function termWrite(lines) {
  if (!lines || !lines.length) return;
  var saved = inputBuf;
  if (saved) {
    // 输入保护：先把当前录入行清掉（回行首+清除整行），
    // 推送内容输出到独立行，再恢复录入内容，避免推送打断输入
    term.write('\r\x1b[2K');
    lines.forEach(function (line) {
      term.write((line || '') + '\r\n');
    });
    term.write(saved);
  } else {
    lines.forEach(function (line) {
      term.write((line || '') + '\r\n');
    });
  }
  // 始终滚动到底部：游戏终端的输入光标必须始终可见
  try { term.scrollToBottom(); } catch (e) {}
}

function sendCommand(cmd) {
  // 培训学习/考试 → 图形化答题弹窗（选择题/判断题）
  var qm = cmd.trim().match(/^(train|exam)\s+(\d+)$/);
  if (qm) {
    if (qm[1] === 'train') {
      // 未报名的课程先走后端报名命令（交学费），报名成功后再进入答题
      api('/api/game/config').done(function (cfg) {
        var c = cfg.courses && cfg.courses[parseInt(qm[2]) - 1];
        if (c && c.progress == null && !c.done) {
          term.write('$ ' + cmd + '\r\n');
          api('/api/game/command', { input: cmd }).done(function (r) {
            termWrite(r.lines || []);
            if (r.hud) renderHud(r.hud);
            var lines = (r.lines || []).join('\n');
            if (lines.indexOf('学费不够') >= 0 || lines.indexOf('智力') >= 0) return;
            setTimeout(function () { openQuizFlow('train', qm[2]); }, 600);
          });
        } else {
          openQuizFlow('train', qm[2]);
        }
      });
    } else {
      openQuizFlow('exam', qm[2]);
    }
    return;
  }
  var qm2 = cmd.trim().match(/^quiz\s+(learn|exam)$/);
  if (qm2) { openQuizFlow(qm2[1] === 'exam' ? 'exam' : 'train', null); return; }
  var qm3 = cmd.trim().match(/^(fun|趣味|问答)$/);
  if (qm3) { openQuizFlow('fun', null); return; }
  term.write('$ ' + cmd + '\r\n');
  var isMove = /^\s*move\s+/.test(cmd);
  if (isMove) {
    var target = cmd.trim().replace(/^move\s+/, '');
    showSceneLoading('正在前往 ' + target);
  }
  api('/api/game/command', { input: cmd }).done(function (r) {
    termWrite(r.lines || []);
    if (r.hud) renderHud(r.hud);
    if (r.hud && r.hud.gameOver) {
      toast(r.hud.gameOverReason || '游戏结束', 'err');
    }
    // 场景图已就绪（或无需换图）→ 隐藏场景 loading
    if (isMove) hideSceneLoading();
  }).fail(function () {
    termWrite(['\u001b[31m⚠ 与服务器通信失败\u001b[0m']);
    if (isMove) hideSceneLoading();
  });
}

/* 场景图加载完成/失败 → 隐藏场景 loading（move 后新图 onload） */
(function () {
  var si = document.getElementById('scene-img');
  if (si) {
    si.addEventListener('load', function () { hideSceneLoading(); });
    si.addEventListener('error', function () { hideSceneLoading(); });
  }
})();

/* ================ 加载指示 ================ */
var _sceneLoadingEl = null;
var _sceneLoadingTimer = null;
var _bootLogIdx = 0;
var _bootLogMsgs = [
  'initializing worker_sim…',
  'loading city config…',
  'connecting SSE channel…',
  'syncing character data…',
  'all systems ready.'
];
function setBootLog(txt, ok) {
  var el = document.getElementById('boot-log');
  if (!el) return;
  el.innerHTML = '<span class="' + (ok ? 'bl-ok' : '') + '">' + txt + '</span><span class="bl-cursor"></span>';
}
function finishBoot() {
  var el = document.getElementById('boot-loading');
  if (!el || el.dataset.done) return;
  el.dataset.done = '1';
  // 最短展示时长：让初始化动画可感知（数据秒开时也不至于一闪而过）
  var wait = Math.max(0, 1300 - (Date.now() - _bootStartTs));
  setTimeout(function () {
    setBootLog(_bootLogMsgs[_bootLogMsgs.length - 1], true);
    var fill = document.getElementById('boot-bar-fill');
    if (fill) fill.style.width = '100%';
    el.classList.add('boot-done');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 650);
  }, wait);
}
function startBootAnim() {
  _bootStartTs = Date.now();
  var fill = document.getElementById('boot-bar-fill');
  var w = 8;
  setInterval(function () {
    w = Math.min(92, w + 9 + Math.random() * 14);
    if (fill) fill.style.width = w + '%';
    _bootLogIdx = Math.min(_bootLogIdx + 1, _bootLogMsgs.length - 2);
    setBootLog(_bootLogMsgs[_bootLogIdx]);
  }, 420);
}
/* 场景切换 loading（全屏，覆盖图片+接口加载） */
function showSceneLoading(text) {
  hideSceneLoading();
  var d = document.createElement('div');
  d.className = 'scene-loading';
  d.id = 'scene-loading';
  d.innerHTML = '<div class="sl-inner"><span class="sl-spin"></span><span class="sl-text">' + text + '</span></div>';
  document.body.appendChild(d);
  _sceneLoadingEl = d;
  if (_sceneLoadingTimer) clearTimeout(_sceneLoadingTimer);
  _sceneLoadingTimer = setTimeout(hideSceneLoading, 3200);   // 兜底：最长 3.2s
}
function hideSceneLoading() {
  if (_sceneLoadingTimer) { clearTimeout(_sceneLoadingTimer); _sceneLoadingTimer = null; }
  if (!_sceneLoadingEl) return;
  var el = _sceneLoadingEl;
  el.classList.add('sl-out');
  setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
  _sceneLoadingEl = null;
}
/* 弹窗内容 loading：等待弹窗内图片加载完成（列表类同步渲染则瞬间消失） */
function showModalLoading(mask) {
  var box = mask && mask.querySelector ? (mask.querySelector('.modal') || mask) : null;
  if (!box) return;
  var lk = document.createElement('div');
  lk.className = 'modal-loading';
  lk.style.pointerEvents = 'none';
  lk.innerHTML = '<span class="ml-spin"></span>加载中';
  box.appendChild(lk);
  var imgs = box.querySelectorAll('img');
  var pending = [];
  imgs.forEach(function (im) { if (!im.complete) pending.push(im); });
  var cleared = false;
  function clear() {
    if (cleared) return; cleared = true;
    lk.classList.add('ml-out');
    setTimeout(function () { if (lk.parentNode) lk.parentNode.removeChild(lk); }, 200);
  }
  if (!pending.length) { setTimeout(clear, 40); return; }
  var left = pending.length;
  pending.forEach(function (im) {
    im.addEventListener('load', function () { if (--left <= 0) clear(); });
    im.addEventListener('error', function () { if (--left <= 0) clear(); });
  });
  setTimeout(clear, 800);   // 超时兜底（头像等小图加载快）
}

/* SSE 实时推送：服务端状态变更主动下发，替代高频轮询。
   SSE 连接正常时完全依赖 SSE（/api/game/state 零请求）；
   仅在 SSE 不支持/断线重连期间启用低频轮询兜底，恢复后自动停止。 */
function startFallbackPoll() {
  if (pollTimer) return;
  pollTimer = setInterval(pollState, 10000);
}
function stopFallbackPoll() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
function initSse() {
  if (!window.EventSource) { startFallbackPoll(); return; }
  sse = new EventSource('/api/game/stream');
  sse.addEventListener('state', function (e) {
    _lastSseTs = Date.now();
    try { applyState(JSON.parse(e.data), 'light'); }
    catch (err) { if (window.console) console.error('SSE apply error:', err); }
  });
  sse.onopen = function () {
    _lastSseTs = Date.now();
    stopFallbackPoll();
  };
  sse.onerror = function () {
    // EventSource 会自动重连；重连窗口内启用低频兜底保证状态不中断
    startFallbackPoll();
  };
  // 僵尸连接防护：连接看似正常但 25s 无任何消息（服务器端连接被清理/网络半开）→ 强制重建 + 兜底
  if (!_sseWatch) {
    _sseWatch = setInterval(function () {
      if (sse && sse.readyState === 1 && Date.now() - _lastSseTs > 25000) {
        try { sse.close(); } catch (e) {}
        sse = null;
        startFallbackPoll();
        initSse();
      }
    }, 8000);
  }
}

/* SSE 循环渲染防护：内容级脏检查。
   每个"昂贵"渲染函数先用 sig() 计算数据摘要，与上次相同则跳过重建——
   SSE 每秒推送不再无差别重绘 DOM，也避免对局/输入中的弹窗被每秒打断。
   玩家操作后数据变化 → 摘要变化 → 正常重建，功能不受影响。 */
var _sigCache = {};
function sig(key, s) {
  if (_sigCache[key] === s) return false;
  _sigCache[key] = s;
  return true;
}
function sigReset() { _sigCache = {}; }

/* 轻量状态合并：SSE 每秒推送的字段（vitals/金钱/时间/行情等）合并进完整缓存，
   低频字段（背包/NPC/证书/资产等）保留上次全量快照，避免每次推送全量数据 */
function mergeHud(light) {
  var base = window.__lastHud || {};
  if (!base.started || !light) { window.__lastHud = light || {}; return window.__lastHud; }
  Object.keys(light).forEach(function (k) {
    if (k === 'market') {
      // 行情：SSE 轻量只带现价，合并时保留旧 history（走势图数据），避免每次推送清空
      var oldQ = (base.market && base.market.quotes) || [];
      var newQ = (light.market.quotes || []).map(function (q) {
        var old = null;
        oldQ.forEach(function (o) { if (o.code === q.code) old = o; });
        q.history = (old && old.history && old.history.length) ? old.history : (q.history || []);
        return q;
      });
      base.market = { quotes: newQ, holdings: (light.market.holdings || base.market.holdings || []), cash: light.market.cash != null ? light.market.cash : 0 };
      return;
    }
    base[k] = light[k];
  });
  window.__lastHud = base;
  return base;
}

/* 统一状态刷新入口：mode='light' 为 SSE 轻量推送（merge），默认 'full' 为完整视图（替换） */
function applyState(r, mode) {
  var hud = mode === 'light' ? mergeHud(r.hud) : (r.hud || {});
  if (!hud.started) {
    finishBoot();   // 无存档：先结束 loading 再跳转
    if (term) termWrite(['\u001b[33m⚠ 游戏尚未开始，3 秒后返回标题页创建角色……\u001b[0m']);
    clearInterval(pollTimer);
    if (sse) { sse.close(); sse = null; }
    setTimeout(function () { location.href = '/'; }, 3000);
    return;
  }
  if (r.lines && r.lines.length) {
    var ev = r.lines.map(function (l) { return '\u001b[38;5;245m⛅\u001b[0m ' + l; });
    termWrite(ev);
  }
  renderHud(hud);
  finishBoot();   // 主界面数据就绪 → 结束初始化 loading（幂等）
  refreshOpenModals();
}

function pollState() {
  api('/api/game/state').done(function (r) { applyState(r, 'full'); }).fail(function () {});
}

/* 弹窗打开时随推送自动刷新（进度/金钱/状态实时同步）
   节流 1.5s：避免 SSE 每秒推送导致弹窗按钮不断重建刷新 */
var _modalRefreshLast = 0;
function refreshOpenModals() {
  var now = Date.now();
  if (now - _modalRefreshLast < 1500) return;
  _modalRefreshLast = now;
  var pairs = [
    ['shop-modal', renderShopModal], ['jobs-modal', renderJobsModal],
    ['train-modal', renderTrainModal], ['housing-modal', renderHousingModal],
    ['eat-modal', renderEatModal], ['lottery-modal', renderLotteryModal],
    ['bank-modal', renderBankModal], ['ach-modal', renderAchModal],
    ['assets-modal', renderAssetsModal], ['status-modal', renderStatusModal],
    ['quest-modal', renderQuestModal]
  ];
  pairs.forEach(function (p) {
    var el = document.getElementById(p[0]);
    if (el && el.style.display !== 'none' && p[1]) { try { p[1](); } catch (e) {} }
  });
}

/* ---------------- HUD 渲染 ---------------- */
function renderHud(h) {
  if (!h.started) return;
  window.__lastHud = h;
  if (h.market) window.gameMarket = h.market;
  // 时钟/日期/位置最先更新：即使后续渲染出现异常，时间显示也绝不停止
  document.getElementById('game-clock').textContent = h.fullTime || (h.day + ' ' + h.time);
  var loc = h.location || {};
  document.getElementById('chip-loc').textContent = (loc.icon || '📍') + ' ' + (loc.name || '');
  // 天气 chip
  var wx = h.weather || {};
  var wxChip = document.getElementById('chip-weather');
  if (wxChip) {
    var wxSig = (wx.id || 'sunny') + '|' + (wx.name || '');
    if (sig('hud-weather', wxSig)) {
      wxChip.textContent = (wx.icon || '☀️') + ' ' + (wx.name || '晴');
      wxChip.title = wx.desc || '今日天气';
    }
  }
  // 每日任务面板
  renderQuestPanel(h);
  if (stockModalOpen) renderStockModal();
  if (bagModalOpen) renderBagModal();
  if (bjModalOpen) renderBjModal(h);
  if (gomokuModalOpen) renderGomokuModal(h);
  if (pcModalOpen) renderPcDesktop();
  if (familyModalOpen) renderFamilyModal();
  if (loc.img) {
    document.getElementById('scene-img').src = '/img/' + loc.img + '?v=20260911';
  }
  if (typeof s3dSwitchPlace === 'function') s3dSwitchPlace(loc.id);
  document.getElementById('scene-icon').textContent = loc.icon || '';
  document.getElementById('scene-name').textContent = loc.name || '';
  document.getElementById('scene-desc').textContent = loc.desc || '';
  renderMap(loc.id);
  renderCmdBtns();

  var c = h.char || {};
  document.getElementById('avatar').textContent = c.genderIcon || '👨';
  document.getElementById('char-name').textContent = c.name || '——';
  document.getElementById('char-tags').textContent = [c.education, c.personality, c.major].filter(Boolean).join(' · ');

  var v = h.vitals || {};
  setBar('bar-stamina', 'num-stamina', v.stamina);
  setBar('bar-hunger', 'num-hunger', v.hunger);
  setBar('bar-mood', 'num-mood', v.mood);

  var sk = h.skills || {};
  document.getElementById('sk-str').textContent = sk.str || 0;
  document.getElementById('sk-intel').textContent = sk.intel || 0;
  document.getElementById('sk-charm').textContent = sk.charm || 0;
  document.getElementById('sk-luck').textContent = sk.luck || 0;

  // 属性悬浮详情
  var gearCharm = (sk.charm || 0) - (sk.baseCharm != null ? sk.baseCharm : 0);
  setTip('tip-stamina', '体力：干活、赶路的本钱<br>工作/移动会消耗，睡觉、吃饭、SPA 可恢复<br>归零会晕倒进医院');
  setTip('tip-hunger', '饱腹：肚子饿不饿<br>饿过头会掉体力，去吃饭能补充');
  setTip('tip-mood', '心情：情绪值<br>加班/输钱会掉，吃喝玩乐、社交会涨<br>太低容易生病');
  setTip('tip-str', '体力(力量)：「打工皇帝」的本钱<br>当前 ' + (sk.str || 0) + ' / 90<br>大街「锻炼身体」每 2 天 +1，体力活职业也会长');
  setTip('tip-intel', '智力：脑力工作的敲门砖<br>当前 ' + (sk.intel || 0) + ' / 90<br>培训中心「读书」、公园「冥想」每 2 天 +1');
  setTip('tip-charm', '魅力：吸引力的综合值<br>当前 ' + (sk.charm || 0) + '（基础 ' + (sk.baseCharm != null ? sk.baseCharm : 0) + ' + 穿戴 ' + gearCharm + '）<br>商场买衣服/饰品提升');
  setTip('tip-luck', '运气：玄学数值，影响刮刮乐/古董/套圈<br>当前 ' + (sk.luck || 0) + ' / 90<br>花店祈福、彩票店拜财神、台球练球、行善可提升');

  document.getElementById('money').textContent = h.money != null ? h.money : 0;
  document.getElementById('deposit').textContent = h.deposit != null ? h.deposit : 0;
  document.getElementById('prestige').textContent = h.prestige != null ? h.prestige : 0;

  var job = h.job;
  document.getElementById('hud-job').textContent = job ? (job.name + (job.type === 'special' ? ' ★' : '')) : '无业游民';
  document.getElementById('hud-certs').textContent = (h.certs && h.certs.length) ? h.certs.join('、') : '无';
  document.getElementById('hud-housing').textContent = h.housing || '睡大街';
  document.getElementById('hud-cars').textContent = (h.cars && h.cars.length) ? h.cars.join('、') : '无';
  document.getElementById('hud-estates').textContent = (h.estates && h.estates.length) ? h.estates.join('、') : '无';

  // 关系
  // 事件推送
  var partner = h.partner;
  window._hudNpcs = h.npcs || [];
  window._hudCerts = h.certificates || [];
  window._hudBiz = h.business || null;
  window._hudWholesale = h.wholesaleStock || [];
  window._hudEnts = h.ents || [];
  window._hudBestCar = h.bestCar || null;
  var married = h.marriage && h.marriage.married;
  document.getElementById('partner-info').textContent = partner ? ('· ' + partner.relation + '：' + partner.name + (married ? ' 💍' : '')) : (married ? ' 💍 已婚' : '');
  // 关系列表：好感/关系/来源变化才重建（SSE 每秒推送时避免头像 <img> 反复重新加载）
  var npcSig = (h.npcs || []).map(function (n) { return n.id + ':' + n.affection + ':' + n.relation + ':' + (n.source || '') + ':' + n.name + ':' + n.profession; }).join(',');
  if (sig('hud-npcs', npcSig)) {
    var npcHtml = '';
    (h.npcs || []).forEach(function (n) {
      var relCls = 'npc-rel';
      if (n.relation === '恋人' || n.relation === '暧昧') relCls += ' love';
      if (n.relation === '配偶') relCls += ' spouse';
      var affCls = 'lo';
      if (n.affection >= 85) affCls = 'hi';
      else if (n.affection >= 50) affCls = 'mid';
      npcHtml += '<div class="npc-item" onclick="openNpcDetail(\'' + esc(n.id) + '\')" title="点击互动">' +
        npcAvatar(n) +
        '<span><span class="npc-name">' + esc(n.name) + '</span><span class="npc-sub"> ' + (n.source === 'work' ? '同事' : '街头') + '·' + esc(n.profession) + '</span>' +
        '<br><span class="' + relCls + '">' + esc(n.relation) + '</span></span>' +
        '<span class="npc-aff ' + affCls + '">♥' + n.affection + '</span>' +
        '<span class="npc-go">互动 ›</span></div>';
    });
    document.getElementById('npc-list').innerHTML = npcHtml || '<p class="dim">还没有认识的人，去大街逛逛吧</p>';
  }

  // 成就
  var ac = h.achievementCount || 0, at = h.achievementTotal || 0;
  document.getElementById('ach-count').textContent = ac + '/' + at;
  document.getElementById('ach-fill').style.width = (at ? Math.round(ac / at * 100) : 0) + '%';

  // 事件日志（内容级脏检查：无新事件不重建 DOM）
  var evLog = h.eventLog || [];
  var evSig = evLog.length + '|' + (evLog[evLog.length - 1] || '');
  if (sig('evlog', evSig)) {
    var logHtml = '';
    evLog.forEach(function (l) { logHtml += '<p>' + esc(l) + '</p>'; });
    document.getElementById('event-log').innerHTML = logHtml || '<p class="dim">暂无</p>';
  }

  // 暂停/倍速状态
  var btnPause = document.getElementById('btn-pause');
  if (btnPause) {
    btnPause.textContent = h.paused ? '▶ 继续' : '⏸ 暂停';
    btnPause.classList.toggle('active', !!h.paused);
  }
  // 数值变化跳动
  var _lv = window.__lastVals || (window.__lastVals = {});
  [
    ['money', h.money != null ? h.money : 0],
    ['deposit', h.deposit != null ? h.deposit : 0],
    ['prestige', h.prestige != null ? h.prestige : 0],
    ['sk-str', sk.str || 0], ['sk-intel', sk.intel || 0],
    ['sk-charm', sk.charm || 0], ['sk-luck', sk.luck || 0],
    ['num-stamina', v.stamina || 0], ['num-hunger', v.hunger || 0], ['num-mood', v.mood || 0]
  ].forEach(function (pair) {
    var id = pair[0], val = pair[1];
    if (_lv[id] !== undefined && _lv[id] !== val) bumpVal(id);
    _lv[id] = val;
  });
}

function setBar(barId, numId, val) {
  val = Math.max(0, Math.min(100, val || 0));
  document.getElementById(barId).style.width = val + '%';
  document.getElementById(numId).textContent = val;
}

/* ---------------- 顶栏操作 ---------------- */
function togglePause() {
  var btn = document.getElementById('btn-pause');
  var paused = btn.textContent.indexOf('继续') >= 0;
  api('/api/game/pause', { paused: !paused }).done(function (r) {
    if (r.hud) renderHud(r.hud);
    toast(paused ? '时间继续流动' : '时间已暂停');
  });
}
function doSave() {
  var slot = +document.getElementById('save-slot').value;
  api('/api/game/save', { slot: slot }).done(function (r) {
    toast(r.ok ? '已保存到槽位 ' + slot : ((r.lines && r.lines[0]) || '保存失败'), r.ok ? 'ok' : 'err');
  });
}
function doLoad() {
  var slot = +document.getElementById('save-slot').value;
  if (!confirm('读取槽位 ' + slot + ' 的存档？当前进度会被覆盖。')) return;
  api('/api/game/load', { slot: slot }).done(function (r) {
    termWrite(r.lines || []);
    if (r.hud) renderHud(r.hud);
    toast(r.ok ? '读档成功' : '读档失败', r.ok ? 'ok' : 'err');
  });
}
function doReset() {
  if (!confirm('确定开始新游戏？当前进度将清空（可先存档）。')) return;
  api('/api/game/reset').done(function () { location.href = '/'; });
}

/* ---------------- 城市地图（弹窗 · 图片化） ---------------- */
var currentLocId = '';
var MAP_LOCS = [
  { id: 'jobmarket',  name: '人才市场', icon: '🏢', cmd: 'move 人才市场', x: 10, y: 19 },
  { id: 'bar',        name: '酒吧',     icon: '🍸', cmd: 'move 酒吧',     x: 24, y: 20 },
  { id: 'bank',       name: '银行',     icon: '🏦', cmd: 'move 银行',     x: 54, y: 15 },
  { id: 'mall',       name: '商场',     icon: '🛍️', cmd: 'move 商场',     x: 72, y: 12 },
  { id: 'stock',      name: '交易大厅', icon: '📈', cmd: 'move 交易大厅', x: 90, y: 17 },

  { id: 'carshop',    name: '4S店',     icon: '🚗', cmd: 'move 4S店',     x: 76, y: 26 },
  { id: 'foodstreet', name: '美食街',   icon: '🍜', cmd: 'move 美食街',   x: 50, y: 32 },
  { id: 'nightmarket',name: '夜市',     icon: '🏮', cmd: 'move 夜市',     x: 34, y: 34 },
  { id: 'wholesale',  name: '小商品批发', icon: '📦', cmd: 'move 小商品批发', x: 7, y: 37 },
  { id: 'market',     name: '菜市场',   icon: '🥬', cmd: 'move 菜市场',   x: 20, y: 44 },

  { id: 'dumpling',   name: '饺子馆',   icon: '🥟', cmd: 'move 饺子馆',   x: 92, y: 36 },
  { id: 'hotpot',     name: '火锅店',   icon: '🔥', cmd: 'move 火锅店',   x: 62, y: 44 },
  { id: 'malatang',   name: '地摊麻辣烫', icon: '🍲', cmd: 'move 地摊麻辣烫', x: 58, y: 68 },
  { id: 'braised',    name: '百味鸡',   icon: '🍗', cmd: 'move 百味鸡',   x: 30, y: 54 },
  { id: 'street',     name: '大街',     icon: '🏙️', cmd: 'move 大街',     x: 52, y: 55 },

  { id: 'estate',     name: '房产中介', icon: '🏘️', cmd: 'move 房产中介', x: 16, y: 64 },
  { id: 'billiards',  name: '台球厅',   icon: '🎱', cmd: 'move 台球厅',   x: 88, y: 56 },
  { id: 'lottery',    name: '彩票店',   icon: '🎰', cmd: 'move 彩票店',   x: 70, y: 58 },
  { id: 'training',   name: '培训中心', icon: '🎓', cmd: 'move 培训中心', x: 36, y: 68 },
  { id: 'adu',        name: '成人大学', icon: '🏛️', cmd: 'move 成人大学', x: 50, y: 70 },
  { id: 'park',       name: '城市公园', icon: '🌳', cmd: 'move 城市公园', x: 90, y: 74 },

  { id: 'club',       name: '会所',     icon: '🥂', cmd: 'move 会所',     x: 72, y: 78 },
  { id: 'ktv',        name: 'KTV',      icon: '🎤', cmd: 'move KTV',      x: 78, y: 82 },
  { id: 'pvclub',     name: '私人会所', icon: '💆', cmd: 'move 私人会所', x: 62, y: 84 },
  { id: 'flower',     name: '花店',     icon: '🌷', cmd: 'move 花店',     x: 44, y: 82 },
  { id: 'ghostmarket',name: '鬼市',     icon: '🕯️', cmd: 'move 鬼市',     x: 8, y: 86 },
  { id: 'home',       name: '住处',     icon: '🏠', cmd: 'move 住处',     x: 56, y: 88 },
  { id: 'workplace',  name: '工作地点', icon: '💼', cmd: 'move 工作地点', x: 28, y: 90 }
];
function refreshMap() {
  var wrap = document.getElementById('city-map');
  if (!wrap) return;
  var old = wrap.querySelectorAll('.city-pin');
  old.forEach(function (p) { p.remove(); });
  var curId = currentLocId || '';
  MAP_LOCS.forEach(function (loc) {
    var pin = document.createElement('div');
    pin.className = 'city-pin' + (loc.id === curId ? ' cur' : '');
    pin.style.left = loc.x + '%';
    pin.style.top = loc.y + '%';
    pin.id = 'map-' + loc.id;
    pin.title = loc.name;
    var locked = false;
    if (loc.id === 'workplace' && (!document.getElementById('hud-job') || document.getElementById('hud-job').textContent === '无业游民')) locked = true;
    if (loc.id === 'home' && document.getElementById('hud-housing') && document.getElementById('hud-housing').textContent === '睡大街') locked = true;
    pin.className = 'city-pin' + (loc.id === curId ? ' cur' : '') + (locked && loc.id !== curId ? ' locked' : '');
    pin.innerHTML = '<span class="cp-icon">' + loc.icon + '</span><span class="cp-name">' + loc.name + '</span>';
    pin.addEventListener('click', function () { closeMapModal(); runCmd(loc.cmd); });
    wrap.appendChild(pin);
  });
}
function openMapModal() {
  var m = document.getElementById('map-modal');
  if (!m) return;
  showModalBox(m);
  refreshMap();
  startMap3D();
}
function closeMapModal() {
  var m = document.getElementById('map-modal');
  hideModalEl(m);
  stopMap3D();
}
function renderMap(locId) { currentLocId = locId || ''; }

/* ---------------- 股市交易大厅（弹窗） ---------------- */
var stockModalOpen = false;
var stockSelCode = null;
function openStockModal() {
  var m = document.getElementById('stock-modal');
  if (!m) return;
  stockModalOpen = true;
  showModalBox(m);
  renderStockModal();
}
function closeStockModal() {
  var m = document.getElementById('stock-modal');
  hideModalEl(m);
  stockModalOpen = false;
}
function renderStockModal() {
  var mk = window.gameMarket;
  var box = document.getElementById('stock-quotes');
  if (!box) return;
  if (!mk || !mk.quotes || !mk.quotes.length) {
    box.innerHTML = '<div class="cmd-empty">交易大厅暂无行情，稍后再来看看。</div>';
    return;
  }
  var codes = mk.quotes.map(function (q) { return q.code; }).join(',');
  var priceSig = mk.quotes.map(function (q) { return q.price.toFixed(2) + ':' + (q.chg || 0); }).join(',');
  var holdSig = (mk.holdings || []).map(function (x) { return x.code + ':' + x.shares + ':' + x.cost; }).join(',');
  if (sig('stock-struct', codes + '|' + (stockSelCode || ''))) {
    // 结构变化（代码列表/选中股变化）→ 重建列表 DOM
    box.innerHTML = '';
    mk.quotes.forEach(function (q) {
      var chg = q.chg || 0;
      var cls = chg > 0 ? 'up' : (chg < 0 ? 'down' : 'flat');
      var row = document.createElement('div');
      row.className = 'sq-row' + (stockSelCode === q.code ? ' sel' : '');
      row.setAttribute('data-code', q.code);
      row.innerHTML =
        '<span class="sq-ico">' + (q.icon || '📈') + '</span>' +
        '<span class="sq-info"><span class="sq-name">' + q.name + '</span>' +
        '<span class="sq-code">' + q.code + ' · ' + (q.sector || '') + '</span></span>' +
        '<span class="sq-price"><span class="p ' + cls + '">' + q.price.toFixed(2) + '</span>' +
        '<span class="c ' + cls + '">' + (chg > 0 ? '+' : '') + chg.toFixed(2) + '%</span></span>';
      row.addEventListener('click', function () { selectStock(q.code); });
      box.appendChild(row);
    });
    if (!stockSelCode) { selectStock(mk.quotes[0].code); return; }
  } else if (sig('stock-price', priceSig + '|' + holdSig)) {
    // 结构未变但价格/持仓变化 → 仅更新已存在行的价格文本，不重建 DOM
    document.querySelectorAll('#stock-quotes .sq-row').forEach(function (row) {
      var code = row.getAttribute('data-code');
      var q = null;
      mk.quotes.forEach(function (x) { if (x.code === code) q = x; });
      if (!q) return;
      var cls = (q.chg || 0) > 0 ? 'up' : (q.chg || 0) < 0 ? 'down' : 'flat';
      var p = row.querySelector('.p'), c = row.querySelector('.c');
      if (p) { p.textContent = q.price.toFixed(2); p.className = 'p ' + cls; }
      if (c) { c.textContent = ((q.chg || 0) > 0 ? '+' : '') + (q.chg || 0).toFixed(2) + '%'; c.className = 'c ' + cls; }
    });
  }
  refreshStockDetail(mk);
}
function selectStock(code) {
  stockSelCode = code;
  var mk = window.gameMarket;
  if (mk) refreshStockDetail(mk);
  var rows = document.querySelectorAll('#stock-quotes .sq-row');
  rows.forEach(function (r) { r.classList.toggle('sel', r.textContent.indexOf(code) >= 0); });
}
function refreshStockDetail(mk) {
  var q = null;
  (mk.quotes || []).forEach(function (x) { if (x.code === stockSelCode) q = x; });
  if (!q) return;
  document.getElementById('stock-chart-title').textContent = (q.icon || '📈') + ' ' + q.name + '（' + q.code + '）';
  document.getElementById('stock-chart-title').title = q.name;
  var chg = q.chg || 0;
  var cls = chg > 0 ? 'up' : (chg < 0 ? 'down' : 'flat');
  var pr = document.getElementById('stock-chart-price');
  pr.textContent = q.price.toFixed(2) + ' 元';
  pr.className = 'stock-price ' + cls;
  var cg = document.getElementById('stock-chart-chg');
  cg.textContent = (chg > 0 ? '+' : '') + chg.toFixed(2) + '%';
  cg.className = 'stock-chg ' + cls;
  document.getElementById('stock-desc').textContent = (q.desc || '') + ' · 波动率 ±' + (q.volatility != null ? Math.round(q.volatility * 100) : '—') + '%';
  drawStockChart(q.history || []);
  // 持仓与交易
  var hold = document.getElementById('stock-hold');
  var h = (mk.holdings || []).filter(function (x) { return x.code === q.code; })[0];
  if (h) {
    var pnl = (q.price - h.cost / h.shares) * h.shares;
    var pcls = pnl >= 0 ? 'up' : 'down';
    hold.innerHTML =
      '<div class="tp-t">我的持仓</div>' +
      '<div class="tp-row"><span>持有</span><b>' + h.shares + ' 股</b></div>' +
      '<div class="tp-row"><span>成本</span><b>' + h.cost.toFixed(1) + ' 元</b></div>' +
      '<div class="tp-row"><span>现价</span><b class="' + cls + '">' + q.price.toFixed(2) + '</b></div>' +
      '<div class="tp-row"><span>浮动盈亏</span><b class="' + pcls + '">' + (pnl >= 0 ? '+' : '') + pnl.toFixed(1) + ' 元</b></div>';
  } else {
    hold.innerHTML = '<div class="tp-t">我的持仓</div><div class="cmd-empty" style="padding:4px 0">尚未持有这只股票</div>';
  }
  var cash = document.getElementById('stock-tip');
  cash.textContent = '可用现金 ' + (mk.cash != null ? mk.cash : 0) + ' 元 · 卖出时自动扣除手续费';
}
function drawStockChart(hist) {
  var cv = document.getElementById('stock-canvas');
  if (!cv) return;
  // 价格/长度未变化不重绘 canvas（SSE 每秒推送时避免无谓的 buffer 重分配）
  if (!sig('chart', (hist ? hist.length : 0) + ':' + (hist && hist.length ? hist[hist.length - 1] : ''))) return;
  var dpr = window.devicePixelRatio || 1;
  var W = cv.clientWidth || 520, H = cv.clientHeight || 240;
  cv.width = W * dpr; cv.height = H * dpr;
  var ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  if (!hist || hist.length < 2) {
    ctx.fillStyle = '#7d8590'; ctx.font = '12px monospace';
    ctx.fillText('数据采集中……', 16, H / 2);
    return;
  }
  var padL = 46, padR = 10, padT = 12, padB = 22;
  var cw = W - padL - padR, chh = H - padT - padB;
  var min = Math.min.apply(null, hist), max = Math.max.apply(null, hist);
  if (max - min < 1e-6) { max = min + 1; }
  var n = hist.length;
  function X(i) { return padL + (n === 1 ? cw / 2 : cw * i / (n - 1)); }
  function Y(v) { return padT + chh * (1 - (v - min) / (max - min)); }
  // 网格
  ctx.strokeStyle = 'rgba(48,54,61,.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
  for (var g = 0; g <= 4; g++) {
    var gy = padT + chh * g / 4;
    ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke();
    var val = max - (max - min) * g / 4;
    ctx.fillStyle = '#7d8590'; ctx.font = '10px monospace';
    ctx.fillText(val.toFixed(2), 2, gy + 3);
  }
  ctx.setLineDash([]);
  var upColor = '#f85149', downColor = '#3fb950';
  var last = hist[n - 1], first = hist[0];
  var col = last >= first ? upColor : downColor;
  // 面积填充
  var grad = ctx.createLinearGradient(0, padT, 0, padT + chh);
  grad.addColorStop(0, col + '44');
  grad.addColorStop(1, col + '00');
  ctx.beginPath();
  ctx.moveTo(X(0), Y(hist[0]));
  for (var i = 1; i < n; i++) ctx.lineTo(X(i), Y(hist[i]));
  ctx.lineTo(X(n - 1), padT + chh); ctx.lineTo(X(0), padT + chh);
  ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  // 折线
  ctx.beginPath();
  for (var j = 0; j < n; j++) {
    if (j === 0) ctx.moveTo(X(j), Y(hist[j]));
    else ctx.lineTo(X(j), Y(hist[j]));
  }
  ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke();
  // 最后价格点
  ctx.beginPath(); ctx.arc(X(n - 1), Y(last), 3, 0, Math.PI * 2);
  ctx.fillStyle = col; ctx.fill();
  // X 轴刻度
  ctx.fillStyle = '#7d8590'; ctx.font = '10px monospace';
  for (var k = 0; k <= 3; k++) {
    var xi = Math.floor(k * (n - 1) / 3);
    ctx.fillText('#' + (xi + 1), padL + cw * k / 3 - 8, H - 7);
  }
}
function stockOrder(side) {
  if (!stockSelCode) return;
  var qty = parseInt(document.getElementById('stock-qty').value, 10);
  if (!qty || qty <= 0) { toast('请输入股数', 'err'); return; }
  if (qty % 100 !== 0) { toast('股数须为 100 的整数倍（1手=100股）', 'err'); return; }
  runCmd('stock ' + side + ' ' + stockSelCode + ' ' + qty);
  setTimeout(function () { if (stockModalOpen) renderStockModal(); }, 1200);
}

/* ---------------- 背包换装（弹窗） ---------------- */
var bagModalOpen = false;
function openBagModal() {
  var m = document.getElementById('bag-modal');
  if (!m) return;
  bagModalOpen = true;
  showModalBox(m);
  renderBagModal();
}
function closeBagModal() {
  var m = document.getElementById('bag-modal');
  hideModalEl(m);
  bagModalOpen = false;
}
var BAG_CATS = [
  { k: 'clothes', icon: '👕', name: '衣服' },
  { k: 'pants', icon: '👖', name: '裤子' },
  { k: 'shoes', icon: '👞', name: '鞋子' },
  { k: 'watch', icon: '⌚', name: '手表' },
  { k: 'accessory', icon: '🕶️', name: '配饰' },
  { k: 'digital', icon: '📱', name: '数码' },
  { k: 'pet', icon: '🐾', name: '宠物' },
  { k: 'health', icon: '💊', name: '药品' },
  { k: 'other', icon: '📦', name: '其他' }
];

/* ---------------- 关系弹窗（NPC 交互） ---------------- */
var REL_MAP = { STRANGER: '陌生人', FRIEND: '朋友', CRUSH: '暧昧', LOVER: '恋人', FIANCEE: '未婚妻/夫', SPOUSE: '配偶' };
function relCn(r) { return REL_MAP[r] || r || '陌生人'; }
function findNpc(id) {
  return (window._hudNpcs || []).filter(function (n) { return n.id === id; })[0] || null;
}
function npcEmoji(n) {
  if (n.id === 'cat') return '🐱';
  return n.gender === 'male' ? '👨' : '👩';
}
var NPC_AV_MAP = {
  'fixed-foreman': 1, 'fixed-landlady': 2, 'fixed-madam': 3, 'fixed-agent': 4,
  'fixed-shop-flower': 5, 'fixed-shop-bar': 6, 'fixed-shop-billiards': 7, 'fixed-shop-club': 8,
  'fixed-nightboss': 9, 'fixed-ghostboss': 10, 'fixed-shop-street': 11, 'fixed-shop-mall': 12,
  'fixed-shop-braised': 1
};
var NPC_AV_MALE = [1, 4, 6, 10, 11];
var NPC_AV_FEMALE = [2, 3, 5, 7, 8, 9, 12];
function npcAvatar(n) {
  if (n && n.id === 'cat') return '<span class="npc-av cat">🐱</span>';
  var idx = 0;
  if (n && NPC_AV_MAP[n.id]) {
    idx = NPC_AV_MAP[n.id];
  } else {
    var pool = (n && n.gender) === 'female' ? NPC_AV_FEMALE : NPC_AV_MALE;
    var key = (n && n.id) || (n && n.name) || 'x';
    var h = 0;
    for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % pool.length;
    idx = pool[h];
  }
  var sp = (n && n.relation === 'SPOUSE') ? ' spouse' : ((n && (n.relation === 'LOVER' || n.relation === 'FIANCEE')) ? ' love' : '');
  return '<span class="npc-av' + sp + '"><img src="/img/npc/av' + idx + '.jpg" alt="' + esc((n && n.name) || '') + '" loading="lazy"><em class="npc-dot"></em></span>';
}
function openNpcModal() {
  var m = document.getElementById('npc-modal');
  if (!m) return;
  showModalBox(m);
  var list = document.getElementById('npc-modal-list');
  var npcs = window._hudNpcs || [];
  document.getElementById('npc-modal-step').textContent = npcs.length + ' 位熟人 · 点击进入互动';
  var html = '';
  npcs.forEach(function (n) {
    var affCls = n.affection >= 85 ? 'hi' : (n.affection >= 50 ? 'mid' : 'lo');
    var sp = n.relation === 'SPOUSE' ? ' spouse' : (n.relation === 'LOVER' || n.relation === 'FIANCEE' ? ' love' : '');
    html += '<div class="npc-card" onclick="openNpcDetail(\'' + esc(n.id) + '\')">' +
      npcAvatar(n) +
      '<span class="npc-card-info">' +
        '<span class="npc-card-name">' + esc(n.name) + '</span>' +
        '<span class="npc-card-sub">' + (n.source === 'work' ? '职场同事' : '街头熟人') + ' · ' + esc(n.profession) + '</span>' +
        '<span class="npc-aff-bar"><span class="npc-aff-fill ' + affCls + '" style="width:' + Math.min(100, n.affection) + '%"></span></span>' +
      '</span>' +
      '<span class="npc-card-right"><span class="npc-rel-tag' + sp + '">' + relCn(n.relation) + '</span><span class="npc-card-aff">♥ ' + n.affection + '</span></span>' +
    '</div>';
  });
  list.innerHTML = html || '<p class="dim" style="padding:20px">城里还没有熟人，去大街 social 认识新朋友吧</p>';
}
function closeNpcModal() { var m = document.getElementById('npc-modal'); hideModalEl(m); }
function openNpcDetail(id) {
  var n = findNpc(id);
  if (!n) { toast('找不到这个人', 'err'); return; }
  document.getElementById('npc-detail-title').textContent = npcEmoji(n) + ' ' + n.name;
  document.getElementById('npc-detail-relation').textContent = relCn(n.relation) + ' · 好感 ' + n.affection + '/100';
  var affCls = n.affection >= 85 ? 'hi' : (n.affection >= 50 ? 'mid' : 'lo');
  var tips = '';
  if (n.relation === 'SPOUSE') tips = '婚后的日子：偶尔回家一起吃顿饭，感情更长久。';
  else if (n.relation === 'LOVER' || n.relation === 'FIANCEE') tips = '继续升温：好感 90+ 可以求婚（有房更稳）。';
  else if (n.affection >= 60) tips = '到了表白的好时机：confess 确定关系。';
  else if (n.affection >= 30) tips = '慢慢来：好感 60 后可表白。';
  else tips = '多聊天、请客、送礼，好感会慢慢涨。';
  var btn = function (cmd, label, icon, cls) {
    return '<button class="npc-act ' + cls + '" onclick="npcAct(\'' + cmd + '\')">' + icon + ' ' + label + '</button>';
  };
  var acts = '';
  acts += btn('talk ' + n.id, '聊天', '💬', '');
  acts += btn('treat ' + n.id, '请客', '🍜', '');
  acts += btn('gift ' + n.id, '送礼', '🎁', '');
  acts += btn('help_npc ' + n.id, '帮个忙', '🤝', '');
  acts += btn('learn_npc ' + n.id, '请教', '📖', '');
  acts += btn('gossip ' + n.id, '知心话', '💭', '');
  acts += btn('borrow ' + n.id + ' 100', '借100', '💴', '');
  if (n.relation !== 'LOVER' && n.relation !== 'FIANCEE' && n.relation !== 'SPOUSE') {
    acts += btn('confess ' + n.id, '表白', '💘', n.affection >= 60 ? 'hot' : 'off');
  }
  if (n.relation === 'LOVER' || n.relation === 'FIANCEE') {
    acts += btn('propose ' + n.id, '求婚', '💍', n.affection >= 90 ? 'hot' : 'off');
  }
  if (n.relation === 'SPOUSE') {
    acts += btn('divorce ' + n.id, '离婚', '📄', 'danger');
  }
  var body = document.getElementById('npc-detail-body');
  // v2.2 话题聊天：按性别/角色分内容，态度随玩家社会地位变化
  var topics = ['家乡', '工作', '美食', '理财', '人生', '八卦'];
  var topicBtns = topics.map(function (tp) {
    return '<button class="npc-act" onclick="npcTopic(\'' + n.id + '\',\'' + tp + '\')">💬 聊' + tp + '</button>';
  }).join('');
  body.innerHTML =
    '<div class="npc-detail-top">' +
      '<div class="npc-detail-ava">' + npcEmoji(n) + '</div>' +
      '<div class="npc-detail-info">' +
        '<div class="nd-name">' + esc(n.name) + '</div>' +
        '<div class="nd-meta">' + (n.gender === 'male' ? '男' : '女') + ' · ' + esc(n.profession) + '</div>' +
        '<div class="nd-meta dim">性格：' + esc(n.personality || '') + '</div>' +
        '<div class="nd-aff"><span class="npc-aff-bar"><span class="npc-aff-fill ' + affCls + '" style="width:' + Math.min(100, n.affection) + '%"></span></span><span class="nd-aff-num">' + n.affection + '/100</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="npc-detail-tip">' + tips + '</div>' +
    '<div class="npc-detail-topics"><div class="nd-topics-title">💬 话题聊天 <span class="dim">（内容随性别/角色/你的身价变化）</span></div>' +
      '<div class="nd-topics">' + topicBtns + '</div></div>' +
    '<div class="npc-detail-acts">' + acts + '</div>';
  var mm = document.getElementById('npc-detail-modal');
  if (mm) showModalBox(mm);
}
function closeNpcDetail() { var m = document.getElementById('npc-detail-modal'); hideModalEl(m); }
function npcTopic(id, topic) {
  closeNpcDetail();
  runCmd('talk ' + id + ' ' + topic);
  setTimeout(function () { pollState(); }, 1000);
}
function npcAct(cmd) {
  closeNpcDetail();
  runCmd(cmd);
  setTimeout(function () { pollState(); }, 1000);
}
function openNpcBorrow(it) {
  // 打开熟人列表，用户选人后终端手动输入金额更稳
  openNpcModal();
  toast('在熟人列表里点开一个人，用「borrow <编号> <金额>」借钱（终端输入更灵活）', 'ok');
}

/* ---------------- 证书墙（弹窗） ---------------- */
function openCertModal() {
  var m = document.getElementById('cert-modal');
  if (!m) return;
  showModalBox(m);
  var certs = window._hudCerts || [];
  var body = document.getElementById('cert-body');
  if (!certs.length) {
    body.innerHTML = '<div class="cert-empty">📭 还没有获得任何证书<br><span>去培训中心学习并考试（train / exam）</span></div>';
    return;
  }
  var html = '<div class="cert-count">已获得 <b>' + certs.length + '</b> 张证书</div><div class="cert-grid">';
  certs.forEach(function (c) {
    html += '<div class="cert-card">' +
      '<div class="cert-icon">' + (c.icon || '📜') + '</div>' +
      '<div class="cert-name">' + esc(c.name) + '</div>' +
      '<div class="cert-seal">✔ 认证</div></div>';
  });
  html += '</div>';
  body.innerHTML = html;
}
function closeCertModal() { var m = document.getElementById('cert-modal'); hideModalEl(m); }

/* ---------------- 创业开店（弹窗） ---------------- */
function openBizModal() {
  var m = document.getElementById('biz-modal');
  if (!m) return;
  showModalBox(m);
  api('/api/game/config').done(function (cfg) {
    renderBizModal(cfg.businesses || []);
  });
}
function closeBizModal() { var m = document.getElementById('biz-modal'); hideModalEl(m); }
function renderBizModal(list) {
  var body = document.getElementById('biz-body');
  var biz = window._hudBiz;
  if (!biz) {
    var html = '<div class="biz-empty">想当老板吗？攒够启动资金，开一家自己的店。</div><div class="biz-list">';
    list.forEach(function (b, i) {
      html += '<div class="biz-card">' +
        '<span class="biz-icon">' + b.icon + '</span>' +
        '<span class="biz-info">' +
          '<span class="biz-name">' + esc(b.name) + '</span>' +
          '<span class="biz-desc">' + esc(b.desc) + '</span>' +
          '<span class="biz-meta">启动金 <b>' + b.cost + '</b> 元 · 声望 ≥ ' + b.minPrestige + ' · 日收益约 ' + b.baseIncome + ' 元</span>' +
        '</span>' +
        '<button class="biz-open" onclick="bizAct(\'open ' + (i + 1) + '\')">开店</button>' +
      '</div>';
    });
    html += '</div>';
    body.innerHTML = html;
    return;
  }
  var b = list.filter(function (x) { return x.id === biz.id; })[0] || null;
  var html = '<div class="biz-mine">' +
    '<div class="biz-mine-head">' + (b ? b.icon : '🏪') + ' ' + esc(biz.name) + ' · Lv.' + biz.level + '</div>' +
    '<div class="biz-mine-meta">累计营收 <b>' + biz.revenue + '</b> 元' + (b ? ' · 日收益约 ' + Math.round(b.baseIncome * Math.pow(1.5, biz.level - 1)) + ' 元' : '') + '</div>' +
    '<div class="biz-mine-acts">' +
      '<button class="biz-open" onclick="bizAct(\'run\')">🏪 今日经营</button>' +
      '<button class="biz-open" onclick="bizAct(\'upgrade\')">🛠 升级店铺</button>' +
      '<button class="biz-open danger" onclick="bizAct(\'close\')">🏷 转让店铺</button>' +
    '</div>' +
    '<div class="biz-tip">经营消耗体力与 2 小时时间，每日一次；升级提升营收。</div>' +
  '</div>';
  body.innerHTML = html;
}
function bizAct(cmd) {
  closeBizModal();
  runCmd(cmd);
  if (cmd.indexOf('open') === 0) {
    setTimeout(function () {
      pollState();
      setTimeout(function () {
        var biz = window._hudBiz;
        toast(biz ? ('✅ 开店成功：' + biz.name) : ('❌ 开店失败：资金或声望不足'), biz ? 'ok' : 'err');
      }, 1400);
    }, 500);
  } else if (cmd === 'run') {
    setTimeout(function () { pollState(); }, 1200);
    toast('🏪 今日经营完成，营收已入账', 'ok');
  } else if (cmd === 'upgrade') {
    toast('🛠 店铺升级完成', 'ok');
  } else if (cmd.indexOf('close') === 0) {
    toast('🏷 店铺已转让', 'ok');
  }
}

/* ---------------- 培训答题（弹窗） ---------------- */
var quizState = null;
function openQuizFlow(mode, courseIdx) {
  if (mode !== 'train' && mode !== 'exam' && mode !== 'college' && mode !== 'fun') return;
  if (mode === 'fun') {
    api('/api/game/quiz', { courseId: currentLocId || '', mode: 'fun' }).done(function (r) {
      if (!r.ok) { toast(r.msg || '这里没什么好玩的', 'err'); return; }
      quizState = {
        mode: 'fun',
        phase: 'q',
        quizId: r.quizId,
        courseName: r.courseName,
        questions: r.questions || [],
        answers: [],
        cur: 0,
        answered: false
      };
      quizState.questions.forEach(function () { quizState.answers.push(null); });
      renderQuiz();
      var m = document.getElementById('quiz-modal');
      if (m) showModalBox(m);
    }).fail(function () { toast('无法连接服务器', 'err'); });
    return;
  }
  if (courseIdx != null) {
    startQuiz(mode, String(courseIdx));
    return;
  }
  // 未指定课程 → 先显示选课列表
  api('/api/game/config').done(function (cfg) {
    quizState = { mode: mode, phase: 'pick', courses: cfg.courses || [], college: cfg.adultClasses || [] };
    renderQuiz();
    var m = document.getElementById('quiz-modal');
    if (m) showModalBox(m);
  }).fail(function () { toast('无法连接服务器', 'err'); });
}
function startQuiz(mode, courseIdx) {
  api('/api/game/quiz', { courseId: courseIdx, mode: mode === 'exam' ? 'exam' : (mode === 'college' ? 'adult' : 'study') }).done(function (r) {
    if (!r.ok) { toast(r.msg || '出题失败', 'err'); return; }
    quizState = {
      mode: mode,
      phase: 'q',
      quizId: r.quizId,
      courseName: r.courseName,
      questions: r.questions || [],
      answers: [],
      cur: 0,
      answered: false
    };
    quizState.questions.forEach(function () { quizState.answers.push(null); });
    renderQuiz();
    var m = document.getElementById('quiz-modal');
    if (m) showModalBox(m);
  }).fail(function () { toast('无法连接服务器', 'err'); });
}
function closeQuizModal() {
  var m = document.getElementById('quiz-modal');
  hideModalEl(m);
  quizState = null;
}
function renderQuiz() {
  if (!quizState) return;
  var st = quizState;
  // 选课阶段
  if (st.phase === 'pick') {
    document.getElementById('quiz-title').textContent = st.mode === 'exam' ? '📝 选择考试课程' : (st.mode === 'college' ? '🎓 选择学历班级' : '✏️ 选择学习课程');
    document.getElementById('quiz-step').textContent = st.mode === 'exam' ? '熟练度满 100% 才能参加' : (st.mode === 'college' ? '熟练度满 100% 才能参加毕业考试' : '答题成功才算完成本节课');
    var bar = document.getElementById('quiz-progress-bar');
    if (bar) bar.style.width = '0%';
    document.getElementById('quiz-question').innerHTML = st.mode === 'college'
      ? '<span class="quiz-q-tag">提示</span>选择一个学历班级，先「📖 上课」把熟练度学到 100%，再参加毕业考试'
      : '点击选择一门课程开始：';
    var optBox = document.getElementById('quiz-options');
    optBox.innerHTML = '';
    var list = st.mode === 'college' ? (st.college || []) : (st.courses || []);
    (list || []).forEach(function (c, i) {
      var b = document.createElement('button');
      var status;
      if (st.mode === 'college') {
        status = c.graduated ? '✔ 已毕业' : (c.progress >= 100 ? '🎯 可考试' : (c.progress != null ? '📖 ' + Math.round(c.progress) + '%' : '未报名'));
      } else {
        status = c.done ? '✔ 已获证' : (c.progress >= 100 ? '🎯 可考试' : (c.progress > 0 ? '📖 ' + Math.round(c.progress) + '%' : '未报名'));
      }
      b.className = 'quiz-opt course-opt';
      var subInfo = st.mode === 'college'
        ? (c.name + ' · ' + (c.fromEducationName || '') + '→' + (c.toEducationName || ''))
        : (c.name + ' · ' + c.certName);
      b.innerHTML = '<span class="qo-key">' + (i + 1) + '</span>' +
        '<span class="qo-text"><b>' + subInfo + '</b>' +
        '<span class="qo-sub">' + status + '</span></span>';
      b.addEventListener('click', function () {
        if (c.graduated) { toast('这个班已经毕业啦', 'err'); return; }
        if (st.mode === 'exam' && c.progress < 100) { toast('熟练度不足（' + Math.round(c.progress || 0) + '%），先学习', 'err'); return; }
        if (st.mode === 'college') {
          // 未报名 → 先走后端报名命令
          if (c.progress == null) {
            toast('正在报名「' + c.name + '」…', 'ok');
            api('/api/game/command', { input: 'college enroll ' + c.id }).done(function (r) {
              var lines = (r.lines || []).join('\n');
              if (lines.indexOf('学费不够') >= 0 || lines.indexOf('智力') >= 0 || lines.indexOf('学历') >= 0 || lines.indexOf('超出') >= 0) {
                toast('✘ ' + collegeErrMsg(lines), 'err');
                return;
              }
              setTimeout(function () {
                api('/api/game/command', { input: 'college study ' + c.id }).done(function () {
                  pollState();
                  toast('已报名并开始上课，熟练度 +', 'ok');
                });
              }, 300);
            });
            return;
          }
          if (c.progress < 100) {
            api('/api/game/command', { input: 'college study ' + c.id }).done(function (r) {
              pollState();
              toast((r.lines || []).join('\n').split('\n').pop() || '上课完成', 'ok');
            });
            return;
          }
          // 熟练度满 → 直接开考
          startQuiz(st.mode, c.id);
          return;
        }
        if (st.mode === 'train' && c.progress == null) {
          // 未报名 → 先走后端报名命令
          toast('正在报名「' + c.name + '」…', 'ok');
          api('/api/game/command', { input: 'train ' + c.id }).done(function (r) {
            var lines = (r.lines || []).join('\n');
            if (lines.indexOf('学费不够') >= 0 || lines.indexOf('智力') >= 0) {
              toast('报名失败，请查看终端提示', 'err');
              return;
            }
            setTimeout(function () { startQuiz(st.mode, c.id); }, 400);
          });
          return;
        }
        startQuiz(st.mode, c.id);
      });
      optBox.appendChild(b);
    });
    var prev = document.getElementById('quiz-prev');
    var next = document.getElementById('quiz-next');
    var submit = document.getElementById('quiz-submit');
    if (prev) prev.style.display = 'none';
    if (next) next.style.display = 'none';
    if (submit) submit.style.display = 'none';
    document.getElementById('quiz-result').style.display = 'none';
    document.getElementById('quiz-nav').textContent = '共 ' + (list || []).length + ' 个' + (st.mode === 'college' ? '班级' : '课程');
  }
  var total = st.questions.length;
  var q = st.questions[st.cur];
  document.getElementById('quiz-title').textContent =
    (st.mode === 'exam' ? '📝 结业考试' : (st.mode === 'college' ? '🎓 毕业考试' : (st.mode === 'fun' ? '🎲 趣味问答' : '✏️ 课堂学习'))) + ' · ' + st.courseName;
  document.getElementById('quiz-step').textContent =
    st.mode === 'exam' || st.mode === 'college' ? ('答对全部题目才能拿证 · 第 ' + (st.cur + 1) + '/' + total + ' 题')
    : (st.mode === 'fun' ? '答对有钱拿，答错长见识 · 第 ' + (st.cur + 1) + '/' + total + ' 题' : '答对即完成本节课');
  var bar = document.getElementById('quiz-progress-bar');
  if (bar) bar.style.width = (st.mode === 'exam' || st.mode === 'college' ? ((st.cur + 1) / total * 100) : 50) + '%';
  document.getElementById('quiz-question').innerHTML =
    '<span class="quiz-q-tag">' + (q.type === 'judge' ? '判断题' : '选择题') + '</span>' + q.q;
  var optBox = document.getElementById('quiz-options');
  optBox.innerHTML = '';
  var letters = ['A', 'B', 'C', 'D', 'E'];
  q.options.forEach(function (op, i) {
    var b = document.createElement('button');
    b.className = 'quiz-opt' + (st.answers[st.cur] === i ? ' sel' : '');
    b.innerHTML = '<span class="qo-key">' + letters[i] + '</span><span class="qo-text">' + op + '</span>';
    b.addEventListener('click', function () {
      st.answers[st.cur] = i;
      renderQuiz();
    });
    optBox.appendChild(b);
  });
  var prev = document.getElementById('quiz-prev');
  var next = document.getElementById('quiz-next');
  var submit = document.getElementById('quiz-submit');
  var isExamLike = st.mode === 'exam' || st.mode === 'college';
  if (prev) prev.style.display = (isExamLike && st.cur > 0) ? '' : 'none';
  if (next) next.style.display = (isExamLike && st.cur < total - 1) ? '' : 'none';
  if (submit) submit.style.display = (isExamLike && st.cur === total - 1) || st.mode === 'train' || st.mode === 'fun' ? '' : 'none';
  document.getElementById('quiz-result').style.display = 'none';
  document.getElementById('quiz-nav').textContent =
    (isExamLike ? ('第 ' + (st.cur + 1) + '/' + total + ' 题') : '');
}
function quizPrev() {
  if (!quizState || quizState.cur <= 0) return;
  quizState.cur--;
  renderQuiz();
}
function quizNext() {
  if (!quizState) return;
  if (quizState.answers[quizState.cur] == null) { toast('请先选择一个答案', 'err'); return; }
  if (quizState.cur < quizState.questions.length - 1) {
    quizState.cur++;
    renderQuiz();
  }
}
function quizSubmit() {
  if (!quizState || quizState.phase !== 'q') return;
  for (var i = 0; i < quizState.answers.length; i++) {
    if (quizState.answers[i] == null) { toast('第 ' + (i + 1) + ' 题还没作答', 'err'); return; }
  }
  api('/api/game/quiz/answer', { quizId: quizState.quizId, answers: quizState.answers }).done(function (r) {
    var box = document.getElementById('quiz-result');
    box.style.display = 'block';
    box.className = 'quiz-result ' + (r.ok ? 'ok' : 'bad');
    var html = '<div class="qr-title">' + (r.ok ? (r.passed ? (quizState.mode === 'college' ? '🎓 恭喜毕业！' : (quizState.mode === 'fun' ? '🎯 答对了！' : '🎉 恭喜通过！')) : '✅ 回答正确！') : '❌ ' + (quizState.mode === 'exam' || quizState.mode === 'college' ? '考试未通过' : '回答错误')) + '</div>';
    html += '<div class="qr-msg">' + (r.msg || '') + '</div>';
    if (r.detail && r.detail.length > 1) {
      html += '<div class="qr-detail">';
      r.detail.forEach(function (d) {
        html += '<div class="qr-item ' + (d.correct ? 'right' : 'wrong') + '">' +
          (d.correct ? '✔' : '✘') + ' 第' + d.idx + '题 ' + d.q + '（正确答案：' +
          quizState.questions[d.idx - 1].options[d.right] + '）</div>';
      });
      html += '</div>';
    }
    box.innerHTML = html;
    document.getElementById('quiz-next').style.display = 'none';
    document.getElementById('quiz-prev').style.display = 'none';
    document.getElementById('quiz-submit').style.display = 'none';
    if (r.progress != null) toast('熟练度 ' + r.progress + '%', 'ok');
    setTimeout(function () {
      var wasCollege = quizState && quizState.mode === 'college' && r.passed;
      closeQuizModal();
      pollState();
      // 毕业后刷新成人大学弹窗（若还开着）
      if (wasCollege) {
        sigReset();
        loadGameConfig(function () { renderCollegeModal(); }, true);
      }
    }, r.ok && !r.passed ? 1500 : 2600);
  }).fail(function () { toast('无法连接服务器', 'err'); });
}
function bagIcon(cat) {
  var c = BAG_CATS.filter(function (x) { return x.k === cat; })[0];
  return c ? c.icon : '📦';
}
function renderBagModal() {
  var list = document.getElementById('bag-list');
  if (!list) return;
  var h = window.__lastHud;
  var inv = h && h.inventory ? h.inventory : [];
  var bagSig = inv.map(function (it) { return (it.id || it.name || '') + ':' + (it.on ? 1 : 0); }).join(',');
  if (!sig('bag', bagSig)) return;   // 背包内容/穿戴未变化不重建
  if (!inv.length) {
    list.innerHTML = '<div class="cmd-empty">背包空空如也，去商场买点东西吧。</div>';
    document.getElementById('bag-bonus').innerHTML = '';
    document.getElementById('bag-summary').textContent = '0 件物品';
    return;
  }
  var on = {}, off = {};
  inv.forEach(function (it) {
    var cat = it.category || 'other';
    (it.on ? on : off)[cat] = (it.on ? on : off)[cat] || [];
    (it.on ? on : off)[cat].push(it);
  });
  var html = '';
  BAG_CATS.forEach(function (c) {
    var items = (on[c.k] || []).concat(off[c.k] || []);
    if (!items.length) return;
    html += '<div class="bag-cat-row"><span class="bag-cat">' + c.icon + ' ' + c.name + '</span>'
      + '<span class="bag-cat-rule"></span></div>';
    html += '<div class="bag-grid">';
    items.forEach(function (it) {
      var wear = it.category === 'clothes' || it.category === 'pants' || it.category === 'shoes' || it.category === 'watch' || it.category === 'accessory' || it.category === 'digital';
      var bonus = [];
      if (it.charm > 0) bonus.push('<i class="chip chip-charm">✨+' + it.charm + '</i>');
      if (it.prestige > 0) bonus.push('<i class="chip chip-prestige">⭐+' + it.prestige + '</i>');
      if (it.mood > 0) bonus.push('<i class="chip chip-mood">💖+' + it.mood + '</i>');
      if (it.socialBonus > 0) bonus.push('<i class="chip chip-social">💬+' + Math.round(it.socialBonus * 100) + '%</i>');
      html += '<div class="bag-card' + (it.on ? ' on' : '') + '">'
        + (it.on ? '<span class="bag-wear-tag">穿 戴 中</span>' : '')
        + '<div class="bag-card-head">'
        + '<span class="bag-card-icon">' + bagIcon(it.category) + '</span>'
        + '<span class="bag-card-name">' + it.name + '</span>'
        + '</div>'
        + '<div class="bag-card-bonus">' + (bonus.length ? bonus.join('') : '<span class="bag-none">无属性加成</span>') + '</div>'
        + '<div class="bag-card-foot">';
      if (wear) {
        html += '<button class="bag-btn ' + (it.on ? 'off' : 'on') + '" onclick="bagToggle(\'' + it.id + '\',' + (it.on ? 0 : 1) + ')">'
          + (it.on ? '卸 下' : '穿 上') + '</button>';
      } else {
        html += '<span class="bag-own">' + (it.category === 'pet' ? '已领养' : '已拥有') + '</span>';
      }
      html += '</div></div>';
    });
    html += '</div>';
  });
  list.innerHTML = html;
  var ch = h && h.skills ? h.skills.charm : 0;
  var pr = h && h.prestige ? h.prestige : 0;
  document.getElementById('bag-summary').textContent = inv.length + ' 件物品 · 同类别仅可穿戴一件';
  document.getElementById('bag-bonus').innerHTML =
    '<span class="stat-pill">✨ 总魅力 <b>' + ch + '</b></span>'
    + '<span class="stat-pill">⭐ 总声望 <b>' + pr + '</b></span>'
    + '<span class="stat-pill hint">同类别（衣服/裤子/手表/数码）只可穿一件</span>';
}
function bagToggle(itemId, toOn) {
  runCmd((toOn ? 'wear ' : 'takeoff ') + itemId);
  setTimeout(function () {
    // 命令执行后 HUD 已刷新，直接重渲染弹窗
    renderBagModal();
  }, 1000);
}

/* ---------------- 图形化命令面板（按场景展示） ---------------- */
// scenes 缺省 = 通用（所有场景可见）
var CMD_GROUPS = [
  { key: 'grow', label: '📈 工作学习', items: [
    { t: '📋 招聘信息', c: 'jobs', d: '人才市场岗位一览', i: '📋', scenes: ['jobmarket'], pop: 'jobs' },
    { t: '💪 去上班', c: 'work 8', d: '打工 8 小时（体力不足自动减）', i: '💪', scenes: ['workplace'], pop: 'work' },
    { t: '📚 培训课程', c: 'train', d: '报名 / 学习 / 结业考试（弹窗内完成）', i: '📚', scenes: ['training'], pop: 'train' },
    { t: '🎓 成人大学', c: 'college', d: '学历提升：报名 / 上课 / 毕业考试', i: '🎓', scenes: ['adu'], pop: 'college' },
    { t: '📖 读书自习', c: 'read', d: '看书 1 小时，每 2 天 +1 智力', i: '📖', scenes: ['training', 'home'], pop: 'action' },
    { t: '📜 证书墙', c: 'cert', d: '查看所有已获证书', i: '📜', pop: 'cert' }
  ]},
  { key: 'interact', label: '📍 交互', items: [
    { t: '🛍️ 逛商场', c: 'shop', d: '买衣表数码提升魅力声望', i: '🛍️', scenes: ['mall'], pop: 'shop' },
    { t: '💊 买药', c: 'buy medicine', d: '生病时恢复健康', i: '💊', scenes: ['mall'] },
    { t: '🌷 买花', c: 'eat', d: '花店选购装点心情', i: '🌷', scenes: ['flower'], pop: 'eat' },
    { t: '🙏 祈福许愿', c: 'pray', d: '50 元香火钱，每 3 天 +1 运气', i: '🙏', scenes: ['flower'], pop: 'action' },
    { t: '🍜 美食街觅食', c: 'eat', d: '沙县小吃/串串香/烧烤/炸鸡/小火锅', i: '🍜', scenes: ['foodstreet'], pop: 'eat' },
    { t: '🍸 喝一杯', c: 'eat', d: '酒吧小酌放松心情', i: '🍸', scenes: ['bar'], pop: 'eat' },
    { t: '🎱 打台球', c: 'eat', d: '台球厅娱乐消遣', i: '🎱', scenes: ['billiards'], pop: 'eat' },
    { t: '🎯 练球', c: 'practice', d: '台球厅找手感，每 3 天 +1 运气', i: '🎯', scenes: ['billiards'], pop: 'action' },
    { t: '🥂 会所消费', c: 'eat', d: '高消费涨声望', i: '🥂', scenes: ['club'], pop: 'eat' },
    { t: '💆 SPA按摩', c: 'spa', d: '会所放松，80 元恢复体力心情', i: '💆', scenes: ['club'], pop: 'action' },
    { t: '🍗 百味鸡', c: 'eat', d: '老王家的卤味', i: '🍗', scenes: ['braised'], pop: 'eat' },
    { t: '🍲 麻辣烫', c: 'eat', d: '街角自选串串', i: '🍲', scenes: ['malatang'], pop: 'eat' },
    { t: '🥟 饺子馆', c: 'eat', d: '金元宝薄皮大馅', i: '🥟', scenes: ['dumpling'], pop: 'eat' },
    { t: '🔥 火锅', c: 'eat', d: '蜀香门红油翻滚', i: '🔥', scenes: ['hotpot'], pop: 'eat' },
    { t: '🥬 菜市场', c: 'eat', d: '买菜做饭食材', i: '🥬', scenes: ['market'], pop: 'eat' },
    { t: '🍢 夜市小吃', c: 'eat', d: '夜市小吃摊', i: '🍢', scenes: ['nightmarket'], pop: 'eat' },
    { t: '🎫 彩票站', c: 'lottery', d: '刮刮乐 + 双色球', i: '🎫', scenes: ['lottery'], pop: 'lottery' },
    { t: '🪔 拜财神', c: 'worship', d: '彩票店上香，每 3 天 +1 运气', i: '🪔', scenes: ['lottery'], pop: 'action' },
    { t: '📦 批发进货', c: 'wholesale', d: '摆摊货源批发城', i: '📦', scenes: ['wholesale'], pop: 'wholesale' },
    { t: '🃏 21点', c: 'bj', d: '公园牌友对赌', i: '🃏', scenes: ['park'], pop: 'bj' },
    { t: '♟️ 五子棋', c: 'gomoku', d: '公园棋友对弈', i: '♟️', scenes: ['park'], pop: 'gomoku' },
    { t: '🧘 冥想', c: 'meditate', d: '公园打坐，每 2 天 +1 智力', i: '🧘', scenes: ['park'], pop: 'action' },
    { t: '🎯 套圈', c: 'ringtoss', d: '夜市套圈，20 元 3 圈碰运气', i: '🎯', scenes: ['nightmarket'], pop: 'action' },
    { t: '🏺 淘古董', c: 'antique', d: '鬼市赌眼力，50 元一把', i: '🏺', scenes: ['ghostmarket'], pop: 'action' },
    { t: '🔮 求签', c: 'fortune', d: '鬼市求一签，看今日运势', i: '🔮', scenes: ['ghostmarket'], pop: 'action' },
    { t: '🏦 银行业务', c: 'bank', d: '存取款 / 贷款 / 理财一站式', i: '🏦', scenes: ['bank'], pop: 'bank' },
    { t: '🚗 汽车服务', c: 'carshop', d: '4S店：买车 / 卖车一站式', i: '🚗', scenes: ['carshop'], pop: 'carshop' },
    { t: '🏠 看房买房', c: 'estate', d: '房产中介在售房源', i: '🏠', scenes: ['estate'], pop: 'estate' },
    { t: '🏘️ 找住处', c: 'housing', d: '日租/月租/公寓', i: '🏘️', scenes: ['street', 'estate'], pop: 'housing' },
    { t: '🛋️ 家居布置', c: 'home', d: '购置家电家具，把家布置得像样', i: '🛋️', scenes: ['home'], pop: 'home', needHome: true },
    { t: '🖥️ 电脑', c: 'pc', d: '线上求职/炒股/网银/刷剧/直播', i: '🖥️', scenes: ['home'], pop: 'pc', needPc: true },
    { t: '📺 看电视', c: 'home watch', d: '窝沙发看会儿电视', i: '📺', scenes: ['home'], pop: 'action', needTv: true },
    { t: '💑 家庭互动', c: 'family', d: '和TA在家里腻歪', i: '💑', scenes: ['home'], pop: 'family', needPartner: true },
    { t: '🌙 睡觉', c: 'sleep', d: '按住处质量恢复体力', i: '🌙', scenes: ['street', 'home'], pop: 'action' },
    { t: '🗑️ 捡废品', c: 'scrap', d: '大街翻垃圾桶换钱', i: '🗑️', scenes: ['street'], pop: 'action' },
    { t: '摆地摊', c: 'stall', d: '选货吆喝两小时（先进货）', i: '🏪', scenes: ['street'], pop: 'stall' },
    { t: '🏃 锻炼身体', c: 'exercise', d: '跑步半小时，每 2 天 +1 体力', i: '🏃', scenes: ['street'], pop: 'action' },
    { t: '💝 行善积德', c: 'donate', d: '捐 100 元，每 2 天 +1 运气', i: '💝', scenes: ['street'], pop: 'action' },
    { t: '📰 街头小报', c: 'news', d: '1 元买份小报，看趣闻与今日运势', i: '📰', scenes: ['street'], pop: 'action' },
    { t: '💼 打零工', c: 'gig', d: '发传单/帮工 2 小时，每日 2 次（大街/百味鸡/菜市场/花店）', i: '💼', scenes: ['street', 'braised', 'market', 'flower'], pop: 'action' },
    { t: '🧾 砍价买菜', c: 'bargain', d: '菜市场讨价还价，运气决定折扣（10%~45%）', i: '🧾', scenes: ['market'], pop: 'action' },
    { t: '💐 学插花', c: 'arrange', d: '花店 60 元学费，每 3 天魅力 +1', i: '💐', scenes: ['flower'], pop: 'action' },
    { t: '🏆 台球对局', c: 'battle', d: '与凤姐赌一局台球（20~200 元）', i: '🏆', scenes: ['billiards'], pop: 'action' },
    { t: '🤝 商务应酬', c: 'network', d: '会所 200 元应酬，声望 +1 有几率遇贵人', i: '🤝', scenes: ['club'], pop: 'action' },
    { t: '💘 相亲角', c: 'match', d: '公园相亲角 20 元，每天 1 次，魅力运气定缘分', i: '💘', scenes: ['park'], pop: 'action' },
    { t: '🕊️ 喂鸽子', c: 'pigeon', d: '公园 2 元鸽食，图个乐子', i: '🕊️', scenes: ['park'], pop: 'action' },
    { t: '🎯 打气球', c: 'balloon', d: '夜市 10 元 10 发，百发百中有彩蛋', i: '🎯', scenes: ['nightmarket'], pop: 'action' },
    { t: '🎣 捞金鱼', c: 'goldfish', d: '夜市 10 元一网，有几率捞到宠物金鱼', i: '🎣', scenes: ['nightmarket'], pop: 'action' },
    { t: '🏪 小卖部唠嗑', c: 'conv', d: '买瓶水，听店主唠家常，可能白赚一笔', i: '🏪', scenes: ['street'], pop: 'action' },
    { t: '📌 看公告栏', c: 'bulletin', d: '人才市场公告栏，可能有急招情报', i: '📌', scenes: ['jobmarket'], pop: 'action' },
    { t: '👕 试衣间', c: 'tryon', d: '商场试衣服，心情+2，可能捡到优惠券', i: '👕', scenes: ['mall'], pop: 'action' },
    { t: '🍢 试吃巡游', c: 'taste', d: '美食街免费试吃，混个半饱', i: '🍢', scenes: ['foodstreet'], pop: 'action' },
    { t: '🌷 整理花材', c: 'flowerwork', d: '帮花店老板娘理花，可能获赠玫瑰', i: '🌷', scenes: ['flower'], pop: 'action' },
    { t: '🎵 听驻唱', c: 'music', d: '酒吧角落里听歌，心情+3', i: '🎵', scenes: ['bar'], pop: 'action' },
    { t: '🎱 斯诺克', c: 'snooker', d: '台球厅自己练练手感', i: '🎱', scenes: ['billiards'], pop: 'action' },
    { t: '🥂 会所大堂', c: 'lounge', d: '坐大堂观察体面人，可能被记住', i: '🥂', scenes: ['club'], pop: 'action' },
    { t: '🎰 研究走势', c: 'studylotto', d: '彩票店研究走势图，蓄力好运', i: '🎰', scenes: ['lottery'], pop: 'action' },
    { t: '🥬 菜摊帮工', c: 'marketwork', d: '帮摊主理菜，可能获赠青菜', i: '🥬', scenes: ['market'], pop: 'action' },
    { t: '🏦 大堂经理', c: 'lobby', d: '银行大厅听理财课，涨点见识', i: '🏦', scenes: ['bank'], pop: 'action' },
    { t: '🚗 试驾豪车', c: 'testdrive', d: '4S店试坐/试驾，感受有钱人的世界', i: '🚗', scenes: ['carshop'], pop: 'action' },
    { t: '🏠 看样板间', c: 'viewhome', d: '房产中介样板间，畅想未来', i: '🏠', scenes: ['estate'], pop: 'action' },
    { t: '🌳 公园遛弯', c: 'stroll', d: '散散步，看看大爷大妈，心情+2', i: '🌳', scenes: ['park'], pop: 'action' },
    { t: '🏮 逛夜市', c: 'nightwalk', d: '慢悠悠晃夜市，闻闻人间烟火', i: '🏮', scenes: ['nightmarket'], pop: 'action' },
    { t: '🕯️ 鬼市听古话', c: 'ghosttalk', d: '听摊主讲故事，可能沾点好运', i: '🕯️', scenes: ['ghostmarket'], pop: 'action' },
    { t: '🧠 街坊百晓生', c: 'fun', d: '邻里趣味问答：答对老板给你包红包', i: '🧠', scenes: ['street'], pop: 'fun' },
    { t: '💼 职场小考', c: 'fun', d: '职场冷知识问答，答对长见识还赚钱', i: '💼', scenes: ['jobmarket'], pop: 'fun' },
    { t: '🛍️ 购物达人考', c: 'fun', d: '商场套路趣味问答，答对有小彩头', i: '🛍️', scenes: ['mall'], pop: 'fun' },
    { t: '🍜 吃货鉴定考', c: 'fun', d: '吃货知识趣味问答，答对店家送小费', i: '🍜', scenes: ['foodstreet'], pop: 'fun' },
    { t: '🌷 花语小考', c: 'fun', d: '花语知识趣味问答，答对老板娘点赞', i: '🌷', scenes: ['flower'], pop: 'fun' },
    { t: '🍸 酒桌常识考', c: 'fun', d: '酒桌冷知识问答，答对全场干一杯', i: '🍸', scenes: ['bar'], pop: 'fun' },
    { t: '🎱 台球规则考', c: 'fun', d: '台球规则问答，答对凤姐请你打球', i: '🎱', scenes: ['billiards'], pop: 'fun' },
    { t: '🥂 商务礼仪考', c: 'fun', d: '应酬礼仪问答，答对老板高看你一眼', i: '🥂', scenes: ['club'], pop: 'fun' },
    { t: '🎰 彩民知识考', c: 'fun', d: '彩票冷知识问答，答对老板送一张刮刮乐', i: '🎰', scenes: ['lottery'], pop: 'fun' },
    { t: '🥬 买菜精考', c: 'fun', d: '菜市场生存问答，答对摊主抹零头', i: '🥬', scenes: ['market'], pop: 'fun' },
    { t: '💰 理财常识考', c: 'fun', d: '银行理财冷知识问答，答对柜员送小礼品', i: '💰', scenes: ['bank'], pop: 'fun' },
    { t: '🚗 汽车常识考', c: 'fun', d: '汽车知识问答，答对销售小哥递名片', i: '🚗', scenes: ['carshop'], pop: 'fun' },
    { t: '🏠 购房常识考', c: 'fun', d: '买房冷知识问答，答对中介喊你哥', i: '🏠', scenes: ['estate'], pop: 'fun' },
    { t: '🌳 生活百晓生', c: 'fun', d: '生活常识问答，答对大爷大妈给你鼓掌', i: '🌳', scenes: ['park'], pop: 'fun' },
    { t: '🏮 夜市老饕考', c: 'fun', d: '夜市生存问答，答对老板多送一串', i: '🏮', scenes: ['nightmarket'], pop: 'fun' },
    { t: '🕯️ 鬼市识货考', c: 'fun', d: '古玩江湖问答，答对老瞎子说你有悟性', i: '🕯️', scenes: ['ghostmarket'], pop: 'fun' },
    { t: '📚 充电小考', c: 'fun', d: '学习知识趣味问答，答对同学请你喝奶茶', i: '📚', scenes: ['training'], pop: 'fun' },
    { t: '🏛️ 校园智多星', c: 'fun', d: '校园趣味问答，答对室友请你撸串', i: '🏛️', scenes: ['adu'], pop: 'fun' },
    { t: '🎤 点公主/少爷', c: 'ktv', d: 'KTV 花名册：点一位陪唱，按小时计费', i: '🎤', scenes: ['ktv'], pop: 'ktv' },
    { t: '💆 点男/女技师', c: 'pv', d: '私人会所技师名单：点单按摩放松', i: '💆', scenes: ['pvclub'], pop: 'pvclub' }
  ]},
  { key: 'social', label: '💕 社交', items: [
    { t: '👋 附近的人', c: 'social', d: '大街陌生人 / 同事', i: '👋', scenes: ['street', 'workplace'], pop: 'npc' },
    { t: '👥 熟人互动', c: 'npc', d: '点击NPC弹窗：聊天/送礼/表白/离婚', i: '👥', pop: 'npc' },
    { t: '🤝 帮个忙', c: 'help_npc 1', d: '帮朋友个忙，好感大涨（先 social 看编号）', i: '🤝', pop: 'npchelp' },
    { t: '💴 找人借钱', c: 'borrow 1 100', d: '向熟人借钱：点开熟人列表选人（borrow <编号> <金额>）', i: '💴', pop: 'npcborrow' },
    { t: '📖 请教学习', c: 'learn_npc 1', d: '向朋友请教，智力成长（先 social 看编号）', i: '📖', pop: 'npclearn' },
    { t: '💭 聊知心话', c: 'gossip 1', d: '聊点八卦家常，好感+心情（先 social 看编号）', i: '💭', pop: 'npcgossip' }
  ]},
  { key: 'asset', label: '🏦 资产', items: [
    { t: '🎒 背包', c: 'bag', d: '查看物品 / 穿戴换装', i: '🎒', pop: 'bag' },
    { t: '🏪 创业开店', c: 'business', d: '从打工人到小老板', i: '🏪', pop: 'biz' },
    { t: '💼 资产总览', c: 'assets', d: '房产/车辆/存款/生意', i: '💼', pop: 'assets' },
    { t: '📈 交易大厅', c: 'stock', d: '临江股市：行情/买卖/持仓', i: '📈', pop: 'stock', scenes: ['stock'] },
    { t: '🚗 用车互动', c: 'car', d: '兜风/洗车/加油/黑车/载人/飙车', i: '🚗', pop: 'car', needCar: true }
  ]},
  { key: 'sys', label: '⚙️ 系统', items: [
    { t: '帮助', c: 'help', d: '全部指令说明', i: '❓' },
    { t: '📊 状态', c: 'status', d: '完整属性面板', i: '📊', pop: 'status' },
    { t: '🏆 成就', c: 'achievements', d: '已解锁成就墙', i: '🏆', pop: 'ach' },
    { t: '📋 每日任务', c: 'quest', d: '今日 3 个任务，完成自动领奖', i: '📋', pop: 'quest' },
    { t: '📱 手机', c: 'phone', d: '聊天/短视频/点外卖（需购买）', i: '📱', pop: 'phone' },
    { t: '⏸️ 暂停/继续', c: 'pause', d: '暂停时间流逝', i: '⏸️' },
    { t: '💾 存档', c: 'save', d: '保存当前进度', i: '💾' },
    { t: '🔄 新周目', c: 'newgame', d: '重开一局：继承30%现金/车辆/证书/关系', i: '🔄', pop: 'newgame' }
  ]}
];
var cmdCurKey = 'interact';
function initCmdBar() {
  var tabs = document.getElementById('cmd-tabs');
  var btns = document.getElementById('cmd-btns');
  if (!tabs || !btns) return;
  CMD_GROUPS.forEach(function (g) {
    if (g.key === 'sys') {
      var mb = document.createElement('button');
      mb.className = 'cmd-tab btn-map-tab';
      mb.textContent = '🗺 地图';
      mb.title = '城市地图';
      mb.addEventListener('click', function () { openMapModal(); });
      tabs.appendChild(mb);
    }
    var tb = document.createElement('button');
    tb.className = 'cmd-tab' + (g.key === cmdCurKey ? ' active' : '');
    tb.textContent = g.label;
    tb.dataset.key = g.key;
    tb.addEventListener('click', function () {
      cmdCurKey = g.key;
      document.querySelectorAll('.cmd-tab').forEach(function (t) { t.classList.toggle('active', t === tb); });
      renderCmdBtns();
    });
    tabs.appendChild(tb);
  });
  renderCmdBtns();
}
function cmdVisible(it, locId) {
  if (it.scenes && it.scenes.length && it.scenes.indexOf(locId) < 0) return false;
  var _h = window.__lastHud || {};
  if (it.needPc && !_h.pc) return false;
  if (it.needTv && !_h.tv) return false;
  if (it.needHome && !(_h.estates && _h.estates.length)) return false;
  if (it.needPartner && !_h.partner) return false;
  if (it.needCar && !_h.bestCar) return false;
  return true;
}
var _cmdRenderKey = '';
function renderCmdBtns() {
  var container = document.getElementById('cmd-btns');
  if (!container) return;
  var g = null;
  CMD_GROUPS.forEach(function (x) { if (x.key === cmdCurKey) g = x; });
  if (!g) return;
  var locId = currentLocId || '';
  var _h = window.__lastHud || {};
  var _key = cmdCurKey + '|' + locId + '|' + ((_h.job && _h.job.id) || '') + '|' + !!_h.paused
    + '|' + ((_h.pc && _h.pc.level) || 0) + '|' + !!_h.tv + '|' + !!_h.partner + '|' + (_h.homeItems || []).length;
  if (_key === _cmdRenderKey) return;   // 场景/工作/暂停/家电/伴侣未变化不重建（防每秒刷新）
  _cmdRenderKey = _key;
  var items = g.items.filter(function (it) { return cmdVisible(it, locId); });
  container.innerHTML = '';
  if (!items.length) {
    var tip = document.createElement('span');
    tip.className = 'cmd-empty';
    tip.textContent = '当前场景没有「' + g.label.replace(/^\S+\s/, '') + '」相关操作，试试其他场景';
    container.appendChild(tip);
    return;
  }
  items.forEach(function (it) {
    var b = document.createElement('button');
    b.className = 'cbtn';
    if (!it.pop) b.setAttribute('data-exec', '1');   // 执行类按钮：进度条+防重复；弹窗打开类不算执行
    b.title = it.d + '（' + it.c + '）';
    b.innerHTML = '<span class="cb-ico">' + it.i + '</span>' + it.t.replace(/^[^\u4e00-\u9fa5]+/, '');
    b.addEventListener('click', function () {
      if (it.pop === 'stock') { openStockModal(); }
      else if (it.pop === 'bag') { openBagModal(); }
      else if (it.pop === 'npc') { openNpcModal(); }
      else if (it.pop === 'cert') { openCertModal(); }
      else if (it.pop === 'biz') { openBizModal(); }
      else if (it.pop === 'stall') { openStallModal(); }
      else if (it.pop === 'wholesale') { openWholesaleModal(); }
      else if (it.pop === 'carshop') { openCarshopModal(); }
      else if (it.pop === 'estate') { openEstateModal(); }
      else if (it.pop === 'bj') { openBjModal(); }
      else if (it.pop === 'gomoku') { openGomokuModal(); }
      else if (it.pop === 'phone') { openPhoneModal(); }
      else if (it.pop === 'action') { openActionModal(it); }
      else if (it.pop === 'shop') { openShopModal(); }
      else if (it.pop === 'jobs') { openJobsModal(); }
      else if (it.pop === 'train') { openTrainModal(); }
      else if (it.pop === 'college') { openCollegeModal(); }
      else if (it.pop === 'npchelp') { runCmd(it.c); }
      else if (it.pop === 'npcborrow') { openNpcBorrow(it); }
      else if (it.pop === 'npclearn') { runCmd(it.c); }
      else if (it.pop === 'npcgossip') { runCmd(it.c); }
      else if (it.pop === 'housing') { openHousingModal(); }
      else if (it.pop === 'eat') { openEatModal(); }
      else if (it.pop === 'lottery') { openLotteryModal(); }
      else if (it.pop === 'bank') { openBankModal(); }
      else if (it.pop === 'ach') { openAchModal(); }
      else if (it.pop === 'home') { openHomeModal(); }
      else if (it.pop === 'pc') { openPcModal(); }
      else if (it.pop === 'family') { openFamilyModal(); }
      else if (it.pop === 'work') { openWorkModal(); }
      else if (it.pop === 'assets') { openAssetsModal(); }
      else if (it.pop === 'status') { openStatusModal(); }
      else if (it.pop === 'quest') { openQuestModal(); }
      else if (it.pop === 'fun') { openQuizFlow('fun', null); }
      else if (it.pop === 'ktv') { openKtvModal(); }
      else if (it.pop === 'pvclub') { openPvclubModal(); }
      else if (it.pop === 'car') { openCarModal(); }
      else if (it.pop === 'newgame') {
        if (confirm('确定开启新周目吗？\n将保留 30% 现金、车辆、证书与关系好感，其余清零重来。')) runCmd('newgame');
      }
      else { runCmd(it.c); }
    });
    container.appendChild(b);
  });
}

/* ---------------- 执行进度条 + 防重复点击 ---------------- */
function showExecProgress() {
  var bar = document.getElementById('exec-progress');
  if (!bar) return;
  var fill = bar.querySelector('.exec-progress-fill');
  fill.classList.remove('run');
  void fill.offsetWidth;   // 重启动画
  fill.classList.add('run');
  bar.classList.add('on');
}
function hideExecProgress() {
  var bar = document.getElementById('exec-progress');
  if (bar) bar.classList.remove('on');
}
/* 统一拦截：执行类按钮点击 → 顶部进度条（2s）+ 防重复
   判定规则：带 data-exec 标记（终端命令按钮/快捷指令），
   或 onclick 调用执行类函数（购买/入职/学习/社交/保存等）；
   关闭/切换/翻页/选择/打开弹窗类为被动按钮，放行。 */
document.addEventListener('click', function (e) {
  // 手机弹窗内所有按钮免进度条（保持手机操作流畅）
  var pm = document.getElementById('phone-modal');
  if (pm && getComputedStyle(pm).display !== 'none') return;
  var btn = e.target && e.target.closest ? e.target.closest('button') : null;
  if (!btn || btn.disabled) return;
  var isExec = btn.getAttribute('data-exec') === '1' || btn.hasAttribute('data-cmd');
  if (!isExec) {
    var oc = btn.getAttribute('onclick') || '';
    if (!oc) return;
    if (/(close|Close|✕|×|取消|tab|page|prev|next|toggle|select|open\w*Modal|wg[A-Z]|bjAction|gomokuStart|scratchBuy|scratchRevealAll|lotteryBuy|trainStudy|trainExam|trainAction|phoneTab|phoneChatNpc|phoneChatReply)/i.test(oc)) return;
  }
  if (btn.dataset.execBusy === '1') {
    e.stopImmediatePropagation();
    e.preventDefault();
    toast('⏳ 操作执行中，请稍候…', 'err');
    return;
  }
  btn.dataset.execBusy = '1';
  btn.classList.add('executing');
  showExecProgress();
  setTimeout(function () {
    btn.dataset.execBusy = '';
    btn.classList.remove('executing');
    hideExecProgress();
  }, 2000);
}, true);

/* ---------------- 初始化 ---------------- */
$(function () {
  startBootAnim();   // 主页面初始化 loading 动画（数据就绪后由 finishBoot 淡出）
  if (document.getElementById('terminal')) {
    initTerminal();
    initScene3D();
    termWrite([
      '\u001b[38;5;220m╔══════════════════════════════════════════════════╗\u001b[0m',
      '\u001b[38;5;220m║         Worker Simulator · 正在连接……           ║\u001b[0m',
      '\u001b[38;5;220m║  提示：终端中的命令都可以用鼠标点击执行          ║\u001b[0m',
      '\u001b[38;5;220m╚══════════════════════════════════════════════════╝\u001b[0m'
    ]);
    initSse();
    // 一次性全量状态（背包/NPC/证书/资产等低频字段），此后由 SSE 轻量增量 + 操作返回更新
    api('/api/game/state').done(function (r) { applyState(r, 'full'); });
    // 自由模式跳转进入（?goto=<地点id>）自动移动
    applyGotoParam();

    // 图形化命令面板
    initCmdBar();

    // 快捷指令
    document.querySelectorAll('.qbtn').forEach(function (b) {
      b.addEventListener('click', function () {
        var cmd = b.getAttribute('data-cmd');
        if (cmd) sendCommand(cmd);
      });
    });
  }

  // 标题页滚动标语
  var slogans = [
    '「 从一无所有，到在这座城市活下去 」',
    '「 1 游戏分钟 = 1 现实秒，时间不会等你 」',
    '「 搬砖、学习、恋爱、买房——你的人生你做主 」',
    '「 刮刮乐能救命，也能要命，量力而行 」'
  ];
  var sEl = document.getElementById('slogan');
  if (sEl) {
    var si = 0;
    setInterval(function () {
      si = (si + 1) % slogans.length;
      sEl.style.opacity = 0;
      setTimeout(function () {
        sEl.textContent = slogans[si];
        sEl.style.transition = 'opacity .4s';
        sEl.style.opacity = 1;
      }, 400);
    }, 6000);
  }
});

/* ---------------- 摆地摊（弹窗选货） ---------------- */
function openStallModal() {
  var m = document.getElementById('stall-modal');
  if (!m) return;
  showModalBox(m);
  renderStallModal();
}
function closeStallModal() { var m = document.getElementById('stall-modal'); hideModalEl(m); }
function renderStallModal() {
  var list = window._hudWholesale || [];
  var body = document.getElementById('stall-body');
  if (!list.length) {
    body.innerHTML = '<div class="stall-empty">🈳 货架空空如也<br><span>先去「小商品批发」进货（move 小商品批发 → 批发进货）</span></div>';
    return;
  }
  var html = '<div class="stall-tip">选择要卖的货，一次摆摊 2 小时卖 1 单位，卖得越多赚得越多（可多卖几单位）</div><div class="stall-list">';
  list.forEach(function (w) {
    html += '<div class="stall-card" id="stall-' + w.id + '">' +
      '<span class="stall-icon">' + w.icon + '</span>' +
      '<span class="stall-info">' +
        '<span class="stall-name">' + esc(w.name) + '</span>' +
        '<span class="stall-meta">库存 <b>' + w.stock + '</b> ' + w.unit + ' · 约卖 ' + w.sellBase + ' 元/' + w.unit + '</span>' +
        '<span class="stall-qty">卖出数量 <button class="qty-btn" onclick="stallQty(\'' + w.id + '\',-1)">−</button><b id="qty-' + w.id + '">1</b><button class="qty-btn" onclick="stallQty(\'' + w.id + '\',1)">＋</button></span>' +
      '</span>' +
      '<button class="stall-go" onclick="stallGo(\'' + w.id + '\')">🏪 开摆</button>' +
    '</div>';
  });
  html += '</div>';
  body.innerHTML = html;
}
function stallQty(id, d) {
  var el = document.getElementById('qty-' + id);
  var w = (window._hudWholesale || []).filter(function (x) { return x.id === id; })[0];
  if (!el || !w) return;
  var q = Math.max(1, Math.min(w.stock, (+el.textContent || 1) + d));
  el.textContent = q;
}
function stallGo(id) {
  var q = +(document.getElementById('qty-' + id).textContent || 1);
  var before = (window._hudWholesale || []).filter(function (x) { return x.id === id; })[0];
  var beforeStock = before ? before.stock : 0;
  closeStallModal();
  runCmd('stall ' + id + ' ' + q);
  setTimeout(function () { pollState(); }, 1200);
  setTimeout(function () {
    var h = window.__lastHud || {};
    var cur = (h.wholesaleStock || []).filter(function (x) { return x.id === id; })[0];
    var sold = cur ? Math.max(0, beforeStock - cur.stock) : 0;
    toast(sold > 0 ? ('✅ 卖出 ' + sold + ' 单位，收益已入账') : ('❌ 这次没卖出去（城管来了？）'), sold > 0 ? 'ok' : 'err');
  }, 3200);
}

/* ---------------- 小商品批发（弹窗进货） ---------------- */
function openWholesaleModal() {
  var m = document.getElementById('wholesale-modal');
  if (!m) return;
  showModalBox(m);
  api('/api/game/config').done(function (cfg) {
    renderWholesaleModal(cfg.wholesale || []);
  });
}
function closeWholesaleModal() { var m = document.getElementById('wholesale-modal'); hideModalEl(m); }
function renderWholesaleModal(list) {
  var body = document.getElementById('wholesale-body');
  var stockMap = {};
  (window._hudWholesale || []).forEach(function (w) { stockMap[w.id] = w.stock; });
  var html = '<div class="wholesale-tip">一箱箱的袜子手机壳，摆摊人的进货圣地。进货后去大街「摆地摊」卖货。</div><div class="wholesale-list">';
  list.forEach(function (w, i) {
    var have = stockMap[w.id] || 0;
    html += '<div class="wholesale-card" id="ws-' + w.id + '">' +
      '<span class="ws-icon">' + w.icon + '</span>' +
      '<span class="ws-info">' +
        '<span class="ws-name">' + esc(w.name) + '</span>' +
        '<span class="ws-desc">' + esc(w.desc) + '</span>' +
        '<span class="ws-meta">批发 <b>' + w.price + '</b> 元/' + w.unit + ' · 摆摊约卖 ' + w.sellBase + ' 元 · 已有 ' + have + ' 单位</span>' +
      '</span>' +
      '<span class="ws-buy">' +
        '<span class="ws-qty">数量 <button class="qty-btn" onclick="wsQty(\'' + w.id + '\',-1)">−</button><b id="wsq-' + w.id + '">1</b><button class="qty-btn" onclick="wsQty(\'' + w.id + '\',1)">＋</button></span>' +
        '<button class="ws-go" onclick="wsBuy(\'' + (i + 1) + '\')">📦 进货</button>' +
      '</span>' +
    '</div>';
  });
  html += '</div>';
  body.innerHTML = html;
}
function wsQty(id, d) {
  var el = document.getElementById('wsq-' + id);
  if (!el) return;
  var q = Math.max(1, Math.min(99, (+el.textContent || 1) + d));
  el.textContent = q;
}
function wsBuy(idx) {
  var list = [];
  var cards = document.querySelectorAll('.wholesale-card');
  var id = '';
  cards.forEach(function (c) { if (c.id.indexOf('ws-') === 0) list.push(c.id.slice(3)); });
  id = list[idx - 1];
  var q = +(document.getElementById('wsq-' + id).textContent || 1);
  closeWholesaleModal();
  runCmd('wholesale buy ' + idx + ' ' + q);
  buyResultToast('wholesale', id, '进货 ' + q + ' 单位成功，快去大街摆摊', '进货失败：余额不足');
}

/* ================= 4S 店购车弹窗 ================= */
var carshopModalOpen = false;
var carIcons = { ebike: '🛵', tricycle: '🛺', motorcycle: '🏍️', van: '🚐', sedan: '🚗', newcar: '🚘', sedan_mid: '🚙', truck: '🚚', luxcar: '🚔', sports: '🏎️' };
var _carTab = 'buy';
function openCarshopModal() {
  carshopModalOpen = true;
  _carTab = 'buy';
  var m = document.getElementById('carshop-modal');
  showModalBox(m);
  var tb = document.getElementById('ws-tab-buy'), ts = document.getElementById('ws-tab-sell');
  if (tb) tb.className = 'ws-tab active';
  if (ts) ts.className = 'ws-tab';
  loadGameConfig(function () { renderCarshopModal(); });
}
function closeCarshopModal() { carshopModalOpen = false; closeModalWithAnim('carshop-modal'); }
function carshopTab(tab, btn) {
  _carTab = tab;
  var tb = document.getElementById('ws-tab-buy'), ts = document.getElementById('ws-tab-sell');
  if (tb) tb.className = 'ws-tab' + (tab === 'buy' ? ' active' : '');
  if (ts) ts.className = 'ws-tab' + (tab === 'sell' ? ' active' : '');
  renderCarshopModal();
}
function renderCarshopModal() {
  var wrap = document.getElementById('carshop-list');
  if (!wrap) return;
  if (_carTab === 'sell') { renderCarshopSell(wrap); return; }
  var h = window.__lastHud || {};
  var owned = h.cars || [];
  var cfg = GAME_CONFIG || {};
  var cars = cfg.cars || [];
  if (!cars.length) { wrap.innerHTML = '<div class="stall-empty">数据加载中…</div>'; return; }
  var html = cars.map(function (c, i) {
    var has = owned.indexOf(c.id) >= 0;
    return '<div class="wholesale-card">' +
      '<div class="ws-icon">' + (carIcons[c.id] || '🚗') + '</div>' +
      '<div class="ws-info">' +
        '<div class="ws-name">' + c.name + '</div>' +
        '<div class="ws-desc">' + (c.desc || '') + '</div>' +
        '<div class="ws-meta">售价 <b>' + fmtMoney(c.cost) + '</b> 元 · 声望+' + c.prestige + (c.deliveryBonus > 0 ? ' · 配送+' + Math.round(c.deliveryBonus * 100) + '%' : '') + (c.socialBonus > 0 ? ' · 社交+' + Math.round(c.socialBonus * 100) + '%' : '') + '</div>' +
      '</div>' +
      '<div class="ws-buy">' + (has ? '<span class="sc-owned">✅ 已提车</span>' : '<button class="ws-go" onclick="buyCarById(\'' + c.id + '\',\'' + esc(c.name) + '\')">🚗 全款提车</button>') + '</div>' +
    '</div>';
  }).join('');
  wrap.innerHTML = '<div class="wholesale-tip">🏪 4S店 · 车到山前必有路，提车提升声望与配送效率</div><div class="wholesale-list">' + html + '</div>';
}
function buyCarById(id, name) {
  closeCarshopModal();
  runCmd('buycar ' + id);
  buyResultToast('cars', id, '提车成功：' + (name || id), '提车失败：余额不足');
}

/* ================= 房产中介弹窗 ================= */
var estateModalOpen = false;
var estateIcons = { village_flat: '🏘️', old_flat: '🏚️', shop: '🏪', lift_flat: '🏢', two_bedroom: '🏬', villa: '🏡', riverside: '🌆' };
function openEstateModal() {
  estateModalOpen = true;
  showModalBox(document.getElementById('estate-modal'));
  loadGameConfig(function () { renderEstateModal(); });
}
function closeEstateModal() { estateModalOpen = false; closeModalWithAnim('estate-modal'); }
function renderEstateModal() {
  var wrap = document.getElementById('estate-list');
  if (!wrap) return;
  var h = window.__lastHud || {};
  var owned = h.estates || [];
  var cfg = GAME_CONFIG || {};
  var es = cfg.realestate || [];
  if (!es.length) { wrap.innerHTML = '<div class="stall-empty">数据加载中…</div>'; return; }
  var html = es.map(function (e) {
    var has = owned.indexOf(e.id) >= 0;
    return '<div class="wholesale-card">' +
      '<div class="ws-icon">' + (estateIcons[e.id] || '🏠') + '</div>' +
      '<div class="ws-info">' +
        '<div class="ws-name">' + e.name + '</div>' +
        '<div class="ws-desc">' + (e.desc || '') + '</div>' +
        '<div class="ws-meta">售价 <b>' + fmtMoney(e.cost) + '</b> 元 · 声望+' + e.prestige + (e.passiveIncome > 0 ? ' · 日收租+' + e.passiveIncome : '') + '</div>' +
      '</div>' +
      '<div class="ws-buy">' + (has ? '<span class="sc-owned">✅ 已置业</span>' : '<button class="ws-go" onclick="buyHouseById(\'' + e.id + '\',\'' + esc(e.name) + '\')">🏠 拿下</button>') + '</div>' +
    '</div>';
  }).join('');
  wrap.innerHTML = '<div class="wholesale-tip">🏠 安家房产 · 在售房源：买下后可免费入住，商铺每日收租</div><div class="wholesale-list">' + html + '</div>';
}
function buyHouseById(id, name) {
  closeEstateModal();
  runCmd('buyhouse ' + id);
  buyResultToast('estates', id, '置业成功：' + (name || id), '置业失败：余额不足');
}

/* ================= 全局配置缓存 & 金额格式化 ================= */
var GAME_CONFIG = null;
function fmtMoney(n) { return (n || 0).toLocaleString('zh-CN'); }
function loadGameConfig(cb, force) {
  if (GAME_CONFIG && !force) { if (cb) cb(GAME_CONFIG); return; }
  $.getJSON('/api/game/config', function (d) { GAME_CONFIG = d; if (cb) cb(d); })
   .fail(function () { if (cb) cb(GAME_CONFIG); });
}

/* ================= 公园 21 点弹窗 ================= */
var bjModalOpen = false;
function openBjModal() {
  bjModalOpen = true;
  showModalBox(document.getElementById('bj-modal'));
  renderBjModal();
}
function closeBjModal() { bjModalOpen = false; closeModalWithAnim('bj-modal'); }
function bjAction(action) {
  var bet = +(document.getElementById('bj-bet').value || 100);
  $.ajax({ url: '/api/game/bj', method: 'POST', contentType: 'application/json', data: JSON.stringify({ action: action, bet: bet }) })
  .done(function (d) {
    renderBjModal(d.hud);
    if (d.lines && d.lines.length) pollState();
  }).fail(function (x) { runCmd('bj ' + bet); });
}
function renderBjModal(hud) {
  var h = hud || window.__lastHud || {};
  var g = h.blackjack;
  var box = document.getElementById('bj-table');
  if (!box) return;
  if (!g) {
    // 空桌：仅在首次渲染，避免每秒重建导致下注输入框被重置
    if (!sig('bj-idle', '1')) return;
    box.innerHTML = '<div class="stall-empty">牌桌空着，和公园牌友来一局？<br><span>21点，爆了算输，庄家17点停牌</span></div>' +
      '<div class="bj-tip">下注：<input id="bj-bet" type="number" min="10" step="10" value="100" class="bj-bet-input"> 元</div>' +
      '<div class="bj-actions"><button class="bj-btn start" onclick="bjAction(\'start\')">🎲 开局</button></div>';
    return;
  }
  var bjSig = (g.bet || 0) + ':' + (g.phase || '') + ':' + (g.player || []).join(',') + ':' + (g.dealer || []).join(',')
    + ':' + (g.playerStand ? 1 : 0) + ':' + (g.result != null ? g.result : '') + ':' + (g.payout || 0);
  if (!sig('bj', bjSig)) return;   // 牌局状态未变化不重建（对局中不打断）
  var cardsHtml = function (cards, hideSecond) {
    return (cards || []).map(function (c, i) {
      var red = c.indexOf('♥') >= 0 || c.indexOf('♦') >= 0;
      if (hideSecond && i === 1) return '<span class="bj-card back">🂠</span>';
      return '<span class="bj-card ' + (red ? 'red' : '') + '">' + c + '</span>';
    }).join('');
  };
  var playing = g.phase === 'play';
  var dh = cardsHtml(g.dealer, playing && !g.playerStand);
  var ph = cardsHtml(g.player, false);
  var resHtml = '';
  if (g.phase === 'done') {
    var t = g.result > 0 ? '<span class="bj-win">🎉 你赢了 +' + g.payout + ' 元</span>' :
            g.result === 0 ? '<span class="bj-draw">🤝 平局</span>' :
            '<span class="bj-lose">💸 输了 -' + (-g.payout) + ' 元</span>';
    resHtml = '<div class="bj-result">' + t + '</div>';
  }
  var btnHtml = playing && !g.playerStand
    ? '<button class="bj-btn hit" onclick="bjAction(\'hit\')">🃏 要牌</button>' +
      '<button class="bj-btn stand" onclick="bjAction(\'stand\')">✋ 停牌</button>' +
      (g.player.length === 2 ? '<button class="bj-btn dbl" onclick="bjAction(\'double\')">💥 加倍</button>' : '')
    : (playing ? '<div class="bj-wait">庄家回合，稍等…</div>' :
       '<button class="bj-btn start" onclick="bjAction(\'start\')">🎲 再来一局</button>');
  box.innerHTML =
    '<div class="bj-tip">下注：<input id="bj-bet" type="number" min="10" step="10" value="' + (g.bet || 100) + '" class="bj-bet-input"> 元</div>' +
    '<div class="bj-row"><div class="bj-label">🂠 庄家（' + g.dealerScore + '）</div><div class="bj-cards">' + dh + '</div></div>' +
    '<div class="bj-vs">VS</div>' +
    '<div class="bj-row"><div class="bj-label">🃏 你（' + g.playerScore + '）</div><div class="bj-cards">' + ph + '</div></div>' +
    resHtml +
    '<div class="bj-actions">' + btnHtml + '</div>';
}

/* ================= 公园五子棋弹窗 ================= */
var gomokuModalOpen = false;
var gomokuCanvas = null, gomokuCtx = null;
function openGomokuModal() {
  gomokuModalOpen = true;
  showModalBox(document.getElementById('gomoku-modal'));
  renderGomokuModal(window.__lastHud);
}
function closeGomokuModal() { gomokuModalOpen = false; closeModalWithAnim('gomoku-modal'); }
function gomokuStart() {
  var bet = +(document.getElementById('gomoku-bet').value || 100);
  $.ajax({ url: '/api/game/gomoku', method: 'POST', contentType: 'application/json', data: JSON.stringify({ action: 'start', bet: bet }) })
  .done(function (d) {
    renderGomokuModal(d.hud);
    if (d.lines && d.lines.length) pollState();
  }).fail(function (x) { runCmd('gomoku ' + bet); });
}
function renderGomokuModal(hud) {
  var h = hud || window.__lastHud || {};
  var g = h.gomoku;
  var box = document.getElementById('gomoku-board');
  if (!box) return;
  if (!g || g.phase !== 'play') {
    // 空闲/终局：数据未变化不重建（避免每秒重绘与输入打断）
    if (!sig('gomoku-idle', (g && (g.phase + ':' + (g.result != null ? g.result : '') + ':' + (g.payout || 0))) || '')) return;
    box.innerHTML = '<div class="stall-empty">石桌空着，和公园棋友杀一局？<br><span>下注开始，你执黑 ● 先手，五连珠获胜</span></div>';
    var b = document.getElementById('gomoku-start');
    if (b) b.style.display = '';
    return;
  }
  var gomSig = JSON.stringify(g.board) + ':' + (g.phase || '') + ':' + (g.result != null ? g.result : '')
    + ':' + (g.payout || 0) + ':' + (g.playerTurn ? 1 : 0) + ':' + (g.bet || 0);
  if (!sig('gomoku', gomSig)) return;   // 棋盘未变化不重绘 canvas
  var b = document.getElementById('gomoku-start');
  if (b) b.style.display = 'none';
  // Canvas 渲染（每次从容器查询，避免内层被覆盖后丢失）
  gomokuCanvas = box.querySelector('canvas.gomoku-cv');
  if (!gomokuCanvas) {
    gomokuCanvas = document.createElement('canvas');
    gomokuCanvas.className = 'gomoku-cv';
    gomokuCanvas.width = 480; gomokuCanvas.height = 480;
    gomokuCanvas.style.width = '100%'; gomokuCanvas.style.maxWidth = '480px';
    gomokuCanvas.style.aspectRatio = '1 / 1';
    gomokuCanvas.addEventListener('click', function (ev) {
      var rect = gomokuCanvas.getBoundingClientRect();
      var col = Math.round((ev.clientX - rect.left) / rect.width * 15) - 1;
      var row = Math.round((ev.clientY - rect.top) / rect.height * 15) - 1;
      if (row >= 0 && row < 15 && col >= 0 && col < 15) gomokuMove(row, col);
    });
    box.appendChild(gomokuCanvas);
  }
  gomokuCtx = gomokuCanvas.getContext('2d');
  drawGomoku(g);
}
function drawGomoku(g) {
  var ctx = gomokuCtx, n = 15, cell = 480 / n;
  ctx.fillStyle = '#e8c990';
  ctx.fillRect(0, 0, 480, 480);
  ctx.strokeStyle = '#a0763a';
  ctx.lineWidth = 1;
  for (var i = 0; i < n; i++) {
    ctx.beginPath(); ctx.moveTo(cell / 2, cell / 2 + i * cell); ctx.lineTo(480 - cell / 2, cell / 2 + i * cell); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cell / 2 + i * cell, cell / 2); ctx.lineTo(cell / 2 + i * cell, 480 - cell / 2); ctx.stroke();
  }
  g.board.forEach(function (row, r) {
    row.forEach(function (v, c) {
      if (v === 0) return;
      ctx.beginPath();
      ctx.arc(cell / 2 + c * cell, cell / 2 + r * cell, cell * 0.4, 0, Math.PI * 2);
      if (v === 1) { ctx.fillStyle = '#1c1c1c'; ctx.fill(); ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.stroke(); }
      else { ctx.fillStyle = '#f5f5f5'; ctx.fill(); ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.5; ctx.stroke(); }
    });
  });
  var info = document.getElementById('gomoku-info');
  if (info) {
    var turnTxt = g.phase === 'play' ? (g.playerTurn ? '轮到你了（黑 ●）' : '棋友思考中…') :
      (g.result > 0 ? '<span style="color:#7ee2a8">🏆 你赢了 +' + g.payout + ' 元</span>' :
       g.result === 0 ? '<span style="color:#9fb3cc">🤝 平局</span>' :
       '<span style="color:#ff7a7a">💸 棋友赢了 -' + (-g.payout) + ' 元</span>');
    info.innerHTML = '下注 ' + g.bet + ' 元 · ' + turnTxt;
  }
}
function gomokuMove(row, col) {
  $.ajax({ url: '/api/game/gomoku', method: 'POST', contentType: 'application/json', data: JSON.stringify({ action: 'move', row: row, col: col }) })
  .done(function (d) {
    renderGomokuModal(d.hud);
    if (d.lines && d.lines.length) pollState();
  }).fail(function (x) { runCmd('gomoku put ' + (row + 1) + ' ' + (col + 1)); });
}

/* ---------------- 属性悬浮提示 & 事件推送 ---------------- */
function setTip(id, html) {
  var el = document.getElementById(id);
  if (el) el.setAttribute('data-tip', html);
}

/* ---------------- 手机图形界面 ---------------- */
var _phoneTab = 'chat';
var _phoneTab = 'home';
var PHONE_APPS = [
  { app: 'chat', ico: '💬', name: '微信', g: ['#2dd46b', '#0d7a3c'] },
  { app: 'video', ico: '🎬', name: '短视频', g: ['#ff6a3d', '#d81e2f'] },
  { app: 'takeout', ico: '🍜', name: '外卖', g: ['#ffc02e', '#ff7a00'] },
  { app: 'call', ico: '📞', name: '电话', g: ['#33c35f', '#157a3d'] },
  { app: 'contacts', ico: '👥', name: '通讯录', g: ['#3b82f6', '#1d4fc4'] },
  { app: 'news', ico: '📰', name: '城市新闻', g: ['#ef5350', '#a81f24'] },
  { app: 'weather', ico: '⛅', name: '天气', g: ['#43b4f5', '#1f66c9'] },
  { app: 'stock', ico: '📈', name: '股票', g: ['#22a75f', '#0e5f33'] },
  { app: 'bank', ico: '🏦', name: '银行', g: ['#d4a52a', '#8a6a10'] },
  { app: 'settings', ico: '⚙️', name: '设置', g: ['#64748b', '#334155'] }
];
function phoneAppGrad(a) { return 'linear-gradient(150deg,' + a.g[0] + ',' + a.g[1] + ')'; }
function openPhoneModal() {
  _phoneTab = 'home';
  showModalBox(document.getElementById('phone-modal'));
  setPhoneDock('home');
  renderPhoneHome();
}
function tickPhoneClock() {
  var el = document.getElementById('ps-time');
  if (!el) return;
  var d = new Date();
  var hh = d.getHours(), mm = d.getMinutes();
  el.textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
}
setInterval(tickPhoneClock, 30000);
function closePhoneModal() {
  closeModalWithAnim('phone-modal');
}
function setPhoneDock(app) {
  document.querySelectorAll('.phone-tab').forEach(function (b) {
    b.classList.toggle('active', b.dataset.pt === app);
  });
}
function phoneGoHome() { phoneTab('home'); }
function phoneTab(tab) {
  _phoneTab = tab;
  setPhoneDock(tab);
  if (tab === 'home') { renderPhoneHome(); return; }
  if (tab === 'call') { renderPhoneCall(); return; }
  if (tab === 'news') { renderPhoneNews(); return; }
  if (tab === 'weather') { renderPhoneWeather(); return; }
  if (tab === 'settings') { renderPhoneSettings(); return; }
  if (tab === 'stock') { renderPhoneStock(); return; }
  phoneLoad(tab);
}
function phoneOpenApp(app) {
  if (app === 'stock') { phoneTab('stock'); return; }
  if (app === 'bank') { closePhoneModal(); openBankModal(); return; }
  phoneTab(app);
}
function renderPhoneHome() {
  var scr = document.getElementById('phone-screen');
  if (!scr) return;
  var today = new Date();
  var week = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()];
  var grid = PHONE_APPS.map(function (a) {
    return '<button class="pa" onclick="phoneOpenApp(\'' + a.app + '\')">' +
      '<span class="pa-ico" style="background:' + phoneAppGrad(a) + '">' + a.ico + '</span>' +
      '<span class="pa-name">' + a.name + '</span></button>';
  }).join('');
  scr.innerHTML = '<div class="ps-home">' +
    '<div class="ph-widget"><span class="pw-date">' + (today.getMonth() + 1) + '月' + today.getDate() + '日 · 周' + week + '</span>' +
    '<span class="pw-wx">⛅ 22°C 晴 · 临江市</span></div>' +
    '<div class="ph-grid">' + grid + '</div></div>';
}
function renderPhoneCall() {
  var scr = document.getElementById('phone-screen');
  var hud = window.__lastHud || {};
  var npcs = hud.npcs || [];
  var quicks = npcs.slice(0, 4).map(function (n) {
    return '<div class="pc-quick" onclick="phoneDial(\'' + esc(n.id) + '\',\'' + esc(n.name) + '\')">' + npcAvatar(n) + '<span class="pcq-name">' + esc(n.name) + '</span></div>';
  }).join('');
  scr.innerHTML = '<div class="ps-app-head"><button class="pch-back" onclick="phoneGoHome()">‹</button><span class="pch-title">📞 电话</span></div>' +
    '<div class="ps-call">' +
    '<div class="pc-quicks">' + (quicks || '<div class="dim">还没有联系人，去街上认识朋友吧</div>') + '</div>' +
    '<div class="pc-num" id="pc-num"></div>' +
    '<div class="pc-pad">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(function (d) {
      return '<button class="pc-key" onclick="phonePad(\'' + d + '\')">' + d + '</button>';
    }).join('') + '</div>' +
    '<button class="pc-callbtn" onclick="phoneCallCurrent()">📞 呼叫</button></div>';
}
function phonePad(d) {
  var el = document.getElementById('pc-num');
  if (!el) return;
  var cur = el.textContent.replace(/[^0-9*#]/g, '');
  if (cur.length < 11) el.textContent = cur + d;
}
function phoneCallCurrent() {
  var el = document.getElementById('pc-num');
  var num = el ? el.textContent.replace(/[^0-9*#]/g, '') : '';
  if (num.length < 3) { showToast('请输入完整号码'); return; }
  phoneRinging('陌生号码', num);
}
function phoneDial(id, name) { phoneRinging(name, id); }
function phoneRinging(name, sub) {
  var scr = document.getElementById('phone-screen');
  scr.innerHTML = '<div class="ps-calling">' +
    '<div class="pc-ring-av">' + (sub.indexOf('fixed') >= 0 ? npcAvatar({ id: sub, name: name, gender: 'male' }) : '📞') + '</div>' +
    '<div class="pc-ring-name">' + esc(name) + '</div>' +
    '<div class="pc-ring-sub">' + esc(sub) + ' · 呼出中…</div>' +
    '<button class="pc-hang" onclick="phoneHang(\'' + esc(name) + '\',\'' + esc(sub) + '\')">挂断</button></div>';
  setTimeout(function () {
    var scr2 = document.getElementById('phone-screen');
    if (!scr2 || scr2.querySelector('.ps-calling') !== scr2.firstChild) return;
    if (sub.indexOf('fixed') >= 0) {
      scr2.innerHTML = '<div class="ps-calling talk">' +
        '<div class="pc-ring-av">' + npcAvatar({ id: sub, name: name, gender: 'male' }) + '</div>' +
        '<div class="pc-ring-name">' + esc(name) + '</div>' +
        '<div class="pc-ring-sub">通话中 00:0' + (Math.floor(Math.random() * 9) + 1) + ' · 聊点近况</div>' +
        '<button class="pc-hang" onclick="phoneHang(\'' + esc(name) + '\',\'' + esc(sub) + '\')">挂断</button></div>';
    } else {
      scr2.innerHTML = '<div class="ps-empty">📵 对方未接听<br><span class="dim">号码无效或不在服务区</span></div>';
    }
  }, 1600);
}
function phoneHang(name, sub) {
  if (sub.indexOf('fixed') >= 0) { phoneLoad('chatnpc', { npcId: sub }); return; }
  var scr = document.getElementById('phone-screen');
  scr.innerHTML = '<div class="ps-empty">📵 通话结束<br><span class="dim">未接通，不产生费用</span></div>';
}
function renderPhoneNews() {
  var scr = document.getElementById('phone-screen');
  var news = [
    { t: '临江大桥今日贯通，打工人通勤省 20 分钟', m: '市政建设 · 2小时前', d: '桥面双向六车道，配套公交专线同步开通，沿线房租有望上涨。' },
    { t: '劳务市场新规：日结工资当日到账', m: '社会民生 · 5小时前', d: '市场监管部门推动零工平台“日结日清”，再也不用等老板月底发钱。' },
    { t: '夜市一条街申请“深夜食堂”牌照', m: '城市生活 · 8小时前', d: '延长营业至凌晨 2 点，麻辣烫、烧烤摊主们迎来增收旺季。' },
    { t: '临江股市连涨三日，散户跑步入场', m: '财经 · 1天前', d: '分析师提醒：追高需谨慎，配置要分散，别把全部积蓄押进去。' },
    { t: '城中村改造启动，首批 300 户签约', m: '城市建设 · 1天前', d: '补偿方案公开透明，房东们开始打听新楼盘。' },
    { t: '全市公交票价拟上调至 3 元', m: '民生 · 1天前', d: '听证会下月举行，打工人通勤成本又要增加了。' },
    { t: '花店老板娘小雨的玫瑰盲盒卖爆了', m: '本地趣闻 · 2天前', d: '19.9 元随机一束花，年轻人直呼“拆惊喜”，一上架就售罄。' },
    { t: '公园五子棋擂台赛开打，奖金 500 元', m: '文体 · 2天前', d: '老李坐镇守擂，连胜者可抱走现金大奖。' }
  ];
  scr.innerHTML = '<div class="ps-app-head"><button class="pch-back" onclick="phoneGoHome()">‹</button><span class="pch-title">📰 城市新闻</span></div>' +
    '<div class="ps-news">' + news.map(function (n) {
      return '<div class="pn"><div class="pn-title">' + n.t + '</div><div class="pn-meta">' + n.m + '</div><div class="pn-desc">' + n.d + '</div></div>';
    }).join('') + '</div>';
}
function renderPhoneWeather() {
  var scr = document.getElementById('phone-screen');
  var days = [
    { w: '今天', ico: '⛅', t: '22°', lo: '15°', d: '晴间多云，适合出门搬砖' },
    { w: '明天', ico: '🌧️', t: '19°', lo: '14°', d: '小雨，记得带伞和雨衣' },
    { w: '后天', ico: '☀️', t: '25°', lo: '16°', d: '放晴回暖，摆摊好日子' },
    { w: '周五', ico: '🌥️', t: '23°', lo: '15°', d: '多云转阴，风力 3 级' }
  ];
  scr.innerHTML = '<div class="ps-app-head"><button class="pch-back" onclick="phoneGoHome()">‹</button><span class="pch-title">⛅ 天气</span></div>' +
    '<div class="ps-weather">' +
    '<div class="pw-now"><span class="pwn-ico">⛅</span><span class="pwn-t">22°</span>' +
    '<span class="pwn-meta">临江市 · 晴间多云<br>体感 21° · 湿度 52% · 东北风 2 级</span></div>' +
    '<div class="pw-days">' + days.map(function (d) {
      return '<div class="pwd"><span class="pwd-w">' + d.w + '</span><span class="pwd-ico">' + d.ico + '</span>' +
        '<span class="pwd-t">' + d.t + ' / ' + d.lo + '</span><span class="pwd-d">' + d.d + '</span></div>';
    }).join('') + '</div></div>';
}
function renderPhoneSettings() {
  var scr = document.getElementById('phone-screen');
  var hud = window.__lastHud || {};
  scr.innerHTML = '<div class="ps-app-head"><button class="pch-back" onclick="phoneGoHome()">‹</button><span class="pch-title">⚙️ 设置</span></div>' +
    '<div class="ps-settings">' +
    '<div class="ps-set-card"><div class="pss-label">用户</div><div class="pss-val">' + esc(hud.name || '-') + ' · ' + esc(hud.job || '无业游民') + '</div></div>' +
    '<div class="ps-set-card"><div class="pss-label">现金</div><div class="pss-val">¥' + (hud.money != null ? hud.money : 0) + '</div></div>' +
    '<div class="ps-set-card"><div class="pss-label">资产估值</div><div class="pss-val">¥' + (hud.totalAssets != null ? hud.totalAssets : 0) + '</div></div>' +
    '<div class="ps-set-card"><div class="pss-label">关于</div><div class="pss-val">Worker Simulator v1.0 · 临江城市版</div></div></div>';
}
function phoneStockSig() {
  var mk = window.gameMarket || {};
  var qs = mk.quotes || [];
  return qs.map(function (q) { return q.code + ':' + q.price.toFixed(2) + ':' + (q.chg || 0); }).join('|') +
    '|h:' + (mk.holdings || []).map(function (x) { return x.code + ':' + x.shares + ':' + x.cost; }).join(',');
}
var _phoneStockSel = null;
var _phoneStockSig = '';
function renderPhoneStock() {
  var scr = document.getElementById('phone-screen');
  if (!scr) return;
  var mk = window.gameMarket || {};
  var qs = mk.quotes || [];
  var sig = phoneStockSig();
  var sel = _phoneStockSel;
  if (qs.length && sel && !qs.some(function (q) { return q.code === sel; })) sel = null;
  if (!sel && qs.length) sel = qs[0].code;
  _phoneStockSel = sel;
  if (sig === _phoneStockSig && scr.querySelector('.ps-stock')) {
    // 仅更新选中股价格闪烁
    return;
  }
  _phoneStockSig = sig;
  var idx = qs.reduce(function (a, q) { return a + (q.chg || 0); }, 0);
  var idxChg = qs.length ? idx / qs.length : 0;
  var hud = window.__lastHud || {};
  var cash = hud.money != null ? hud.money : 0;
  var rows = qs.map(function (q) {
    var chg = q.chg || 0;
    var cls = chg > 0 ? 'up' : (chg < 0 ? 'down' : 'flat');
    return '<div class="psq' + (sel === q.code ? ' sel' : '') + '" onclick="phoneStockSel(\'' + q.code + '\')">' +
      '<span class="psq-ico">' + (q.icon || '📈') + '</span>' +
      '<span class="psq-info"><b>' + esc(q.name) + '</b><em>' + q.code + ' · ' + esc(q.sector || '') + '</em></span>' +
      '<span class="psq-px"><span class="p ' + cls + '">' + q.price.toFixed(2) + '</span>' +
      '<span class="c ' + cls + '">' + (chg > 0 ? '+' : '') + chg.toFixed(2) + '%</span></span></div>';
  }).join('');
  var q = null;
  qs.forEach(function (x) { if (x.code === sel) q = x; });
  var detail = '';
  if (q) {
    var chg = q.chg || 0;
    var cls = chg > 0 ? 'up' : (chg < 0 ? 'down' : 'flat');
    detail = '<div class="psq-detail">' +
      '<div class="psqd-head"><span class="psqd-name">' + (q.icon || '📈') + ' ' + esc(q.name) + '</span>' +
      '<span class="psqd-code">' + q.code + '</span></div>' +
      '<div class="psqd-price"><span class="p ' + cls + '">' + q.price.toFixed(2) + '</span>' +
      '<span class="c ' + cls + '">' + (chg > 0 ? '+' : '') + chg.toFixed(2) + '%</span></div>' +
      '<div class="psqd-spark">' + phoneSpark(q) + '</div>' +
      '<div class="psqd-meta">' + esc(q.desc || '') + ' · 波动率 ±' + (q.volatility != null ? Math.round(q.volatility * 100) : '—') + '%</div>' +
      '<div class="psqd-acts"><button class="psqa buy" onclick="phoneStockOrder(\'buy\')">买入</button>' +
      '<button class="psqa sell" onclick="phoneStockOrder(\'sell\')">卖出</button>' +
      '<input class="psqa-qty" id="psq-qty" type="number" min="1" max="100000" value="100" title="数量"></div></div>';
  }
  var holds = (mk.holdings || []).filter(function (x) { return x.shares > 0; });
  var holdHtml = holds.length ? holds.map(function (x) {
    var qx = null; qs.forEach(function (q2) { if (q2.code === x.code) qx = q2; });
    var cur = qx ? qx.price : 0;
    var val = cur * x.shares;
    var pnl = val - x.cost * x.shares;
    var pcls = pnl > 0 ? 'up' : (pnl < 0 ? 'down' : 'flat');
    return '<div class="psq-hold"><span class="psh-name">' + esc(x.name || x.code) + '</span>' +
      '<span class="psh-shares">' + x.shares + ' 股</span>' +
      '<span class="psh-val p ' + pcls + '">' + val.toFixed(0) + ' 元</span>' +
      '<span class="psh-pnl c ' + pcls + '">' + (pnl >= 0 ? '+' : '') + pnl.toFixed(0) + '</span></div>';
  }).join('') : '<div class="psq-empty">暂无持仓，买入第一只股票吧</div>';
  scr.innerHTML = '<div class="ps-app-head"><button class="pch-back" onclick="phoneGoHome()">‹</button><span class="pch-title">📈 股票</span></div>' +
    '<div class="ps-stock">' +
    '<div class="psx-idx"><span class="psxi-name">临江指数</span>' +
    '<span class="psxi-val p ' + (idxChg > 0 ? 'up' : (idxChg < 0 ? 'down' : 'flat')) + '">' + (idxChg > 0 ? '+' : '') + idxChg.toFixed(2) + '%</span>' +
    '<span class="psxi-cash">可用 ¥' + cash + '</span></div>' +
    '<div class="psx-list">' + rows + '</div>' +
    detail +
    '<div class="psx-title">📦 我的持仓</div>' +
    '<div class="psx-holds">' + holdHtml + '</div>' +
    '<button class="psx-refresh" onclick="phoneStockRefresh()">🔄 刷新行情</button></div>';
}
function phoneSpark(q) {
  var n = 24, pts = [];
  var seed = 0;
  var k = (q.code || 'x');
  for (var i = 0; i < k.length; i++) seed = (seed * 31 + k.charCodeAt(i)) % 1000;
  var base = q.price;
  var v = q.volatility || 0.02;
  var prev = base;
  for (var i2 = 0; i2 < n; i2++) {
    seed = (seed * 9301 + 49297) % 233280;
    var r = seed / 233280 - 0.5;
    prev = prev * (1 + r * v * 2);
    pts.push(prev);
  }
  pts.push(base);
  var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
  var span = (max - min) || 1;
  var w = 100, h = 34;
  var path = pts.map(function (p, i) {
    var x = (i / (pts.length - 1)) * w;
    var y = h - 3 - ((p - min) / span) * (h - 6);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  var up = q.chg >= 0;
  var col = up ? '#ff5252' : '#2fd06b';
  var last = pts[pts.length - 1];
  var lx = w, ly = h - 3 - ((last - min) / span) * (h - 6);
  return '<svg class="psq-svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
    '<path d="' + path + '" fill="none" stroke="' + col + '" stroke-width="1.6"/>' +
    '<circle cx="' + lx + '" cy="' + ly.toFixed(1) + '" r="2.4" fill="' + col + '"/></svg>';
}
function phoneStockSel(code) { _phoneStockSel = code; _phoneStockSig = ''; renderPhoneStock(); }
function phoneStockRefresh() { _phoneStockSig = ''; renderPhoneStock(); toast('行情已刷新', 'ok'); }
function phoneStockOrder(side) {
  var code = _phoneStockSel;
  if (!code) { toast('请先选择一只股票', 'err'); return; }
  var el = document.getElementById('psq-qty');
  var qty = parseInt(el ? el.value : '100', 10);
  if (!qty || qty < 1) { toast('请输入正确的数量（100 的整数倍）', 'err'); return; }
  if (qty % 100 !== 0) { toast('股数须为 100 的整数倍（1手=100股）', 'err'); return; }
  $.ajax({
    url: '/api/game/phone/stock', method: 'POST', contentType: 'application/json',
    data: JSON.stringify({ side: side, code: code, shares: String(qty) }),
    success: function (r) {
      if (r.lines && r.lines.length) {
        r.lines.forEach(function (l) {
          var t = document.createElement('div');
          t.innerHTML = l;
          termWrite([t.textContent]);
        });
      }
      if (r.hud) renderHud(r.hud);
      var ok = (r.lines || []).join('').indexOf('✔') >= 0 || (r.lines || []).join('').indexOf('成交') >= 0;
      toast(ok ? (side === 'buy' ? '买入成功' : '卖出成功') : (side === 'buy' ? '买入失败' : '卖出失败'), ok ? 'ok' : 'err');
      setTimeout(function () { _phoneStockSig = ''; renderPhoneStock(); }, 500);
    }
  });
}
function phoneLoad(action, extra) {
  var body = { action: action };
  if (extra) Object.assign(body, extra);
  $.ajax({
    url: '/api/game/phone', method: 'POST', contentType: 'application/json',
    data: JSON.stringify(body),
    success: function (r) {
      if (r.lines && r.lines.length) {
        r.lines.forEach(function (l) { termWrite([l]); });
      }
      if (r.hud) renderHud(r.hud);
      if (r.ok === false) {
        document.getElementById('phone-screen').innerHTML = '<div class="ps-empty">📵 你还没有手机<br>去商场买一部吧</div>';
        return;
      }
      if (action === 'video') renderPhoneVideo(r);
      else if (action === 'takeout') renderPhoneTakeout(r);
      else if (action === 'contacts') renderPhoneContacts(r);
      else if (action === 'chatnpc') renderPhoneChatNpc(r);
      else if (action === 'order') { phoneLoad('takeout'); }
      else renderPhoneChat(r);
    }
  });
}
function renderPhoneContacts(r) {
  var scr = document.getElementById('phone-screen');
  if (!r.contacts || !r.contacts.length) {
    scr.innerHTML = '<div class="ps-empty">📇 通讯录空空如也<br><span class="dim">去大街 social 认识新朋友吧</span></div>';
    return;
  }
  var html = r.contacts.map(function (n) {
    var affCls = n.affection >= 85 ? 'hi' : (n.affection >= 50 ? 'mid' : 'lo');
    var sp = n.relation === 'SPOUSE' ? ' spouse' : ((n.relation === 'LOVER' || n.relation === 'FIANCEE') ? ' love' : '');
    return '<div class="ps-contact" onclick="phoneChatNpc(\'' + esc(n.id) + '\')">' +
      npcAvatar(n) +
      '<span class="pc-info"><span class="pc-name">' + esc(n.name) + '</span>' +
      '<span class="pc-meta">' + esc(n.relationCn || relCn(n.relation)) + ' · ' + esc(n.profession || '') + '</span>' +
      '<span class="pc-aff ' + affCls + '">♥ ' + n.affection + '</span></span>' +
      '<span class="pc-go">💬</span></div>';
  }).join('');
  scr.innerHTML = '<div class="ps-app-head"><button class="pch-back" onclick="phoneGoHome()">‹</button><span class="pch-title">📇 通讯录</span></div>' +
    '<div class="ps-contacts">' + html + '</div>';
}
function phoneChatNpc(id) { phoneLoad('chatnpc', { npcId: id }); }
function phoneChatReply(id) { phoneLoad('chatnpc', { npcId: id }); }
function renderPhoneChatNpc(r) {
  var scr = document.getElementById('phone-screen');
  var msgs = (r.msgs || []);
  var html = '<div class="ps-chat-head">' +
    '<button class="pch-back" onclick="phoneLoad(\'contacts\')">‹</button>' +
    '<span class="pch-title">' + esc(r.npcName || '聊天') + '</span>' +
    '<span class="pch-aff">♥ ' + (r.affection != null ? r.affection : 0) + '</span></div>';
  msgs.forEach(function (m) {
    var av = m.mine
      ? { name: '我', gender: 'male', id: 'me' }
      : { name: (m.from || r.npcName || '?'), gender: m.gender, id: m.npcId || r.npcId || 'x', relation: r.relation };
    html += '<div class="' + (m.mine ? 'ps-msg mine' : 'ps-msg') + '">' +
      npcAvatar(av) +
      '<div class="ps-bubble">' + esc(m.text || '') + '</div></div>';
  });
  if (r.gain > 0) {
    html += '<div class="ps-gain">💕 好感度 +' + r.gain + ' · 当前 ' + (r.affection != null ? r.affection : 0) + '/100</div>';
  }
  html += '<div class="ps-chat-acts">' +
    '<button class="btn btn-mini" onclick="phoneChatReply(\'' + esc(r.npcId || '') + '\')">💬 继续聊</button>' +
    '<button class="btn btn-mini" onclick="phoneLoad(\'contacts\')">📇 返回</button></div>';
  scr.innerHTML = html;
}
function renderPhoneChat(r) {
  var scr = document.getElementById('phone-screen');
  if (!r.msgs || !r.msgs.length) { scr.innerHTML = '<div class="ps-empty">💬 没有新消息</div>'; return; }
  var html = r.msgs.map(function (m) {
    var cls = m.mine ? 'ps-msg mine' : 'ps-msg';
    return '<div class="' + cls + '"><span class="ps-av">' + (m.avatar || '👤') + '</span>' +
      '<div class="ps-bubble"><b>' + (m.from || '') + '：</b>' + (m.text || '') + '</div></div>';
  }).join('');
  html += '<div class="ps-takeout" style="margin-top:6px"><span class="po-ico">✉️</span>' +
    '<div class="po-info"><div class="po-name">微信消息</div><div class="po-meta">刷一刷新消息（心情 +2）</div></div>' +
    '<button class="po-btn" onclick="phoneLoad(\'chat\')">刷新</button></div>';
  scr.innerHTML = '<div class="ps-app-head"><button class="pch-back" onclick="phoneGoHome()">‹</button><span class="pch-title">💬 微信</span></div>' + html;
}
function renderPhoneVideo(r) {
  var scr = document.getElementById('phone-screen');
  if (!r.videos || !r.videos.length) { scr.innerHTML = '<div class="ps-empty">🎬 没有新视频</div>'; return; }
  var html = r.videos.map(function (v) {
    return '<div class="ps-video"><div class="pv-title">▶ ' + v.title + '</div>' +
      '<div class="pv-desc">' + v.desc + '</div>' +
      '<div class="pv-tag">' + (v.tag || '') + ' · ' + (v.plays || 0) + ' 次播放</div></div>';
  }).join('');
  html += '<div class="ps-takeout" style="margin-top:6px"><span class="po-ico">🎬</span>' +
    '<div class="po-info"><div class="po-name">继续刷</div><div class="po-meta">心情 +' + (r.moodGain || 0) + '</div></div>' +
    '<button class="po-btn" onclick="phoneLoad(\'video\')">再刷一波</button></div>';
  scr.innerHTML = '<div class="ps-app-head"><button class="pch-back" onclick="phoneGoHome()">‹</button><span class="pch-title">🎬 短视频</span></div>' + html;
}
function renderPhoneTakeout(r) {
  var scr = document.getElementById('phone-screen');
  if (!r.takeout || !r.takeout.length) { scr.innerHTML = '<div class="ps-empty">🍜 附近没有外卖</div>'; return; }
  var html = r.takeout.map(function (f) {
    return '<div class="ps-takeout"><span class="po-ico">' + (f.emoji || '🍱') + '</span>' +
      '<div class="po-info"><div class="po-name">' + f.name + '</div>' +
      '<div class="po-meta">' + f.cost + ' 元（含配送）· 饱腹+' + (f.hunger || 0) + ' 体力+' + (f.stamina || 0) + '</div></div>' +
      '<button class="po-btn" onclick="phoneOrder(\'' + f.id + '\')">下单</button></div>';
  }).join('');
  scr.innerHTML = '<div class="ps-app-head"><button class="pch-back" onclick="phoneGoHome()">‹</button><span class="pch-title">🍜 外卖</span></div>' + html;
}
function phoneOrder(foodId) {
  phoneLoad('order', { foodId: foodId });
}

/* ---------------- 商场购物（弹窗） ---------------- */
var shopCat = 'all';
function openShopModal() {
  showModalBox(document.getElementById('shop-modal'));
  shopCat = 'all';
  loadGameConfig(function () { renderShopModal(); });
}
function closeShopModal() { closeModalWithAnim('shop-modal'); }
function shopCatBtn(cat, el) {
  shopCat = cat;
  document.querySelectorAll('#shop-cats .sc-btn').forEach(function (b) { b.classList.toggle('active', b === el); });
  renderShopModal();
}
function renderShopModal() {
  var cfg = GAME_CONFIG || {};
  var mall = cfg.mall || [];
  var h = window.__lastHud || {};
  var inv = h.inventory || [];
  var eq = h.equipped || [];
  var shopSig = shopCat + '|' + inv.join(',') + '|' + eq.join(',') + '|' + (h.money != null ? h.money : 0);
  if (!sig('shop', shopSig)) return;   // 分类/已购/穿戴/现金未变化不重建
  var cats = [];
  mall.forEach(function (it) { if (cats.indexOf(it.category) < 0) cats.push(it.category); });
  var catMeta = { clothes: '👕 衣服', pants: '👖 裤子', shoes: '👞 鞋子', watch: '⌚ 手表', digital: '📱 数码', accessory: '🕶️ 饰品', pet: '🐾 宠物', health: '💊 健康', other: '📦 其他' };
  var catBox = document.getElementById('shop-cats');
  var html = '<button class="sc-btn active" onclick="shopCatBtn(\'all\', this)">全部</button>';
  cats.forEach(function (c) {
    html += '<button class="sc-btn" onclick="shopCatBtn(\'' + c + '\', this)">' + (catMeta[c] || c) + '</button>';
  });
  catBox.innerHTML = html;
  var grid = document.getElementById('shop-grid');
  var list = shopCat === 'all' ? mall : mall.filter(function (it) { return it.category === shopCat; });
  if (!list.length) { grid.innerHTML = '<div class="cmd-empty">这个分类没有商品</div>'; }
  else {
    var g = '';
    list.forEach(function (it) {
      var idx = mall.indexOf(it) + 1;   // 全量编号（buy <编号> 用）
      var wearing = eq.indexOf(it.id) >= 0;
      var owned = inv.indexOf(it.id) >= 0 || wearing;
      var bonus = [];
      if (it.charm > 0) bonus.push('魅力+' + it.charm);
      if (it.prestige > 0) bonus.push('声望+' + it.prestige);
      if (it.mood > 0) bonus.push('心情+' + it.mood);
      if (it.socialBonus > 0) bonus.push('社交+' + Math.round(it.socialBonus * 100) + '%');
      g += '<div class="shop-card' + (owned ? ' owned' : '') + (wearing ? ' wearing' : '') + '">' +
        '<div class="sc-ico">' + (catMeta[it.category] ? catMeta[it.category].split(' ')[0] : '📦') + '</div>' +
        '<div class="sc-name">' + it.name + '</div>' +
        '<div class="sc-desc">' + (it.desc || '') + '</div>' +
        '<div class="sc-bonus">' + (bonus.length ? bonus.join(' · ') : '无属性加成') + '</div>' +
        '<div class="sc-foot"><span class="sc-price">' + it.cost + ' 元</span>' +
        (owned
          ? '<span class="sc-owned' + (wearing ? ' wearing' : '') + '">' + (wearing ? '✅ 穿戴中' : '✅ 已拥有') + '</span>'
          : '<button class="btn btn-mini" onclick="shopBuy(' + idx + ', \'' + it.name + '\', \'' + it.id + '\')">购买</button>') +
        '</div></div>';
    });
    grid.innerHTML = g;
  }
  document.getElementById('shop-foot').innerHTML = '<span class="dim">现金 ' + fmtMoney(h.money != null ? h.money : 0) + ' 元 · 已穿戴自动加属性，同类只能穿一件</span>';
}
function shopBuy(idx, name, id) {
  runCmd('buy ' + idx);
  setTimeout(function () { renderShopModal(); }, 1200);
  buyResultToast('inventory', id, '已购买 ' + name, '购买失败：余额不足或无法购买');
}

/* ---------------- 人才市场（弹窗） ---------------- */
var jobsModalOpen = false;
function openJobsModal() {
  jobsModalOpen = true;
  showModalBox(document.getElementById('jobs-modal'));
  $.getJSON('/api/game/config', function (d) { if (d && d.jobs) GAME_CONFIG = d; renderJobsModal(); });
}
function closeJobsModal() { jobsModalOpen = false; closeModalWithAnim('jobs-modal'); }
function renderJobsModal() {
  var cfg = GAME_CONFIG || {};
  var jobs = cfg.jobs || [];
  var h = window.__lastHud || {};
  var box = document.getElementById('jobs-list');
  if (!jobs.length) { box.innerHTML = '<div class="cmd-empty">招聘信息加载中……</div>'; return; }
  var jobsSig = jobs.map(function (j) { return j.id + ':' + (j.satisfied ? 1 : 0) + ':' + (j.current ? 1 : 0) + ':' + (j.miss || ''); }).join(',')
    + '|' + ((h.job && h.job.id) || '');
  if (!sig('jobs', jobsSig)) return;   // 入职条件/在职状态未变化不重建
  var g = '';
  jobs.forEach(function (j) {
    var st = j.satisfied ? 'ok' : 'no';
    var cur = j.current ? ' <em class="cur">在职</em>' : '';
    g += '<div class="job-card ' + st + '">' +
      '<div class="jc-head"><span class="jc-ico">' + (j.icon || '💼') + '</span>' +
      '<span class="jc-name">' + j.name + (j.type === 'special' ? ' ★' : '') + cur + '</span>' +
      '<span class="jc-pay">¥' + j.daily + '/天</span></div>' +
      '<div class="jc-desc">' + (j.desc || '') + '</div>' +
      '<div class="jc-reqs">' + (j.reqs || []).map(function (r) { return '<span class="req-chip">' + r + '</span>'; }).join('') + '</div>' +
      '<div class="jc-foot">' + (j.current ? '<span class="dim">当前职业 · 工作地点 work 上班</span><button class="btn btn-mini btn-danger" onclick="jobsResign(\'' + j.name + '\')">✋ 离职</button>' :
        (j.satisfied ? '<button class="btn btn-primary btn-mini" onclick="jobsSign(\'' + j.id + '\', \'' + j.name + '\')">📋 入职</button>'
                     : '<span class="miss-tip">⚠ ' + (j.miss || '条件未满足') + '</span>')) + '</div></div>';
  });
  box.innerHTML = g;
}
function stripAnsi(t) { return String(t).replace(/\x1b\[[0-9;]*m/g, ''); }

function jobFailMsg(lines) {
  var clean = stripAnsi((lines || []).join('\n'));
  if (clean.indexOf('✘ 不符合入职要求') >= 0) {
    var m = clean.match(/不符合入职要求[：:]([^\n]+)/);
    return m ? m[1].trim() : '条件未满足';
  }
  if (clean.indexOf('先 resign') >= 0) return '已有工作，请先辞职再换';
  if (clean.indexOf('请先到人才市场') >= 0) return '请先到人才市场（当前地点不支持入职）';
  if (clean.indexOf('已经在做') >= 0) return '你已经在做这份工作了';
  var tail = clean.replace(/\s+/g, ' ').slice(-60);
  return tail || '入职失败，请重试';
}

function jobsSign(id, name) {
  if (window.__signLock) { toast('正在办理入职，请稍候', 'err'); return; }
  window.__signLock = true;
  toast('正在办理入职…');
  $.ajax({
    url: '/api/game/command', method: 'POST', contentType: 'application/json',
    data: JSON.stringify({ input: 'sign ' + id }),
    success: function (r) {
      window.__signLock = false;
      termWrite((r.lines || []));
      if (r.hud) renderHud(r.hud);
      if (stripAnsi((r.lines || []).join('\n')).indexOf('入职成功') >= 0) {
        toast('🎉 入职成功：' + name + '（明天去工作地点上班）', 'ok');
      } else {
        toast('✘ 入职失败：' + jobFailMsg(r.lines), 'err');
      }
      setTimeout(function () {
        $.getJSON('/api/game/config', function (d) { if (d && d.jobs) { GAME_CONFIG = d; renderJobsModal(); } });
      }, 700);
    },
    error: function () { window.__signLock = false; toast('网络错误，请重试', 'err'); }
  });
}
function jobsResign(name) {
  if (window.__signLock) { toast('正在处理，请稍候', 'err'); return; }
  window.__signLock = true;
  $.ajax({
    url: '/api/game/command', method: 'POST', contentType: 'application/json',
    data: JSON.stringify({ input: 'resign' }),
    success: function (r) {
      window.__signLock = false;
      termWrite((r.lines || []));
      if (r.hud) renderHud(r.hud);
      var clean = stripAnsi((r.lines || []).join('\n'));
      if (clean.indexOf('辞掉') >= 0) {
        toast('✋ 已辞去' + name + '，明天起自由身', 'ok');
      } else if (clean.indexOf('本来就没工作') >= 0) {
        toast('你现在本来就没有工作', 'err');
      } else {
        toast('离职完成', 'ok');
      }
      setTimeout(function () {
        $.getJSON('/api/game/config', function (d) { if (d && d.jobs) { GAME_CONFIG = d; renderJobsModal(); } });
      }, 500);
    },
    error: function () { window.__signLock = false; toast('网络错误，请重试', 'err'); }
  });
}

/* ---------------- 培训中心（弹窗） ---------------- */
function openTrainModal() {
  showModalBox(document.getElementById('train-modal'));
  loadGameConfig(function () { renderTrainModal(); });
}
function closeTrainModal() { closeModalWithAnim('train-modal'); }
function renderTrainModal() {
  var cfg = GAME_CONFIG || {};
  var courses = cfg.courses || [];
  var h = window.__lastHud || {};
  var certs = h.certificates || [];
  var progMap = h.courseProgress || {};
  var box = document.getElementById('train-list');
  var trainSig = (certs || []).join(',') + '|' + JSON.stringify(progMap || {});
  if (!sig('train', trainSig)) return;   // 证书/进度未变化不重建
  if (!courses.length) { box.innerHTML = '<div class="cmd-empty">课程加载中……</div>'; return; }
  var g = '';
  courses.forEach(function (c, i) {
    var done = certs.indexOf(c.certName) >= 0 || c.done;
    var prog = progMap[c.id] != null ? Math.round(progMap[c.id]) : 0;
    var enrolled = progMap[c.id] != null;
    var progHtml = '';
    if (done) {
      progHtml = '<div class="cc-prog done"><div class="cc-prog-bar"><div class="cc-prog-fill" style="width:100%"></div></div><span class="cc-prog-txt">✔ 已拿证</span></div>';
    } else if (enrolled) {
      var pct = Math.min(100, Math.max(0, prog));
      progHtml = '<div class="cc-prog' + (pct >= 100 ? ' full' : '') + '"><div class="cc-prog-bar"><div class="cc-prog-fill" style="width:' + pct + '%"></div></div><span class="cc-prog-txt">' + (pct >= 100 ? '🎯 可参加考试' : '进度 ' + pct + '%') + '</span></div>';
    } else {
      progHtml = '<div class="cc-prog"><div class="cc-prog-bar"></div><span class="cc-prog-txt dim">未报名</span></div>';
    }
    g += '<div class="course-card">' +
      '<div class="cc-head"><span class="cc-ico">📚</span><span class="cc-name">' + c.name + '</span>' +
      '<span class="cc-cert">' + (c.certName || '') + '</span></div>' +
      '<div class="cc-desc">' + (c.desc || '') + '</div>' +
      '<div class="cc-meta">学费 ' + c.cost + ' 元 · 共 ' + c.hours + ' 小时 · 考试费 ' + c.examFee + ' 元' + (c.minIntel > 0 ? ' · 智力≥' + c.minIntel : '') + '</div>' +
      '<div class="cc-foot">' + progHtml +
      (done ? '<span class="dim">✔ ' + c.certName + '</span>' :
        '<button class="btn btn-mini" onclick="trainAction(\'train ' + c.id + '\', this)">' + (enrolled ? '继续学习' : '报名') + '</button>' +
        '<button class="btn btn-mini" onclick="trainStudy(' + (i + 1) + ')">✏️ 学习2h</button>' +
        '<button class="btn btn-mini" onclick="trainExam(' + (i + 1) + ')">📝 考试</button>') +
      '</div></div>';
  });
  box.innerHTML = g;
}
function trainAction(cmd, el) {
  if (el) { el.disabled = true; }
  runCmd(cmd);
  setTimeout(function () {
    var m = document.getElementById('quiz-modal');
    if (m && m.style.display !== 'none') {
      // 答题弹窗已打开，无需刷新课程
    } else {
      renderTrainModal();
      if (el) el.disabled = false;
    }
  }, 1400);
}
function trainStudy(idx) { openQuizFlow('train', String(idx)); }
function trainExam(idx) { openQuizFlow('exam', String(idx)); }

/* ---------------- 成人大学（弹窗） ---------------- */
function openCollegeModal() {
  showModalBox(document.getElementById('college-modal'));
  loadGameConfig(function () { renderCollegeModal(); }, true);
}
function closeCollegeModal() { closeModalWithAnim('college-modal'); }
function renderCollegeModal() {
  var cfg = GAME_CONFIG || {};
  var classes = cfg.adultClasses || [];
  var h = window.__lastHud || {};
  var eduName = ((h.char && h.char.education) || '未知');
  var box = document.getElementById('college-list');
  var status = document.getElementById('college-status');
  var cSig = JSON.stringify(classes) + '|' + eduName;
  if (!sig('college', cSig)) return;
  if (!classes.length) { box.innerHTML = '<div class="cmd-empty">班级加载中……</div>'; return; }
  status.innerHTML = '<div class="college-edu"><span>当前学历</span><b>' + eduName + '</b>' +
    '<span class="college-hint">每班先「📖 上课」学到 100%，再参加毕业考试，全部答对即可毕业并提升学历</span></div>';
  var g = '';
  classes.forEach(function (c, i) {
    var prog = c.progress != null ? Math.round(c.progress) : -1;
    var graduated = c.graduated;
    var progHtml = '';
    if (graduated) {
      progHtml = '<div class="cc-prog done"><div class="cc-prog-bar"><div class="cc-prog-fill" style="width:100%"></div></div><span class="cc-prog-txt">✔ 已毕业</span></div>';
    } else if (prog >= 0) {
      var pct = Math.min(100, Math.max(0, prog));
      progHtml = '<div class="cc-prog' + (pct >= 100 ? ' full' : '') + '"><div class="cc-prog-bar"><div class="cc-prog-fill" style="width:' + pct + '%"></div></div><span class="cc-prog-txt">' + (pct >= 100 ? '🎯 可参加毕业考试' : '进度 ' + pct + '%') + '</span></div>';
    } else {
      progHtml = '<div class="cc-prog"><div class="cc-prog-bar"></div><span class="cc-prog-txt dim">未报名</span></div>';
    }
    g += '<div class="course-card">' +
      '<div class="cc-head"><span class="cc-ico">' + (c.icon || '🏛️') + '</span><span class="cc-name">' + c.name + '</span>' +
      '<span class="cc-cert">' + (c.fromEducationName || '') + ' → ' + (c.toEducationName || '') + (c.majorName ? ' · ' + c.majorName : '') + '</span></div>' +
      '<div class="cc-desc">' + (c.desc || '') + '</div>' +
      '<div class="cc-meta">学费 ' + c.cost + ' 元 · 考试费 ' + c.examFee + ' 元 · 智力≥' + c.minIntel + ' · ' + c.hours + ' 课时</div>' +
      '<div class="cc-foot">' + progHtml +
      (graduated ? '<span class="dim">✔ 已毕业</span>' :
        '<button class="btn btn-mini" onclick="collegeAction(\'college enroll ' + c.id + '\', this)">' + (prog >= 0 ? '报名中' : '报名') + '</button>' +
        '<button class="btn btn-mini" onclick="collegeStudy(\'' + c.id + '\')">📖 上课</button>' +
        '<button class="btn btn-mini" onclick="collegeExam(\'' + c.id + '\')">🎓 毕业考试</button>') +
      '</div></div>';
  });
  box.innerHTML = g;
}
function collegeAction(cmd, el) {
  if (el) el.disabled = true;
  if (window.__collegeBusy) { toast('正在处理上一个操作，请稍候', 'err'); if (el) el.disabled = false; return; }
  window.__collegeBusy = true;
  toast('正在办理…');
  api('/api/game/command', { input: cmd }).done(function (r) {
    window.__collegeBusy = false;
    termWrite(r.lines || []);
    if (r.hud) renderHud(r.hud);
    var clean = stripAnsi((r.lines || []).join('\n'));
    var errTip = collegeErrMsg(clean);
    if (errTip) {
      toast('✘ ' + errTip, 'err');
    } else if (clean.indexOf('报名「') >= 0) {
      toast('📋 报名成功！去「📖 上课」攒熟练度吧', 'ok');
    } else if (clean.indexOf('学费不够') >= 0) {
      toast('✘ 学费不够，先赚钱再来', 'err');
    } else {
      toast('操作完成', 'ok');
    }
    sigReset();
    loadGameConfig(function () { renderCollegeModal(); }, true);
    if (el) el.disabled = false;
  }).fail(function () {
    window.__collegeBusy = false;
    toast('无法连接服务器', 'err');
    if (el) el.disabled = false;
  });
}
function collegeStudy(id) {
  if (window.__collegeBusy) { toast('正在处理上一个操作，请稍候', 'err'); return; }
  window.__collegeBusy = true;
  api('/api/game/command', { input: 'college study ' + id }).done(function (r) {
    window.__collegeBusy = false;
    termWrite(r.lines || []);
    if (r.hud) renderHud(r.hud);
    var clean = stripAnsi((r.lines || []).join('\n'));
    var errTip = collegeErrMsg(clean);
    if (errTip) { toast('✘ ' + errTip, 'err'); }
    else {
      var m = clean.match(/熟练度\s*[\d.]+%\s*→\s*([\d.]+)%/);
      var nm = m ? m[1] : clean.match(/([\d.]+)%\s*$/);
      toast('📖 上课完成，熟练度 ' + (nm ? parseFloat(nm[1]).toFixed(0) : '') + '%', 'ok');
    }
    sigReset();
    loadGameConfig(function () { renderCollegeModal(); }, true);
  }).fail(function () { window.__collegeBusy = false; toast('无法连接服务器', 'err'); });
}
function collegeErrMsg(clean) {
  if (Array.isArray(clean)) clean = stripAnsi(clean.join('\n'));
  if (clean.indexOf('学历') >= 0) { var m = clean.match(/需要[^\n]+学历[^\n]*/); return m ? m[0].trim() : '学历条件不足'; }
  if (clean.indexOf('智力') >= 0) { var m2 = clean.match(/学习需要[^\n]+/); return m2 ? m2[0].trim() : '智力不足'; }
  if (clean.indexOf('学费不够') >= 0) return '学费不够';
  if (clean.indexOf('毕业') >= 0 && clean.indexOf('已经') >= 0) return '这个班已经毕业了';
  if (clean.indexOf('考务费') >= 0) return '考务费不足';
  if (clean.indexOf('太累') >= 0) return '太累了，先休息恢复体力';
  return null;
}
function collegeExam(id) {
  // 熟练度由后端考试接口校验，直接开考
  startQuiz('college', id);
}

/* ---------------- 住宿（弹窗） ---------------- */
function openHousingModal() {
  showModalBox(document.getElementById('housing-modal'));
  loadGameConfig(function () { renderHousingModal(); });
}
function closeHousingModal() { closeModalWithAnim('housing-modal'); }
function renderHousingModal() {
  var cfg = GAME_CONFIG || {};
  var list = cfg.housing || [];
  var h = window.__lastHud || {};
  var box = document.getElementById('housing-list');
  var housingSig = (h.housingId || 'street');
  if (!sig('housing', housingSig)) return;   // 住处未变化不重建
  var g = '';
  list.forEach(function (it, i) {
    var cur = it.id === (h.housingId || 'street');
    var price = it.leaseCost > 0 ? '月租 ' + it.leaseCost + ' 元/' + it.leaseDays + ' 天' : (it.costPerNight > 0 ? it.costPerNight + ' 元/晚' : '免费');
    var moodTxt = it.mood !== 0 ? (it.mood > 0 ? '心情+' + it.mood : '心情' + it.mood) : '';
    g += '<div class="house-card' + (cur ? ' cur' : '') + '">' +
      '<div class="hc-head"><span class="hc-name">' + (cur ? '📍 ' : '') + it.name + '</span><span class="hc-price">' + price + '</span></div>' +
      '<div class="hc-desc">' + (it.desc || '') + '</div>' +
      '<div class="hc-meta">恢复体力至 ' + it.restore + '%' + (moodTxt ? ' · ' + moodTxt : '') + (it.risk > 0 ? ' · ⚠ 风险' + Math.round(it.risk * 100) + '%' : '') + (it.prestige > 0 ? ' · 声望+' + it.prestige : '') + '</div>' +
      (cur ? '<div class="dim">当前住处 · 睡觉请用「睡觉」按钮或 sleep</div>' :
        '<div class="hc-foot"><button class="btn btn-primary btn-mini" onclick="housingPick(' + (i + 1) + ', \'' + it.name + '\')">入住</button></div>') + '</div>';
  });
  box.innerHTML = g;
}
function housingPick(idx, name) {
  runCmd('housing ' + idx);
  setTimeout(function () { renderHousingModal(); }, 1200);
}

/* ---------------- 点餐（弹窗） ---------------- */
function openEatModal() {
  showModalBox(document.getElementById('eat-modal'));
  loadGameConfig(function () { renderEatModal(); });
}
function closeEatModal() { closeModalWithAnim('eat-modal'); }
function renderEatModal() {
  var cfg = GAME_CONFIG || {};
  var foods = cfg.foods || [];
  var h = window.__lastHud || {};
  var locId = currentLocId || '';
  var pool = foods.filter(function (f) { return f.place === locId || f.place === 'any'; });
  var box = document.getElementById('eat-list');
  if (!pool.length) { box.innerHTML = '<div class="cmd-empty">这里没什么可吃的，去别处找找吧。</div>'; return; }
  var eatSig = locId + '|' + (h.money != null ? h.money : 0);
  if (!sig('eat', eatSig)) return;   // 地点/现金未变化不重建
  var g = '';
  pool.forEach(function (f) {
    var fx = [];
    if (f.hunger > 0) fx.push('饱腹+' + f.hunger);
    if (f.stamina > 0) fx.push('体力+' + f.stamina);
    if (f.stamina < 0) fx.push('体力' + f.stamina);
    if (f.mood > 0) fx.push('心情+' + f.mood);
    if (f.prestige > 0) fx.push('声望+' + f.prestige);
    g += '<div class="food-card">' +
      '<span class="fc-ico">' + (f.icon || '🍽️') + '</span>' +
      '<div class="fc-info"><div class="fc-name">' + f.name + '</div><div class="fc-desc">' + (f.desc || '') + '</div>' +
      '<div class="fc-meta">' + (fx.length ? fx.join(' · ') : '无增益') + '</div></div>' +
      '<div class="fc-foot"><span class="fc-price">' + f.cost + ' 元</span>' +
      '<button class="btn btn-mini" onclick="eatPick(\'' + f.id + '\',\'' + esc(f.name) + '\')">来一份</button></div></div>';
  });
  box.innerHTML = g;
}
function eatPick(id, name) {
  runCmd('eat ' + id);
  setTimeout(function () { renderEatModal(); }, 1200);
  setTimeout(function () { toast('🍽️ 已点：' + (name || id) + '，享用完看看状态', 'ok'); }, 900);
}

/* ---------------- 彩票站（弹窗） ---------------- */
var _lotteryTab = 'scratch';
function openLotteryModal() {
  _lotteryTab = 'scratch';
  showModalBox(document.getElementById('lottery-modal'));
  document.querySelectorAll('.lottery-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.lt === 'scratch'); });
  loadGameConfig(function () { renderLotteryModal(); });
}
function closeLotteryModal() { closeModalWithAnim('lottery-modal'); }
function lotteryTab(tab) {
  _lotteryTab = tab;
  document.querySelectorAll('.lottery-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.lt === tab); });
  renderLotteryModal();
}
function renderLotteryModal() {
  var cfg = GAME_CONFIG || {};
  var h = window.__lastHud || {};
  var box = document.getElementById('lottery-screen');
  if (!box) return;
  if (_lotteryTab === 'scratch') {
    var sc = cfg.scratch || {};
    var cost = sc.cost || 10;
    if (_scratchTicket) {
      // 票面态：SSE 每秒重复渲染时跳过（保持刮开涂层进度）
      if (!sig('lottery', 't|' + (_scratchTicket.revealed ? 'r' : 'u'))) return;
      var g = '<div class="lt-scratch">' +
        '<div class="ls-head"><span class="ls-name">🎫 好运来刮刮乐</span><span class="ls-price">' + cost + ' 元/张 · 头奖 ' + fmtMoney(sc.jackpotMax || 5000000) + '</span></div>' +
        '<div class="scratch-box">' +
        '<div class="scratch-ticket">' + scratchFaceHtml(_scratchTicket) +
        '<canvas id="scratch-canvas"' + (_scratchTicket.revealed ? ' style="display:none"' : '') + '></canvas>' +
        '</div>' +
        '<div class="scratch-tip">' + (_scratchTicket.revealed
          ? (_scratchTicket.prize > 0 ? '🎉 恭喜中奖！奖金已自动到账' : '😅 谢谢惠顾，好运下次再来')
          : '🖱️ 按住鼠标在票面上刮开涂层，或点「一键刮开」') + '</div>' +
        '</div>' +
        '<div class="ls-btns">' +
        (_scratchTicket.revealed
          ? '<button class="btn btn-primary" onclick="scratchBuy()">🎫 再买一张（' + cost + '元）</button>'
          : '<button class="btn" onclick="scratchRevealAll()">✨ 一键刮开</button>') +
        '</div>' +
        '<div class="ls-tip dim">现金 ' + fmtMoney(h.money != null ? h.money : 0) + ' 元 · 运气值越高越容易中大奖</div></div>';
      box.innerHTML = g;
      if (!_scratchTicket.revealed) initScratchCanvas();
    } else {
      var scratchSig = 'e|' + (h.money != null ? h.money : 0);
      if (!sig('lottery-list', scratchSig)) return;   // 现金未变化不重建
      var g2 = '<div class="lt-scratch">' +
        '<div class="ls-head"><span class="ls-name">🎫 好运来刮刮乐</span><span class="ls-price">' + cost + ' 元/张</span></div>' +
        '<div class="ls-desc">即刮即中 · 头奖 ' + fmtMoney(sc.jackpotMax || 5000000) + ' 元 · 最高奖金 500 万</div>' +
        '<div class="scratch-preview"><div class="sp-card"><div class="sp-line">🎰 好运来 · 刮刮乐</div><div class="sp-num">? ? ?</div><div class="sp-line dim">刮开涂层见分晓</div></div></div>' +
        '<div class="ls-btns">' +
        '<button class="btn btn-primary" onclick="scratchBuy()">🎫 买一张（' + cost + '元）</button></div>' +
        '<div class="ls-tip dim">现金 ' + fmtMoney(h.money != null ? h.money : 0) + ' 元 · 运气值越高越容易中大奖</div></div>';
      box.innerHTML = g2;
    }
  } else {
    var ssqSig = 's|' + (h.money != null ? h.money : 0);
    if (!sig('lottery-list', ssqSig)) return;   // 现金未变化不重建
    var lt = cfg.lottery || {};
    var g3 = '<div class="lt-ssq">' +
      '<div class="ls-head"><span class="ls-name">🔴 双色球</span><span class="ls-price">' + (lt.costPerTicket || 2) + ' 元/注</span></div>' +
      '<div class="ls-desc">每期 ' + (lt.drawHour != null ? lt.drawHour + ':' + (lt.drawMinute != null ? String(lt.drawMinute).padStart(2, '0') : '30') : '21:30') + ' 开奖 · 6红+1蓝，全中奖 ' + (lt.prizes && lt.prizes[0] ? lt.prizes[0].amount : 5000000) + ' 元</div>' +
      '<div class="ls-btns">' +
      '<button class="btn btn-primary" onclick="lotteryBuy(1)">机选 1 注（2元）</button>' +
      '<button class="btn" onclick="lotteryBuy(5)">机选 5 注（10元）</button>' +
      '<button class="btn" onclick="lotteryBuy(10)">机选 10 注（20元）</button></div>' +
      '<div class="ls-tip dim">开奖时中奖自动到账 · 现金 ' + fmtMoney(h.money != null ? h.money : 0) + ' 元</div></div>';
    box.innerHTML = g3;
  }
}

/* ---------------- 高仿真刮刮乐（canvas 刮涂层） ---------------- */
var _scratchTicket = null;    // 当前票面 {prize, revealed}
var _scratchBuying = false;   // 购买请求进行中

function scratchFaceHtml(t) {
  var p = t.prize;
  if (p > 0) {
    var cls = p >= 100000 ? 'st-big' : (p >= 1000 ? 'st-mid' : 'st-sml');
    return '<div class="st-face ' + cls + '">' +
      '<div class="st-top"><span>好运来刮刮乐</span><span>LUCKY SCRATCH</span></div>' +
      '<div class="st-amt">¥ ' + fmtMoney(p) + '</div>' +
      '<div class="st-tag">' + (p >= 100000 ? '🌟 超级大奖降临' : p >= 1000 ? '🎉 恭喜中大奖' : '✨ 中奖啦') + '</div>' +
      '<div class="st-codes"><span>06</span><span>18</span><span>28</span></div>' +
      '</div>';
  }
  return '<div class="st-face st-lose">' +
    '<div class="st-top"><span>好运来刮刮乐</span><span>LUCKY SCRATCH</span></div>' +
    '<div class="st-amt">谢谢惠顾</div>' +
    '<div class="st-tag">好运下次再来</div>' +
    '<div class="st-codes"><span>0 6</span><span>1 8</span><span>2 8</span></div>' +
    '</div>';
}

function initScratchCanvas() {
  var cv = document.getElementById('scratch-canvas');
  if (!cv) return;
  var W = 360, H = 190;
  cv.width = W; cv.height = H;
  var ctx = cv.getContext('2d');
  var grd = ctx.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, '#e7e8ee'); grd.addColorStop(0.45, '#c8cad4'); grd.addColorStop(1, '#dcdde4');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  for (var i = 0; i < 14; i++) {
    ctx.beginPath(); ctx.moveTo(Math.random() * W, 0); ctx.lineTo(Math.random() * W, H); ctx.stroke();
  }
  for (var j = 0; j < 70; j++) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.08 + Math.random() * 0.3) + ')';
    ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, 1 + Math.random() * 2.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(96,98,112,0.92)'; ctx.font = 'bold 16px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🧧 刮 开 此 区 域 🧧', W / 2, H / 2 - 8);
  ctx.font = '12px sans-serif'; ctx.fillStyle = 'rgba(96,98,112,0.72)';
  ctx.fillText('按住鼠标左右刮动 · 刮开 60% 自动开奖', W / 2, H / 2 + 16);
  cv._scr = { ctx: ctx, W: W, H: H, cnt: 0 };
  cv.onmousedown = function (e) { if (cv._scr) { cv._scr.down = true; scratchErase(cv, e); } };
  cv.onmousemove = function (e) { if (cv._scr && cv._scr.down) scratchErase(cv, e); };
  cv.onmouseup = function () { if (cv._scr) cv._scr.down = false; };
  cv.onmouseleave = function () { if (cv._scr) cv._scr.down = false; };
}

function scratchErase(cv, e) {
  var s = cv._scr, ctx = s.ctx;
  var r = cv.getBoundingClientRect();
  var x = (e.clientX - r.left) * (s.W / r.width);
  var y = (e.clientY - r.top) * (s.H / r.height);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  if (++s.cnt % 6 === 0) checkScratchProgress(cv);
}

function checkScratchProgress(cv) {
  if (!_scratchTicket || _scratchTicket.revealed) return;
  var s = cv._scr, data = s.ctx.getImageData(0, 0, s.W, s.H).data;
  var total = data.length / 4, clearN = 0;
  for (var i = 3; i < data.length; i += 4) if (data[i] < 120) clearN++;
  if (clearN / total > 0.6) scratchReveal();
}

function scratchRevealAll() {
  var cv = document.getElementById('scratch-canvas');
  if (cv && cv._scr) cv._scr.ctx.clearRect(0, 0, cv._scr.W, cv._scr.H);
  scratchReveal();
}

function scratchReveal() {
  if (!_scratchTicket || _scratchTicket.revealed) return;
  _scratchTicket.revealed = true;
  renderLotteryModal();
  var p = _scratchTicket.prize;
  if (p > 0) toast('🎉 刮刮乐中奖：+' + fmtMoney(p) + ' 元！', 'ok');
  else toast('😅 谢谢惠顾，再接再厉', 'err');
}

function scratchBuy() {
  if (_scratchBuying) return;
  _scratchBuying = true;
  $.ajax({ url: '/api/game/scratch', method: 'POST' }).done(function (d) {
    _scratchBuying = false;
    if (!d.ok) { toast(d.msg || '购买失败', 'err'); return; }
    if (d.lines) termWrite(d.lines);
    _scratchTicket = { prize: d.prize || 0, revealed: false };
    renderLotteryModal();
  }).fail(function () {
    _scratchBuying = false;
    toast('网络异常，请重试', 'err');
  });
}

function lotteryBuy(n) {
  runCmd('lottery buy ' + n);
  setTimeout(function () { renderLotteryModal(); }, 1300);
  setTimeout(function () { toast('🔴 已机选 ' + n + ' 注双色球，等开奖！', 'ok'); }, 900);
}

/* ---------------- 银行（弹窗） ---------------- */
var _bankTab = 'save';
function openBankModal() {
  _bankTab = 'save';
  showModalBox(document.getElementById('bank-modal'));
  syncBankTabs();
  renderBankModal();
}
function closeBankModal() { closeModalWithAnim('bank-modal'); }
function syncBankTabs() {
  document.querySelectorAll('.bank-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.bt === _bankTab); });
}
function bankTab(t) { _bankTab = t; syncBankTabs(); renderBankModal(); }
function renderBankModal() {
  var box = document.getElementById('bank-screen');
  if (!box) return;
  if (_bankTab === 'loan') { renderLoanPanel(); return; }
  if (_bankTab === 'finance') { renderFinancePanel(); return; }
  renderSavePanel();
}
function renderSavePanel() {
  var h = window.__lastHud || {};
  var bankSig = (h.money != null ? h.money : 0) + '|' + (h.deposit != null ? h.deposit : 0) + '|' + ((h.loan && h.loan.principal) || 0) + '|' + ((h.finance && h.finance.principal) || 0);
  if (!sig('bank-save', bankSig)) return;   // 现金/存款/贷款/理财未变化不重建
  var loan = h.loan || {}, fin = h.finance || {};
  document.getElementById('bank-screen').innerHTML =
    '<div class="bk-row"><span>现金</span><b>' + fmtMoney(h.money != null ? h.money : 0) + ' 元</b></div>' +
    '<div class="bk-row"><span>存款</span><b class="gold">' + fmtMoney(h.deposit != null ? h.deposit : 0) + ' 元</b></div>' +
    '<div class="bk-row"><span>利率</span><b>日息 0.05%（存 10000 元每天 +5 元）</b></div>' +
    (loan.principal ? '<div class="bk-row warn"><span>贷款</span><b class="red">' + loan.principal + ' 元（日息约 ' + (loan.dailyInterest || 0) + ' 元）</b></div>' : '') +
    (fin.principal ? '<div class="bk-row"><span>理财</span><b class="gold">' + fin.principal + ' 元（第 ' + fin.dueDay + ' 天到期）</b></div>' : '') +
    '<div class="bank-ops">' +
      '<div class="bank-op"><label>金额（元）</label><input type="number" id="bank-amount" min="1" value="100"><div class="bank-btns"><button class="btn btn-primary" onclick="bankOp(\'bank\')">💰 存钱</button><button class="btn" onclick="bankOp(\'withdraw\')">💵 取钱</button></div></div>' +
      '<div class="bank-quick"><button class="btn btn-mini" onclick="setBankAmt(100)">100</button><button class="btn btn-mini" onclick="setBankAmt(500)">500</button><button class="btn btn-mini" onclick="setBankAmt(1000)">1000</button><button class="btn btn-mini" onclick="setBankAmt(5000)">5000</button></div>' +
    '</div>';
}
function setBankAmt(n) { document.getElementById('bank-amount').value = n; }
function bankOp(side) {
  var amt = parseInt(document.getElementById('bank-amount').value, 10);
  if (!amt || amt <= 0) { toast('请输入有效金额', 'err'); return; }
  runCmd(side + ' ' + amt);
  setTimeout(function () { renderSavePanel(); }, 1200);
}

/* ---- 银行贷款 ---- */
function renderLoanPanel() {
  var h = window.__lastHud || {};
  var loan = h.loan || {};
  var sigStr = (h.money != null ? h.money : 0) + '|' + (loan.principal || 0);
  if (!sig('bank-loan', sigStr)) return;
  var remain = Math.max(0, (loan.limit || 50000) - (loan.principal || 0));
  document.getElementById('bank-screen').innerHTML =
    '<div class="bn-panel">' +
      '<div class="bn-hero"><div class="bn-hero-ico">🏦</div><div class="bn-hero-t">信用贷 · 日息 0.1%</div><div class="bn-hero-s">每天清晨自动扣息，现金不足则计入本金</div></div>' +
      '<div class="bk-row"><span>当前贷款</span><b class="' + (loan.principal ? 'red' : '') + '">' + (loan.principal || 0) + ' 元</b></div>' +
      '<div class="bk-row"><span>每日利息</span><b>' + (loan.dailyInterest || 0) + ' 元</b></div>' +
      '<div class="bk-row"><span>可贷额度</span><b>' + remain + ' 元（上限 5 万）</b></div>' +
      '<div class="bn-op"><input id="loan-amount" type="number" min="100" value="1000"><button class="btn btn-primary" onclick="loanBorrow()">💰 借款</button></div>' +
      '<div class="bn-quick">' +
        '<button class="btn btn-mini" onclick="setLoanAmt(1000)">1000</button>' +
        '<button class="btn btn-mini" onclick="setLoanAmt(5000)">5000</button>' +
        '<button class="btn btn-mini" onclick="setLoanAmt(10000)">10000</button>' +
        '<button class="btn btn-mini" onclick="loanRepayAll()">💵 全部还款</button>' +
      '</div>' +
      '<p class="bn-tip dim">💡 贷款能帮你提前买房买车上车，但每天都会吃掉你的现金，量力而行！</p>' +
    '</div>';
}
function setLoanAmt(n) { var el = document.getElementById('loan-amount'); if (el) el.value = n; }
function loanBorrow() {
  var amt = parseInt(document.getElementById('loan-amount').value, 10);
  if (!amt || amt < 100) { toast('单笔最少借 100 元', 'err'); return; }
  runCmd('loan borrow ' + amt);
  setTimeout(function () { renderLoanPanel(); }, 1200);
}
function loanRepayAll() {
  var h = window.__lastHud || {};
  var loan = h.loan || {};
  if (!loan.principal) { toast('当前没有贷款', 'err'); return; }
  runCmd('loan repay all');
  setTimeout(function () { renderLoanPanel(); }, 1200);
}

/* ---- 银行理财 ---- */
function renderFinancePanel() {
  var h = window.__lastHud || {};
  var fin = h.finance || {};
  var sigStr = (h.money != null ? h.money : 0) + '|' + (fin.principal || 0);
  if (!sig('bank-finance', sigStr)) return;
  var g = '<div class="bn-panel">' +
    '<div class="bn-hero bn-hero-fin"><div class="bn-hero-ico">📈</div><div class="bn-hero-t">稳盈理财 · 锁定 7 天</div><div class="bn-hero-s">日息 0.15%，到期本息自动到账</div></div>';
  if (fin.principal) {
    g += '<div class="bk-row"><span>理财本金</span><b class="gold">' + fin.principal + ' 元</b></div>' +
      '<div class="bk-row"><span>到期日</span><b>第 ' + fin.dueDay + ' 天 · 预计收益 ' + (fin.estInterest || 0) + ' 元</b></div>' +
      '<div class="bn-op"><button class="btn btn-danger" onclick="financeRedeem()">⚠ 提前赎回（本金 -10% 手续费，收益清零）</button></div>' +
      '<p class="bn-tip dim">💡 已有一笔理财在锁定中，到期后才能再买。</p>';
  } else {
    g += '<div class="bk-row"><span>起购金额</span><b>' + (fin.min || 1000) + ' 元</b></div>' +
      '<div class="bn-op"><input id="finance-amount" type="number" min="1000" value="1000"><button class="btn btn-primary" onclick="financeBuy()">💰 买入理财</button></div>' +
      '<div class="bn-quick">' +
        '<button class="btn btn-mini" onclick="setFinanceAmt(1000)">1000</button>' +
        '<button class="btn btn-mini" onclick="setFinanceAmt(5000)">5000</button>' +
        '<button class="btn btn-mini" onclick="setFinanceAmt(10000)">10000</button>' +
      '</div>' +
      '<p class="bn-tip dim">💡 收益比活期存款高 3 倍，但要锁 7 天，急用钱时别存太多。</p>';
  }
  g += '</div>';
  document.getElementById('bank-screen').innerHTML = g;
}
function setFinanceAmt(n) { var el = document.getElementById('finance-amount'); if (el) el.value = n; }
function financeBuy() {
  var amt = parseInt(document.getElementById('finance-amount').value, 10);
  if (!amt || amt < 1000) { toast('理财起购 1000 元', 'err'); return; }
  runCmd('finance buy ' + amt);
  setTimeout(function () { renderFinancePanel(); }, 1200);
}
function financeRedeem() {
  if (!confirm('确定提前赎回理财吗？将损失全部收益并扣 10% 手续费。')) return;
  runCmd('finance redeem');
  setTimeout(function () { renderFinancePanel(); }, 1200);
}

/* ---------------- 成就墙（弹窗） ---------------- */
function openAchModal() {
  showModalBox(document.getElementById('ach-modal'));
  $.getJSON('/api/game/config', function (d) { if (d && d.achievements) { GAME_CONFIG = d; renderAchModal(); } else { loadGameConfig(function () { renderAchModal(); }); } });
}
function closeAchModal() { closeModalWithAnim('ach-modal'); }
function renderAchModal() {
  var cfg = GAME_CONFIG || {};
  var ach = cfg.achievements || [];
  var box = document.getElementById('ach-list');
  var achSig = ach.map(function (a) { return (a.id || a.name) + ':' + (a.unlocked ? 1 : 0); }).join(',');
  if (!sig('ach', achSig)) return;   // 成就状态未变化不重建
  var unlocked = 0;
  ach.forEach(function (a) { if (a.unlocked) unlocked++; });
  var g = '<div class="ach-summary">已解锁 ' + unlocked + ' / ' + ach.length + '</div><div class="ach-grid">';
  ach.forEach(function (a) {
    g += '<div class="ach-item' + (a.unlocked ? ' on' : ' off') + '">' +
      '<span class="ai-ico">' + (a.unlocked ? (a.icon || '🏆') : '🔒') + '</span>' +
      '<span class="ai-name">' + a.name + '</span>' +
      '<span class="ai-desc">' + (a.desc || '') + '</span></div>';
  });
  g += '</div>';
  box.innerHTML = g;
}

/* ---------------- 每日任务（弹窗 + HUD 面板） ---------------- */
function openQuestModal() {
  showModalBox(document.getElementById('quest-modal'));
  renderQuestModal();
}
function closeQuestModal() { closeModalWithAnim('quest-modal'); }
function renderQuestModal() {
  var h = window.__lastHud || {};
  var qs = h.quests || [];
  var box = document.getElementById('quest-modal-body');
  if (!box) return;
  var qSig = qs.map(function (q) { return q.id + ':' + q.cur + '/' + q.target + ':' + (q.done ? 1 : 0); }).join(',');
  if (!sig('quest-m', qSig)) return;   // 任务进度未变化不重建
  var done = 0;
  qs.forEach(function (q) { if (q.done) done++; });
  var g = '<div class="qm-summary">' + (qs.length && done === qs.length
    ? '🎉 今日任务全部完成！你就是临江最靓的仔！'
    : '已完成 ' + done + ' / ' + qs.length + ' · 任务完成后奖励自动到账') + '</div>';
  if (!qs.length) g += '<p class="dim">今天没有任务，好好休息一下。</p>';
  qs.forEach(function (q) {
    var pct = Math.min(100, Math.round(q.cur / q.target * 100));
    g += '<div class="qm-item' + (q.done ? ' done' : '') + '">' +
      '<div class="qm-head"><span class="qm-desc">' + (q.done ? '✔ ' : '') + esc(q.desc) + '</span><span class="qm-reward">+' + q.reward + ' 元</span></div>' +
      '<div class="qm-bar"><div class="qm-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="qm-prog">' + Math.min(q.cur, q.target) + ' / ' + q.target + (q.done ? ' · 已完成' : '') + '</div></div>';
  });
  box.innerHTML = g;
}
function renderQuestPanel(h) {
  var qs = h.quests || [];
  var list = document.getElementById('quest-list');
  if (!list) return;
  var qSig = qs.map(function (q) { return q.id + ':' + q.cur + '/' + q.target + ':' + (q.done ? 1 : 0); }).join(',');
  if (!sig('hud-quest', qSig)) return;   // 任务进度未变化不重建
  var done = 0;
  var qh = '';
  qs.forEach(function (q) {
    if (q.done) done++;
    var pct = Math.min(100, Math.round(q.cur / q.target * 100));
    qh += '<div class="ql-item' + (q.done ? ' done' : '') + '" title="' + esc(q.desc) + '（奖励 ' + q.reward + ' 元）">' +
      '<div class="ql-head"><span>' + (q.done ? '✔ ' : '') + esc(q.desc) + '</span><em>+' + q.reward + '</em></div>' +
      '<div class="ql-bar"><div class="ql-fill" style="width:' + pct + '%"></div></div></div>';
  });
  list.innerHTML = qh || '<p class="dim">今日任务已清空</p>';
  document.getElementById('quest-summary').textContent = done + '/' + qs.length;
}

/* ---------------- 资产总览（弹窗） ---------------- */
function openAssetsModal() {
  showModalBox(document.getElementById('assets-modal'));
  renderAssetsModal();
}
function closeAssetsModal() { closeModalWithAnim('assets-modal'); }
function renderAssetsModal() {
  var h = window.__lastHud || {};
  var money = h.money != null ? h.money : 0;
  var dep = h.deposit != null ? h.deposit : 0;
  var cars = h.cars || [];
  var estates = h.estates || [];
  var biz = h.business || null;
  var total = money + dep + (biz ? biz.value || 0 : 0);
  var assetsSig = money + '|' + dep + '|' + cars.join(',') + '|' + estates.join(',') + '|' + (biz ? biz.name + ':' + (biz.value || 0) : '');
  if (!sig('assets', assetsSig)) return;   // 资产未变化不重建
  document.getElementById('assets-total').innerHTML =
    '<div class="at-num">' + fmtMoney(total) + ' 元</div><div class="at-label">总资产（现金 + 存款 + 生意估值）</div>';
  var sec = '<div class="as-sec"><div class="as-title">💵 现金与存款</div>' +
    '<div class="as-row"><span>现金</span><b>' + fmtMoney(money) + '</b></div>' +
    '<div class="as-row"><span>银行存款</span><b>' + fmtMoney(dep) + '</b></div></div>';
  sec += '<div class="as-sec"><div class="as-title">🏠 房产（' + estates.length + '）</div>' +
    (estates.length ? estates.map(function (e) { return '<div class="as-row"><span>🏠</span><b>' + e + '</b></div>'; }).join('') : '<div class="dim">暂无房产</div>') + '</div>';
  sec += '<div class="as-sec"><div class="as-title">🚗 车辆（' + cars.length + '）</div>' +
    (cars.length ? cars.map(function (c) { return '<div class="as-row"><span>🚗</span><b>' + c + '</b></div>'; }).join('') : '<div class="dim">暂无车辆</div>') + '</div>';
  sec += '<div class="as-sec"><div class="as-title">🏪 生意</div>' +
    (biz ? '<div class="as-row"><span>' + (biz.icon || '🏪') + '</span><b>' + biz.name + ' · 估值 ' + (biz.value || 0) + ' 元</b></div>' : '<div class="dim">暂无生意，去创业看看</div>') + '</div>';
  document.getElementById('assets-sections').innerHTML = sec;
}

/* ---------------- 角色状态（弹窗） ---------------- */
function openStatusModal() {
  showModalBox(document.getElementById('status-modal'));
  renderStatusModal();
}
function closeStatusModal() { closeModalWithAnim('status-modal'); }
function renderStatusModal() {
  var h = window.__lastHud || {};
  var c = h.char || {};
  var sk = h.skills || {};
  var v = h.vitals || {};
  var job = h.job || null;
  var box = document.getElementById('status-info');
  if (!box) return;
  // 静态区：角色/技能/职业/证书/住处/时间变化才重建；体力条单独轻量更新
  var statSig = (c.name || '') + ':' + (c.genderIcon || '') + ':' + ((job && job.id) || '')
    + ':' + sk.str + ':' + sk.intel + ':' + sk.charm + ':' + sk.luck
    + ':' + (h.prestige != null ? h.prestige : 0) + ':' + ((h.certificates || []).join(','))
    + ':' + (h.housing || '');
  if (!sig('status-struct', statSig)) {
    // 仅更新体力/饱腹/心情三根条的宽度与数值、游戏时间（不重建 DOM）
    var bars = box.querySelectorAll('.st-bar');
    if (bars.length === 3) {
      var vs = [v.stamina, v.hunger, v.mood];
      bars.forEach(function (b, i) {
        var fill = b.querySelector('.bar-fill');
        var num = b.querySelector('b');
        if (fill) fill.style.width = (vs[i] != null ? vs[i] : 0) + '%';
        if (num) num.textContent = vs[i] != null ? vs[i] : 0;
      });
    }
    var rows = box.querySelectorAll('.st-extra .as-row');
    if (rows.length >= 4) {
      var tb = rows[3].querySelector('b');
      if (tb && h.fullTime) tb.textContent = h.fullTime;
    }
    return;
  }
  var g = '<div class="st-head"><span class="st-avatar">' + (c.genderIcon || '👨') + '</span>' +
    '<div class="st-id"><div class="st-name">' + (c.name || '——') + '</div>' +
    '<div class="st-tags">' + [c.education, c.personality, c.major].filter(Boolean).join(' · ') + '</div></div>' +
    '<div class="st-job">' + (job ? (job.icon || '💼') + ' ' + job.name + (job.type === 'special' ? ' ★' : '') : '无业游民') + '</div></div>';
  g += '<div class="st-bars">' +
    '<div class="st-bar"><span>体力</span><div class="bar"><div class="bar-fill" style="width:' + v.stamina + '%"></div></div><b>' + v.stamina + '</b></div>' +
    '<div class="st-bar"><span>饱腹</span><div class="bar"><div class="bar-fill fill-orange" style="width:' + v.hunger + '%"></div></div><b>' + v.hunger + '</b></div>' +
    '<div class="st-bar"><span>心情</span><div class="bar"><div class="bar-fill fill-pink" style="width:' + v.mood + '%"></div></div><b>' + v.mood + '</b></div></div>';
  g += '<div class="st-attrs">' +
    '<div class="st-attr"><span>💪 力量</span><b>' + sk.str + '</b><i>体力劳动强度</i></div>' +
    '<div class="st-attr"><span>🧠 智力</span><b>' + sk.intel + '</b><i>脑力工作门槛</i></div>' +
    '<div class="st-attr"><span>✨ 魅力</span><b>' + sk.charm + '</b><i>基础+穿戴，社交与部分职业</i></div>' +
    '<div class="st-attr"><span>🍀 运气</span><b>' + sk.luck + '</b><i>赌博/捡漏类玩法</i></div></div>';
  g += '<div class="st-extra">' +
    '<div class="as-row"><span>⭐ 声望</span><b>' + (h.prestige != null ? h.prestige : 0) + '</b></div>' +
    '<div class="as-row"><span>📜 证书</span><b>' + ((h.certificates && h.certificates.length) ? h.certificates.join('、') : '无') + '</b></div>' +
    '<div class="as-row"><span>🏠 住处</span><b>' + (h.housing || '睡大街') + '</b></div>' +
    '<div class="as-row"><span>⏱ 时间</span><b>' + (h.fullTime || '') + '</b></div></div>';
  document.getElementById('status-info').innerHTML = g;
}

/* ---------------- 行为面板（弹窗） ---------------- */
var _actionBtn = null;
function openActionModal(btn) {
  _actionBtn = btn;
  showModalBox(document.getElementById('action-modal'));
  renderActionModal();
}
function closeActionModal() { closeModalWithAnim('action-modal'); }
function renderActionModal() {
  var b = _actionBtn;
  if (!b) return;
  var h = window.__lastHud || {};
  var tip = '';
  if (b.c === 'sleep') tip = '当前住处：' + (h.housing || '睡大街') + ' · 睡觉会推进到第二天清晨';
  else if (b.c.indexOf('work') === 0) {
    tip = h.job ? '当前职业：' + (h.job.icon || '💼') + ' ' + h.job.name + ' · 日薪 ¥' + h.job.daily + ' · 体力 ' + (h.vitals ? h.vitals.stamina : 0) + '%'
         : '还没有工作！先去「人才市场」找份工作再来上班';
  } else if (b.c === 'scrap') tip = '体力 ' + (h.vitals ? h.vitals.stamina : 0) + '% · 捡废品每 30 分钟一次，运气越高越容易捡到好东西';
  else if (b.c === 'donate') tip = '现金 ' + fmtMoney(h.money != null ? h.money : 0) + ' 元 · 每次捐 100 元';
  else if (b.c === 'read') tip = '智力 ' + ((h.skills || {}).intel != null ? h.skills.intel : 0) + ' · 读书消耗 1 小时';
  else if (b.c === 'pray') tip = '运气 ' + ((h.skills || {}).luck != null ? h.skills.luck : 0) + ' · 50 元香火钱';
  else if (b.c === 'meditate') tip = '智力 ' + ((h.skills || {}).intel != null ? h.skills.intel : 0) + ' · 公园打坐 1 小时';
  else if (b.c === 'spa') tip = '80 元一次 · 恢复体力与心情';
  else if (b.c === 'practice') tip = '运气 ' + ((h.skills || {}).luck != null ? h.skills.luck : 0) + ' · 台球厅 1 小时';
  else if (b.c === 'worship') tip = '运气 ' + ((h.skills || {}).luck != null ? h.skills.luck : 0) + ' · 香火钱 30 元';
  else if (b.c === 'ringtoss') tip = '20 元 3 圈 · 套中即赚';
  else if (b.c === 'antique') tip = '50 元一把 · 眼力与运气的对决';
  else if (b.c === 'fortune') tip = '求签 20 元 · 心情与运势的提示';
  else if (b.c === 'news') tip = '现金 ' + fmtMoney(h.money != null ? h.money : 0) + ' 元 · 1 元一份，看完图个乐，还有机会翻出优惠券';
  else if (b.c === 'gig') tip = '打零工 2 小时 · 每天最多 2 次 · 大街发传单 / 百味鸡帮工 / 菜市场理货 / 花店送花';
  else if (b.c === 'bargain') tip = '运气 ' + ((h.skills || {}).luck != null ? h.skills.luck : 0) + ' · 折扣 10%~45% · 买完还能省一笔';
  else if (b.c === 'arrange') tip = '学费 60 元 · 消耗 1 小时 · 每 3 天魅力 +1';
  else if (b.c === 'battle') tip = '下注 20~200 元（默认 50）· 与凤姐一决高下，赢了翻倍拿回';
  else if (b.c === 'network') tip = '消费 200 元 · 声望 +1 · 小概率遇到贵人（下次入职薪资加成）';
  else if (b.c === 'match') tip = '报名费 20 元 · 每天 1 次 · 魅力与运气决定缘分';
  else if (b.c === 'pigeon') tip = '鸽食 2 元 · 开心为主，小心鸽子空袭';
  else if (b.c === 'balloon') tip = '10 元一局 10 发 · 运气越高命中越高 · 全中有彩蛋';
  else if (b.c === 'goldfish') tip = '10 元一网 · 有几率捞到宠物小金鱼（每天心情 +1）';
  document.getElementById('action-tip').innerHTML = tip ? '<span class="at-tip">💡 ' + tip + '</span>' : '';
  document.getElementById('action-grid').innerHTML =
    '<div class="act-card">' +
      '<div class="act-ico">' + (b.i || '🎮') + '</div>' +
      '<div class="act-name">' + b.t.replace(/^[^\u4e00-\u9fa5]+/, '') + '</div>' +
      '<div class="act-desc">' + (b.d || '') + '</div>' +
      '<div class="act-foot"><button class="btn btn-primary" onclick="actionRun()">▶ 执行</button></div>' +
    '</div>';
}
function actionRun() {
  if (!_actionBtn) return;
  var cmd = _actionBtn.c;
  var label = (_actionBtn.t || '').replace(/^[^\u4e00-\u9fa5]+/, '');
  runCmd(cmd);
  if (cmd !== 'sleep' && cmd.indexOf('work') !== 0) {
    toast('▶ 已执行「' + label + '」，结果见终端', 'ok');
  }
  setTimeout(function () {
    renderActionModal();
    if (cmd === 'sleep' || cmd.indexOf('work') === 0) closeActionModal();
  }, 1600);
}

/* ================ 精致动画体系 ================ */
var _modalTop = 100;
function showModalBox(m) {
  if (!m) return;
  m.classList.remove('closing');
  m.style.display = 'flex';
  m.style.zIndex = (++_modalTop);
  showModalLoading(m);
}
function closeModalWithAnim(id) {
  var m = document.getElementById(id);
  if (!m || m.style.display === 'none' || m.classList.contains('closing')) return;
  m.classList.add('closing');
  setTimeout(function () {
    m.style.display = 'none';
    m.classList.remove('closing');
  }, 190);
}
function hideModalEl(el) { closeModalWithAnim(el && el.id); }
function bumpVal(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

/* ================ 购买结果提示 ================ */
function buyResultToast(prop, id, okMsg, failMsg) {
  setTimeout(function () {
    pollState();
    setTimeout(function () {
      var h = window.__lastHud || {};
      var list;
      if (prop === 'inventory') list = (h.inventory || []).map(function (x) { return x.id; });
      else if (prop === 'cars') list = h.cars || [];
      else if (prop === 'estates') list = h.estates || [];
      else if (prop === 'wholesale') list = (h.wholesaleStock || []).map(function (w) { return w.id; });
      else list = [];
      var has = list.indexOf(id) >= 0;
      toast((has ? '✅ ' : '❌ ') + (has ? okMsg : failMsg), has ? 'ok' : 'err');
    }, 1400);
  }, 500);
}

/* ================ 卖车视图（4S店弹窗内 tab） ================ */
function renderCarshopSell(wrap) {
  var h = window.__lastHud || {};
  var owned = h.cars || [];
  var cfg = GAME_CONFIG || {};
  var cars = cfg.cars || [];
  if (!owned.length) {
    wrap.innerHTML = '<div class="stall-empty">🅿️ 车库里空空如也<br><span>先去「买车」提一辆，再来变现</span></div>';
    return;
  }
  var html = owned.map(function (cid) {
    var c = cars.filter(function (x) { return x.id === cid; })[0];
    if (!c) return '';
    var price = Math.round(c.cost * 0.6);
    return '<div class="wholesale-card">' +
      '<div class="ws-icon">' + (carIcons[c.id] || '🚗') + '</div>' +
      '<div class="ws-info">' +
        '<div class="ws-name">' + c.name + '</div>' +
        '<div class="ws-desc">' + (c.desc || '') + '</div>' +
        '<div class="ws-meta">原价 <b>' + fmtMoney(c.cost) + '</b> 元 · 回收价 <b style="color:#ffd76e">' + fmtMoney(price) + '</b> 元 · 声望-' + c.prestige + '</div>' +
      '</div>' +
      '<div class="ws-buy"><button class="ws-go danger" onclick="sellCarById(\'' + c.id + '\',\'' + esc(c.name) + '\')">💰 卖车</button></div>' +
    '</div>';
  }).join('');
  wrap.innerHTML = '<div class="wholesale-tip">🏪 二手车行 · 折价 6 折回收，卖掉后声望会相应降低</div><div class="wholesale-list">' + html + '</div>';
}
function sellCarById(id, name) {
  runCmd('sellcar ' + id);
  setTimeout(function () {
    pollState();
    setTimeout(function () {
      var h = window.__lastHud || {};
      var has = (h.cars || []).indexOf(id) >= 0;
      if (!has) {
        renderCarshopModal();
        toast('✅ 已卖掉 ' + name + '，钱到手了', 'ok');
      } else {
        toast('❌ 卖车失败', 'err');
      }
    }, 1400);
  }, 500);
}

/* ================= 家居布置（弹窗） ================= */
var homeModalOpen = false;
function openHomeModal() {
  homeModalOpen = true;
  showModalBox(document.getElementById('home-modal'));
  if (GAME_CONFIG) renderHomeModal(); else loadGameConfig(function () { renderHomeModal(); });
  // 点击遮罩空白处也可关闭
  var mm = document.getElementById('home-modal');
  if (mm && !mm._hmMaskBound) {
    mm._hmMaskBound = true;
    mm.addEventListener('click', function (e) { if (e.target === mm) closeHomeModal(); });
  }
}
function closeHomeModal() { hideModalEl(document.getElementById('home-modal')); homeModalOpen = false; }
function catIcon(c) {
  return c === 'computer' ? '🖥️' : c === 'tv' ? '📺' : c === 'appliance' ? '🔌' : '🛋️';
}
var HOME_SLOTS = {
  computer: { x: '62%', y: '4%', ico: '🖥️', label: '书桌' },
  tv:       { x: '6%', y: '22%', ico: '📺', label: '电视柜' },
  appliance:{ x: '82%', y: '62%', ico: '🔌', label: '角落' },
  furniture:{ x: '42%', y: '60%', ico: '🛋️', label: '客厅' },
  default:  { x: '36%', y: '36%', ico: '🛋️', label: '' }
};
function homeSlot(id, cat) {
  var key = cat || 'default';
  if (key === 'computer' || key === 'tv' || key === 'appliance' || key === 'furniture') return key;
  if (id.indexOf('pc') === 0) return 'computer';
  if (id.indexOf('tv') === 0) return 'tv';
  return 'default';
}
var HOME_CAT_CN = { computer: '电脑', tv: '电视', appliance: '家电', furniture: '家具', default: '家居' };
function renderHomePreview(owned, all) {
  var pv = '<div class="hm-sec-title">🏠 家居一览</div><div class="hp-strip">';
  // 同类别只展示价格最贵的（避免堆叠）
  var best = {};
  owned.forEach(function (id) {
    var it = null;
    for (var k = 0; k < all.length; k++) if (all[k].id === id) { it = all[k]; break; }
    if (!it) return;
    var cat = it.category || 'default';
    if (!best[cat] || it.cost > best[cat].cost) best[cat] = it;
  });
  var keys = Object.keys(best);
  if (!keys.length) {
    pv += '<div class="hp-empty">房间空荡荡的<br><span class="dim">去下方家居商城添置家电家具吧</span></div>';
  } else {
    keys.forEach(function (cat) {
      var it = best[cat];
      pv += '<div class="hp-card">' +
        '<span class="hpc-ico">' + (it.icon || homeSlotIcon(it.category)) + '</span>' +
        '<b class="hpc-name">' + esc(it.name) + '</b>' +
        '<em class="hpc-brand">' + esc(it.brand || '') + '</em>' +
        '<span class="hpc-cat">' + esc(HOME_CAT_CN[cat] || cat) + '</span>' +
        '<span class="hpc-price">¥' + it.cost + '</span></div>';
    });
  }
  pv += '</div>';
  return pv;
}
function homeSlotIcon(cat) {
  if (cat === 'computer') return '🖥️';
  if (cat === 'tv') return '📺';
  if (cat === 'appliance') return '🔌';
  return '🛋️';
}
function renderHomeModal() {
  var h = window.__lastHud || {};
  var owned = h.homeItems || [];
  var cfg = GAME_CONFIG || {};
  var all = cfg.homeItems || [];
  document.getElementById('home-preview').innerHTML = renderHomePreview(owned, all);
  var o = '<div class="hm-sec-title">🏡 家中已有（' + owned.length + ' 件）</div><div class="hm-owned-grid">';
  if (!owned.length) o += '<div class="dim hm-empty">家里还空荡荡的，挑几件添置吧</div>';
  owned.forEach(function (id) {
    var it = null;
    for (var k = 0; k < all.length; k++) if (all[k].id === id) { it = all[k]; break; }
    if (!it) return;
    o += '<div class="hm-owned-item">' +
      '<span class="hm-oi-ico">' + catIcon(it.category) + '</span>' +
      '<span class="hm-oi-name">' + esc(it.name) + '</span>' +
      '<span class="hm-oi-brand">' + esc(it.brand || '') + '</span>' +
      '<span class="hm-oi-tag">' + (it.unlock && it.unlock.length ? '🔓 ' + it.unlock.length + ' 项功能' : (it.mood ? '心情+' + it.mood : '已布置')) + '</span></div>';
  });
  o += '</div>';
  document.getElementById('home-owned').innerHTML = o;

  var s = '<div class="hm-sec-title">🛍️ 家居商城（选编号购买）</div><div class="hm-shop-list">';
  if (!all.length) s += '<div class="dim">商场正在进货……</div>';
  all.forEach(function (it, i) {
    var bought = owned.indexOf(it.id) >= 0;
    var money = h.money != null ? h.money : 0;
    var can = !bought && money >= it.cost;
    s += '<div class="hm-item' + (bought ? ' bought' : '') + '">' +
      '<span class="hm-ii-ico">' + catIcon(it.category) + '</span>' +
      '<span class="hm-ii-main"><b>' + esc(it.name) + '</b>' +
      '<span class="hm-ii-brand">' + esc(it.brand || '') + '</span>' +
      '<span class="hm-ii-desc">' + esc(it.desc || '') + '</span>' +
      (it.unlock && it.unlock.length ? '<span class="hm-ii-unlock">🔓 ' + esc(it.unlock.join(' / ')) + '</span>' : '') +
      '</span>' +
      '<span class="hm-ii-price">¥' + it.cost + '</span>' +
      (bought
        ? '<span class="hm-ii-state bought">✓ 已购</span>'
        : (can
            ? '<button class="btn btn-mini" onclick="homeBuy(' + (i + 1) + ')">购买</button>'
            : '<button class="btn btn-mini" disabled title="余额不足（还差 ¥' + (it.cost - money) + '）">余额不足</button>')) +
      '</div>';
  });
  s += '</div>';
  document.getElementById('home-shop').innerHTML = s;
}
function homeBuy(i) {
  // 防重由全局点击拦截器统一处理（capture 阶段已置 execBusy + 2s 进度条），
  // 此处不再检查 execBusy，避免自拦截导致点击无反应
  var btn = null;
  document.querySelectorAll('#home-shop button').forEach(function (b) {
    if ((b.getAttribute('onclick') || '').indexOf('homeBuy(' + i + ')') >= 0) btn = b;
  });
  if (btn) {
    btn.textContent = '购买中…';
    btn.disabled = true;
  }
  api('/api/game/command', { input: 'home buy ' + i }).done(function (r) {
    termWrite(r.lines || []);
    if (r.hud) renderHud(r.hud);
    var lines = (r.lines || []).join('\n').replace(/\u001b\[[0-9;]*m/g, '').trim();
    if (/已购入/.test(lines)) {
      toast('✅ 购买成功：' + (lines.split('\n').pop() || '新家具已布置'), 'ok');
    } else {
      var reason = lines.split('\n').pop() || '购买失败';
      toast(reason, 'err');
    }
    renderHomeModal();
  }).fail(function () {
    toast('与服务器通信失败，请重试', 'err');
    renderHomeModal();
  });
}

/* ================= 电脑桌面（Windows 模拟） ================= */
var pcModalOpen = false;
var pcStartOpen = false;
var pcWinSeq = 0;
var PC_APPS = [
  { id: 'sys',      name: '此电脑',      ico: '🖥️', need: 1 },
  { id: 'job',      name: '线上求职',    ico: '💼', need: 1 },
  { id: 'stock',    name: '股票终端',    ico: '📈', need: 1 },
  { id: 'bank',     name: '网上银行',    ico: '🏦', need: 1 },
  { id: 'video',    name: '视频播放器',  ico: '🎬', need: 2 },
  { id: 'game',     name: '游戏平台',    ico: '🎮', need: 2 },
  { id: 'chat',     name: '视频通话',    ico: '📹', need: 2 },
  { id: 'live',     name: '直播助手',    ico: '🔴', need: 3 },
  { id: 'code',     name: '代码编辑器',  ico: '⌨️', need: 3 },
  { id: 'ai',       name: 'AI 创作',     ico: '🎨', need: 3 }
];
var PC_WIN_TMPL = {
  sys:   { w: 380, h: 300, title: '此电脑' },
  job:   { w: 460, h: 420, title: '线上招聘大厅' },
  stock: { w: 460, h: 440, title: '股票终端' },
  bank:  { w: 360, h: 300, title: '网上银行' },
  video: { w: 400, h: 320, title: '视频播放器' },
  game:  { w: 400, h: 330, title: '游戏平台' },
  chat:  { w: 380, h: 300, title: '视频通话' },
  live:  { w: 440, h: 380, title: '直播助手' },
  code:  { w: 440, h: 380, title: '代码编辑器' },
  ai:    { w: 400, h: 340, title: 'AI 创作' }
};
function openPcModal() {
  pcModalOpen = true;
  pcStartOpen = false;
  var m = document.getElementById('pc-modal');
  showModalBox(m);
  loadGameConfig(function () { renderPcDesktop(); });
}
function closePcModal() { hideModalEl(document.getElementById('pc-modal')); pcModalOpen = false; }
function pcToggleStart() {
  pcStartOpen = !pcStartOpen;
  var sm = document.getElementById('pc-start-menu');
  if (!sm) return;
  sm.style.display = pcStartOpen ? 'block' : 'none';
  if (pcStartOpen) renderPcStartMenu();
}
function renderPcDesktop() {
  var h = window.__lastHud || {};
  var pc = h.pc;
  var lvl = pc ? pc.level : 0;
  // 电脑配置/家电未变化 → 不重建桌面图标（时钟单独走轻量文本更新）
  var pcSig = lvl + '|' + (pc ? pc.name : '') + '|' + ((h.homeItems || []).length);
  if (sig('pc', pcSig)) {
    var icons = document.getElementById('pc-icons');
    var g = '<div class="pc-sysnote">' + (pc ? esc(pc.name) : '') + '</div>';
    PC_APPS.forEach(function (a) {
      if (a.need > lvl) return;
      g += '<div class="pc-icon" ondblclick="pcOpen(\'' + a.id + '\')" onclick="pcSelect(this)">' +
        '<span class="pc-ico">' + a.ico + '</span><span class="pc-ico-name">' + a.name + '</span></div>';
    });
    icons.innerHTML = g;
  }
  // 任务栏时钟（轻量文本，不走重建）
  if (h.fullTime) document.getElementById('pc-tray-clock').textContent = h.fullTime.replace('第' + h.day + '天 ', '');
  // 开始菜单
  renderPcStartMenu();
}
function pcSelect(el) {
  document.querySelectorAll('.pc-icon').forEach(function (x) { x.classList.remove('sel'); });
  el.classList.add('sel');
}
function renderPcStartMenu() {
  var h = window.__lastHud || {};
  var lvl = (h.pc && h.pc.level) || 0;
  var sm = document.getElementById('pc-start-menu');
  if (!sm) return;
  if (!sig('pc-menu', lvl + '|' + (h.char ? h.char.name : ''))) return;
  var g = '<div class="pcs-head"><span>🪟 开始</span><small>' + (h.char ? esc(h.char.name) : '') + '</small></div><div class="pcs-list">';
  PC_APPS.forEach(function (a) {
    if (a.need > lvl) return;
    g += '<div class="pcs-item" onclick="pcToggleStart();pcOpen(\'' + a.id + '\')">' + a.ico + ' <span>' + a.name + '</span></div>';
  });
  g += '<div class="pcs-item pcs-power" onclick="closePcModal()">⏻ <span>关机（关闭电脑）</span></div></div>';
  sm.innerHTML = g;
}
/* 打开应用窗口 */
function pcOpen(appId) {
  pcStartOpen = false;
  var sm = document.getElementById('pc-start-menu');
  if (sm) sm.style.display = 'none';
  var tmp = PC_WIN_TMPL[appId] || { w: 400, h: 320, title: appId };
  var box = document.getElementById('pc-windows');
  pcWinSeq++;
  var z = 10 + pcWinSeq;
  var x = 30 + (pcWinSeq % 5) * 26, y = 20 + (pcWinSeq % 4) * 22;
  var w = document.createElement('div');
  w.className = 'pc-win';
  w.style.width = tmp.w + 'px';
  w.style.left = x + 'px';
  w.style.top = y + 'px';
  w.style.zIndex = z;
  w.dataset.app = appId;
  w.innerHTML = '<div class="pc-win-bar" onmousedown="pcDrag(event, this.parentNode)">' +
    '<span class="pc-win-title">' + (PC_APPS.filter(function (a) { return a.id === appId; })[0] || {}).ico + ' ' + tmp.title + '</span>' +
    '<button class="pc-win-close" onclick="pcCloseWin(this)">✕</button></div>' +
    '<div class="pc-win-body" id="pc-body-' + appId + '">' + pcAppBody(appId) + '</div>';
  box.appendChild(w);
  if (appId === 'stock') pcAppStock();
  if (appId === 'chat') pcAppChat();
}
function pcCloseWin(btn) {
  var w = btn.closest('.pc-win');
  if (w) w.remove();
}
function pcDrag(ev, win) {
  var bar = ev.target.closest('.pc-win-bar');
  if (!bar) return;
  var startX = ev.clientX, startY = ev.clientY;
  var ox = win.offsetLeft, oy = win.offsetTop;
  var moved = false;
  function mm(e) {
    moved = true;
    win.style.left = Math.max(0, ox + e.clientX - startX) + 'px';
    win.style.top = Math.max(0, oy + e.clientY - startY) + 'px';
    var all = document.querySelectorAll('.pc-win');
    all.forEach(function (x) { x.style.zIndex = 10 + (++pcWinSeq); });
    win.style.zIndex = 10 + pcWinSeq;
  }
  function mu() {
    document.removeEventListener('mousemove', mm);
    document.removeEventListener('mouseup', mu);
  }
  document.addEventListener('mousemove', mm);
  document.addEventListener('mouseup', mu);
}
function pcAppBody(appId) {
  var h = window.__lastHud || {};
  var pc = h.pc;
  var lvl = pc ? pc.level : 0;
  switch (appId) {
    case 'sys':
      return '<div class="pc-sys">' +
        '<div class="pc-sys-card">' +
        '<div class="pc-sys-row"><span>💻 机型</span><b>' + esc(pc ? pc.name : '未知') + '</b></div>' +
        '<div class="pc-sys-row"><span>🏷️ 品牌</span><b>' + esc(pc ? pc.brand : '-') + '</b></div>' +
        '<div class="pc-sys-row"><span>⚙️ 配置</span><b>' + esc(pc ? pc.desc : '-') + '</b></div>' +
        '<div class="pc-sys-row"><span>🔓 已解锁</span><b>' + ((pc && pc.unlock || []).join(' · ') || '-') + '</b></div>' +
        '</div>' +
        '<div class="pc-sys-tip">低配也能线上求职/炒股/网银；中配解锁刷剧、网游、视频通话；高配解锁直播带货、接单写代码、AI 绘画。</div></div>';
    case 'job': return pcAppJob();
    case 'bank': return pcAppBank(h);
    case 'video': return pcAppVideo(h, lvl);
    case 'game': return pcAppGame(h, lvl);
    case 'live': return pcAppLive(h);
    case 'code': return pcAppCode(h);
    case 'ai': return pcAppAi(h);
    default: return '<div class="dim pc-tip">应用加载中……</div>';
  }
}
function pcAppJob() {
  var h = window.__lastHud || {};
  var jobs = (GAME_CONFIG && GAME_CONFIG.jobs) || [];
  var g = '<div class="pc-app-head">💼 线上招聘大厅<span class="pc-app-sub">条件与人才市场一致，可远程入职</span></div>';
  if (h.job) g += '<div class="pc-job-cur">当前职业：' + esc(h.job.name) + (h.job.type === 'special' ? ' ★' : '') + '（先辞职才能换）</div>';
  g += '<div class="pc-job-list">';
  jobs.forEach(function (j, i) {
    var reqs = (j.reqs || []).join('、');
    var ok = j.satisfied;
    g += '<div class="pc-job-item">' +
      '<span class="pji-ico">' + (j.icon || '💼') + '</span>' +
      '<span class="pji-main"><b>' + esc(j.name) + '</b><span class="pji-desc">' + esc(reqs) + '</span>' +
      '<span class="pji-daily">日薪 ' + j.daily + ' 元' + (j.miss ? ' · <span class="miss">' + esc(j.miss) + '</span>' : '') + '</span></span>' +
      (ok && !h.job
        ? '<button class="btn btn-mini" onclick="pcJobApply(' + (i + 1) + ')">投递</button>'
        : '<span class="pji-state">' + (h.job ? '在职' : (j.miss || '不满足')) + '</span>') +
      '</div>';
  });
  g += '</div>';
  return g;
}
function pcAppBank(h) {
  var money = h.money != null ? h.money : 0;
  var dep = h.deposit != null ? h.deposit : 0;
  return '<div class="pc-app-head">🏦 网上银行<span class="pc-app-sub">E-BANK · 日息 0.05%</span></div>' +
    '<div class="pc-bank-bal"><div><span>现金</span><b>¥' + fmtMoney(money) + '</b></div><div><span>存款</span><b class="gold">¥' + fmtMoney(dep) + '</b></div></div>' +
    '<div class="pc-bank-ops"><input id="pc-bank-amt" type="number" min="1" value="100" placeholder="金额">' +
    '<button class="btn btn-mini" onclick="pcBankOp(\'deposit\')">存入</button>' +
    '<button class="btn btn-mini" onclick="pcBankOp(\'withdraw\')">取出</button></div>' +
    '<div class="pc-app-tip">存款每天 0.05% 利息，钱生钱的第一步。</div>';
}
function pcAppVideo(h, lvl) {
  var v = lvl >= 3 ? '🎬 正在播放：钢铁森林（4K 家庭影院）' : lvl >= 2 ? '🎬 正在播放：都市热播剧 · 第12集' : '📺 雪花屏……';
  return '<div class="pc-app-head">🎬 视频播放器<span class="pc-app-sub">VIDEO PLAYER</span></div>' +
    '<div class="pc-video-screen">' + v + '</div>' +
    '<button class="btn btn-primary pc-app-btn" onclick="pcRun(\'pc video\')">▶ 刷一集（心情+4）</button>' +
    '<div class="pc-app-tip">每日最多 2 次，追剧使人快乐。</div>';
}
function pcAppGame(h, lvl) {
  var gname = lvl >= 3 ? '《艾尔登打工环》' : '《峡谷先锋》';
  return '<div class="pc-app-head">🎮 游戏平台<span class="pc-app-sub">GAME LAUNCHER</span></div>' +
    '<div class="pc-game-art">' + gname + '<span>点击「开一局」进入对局</span></div>' +
    '<button class="btn btn-primary pc-app-btn" onclick="pcRun(\'pc game\')">🎮 开一局（心情+6，有惊喜）</button>' +
    '<div class="pc-app-tip">每日最多 2 局，25% 概率爆出稀有道具换钱。</div>';
}
function pcAppLive(h) {
  return '<div class="pc-app-head">🔴 直播助手<span class="pc-app-sub">LIVE STUDIO · 高配专属</span></div>' +
    '<div class="pc-live-stage"><div class="pc-live-cam">🎤 你</div><div class="pc-live-chat"><p>观众：主播好帅！</p><p>观众：上链接！</p><p>观众：😍😍😍</p></div></div>' +
    '<button class="btn btn-primary pc-app-btn" onclick="pcRun(\'pc live\')">🔴 开播 2 小时（按魅力声望赚钱）</button>' +
    '<div class="pc-app-tip">每日 1 次 · 体力 -10 · 魅力越高带货越猛。</div>';
}
function pcAppCode(h) {
  return '<div class="pc-app-head">⌨️ 代码编辑器<span class="pc-app-sub">VS CODE · 高配专属</span></div>' +
    '<div class="pc-code-screen"><pre><span class="c-k">public</span> <span class="c-k">class</span> <span class="c-n">打工人</span> {<br>  <span class="c-k">public</span> <span class="c-t">void</span> <span class="c-f">main</span>() {<br>    System.<span class="c-f">out</span>.println(<span class="c-s">"打工使我快乐"</span>);<br>  }<br>}</pre></div>' +
    '<button class="btn btn-primary pc-app-btn" onclick="pcRun(\'pc code\')">💰 接一单外包（按智力赚钱）</button>' +
    '<div class="pc-app-tip">每日 2 单 · 体力 -8 · 智力越高报价越高。</div>';
}
function pcAppAi(h) {
  return '<div class="pc-app-head">🎨 AI 创作<span class="pc-app-sub">AI STUDIO · 高配专属</span></div>' +
    '<div class="pc-ai-canvas">🌆 赛博打工人的黄昏<span class="pc-ai-gen">生成中……</span></div>' +
    '<button class="btn btn-primary pc-app-btn" onclick="pcRun(\'pc ai\')">🖌️ 生成一幅（心情+5，看运气卖图）</button>' +
    '<div class="pc-app-tip">每日 1 次 · 运气越高越容易卖出好价钱。</div>';
}
function pcRun(cmd) {
  runCmd(cmd);
  setTimeout(renderPcOpenWindows, 1100);
}

function pcJobApply(idx) {
  if (window.__signLock) { toast('正在投递简历，请稍候', 'err'); return; }
  window.__signLock = true;
  toast('正在线上面试…');
  $.ajax({
    url: '/api/game/command', method: 'POST', contentType: 'application/json',
    data: JSON.stringify({ input: 'pc job ' + idx }),
    success: function (r) {
      window.__signLock = false;
      termWrite((r.lines || []));
      if (r.hud) renderHud(r.hud);
      if (stripAnsi((r.lines || []).join('\n')).indexOf('线上面试通过') >= 0) {
        toast('🎉 线上面试通过，入职成功！', 'ok');
      } else {
        toast('✘ 投递失败：' + jobFailMsg(r.lines), 'err');
      }
      setTimeout(renderPcOpenWindows, 700);
    },
    error: function () { window.__signLock = false; toast('网络错误，请重试', 'err'); }
  });
}
/* 刷新已打开窗口内的动态数据（股票/银行等） */
function renderPcOpenWindows() {
  var wins = document.querySelectorAll('.pc-win');
  wins.forEach(function (w) {
    var app = w.dataset.app;
    if (app === 'stock') pcAppStock();
    if (app === 'bank') {
      var h = window.__lastHud || {};
      var body = w.querySelector('.pc-win-body');
      if (body) body.innerHTML = pcAppBank(h);
    }
    if (app === 'job') {
      var b2 = w.querySelector('.pc-win-body');
      if (b2) b2.innerHTML = pcAppJob();
    }
    if (app === 'chat') pcAppChat();
  });
}
function pcBankOp(side) {
  var amt = parseInt(document.getElementById('pc-bank-amt').value, 10);
  if (!amt || amt <= 0) { toast('请输入金额', 'err'); return; }
  pcRun('pc bank ' + side + ' ' + amt);
}
/* 股票终端窗口（行情 + 买卖） */
function pcAppStock() {
  var h = window.__lastHud || {};
  var mk = window.gameMarket;
  var body = document.getElementById('pc-body-stock');
  if (!body) return;
  var g = '<div class="pc-app-head">📈 股票终端<span class="pc-app-sub">PC STOCK · 红涨绿跌</span></div><div class="pc-stock-q">';
  if (!mk || !mk.quotes || !mk.quotes.length) {
    g += '<div class="dim">暂无行情</div>';
  } else {
    mk.quotes.forEach(function (q) {
      var chg = q.chg || 0;
      var cls = chg > 0 ? 'up' : (chg < 0 ? 'down' : 'flat');
      g += '<div class="psq-row"><span>' + (q.icon || '📈') + ' ' + esc(q.name) + '</span>' +
        '<b>' + q.price + '</b><span class="' + cls + '">' + (chg > 0 ? '+' : '') + chg + '%</span></div>';
    });
  }
  g += '</div><div class="pc-stock-ops">' +
    '<input id="pc-stock-code" placeholder="代码 如 WY01"><input id="pc-stock-qty" type="number" min="100" step="100" value="100">' +
    '<button class="btn-trade btn-buy" onclick="pcStockOp(\'buy\')">买</button>' +
    '<button class="btn-trade btn-sell" onclick="pcStockOp(\'sell\')">卖</button></div>' +
    '<div class="pc-app-tip">1 手 = 100 股，本金 ' + fmtMoney(h.money != null ? h.money : 0) + ' 元。</div>';
  body.innerHTML = g;
}
function pcStockOp(side) {
  var code = document.getElementById('pc-stock-code').value.trim();
  var qty = parseInt(document.getElementById('pc-stock-qty').value, 10);
  if (!code || !qty) { toast('输入代码和数量', 'err'); return; }
  pcRun('pc stock ' + side + ' ' + code + ' ' + qty);
}
function pcAppChat() {
  var h = window.__lastHud || {};
  var p = h.partner;
  var body = document.getElementById('pc-body-chat');
  if (!body) return;
  if (!p) { body.innerHTML = '<div class="dim pc-tip">通讯录里还没有联系人……先社交认识一下吧</div>'; return; }
  var g = '<div class="pc-app-head">📹 视频通话<span class="pc-app-sub">与 ' + esc(p.name) + ' 视频</span></div>' +
    '<div class="pc-chat-video"><div class="pc-chat-self">📹 你</div>' +
    '<div class="pc-chat-them">' + (p.gender === 'male' ? '👨' : '👩') + ' ' + esc(p.name) + '</div></div>' +
    '<button class="btn btn-primary pc-app-btn" onclick="pcRun(\'pc chat\')">📞 拨打（好感+3，每日1次）</button>';
  body.innerHTML = g;
}

/* ================= 家庭互动（伴侣） ================= */
var familyModalOpen = false;
var FAMILY_ACTS = [
  { id: 'chat',   t: '💬 聊天',   d: '好感+2 · 心情+2', need: 0, cost: 0 },
  { id: 'flower', t: '💐 送花',   d: '好感+4 · 20元',   need: 0, cost: 20 },
  { id: 'hug',    t: '🤗 拥抱',   d: '好感+3 · 心情+3', need: 1, cost: 0 },
  { id: 'movie',  t: '🎬 看电影', d: '好感+5 · 60元',   need: 1, cost: 60 },
  { id: 'cook',   t: '🍳 做饭',   d: '好感+4 · 饱腹+10', need: 2, cost: 0 },
  { id: 'date',   t: '💞 约会',   d: '好感+6 · 80元',   need: 2, cost: 80 },
  { id: 'wedding',t: '💍 商量婚礼',d: '好感+8（订婚后）',need: 3, cost: 0 },
  { id: 'dinner', t: '🍚 晚餐',   d: '好感+4 · 30元',   need: 4, cost: 30 },
  { id: 'chore',  t: '🧹 家务',   d: '好感+3 · 心情+2', need: 4, cost: 0 },
  { id: 'cuddle', t: '🛋️ 亲昵',  d: '好感+5 · 心情+6', need: 4, cost: 0 },
  { id: 'plan',   t: '🗺️ 规划未来',d: '好感+4 · 心情+3', need: 4, cost: 0 }
];
function openFamilyModal() {
  familyModalOpen = true;
  showModalBox(document.getElementById('family-modal'));
  renderFamilyModal();
}
function closeFamilyModal() { hideModalEl(document.getElementById('family-modal')); familyModalOpen = false; }
function relLevel(rel) {
  if (rel === 'SPOUSE') return 4;
  if (rel === 'FIANCEE') return 3;
  if (rel === 'LOVER') return 2;
  if (rel === 'CRUSH') return 1;
  return 0;
}
function renderFamilyModal() {
  var h = window.__lastHud || {};
  var p = h.partner;
  var box = document.getElementById('family-partner');
  if (!p) {
    if (sig('family-none', '1')) { document.getElementById('family-actions').innerHTML = ''; document.getElementById('family-log').innerHTML = '<div class="dim">还没有伴侣，先社交认识一个吧</div>'; box.innerHTML = ''; }
    return;
  }
  var famSig = p.relation + ':' + p.affection + ':' + p.name + ':' + (p.gender || '') + ':' + (p.profession || '')
    + ':' + (h.money != null ? h.money : 0);
  if (!sig('family', famSig)) return;   // 关系/好感/金钱/状态未变化不重建
  var lvl = relLevel(p.relation);
  var relCn = p.relationCn || { SPOUSE: '❤ 配偶', FIANCEE: '💍 未婚夫妻', LOVER: '💗 恋人', CRUSH: '💘 暧昧', FRIEND: '🤝 朋友' }[p.relation] || p.relation;
  var g = '<div class="fm-partner-card">' +
    '<span class="fm-avatar">' + (p.gender === 'male' ? '👨' : '👩') + '</span>' +
    '<span class="fm-info"><b>' + esc(p.name) + '</b><span>' + relCn + ' · ' + esc(p.profession || '') + '</span>' +
    '<span class="fm-aff"><i>♥</i> 好感度 ' + p.affection + '/100</span></span></div>';
  box.innerHTML = g;
  document.getElementById('family-step').textContent = 'FAMILY · 与 ' + esc(p.name) + ' 在一起';
  var acts = FAMILY_ACTS.filter(function (a) {
    if (a.need > lvl) return false;
    if (a.id === 'wedding' && p.relation !== 'FIANCEE') return false;
    return true;
  });
  var money = h.money != null ? h.money : 0;
  var g2 = '<div class="fm-sec">专属互动（关系层次：' + relCn + '）</div><div class="fm-acts">';
  acts.forEach(function (a) {
    var can = money >= a.cost;
    g2 += '<button class="fm-act" onclick="familyAct(\'' + a.id + '\')" ' + (can ? '' : 'disabled') + '>' +
      '<span class="fm-act-ico">' + a.t.split(' ')[0] + '</span>' +
      '<span class="fm-act-t">' + esc(a.t.split(' ').slice(1).join(' ')) + '</span>' +
      '<span class="fm-act-d">' + esc(a.d) + '</span></button>';
  });
  g2 += '</div>';
  document.getElementById('family-actions').innerHTML = g2;
  if (lvl < 1) document.getElementById('family-log').innerHTML = '<div class="dim fm-tip">多聊天、送花培养感情，好感度 60+ 进入暧昧，85+ 可表白恋爱，再进一步就是结婚。</div>';
}
function familyAct(act) {
  runCmd('family ' + act);
  setTimeout(renderFamilyModal, 1100);
}

/* ================= 工作小游戏（弹窗） ================= */
var workModalOpen = false;
var workGameTimer = null;
var workGameData = null;
function openWorkModal() {
  workModalOpen = true;
  var h = window.__lastHud || {};
  if (!h.job) { toast('你还没工作，先去人才市场找一份', 'err'); return; }
  showModalBox(document.getElementById('work-modal'));
  renderWorkModal();
}
function closeWorkModal() {
  workModalOpen = false;
  if (workGameTimer) { clearInterval(workGameTimer); workGameTimer = null; }
  hideModalEl(document.getElementById('work-modal'));
}
/* ================= 工作小游戏（v2.2 按职业差异化） ================= */
function wgKindFor(jobId) {
  if (!jobId) return 'click';
  var map = {
    flyer: 'serve',            // 发传单：看路人表情递单
    waiter: 'serve', coffee: 'serve', clerk: 'serve',
    reception: 'serve', beautician: 'serve',
    cleaner: 'click', brick: 'click',   // 体力活：狂点
    cashier: 'cash', accountant: 'cash', accountlead: 'cash', cpa: 'cash',  // 收银找零
    courier: 'deliver', rider: 'deliver',  // 快递/外卖：速配
    guard: 'watch',            // 保安：盯监控找茬
    chef: 'cook', chef_senior: 'cook',    // 厨师：按步骤出菜
    electrician: 'tech', welder: 'tech',  // 电工/焊工：专业题
    programmer: 'code', fullstack: 'code', network: 'code', analyst: 'code',  // 程序员/分析师
    sales: 'talk', autosales: 'talk'      // 销售：话术
  };
  return map[jobId] || 'click';
}
function wgTipFor(kind) {
  var t = {
    click: '狂点模式：10 秒内疯狂点击砖块，点得越多工钱越高！',
    serve: '服务模式：顾客来了，看到笑脸点 😊 递单，看到臭脸点 😠 闪人！',
    quiz: '脑力模式：20 秒内答完 5 道速算题，全对拿满勤奖！',
    cash: '收银模式：顾客给钱啦，算对找零才能过！15 秒 8 单。',
    deliver: '配送模式：看包裹单号，选对目的地！15 秒 10 单。',
    watch: '盯梢模式：监控里有一个异常，点出它！15 秒 8 波。',
    cook: '颠勺模式：按 切菜→下锅→调味→装盘 顺序出菜！15 秒 10 道。',
    tech: '专业模式：电工/焊工安全题，答对才合格！20 秒 5 题。',
    code: '代码模式：程序员日常，20 秒 5 道逻辑题！',
    talk: '话术模式：顾客刁难你，选最佳回应！20 秒 5 题。'
  };
  return t[kind] || t.click;
}
function wgIconFor(kind) {
  var i = { click: '🧱 体力活', serve: '🙋 服务业', quiz: '🧠 脑力活',
    cash: '💵 收银台', deliver: '📦 分拣线', watch: '📹 监控室',
    cook: '🍳 后厨', tech: '⚡ 工位', code: '💻 工位', talk: '🗣 接待台' };
  return i[kind] || '🧱';
}
function renderWorkModal() {
  var h = window.__lastHud || {};
  var job = h.job;
  if (!job) { document.getElementById('work-game').innerHTML = '<div class="dim">没有工作……</div>'; return; }
  document.getElementById('work-title').textContent = '💪 上工 · ' + job.name;
  var kind = wgKindFor(job.id || job.name);
  document.getElementById('work-step').textContent = 'WORK · ' + wgTipFor(kind);
  var g = '<div class="wg-kind">' + wgIconFor(kind) + '</div>';
  if (kind === 'click') {
    g += '<div class="wg-click"><div class="wg-click-info"><span id="wg-time">10.0</span> 秒 · <span id="wg-count">0</span> 次</div>' +
      '<button class="wg-brick" onclick="wgClick(event)">🧱<br>搬砖</button>' +
      '<div class="wg-tip">目标 60 次 = 满分</div></div>';
  } else if (kind === 'serve') {
    g += '<div class="wg-serve"><div class="wg-serve-info"><span id="wg-time">10.0</span> 秒 · 第 <span id="wg-q">1</span>/15 题 · 对 <span id="wg-right">0</span> 题</div>' +
      '<div class="wg-customer" id="wg-customer">😊</div>' +
      '<div class="wg-serve-btns"><button class="wg-smile" onclick="wgServe(1)">😊 笑脸</button><button class="wg-angry" onclick="wgServe(0)">😠 生气</button></div></div>';
  } else if (kind === 'cash') {
    g += '<div class="wg-cash"><div class="wg-cash-info"><span id="wg-time">15.0</span> 秒 · 第 <span id="wg-q">1</span>/8 单 · 对 <span id="wg-right">0</span> 单</div>' +
      '<div class="wg-cash-q" id="wg-question"></div>' +
      '<div class="wg-quiz-btns"><button class="btn" onclick="wgQuiz(0)">A</button><button class="btn" onclick="wgQuiz(1)">B</button><button class="btn" onclick="wgQuiz(2)">C</button></div></div>';
  } else if (kind === 'deliver') {
    g += '<div class="wg-deliver"><div class="wg-deliver-info"><span id="wg-time">15.0</span> 秒 · 第 <span id="wg-q">1</span>/10 单</div>' +
      '<div class="wg-deliver-q" id="wg-question"></div>' +
      '<div class="wg-quiz-btns"><button class="btn" onclick="wgQuiz(0)">A</button><button class="btn" onclick="wgQuiz(1)">B</button><button class="btn" onclick="wgQuiz(2)">C</button></div></div>';
  } else if (kind === 'watch') {
    g += '<div class="wg-watch"><div class="wg-watch-info"><span id="wg-time">15.0</span> 秒 · 第 <span id="wg-q">1</span>/8 波</div>' +
      '<div class="wg-watch-grid" id="wg-watch-grid"></div>' +
      '<div class="wg-tip">四块屏幕里有一个异常，点它！</div></div>';
  } else if (kind === 'cook') {
    g += '<div class="wg-cook"><div class="wg-cook-info"><span id="wg-time">15.0</span> 秒 · 第 <span id="wg-q">1</span>/10 道 · 对 <span id="wg-right">0</span> 道</div>' +
      '<div class="wg-cook-q" id="wg-question"></div>' +
      '<div class="wg-cook-btns" id="wg-cook-btns"></div></div>';
  } else {
    g += '<div class="wg-quiz"><div class="wg-quiz-info"><span id="wg-time">20</span> 秒 · 第 <span id="wg-q">1</span>/5 题 · 对 <span id="wg-right">0</span> 题</div>' +
      '<div class="wg-question" id="wg-question"></div>' +
      '<div class="wg-quiz-btns"><button class="btn" onclick="wgQuiz(0)">A</button><button class="btn" onclick="wgQuiz(1)">B</button><button class="btn" onclick="wgQuiz(2)">C</button></div></div>';
  }
  document.getElementById('work-game').innerHTML = g;
  workGameData = {
    kind: kind, start: Date.now(), count: 0, right: 0,
    total: kind === 'serve' ? 15 : kind === 'cash' || kind === 'watch' ? 8 : kind === 'deliver' || kind === 'cook' ? 10 : 5,
    q: 0, qright: 0, done: false, cookStep: 0
  };
  if (kind === 'serve') wgNewServe();
  if (kind === 'quiz' || kind === 'cash' || kind === 'deliver' || kind === 'tech' || kind === 'code' || kind === 'talk') wgNewQuiz();
  if (kind === 'watch') wgNewWatch();
  if (kind === 'cook') wgNewCook();
  workGameTimer = setInterval(wgTick, 100);
}
function wgTick() {
  var d = workGameData;
  if (!d || d.done) return;
  var remain = (d.kind === 'quiz' || d.kind === 'tech' || d.kind === 'code' || d.kind === 'talk') ? 20
    : (d.kind === 'cash' || d.kind === 'deliver' || d.kind === 'watch' || d.kind === 'cook') ? 15 : 10;
  var left = remain - (Date.now() - d.start) / 1000;
  var el = document.getElementById('wg-time');
  if (el) el.textContent = Math.max(0, left).toFixed(1);
  if (left <= 0) wgFinish();
}
function wgClick(ev) {
  var d = workGameData;
  if (!d || d.done || d.kind !== 'click') return;
  d.count++;
  document.getElementById('wg-count').textContent = d.count;
  var btn = (ev || window.event).target.closest('.wg-brick');
  if (btn) { btn.classList.add('hit'); setTimeout(function () { btn.classList.remove('hit'); }, 90); }
}
function wgNewServe() {
  var d = workGameData;
  var c = document.getElementById('wg-customer');
  if (!c) return;
  d.answer = Math.random() < 0.5 ? 1 : 0;
  c.textContent = d.answer === 1 ? '😊' : '😠';
  c.classList.add('pop');
  setTimeout(function () { c.classList.remove('pop'); }, 220);
}
function wgServe(ans) {
  var d = workGameData;
  if (!d || d.done || d.kind !== 'serve') return;
  if (ans === d.answer) d.right++;
  d.q++;
  document.getElementById('wg-q').textContent = d.q + 1;
  document.getElementById('wg-right').textContent = d.right;
  if (d.q >= d.total) { wgFinish(); return; }
  wgNewServe();
}
var WG_QUIZ = [
  { q: '8 + 7 = ?', a: ['14', '15', '16'], r: 1 },
  { q: '13 × 2 = ?', a: ['24', '26', '28'], r: 1 },
  { q: '100 ÷ 4 = ?', a: ['20', '25', '30'], r: 1 },
  { q: '9 × 9 = ?', a: ['81', '79', '89'], r: 0 },
  { q: '50 - 17 = ?', a: ['33', '35', '37'], r: 0 },
  { q: '6 × 7 = ?', a: ['40', '42', '44'], r: 1 },
  { q: '72 ÷ 8 = ?', a: ['8', '9', '10'], r: 1 },
  { q: '15 + 27 = ?', a: ['42', '44', '46'], r: 0 },
  { q: '11 × 11 = ?', a: ['111', '121', '131'], r: 1 },
  { q: '84 - 39 = ?', a: ['45', '47', '49'], r: 0 }
];
var WG_CASH = [
  { q: '💰 应付 ¥18，顾客给 ¥20', a: ['找 ¥2', '找 ¥3', '找 ¥1'], r: 0 },
  { q: '💰 应付 ¥46，顾客给 ¥50', a: ['找 ¥6', '找 ¥4', '找 ¥5'], r: 1 },
  { q: '💰 应付 ¥32，顾客给 ¥40', a: ['找 ¥6', '找 ¥10', '找 ¥8'], r: 2 },
  { q: '💰 应付 ¥75，顾客给 ¥100', a: ['找 ¥25', '找 ¥35', '找 ¥15'], r: 0 },
  { q: '💰 应付 ¥13，顾客给 ¥20', a: ['找 ¥8', '找 ¥7', '找 ¥9'], r: 1 },
  { q: '💰 应付 ¥58，顾客给 ¥60', a: ['找 ¥2', '找 ¥4', '找 ¥3'], r: 0 },
  { q: '💰 应付 ¥67，顾客给 ¥100', a: ['找 ¥43', '找 ¥33', '找 ¥23'], r: 1 },
  { q: '💰 应付 ¥29，顾客给 ¥50', a: ['找 ¥11', '找 ¥21', '找 ¥31'], r: 0 }
];
var WG_DELIVER = [
  { q: '📦 单号尾 8821 → 门牌 3-502', a: ['3-402', '3-502', '3-602'], r: 1 },
  { q: '📦 单号尾 1034 → 菜市场东门 12 号摊', a: ['东门 12 号', '东门 21 号', '西门 12 号'], r: 0 },
  { q: '📦 单号尾 7745 → 幸福小区 A2 栋', a: ['A1 栋', 'A2 栋', 'A3 栋'], r: 1 },
  { q: '📦 单号尾 2210 → 百货大楼 6 楼柜台', a: ['5 楼', '7 楼', '6 楼'], r: 2 },
  { q: '📦 单号尾 6589 → 江畔花园 8-102', a: ['8-201', '8-102', '7-102'], r: 1 },
  { q: '📦 单号尾 4412 → 老城巷 32 号', a: ['23 号', '31 号', '32 号'], r: 2 },
  { q: '📦 单号尾 9087 → 中央商务区 B 座', a: ['A 座', 'B 座', 'C 座'], r: 1 },
  { q: '📦 单号尾 3360 → 夜市 9 号摊', a: ['9 号摊', '6 号摊', '3 号摊'], r: 0 }
];
var WG_WATCH_ICONS = ['🟦', '🟩', '🟨', '🟪', '🔵', '🟢', '🟡', '🟣'];
function wgNewWatch() {
  var d = workGameData;
  var grid = document.getElementById('wg-watch-grid');
  if (!grid) return;
  var base = WG_WATCH_ICONS[Math.floor(Math.random() * WG_WATCH_ICONS.length)];
  var odd = WG_WATCH_ICONS[Math.floor(Math.random() * WG_WATCH_ICONS.length)];
  var target = Math.floor(Math.random() * 4);
  d.answer = target;
  var html = '';
  for (var i = 0; i < 4; i++) {
    var icon = i === target ? odd : base;
    html += '<div class="wg-watch-cell" onclick="wgWatch(' + i + ')">' + icon + '</div>';
  }
  grid.innerHTML = html;
  document.getElementById('wg-q').textContent = d.q + 1;
}
function wgWatch(idx) {
  var d = workGameData;
  if (!d || d.done || d.kind !== 'watch') return;
  if (idx === d.answer) d.qright++;
  d.q++;
  document.getElementById('wg-right') && (document.getElementById('wg-right').textContent = d.qright);
  if (d.q >= d.total) { wgFinish(); return; }
  wgNewWatch();
}
var WG_COOK_STEPS = ['切菜', '下锅', '调味', '装盘'];
var WG_COOK_TRAPS = ['洗菜', '点火', '颠勺', '摆盘', '焯水', '起锅'];
function wgNewCook() {
  var d = workGameData;
  var q = document.getElementById('wg-question');
  var btns = document.getElementById('wg-cook-btns');
  if (!q || !btns) return;
  var step = WG_COOK_STEPS[d.cookStep];
  var trap = WG_COOK_TRAPS[Math.floor(Math.random() * WG_COOK_TRAPS.length)];
  var opts = [step, trap];
  // 再加一个不同的干扰
  var t2 = WG_COOK_TRAPS[Math.floor(Math.random() * WG_COOK_TRAPS.length)];
  if (t2 === trap) t2 = '备料';
  opts.push(t2);
  // 打乱顺序
  var order = [0, 1, 2].sort(function () { return Math.random() - 0.5; });
  var html = '';
  var r = 0;
  for (var i = 0; i < 3; i++) {
    var oi = order[i];
    var label = opts[oi];
    if (label === step) r = i;
    html += '<button class="wg-cook-btn" onclick="wgCook(' + i + ')">' + label + '</button>';
  }
  q.innerHTML = '🍳 第 <b>' + (d.cookStep + 1) + '</b> 步：<span class="dim">（切菜→下锅→调味→装盘）</span><br>该做什么？';
  d.answer = r;
  btns.innerHTML = html;
  document.getElementById('wg-q').textContent = d.q + 1;
}
function wgCook(idx) {
  var d = workGameData;
  if (!d || d.done || d.kind !== 'cook') return;
  if (idx === d.answer) d.right++;
  d.cookStep++;
  d.q++;
  document.getElementById('wg-right').textContent = d.right;
  if (d.q >= d.total || d.cookStep >= 4) { wgFinish(); return; }
  wgNewCook();
}
var WG_TECH = [
  { q: '⚡ 家用插座电压是多少？', a: ['220V', '110V', '380V'], r: 0 },
  { q: '⚡ 人体安全电流一般低于？', a: ['10mA', '100mA', '1A'], r: 0 },
  { q: '⚡ 焊机工作时必须？', a: ['接地', '悬空', '泡水'], r: 0 },
  { q: '⚡ 电工接线前先？', a: ['断电验电', '直接上手', '摸一下试试'], r: 0 },
  { q: '⚡ 漏电保护器的作用是？', a: ['防雷', '防漏电伤人', '省电'], r: 1 }
];
var WG_CODE = [
  { q: '💻 下面哪个是合法变量名？', a: ['2var', 'var_2', 'var-2'], r: 1 },
  { q: '💻 i++ 等价于？', a: ['i = i + 1', 'i = i - 1', 'i = 1'], r: 0 },
  { q: '💻 数组索引从几开始？', a: ['0', '1', '-1'], r: 0 },
  { q: '💻 HTTP 200 表示？', a: ['请求成功', '页面未找到', '服务器错误'], r: 0 },
  { q: '💻 死循环通常是？', a: ['while(true) 忘退出', '函数递归正确返回', 'for 循环 3 次'], r: 0 }
];
var WG_TALK = [
  { q: '🗣 顾客：「这手机有点贵啊。」', a: ['「一分价钱一分货，旗舰配置值这个价。」', '「那你去别家看看吧。」', '「贵吗？我觉得还好。」'], r: 0 },
  { q: '🗣 顾客：「我能再便宜点吗？」', a: ['「这个价已经到底了，我再送你个赠品。」', '「不行。」', '「你走吧。」'], r: 0 },
  { q: '🗣 顾客：「这款有别的颜色吗？」', a: ['「有的，黑、白、蓝三色都现货。」', '「你自己看吧。」', '「不知道。」'], r: 0 },
  { q: '🗣 顾客：「售后怎么样？」', a: ['「全国联保一年，坏了免费修。」', '「卖出去就不管了。」', '「看运气。」'], r: 0 },
  { q: '🗣 顾客：「我再考虑考虑。」', a: ['「好的，这是我的名片，随时找我，今天订还能送保养。」', '「那你别买了。」', '「哦。」'], r: 0 }
];
function wgPoolFor(kind) {
  if (kind === 'cash') return WG_CASH;
  if (kind === 'deliver') return WG_DELIVER;
  if (kind === 'tech') return WG_TECH;
  if (kind === 'code') return WG_CODE;
  if (kind === 'talk') return WG_TALK;
  return WG_QUIZ;
}
function wgNewQuiz() {
  var d = workGameData;
  var pool = wgPoolFor(d.kind);
  var qi = pool[Math.floor(Math.random() * pool.length)];
  d.qc = qi;
  document.getElementById('wg-q').textContent = d.q + 1;
  document.getElementById('wg-question').textContent = '🧮 ' + qi.q;
  document.querySelectorAll('.wg-quiz-btns .btn').forEach(function (b, i) {
    b.textContent = ['A', 'B', 'C'][i] + '. ' + qi.a[i];
  });
}
function wgQuiz(idx) {
  var d = workGameData;
  if (!d || d.done) return;
  if (d.kind === 'quiz' || d.kind === 'cash' || d.kind === 'deliver' || d.kind === 'tech' || d.kind === 'code' || d.kind === 'talk') {
    if (idx === d.qc.r) d.qright++;
    d.q++;
    document.getElementById('wg-right') && (document.getElementById('wg-right').textContent = d.qright);
    if (d.q >= d.total) { wgFinish(); return; }
    wgNewQuiz();
  }
}
function wgFinish() {
  var d = workGameData;
  if (!d || d.done) return;
  d.done = true;
  if (workGameTimer) { clearInterval(workGameTimer); workGameTimer = null; }
  var score = 0;
  if (d.kind === 'click') score = Math.round(Math.min(100, d.count / 60 * 100));
  if (d.kind === 'serve') score = Math.round(d.right / d.total * 100);
  if (d.kind === 'watch') score = Math.round(d.qright / d.total * 100);
  if (d.kind === 'cook') score = Math.round(d.right / d.total * 100);
  if (d.kind === 'quiz' || d.kind === 'cash' || d.kind === 'deliver' || d.kind === 'tech' || d.kind === 'code' || d.kind === 'talk') {
    score = Math.round(d.qright / d.total * 100);
  }
  var box = document.getElementById('work-game');
  box.innerHTML = '<div class="wg-result">' +
    '<div class="wg-result-num">' + score + '<small>%</small></div>' +
    '<div class="wg-result-txt">' + (score >= 90 ? '🏆 完美收工！' : score >= 70 ? '👍 干得漂亮！' : score >= 50 ? '🙂 中规中矩' : '😅 摸鱼被抓……') + '</div>' +
    '<div class="wg-result-sub">结算中，老板正在数钱……</div></div>';
  $.ajax({ url: '/api/game/work', method: 'POST', contentType: 'application/json', data: JSON.stringify({ score: score }) })
  .done(function (r) {
    if (r.lines && r.lines.length) termWrite(r.lines);
    if (r.hud) renderHud(r.hud);
    setTimeout(function () { if (workModalOpen) { closeWorkModal(); toast('工资已到账，去终端看看', 'ok'); } }, 1400);
  }).fail(function () {
    toast('结算失败，请重试', 'err');
    setTimeout(function () { if (workModalOpen) { closeWorkModal(); } }, 800);
  });
}

/* ================= v2.2 KTV / 私人会所 / 车辆互动 弹窗 ================= */
function openKtvModal() {
  var m = document.getElementById('ktv-modal');
  if (!m) return;
  showModalBox(m);
  renderEntModal('ktv');
}
function closeKtvModal() { hideModalEl(document.getElementById('ktv-modal')); }
function openPvclubModal() {
  var m = document.getElementById('pvclub-modal');
  if (!m) return;
  showModalBox(m);
  renderEntModal('pvclub');
}
function closePvclubModal() { hideModalEl(document.getElementById('pvclub-modal')); }
function renderEntModal(loc) {
  var ents = window._hudEnts || [];
  var list = ents.filter(function (e) { return e.loc === loc; });
  var box = document.getElementById(loc === 'ktv' ? 'ktv-list' : 'pv-list');
  if (!box) return;
  var step = document.getElementById(loc === 'ktv' ? 'ktv-step' : 'pv-step');
  if (step) step.textContent = list.length + ' 位 · 好感 60+ 可私下交流（entchat）';
  if (!list.length) {
    box.innerHTML = '<div class="dim" style="padding:20px">花名册还没传过来，稍等刷新……</div>';
    return;
  }
  var male = list.filter(function (e) { return e.gender === 'male'; });
  var female = list.filter(function (e) { return e.gender === 'female'; });
  var html = '';
  html += renderEntGroup(loc, female, '👩 ' + (loc === 'ktv' ? '公主' : '女技师'));
  html += renderEntGroup(loc, male, '👨 ' + (loc === 'ktv' ? '少爷' : '男技师'));
  box.innerHTML = html;
}
function renderEntGroup(loc, list, title) {
  if (!list.length) return '';
  var h = '<div class="ent-group"><div class="ent-group-title">' + title + '</div>';
  list.forEach(function (e) {
    var aff = e.affection || 0;
    var affCls = aff >= 90 ? 'hi' : aff >= 60 ? 'mid' : 'lo';
    var canChat = aff >= 60;
    var priceUnit = loc === 'ktv' ? '元/小时' : '元/次';
    h += '<div class="ent-card">' +
      '<div class="ent-card-head"><span class="ent-name">' + esc(e.name) + '</span>' +
      '<span class="ent-role">' + esc(e.role) + '</span></div>' +
      '<div class="ent-style">' + esc(e.style) + '</div>' +
      '<div class="ent-meta">' + e.price + priceUnit +
        '<span class="ent-aff"><span class="npc-aff-bar"><span class="npc-aff-fill ' + affCls + '" style="width:' + Math.min(100, aff) + '%"></span></span>' + aff + '</span></div>' +
      '<div class="ent-acts">' +
        (loc === 'ktv'
          ? '<button class="ent-btn" onclick="entAct(\'ktv ' + e.id + ' 1\')">🎤 陪唱1小时</button>' +
            '<button class="ent-btn" onclick="entAct(\'ktv ' + e.id + ' 2\')">🎤 陪唱2小时</button>'
          : '<button class="ent-btn" onclick="entAct(\'pv ' + e.id + '\')">💆 点单</button>') +
        (canChat
          ? '<button class="ent-btn hot" onclick="entAct(\'entchat ' + e.id + '\')">💬 私下交流</button>'
          : '<button class="ent-btn off" disabled title="好感≥60解锁">🔒 好感' + aff + '/60</button>') +
      '</div></div>';
  });
  return h + '</div>';
}
function entAct(cmd) {
  runCmd(cmd);
  setTimeout(function () {
    pollState();
    setTimeout(function () { renderEntModal((cmd.indexOf('ktv') === 0) ? 'ktv' : (cmd.indexOf('pv ') === 0) ? 'pvclub' : currentLocId === 'ktv' ? 'ktv' : 'pvclub'); }, 1200);
  }, 300);
}

/* ---------------- 车辆互动弹窗 ---------------- */
function openCarModal() {
  var m = document.getElementById('car-modal');
  if (!m) return;
  showModalBox(m);
  renderCarModal();
}
function closeCarModal() { hideModalEl(document.getElementById('car-modal')); }
function renderCarModal() {
  var h = window.__lastHud || {};
  var car = window._hudBestCar || h.bestCar;
  var box = document.getElementById('car-body');
  if (!box) return;
  if (!car) {
    box.innerHTML = '<div class="car-empty">🚗 你还没有车<br><span class="dim">去 4S 店（move 4S店）买一台，开启有车生活（buycar）</span></div>';
    return;
  }
  var tierName = car.tier === 2 ? '豪车' : car.tier === 1 ? '代步车' : '小破车';
  var stats = h.carStats || {};
  var html =
    '<div class="car-head"><span class="car-ico">' + (car.tier === 2 ? '🏎️' : '🚗') + '</span>' +
    '<span class="car-name">' + esc(car.name) + '</span><span class="car-tier">' + tierName + '</span></div>' +
    '<div class="car-stats">已兜风 ' + (stats.drive || 0) + ' 次 · 黑车收入 ' + (stats.taxiEarn || 0) + ' 元 · 飙车 ' + (stats.race || 0) + ' 场</div>' +
    '<div class="car-acts">' +
      '<button class="ent-btn" onclick="carAct(\'car drive\')">🚗 兜风散心</button>' +
      '<button class="ent-btn" onclick="carAct(\'car wash\')">💧 洗车</button>' +
      '<button class="ent-btn" onclick="carAct(\'car fuel\')">⛽ 加油</button>' +
      '<button class="ent-btn" onclick="carAct(\'car taxi\')">🚕 黑车拉客</button>' +
      '<button class="ent-btn" onclick="carRideNpc()">🧑‍🤝‍🧑 载熟人兜风</button>' +
      '<button class="ent-btn hot" onclick="carRaceBet()">🏁 深夜飙车</button>' +
    '</div>' +
    '<div class="car-tip">' +
      (car.tier === 2 ? '豪车开出去：心情+15，洗车声望+3，黑车一单 150 起，带人兜风好感+20！' :
       car.tier === 1 ? '代步车：兜风心情+10，黑车一单 80 起，飙车敢玩。' :
       '小电驴：兜风图个乐，黑车拉客会被查（三轮/面包车起才像话）。') +
    '</div>' +
    '<div class="car-sell"><button class="ent-btn danger" onclick="carAct(\'car sell ' + esc(car.id) + '\')">💸 卖掉这辆车（4S店）</button></div>';
  box.innerHTML = html;
}
function carAct(cmd) {
  runCmd(cmd);
  setTimeout(function () {
    pollState();
    setTimeout(renderCarModal, 1200);
  }, 400);
}
function carRideNpc() {
  var npcs = window._hudNpcs || [];
  var ok = npcs.filter(function (n) { return n.affection >= 20; });
  if (!ok.length) { toast('没有好感≥20的熟人，先 social 聊聊', 'err'); return; }
  var n = ok[0];
  carAct('car ride ' + n.id);
}
function carRaceBet() {
  var bet = prompt('押注多少？(≥100 元，当前现金 ' + ((window.__lastHud || {}).money || 0) + ' 元)', '100');
  if (bet === null) return;
  bet = parseInt(bet, 10);
  if (!bet || bet < 100) { toast('押注至少 100 元', 'err'); return; }
  carAct('car race ' + bet);
}

/* ================= v2.6 Three.js 通用城市 3D 动画（昼夜·四季·繁华版） =================
   昼夜交替(天空/灯光/日月星/招牌) + 四季循环(花瓣/落叶/雪/树色/雪地) +
   加宽湿地面铺满视宽 + 24 栋楼群(底商/空调机/楼顶设备/信标) + 霓虹广告牌 +
   三款行人(背包工/打伞/晨跑) + 斜雨 + 光尘 + 云 + 地面反射 + 电影运镜。无边框纯画面。 */
var s3d = {
  renderer: null, scene: null, camera: null, clock: null, raf: 0,
  ready: false, w: 0, h: 0, mouseX: 0, mouseY: 0, camX: 0, camY: 0,
  camAngle: 0, anims: [], envDaylight: 0.5, season: 0
};
function s3dMat(color, opts) {
  return new THREE.MeshLambertMaterial(Object.assign({ color: color }, opts || {}));
}
function s3dBasic(color, opts) {
  return new THREE.MeshBasicMaterial(Object.assign({ color: color }, opts || {}));
}
/* ---------------- 程序化贴图 ---------------- */
function s3dTex(draw, w, h) {
  var cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  var ctx = cv.getContext('2d');
  draw(ctx, w, h);
  var tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return tex;
}
/* ============ 高品质渲染升级：PBR 材质 / 渐变夜空 / 质感地面 ============ */
function s3dStd(color, opts) {
  return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.85, metalness: 0.06 }, opts || {}));
}
/* 渐变夜空背景纹理（深空蓝 -> 紫 -> 地平线微光，自带星点） */
function s3dTexSkyNight() {
  return s3dTex(function (ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#03040a');
    g.addColorStop(0.5, '#070917');
    g.addColorStop(0.8, '#0f0c20');
    g.addColorStop(0.93, '#1d1430');
    g.addColorStop(1, '#2a1c38');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (var i = 0; i < 150; i++) {
      var sx = Math.random() * w, sy = Math.random() * h * 0.72;
      ctx.fillStyle = 'rgba(205,220,255,' + (0.18 + Math.random() * 0.55) + ')';
      ctx.fillRect(sx, sy, 1 + (Math.random() < 0.1 ? 1.6 : 0), 1 + (Math.random() < 0.1 ? 1.6 : 0));
    }
  }, 512, 256);
}
/* 通用噪声 bump（用于不需要专属纹理的表面） */
function s3dNoiseBump() {
  return s3dTex(function (ctx, w, h) {
    for (var i = 0; i < 1600; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + Math.random() * 0.75) + ')';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
    }
  }, 256, 128);
}
/* 地面质感贴图：沥青(默认)/草地/暗夜砖，均附 bumpMap */
function s3dGroundTex(type) {
  var cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  var ctx = cv.getContext('2d');
  var bcv = document.createElement('canvas'); bcv.width = 256; bcv.height = 128;
  var bctx = bcv.getContext('2d');
  if (type === 'grass') {
    ctx.fillStyle = '#12241a'; ctx.fillRect(0, 0, 256, 128);
    for (var gi = 0; gi < 800; gi++) {
      var gx = Math.random() * 256, gy = Math.random() * 128;
      ctx.fillStyle = 'rgba(80,150,100,' + (0.15 + Math.random() * 0.3) + ')';
      ctx.fillRect(gx, gy, 1.4, 2.2);
      bctx.fillStyle = 'rgba(190,220,200,1)';
      bctx.fillRect(gx, gy, 1, 2);
    }
  } else if (type === 'dark') {
    ctx.fillStyle = '#0d0a15'; ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = 'rgba(120,90,160,.16)'; ctx.lineWidth = 1;
    for (var dx = 0; dx <= 256; dx += 32) { ctx.beginPath(); ctx.moveTo(dx, 0); ctx.lineTo(dx, 128); ctx.stroke(); }
    for (var dy = 0; dy <= 128; dy += 32) { ctx.beginPath(); ctx.moveTo(0, dy); ctx.lineTo(256, dy); ctx.stroke(); }
    bctx.fillStyle = 'rgba(150,130,180,1)';
    for (var d2 = 0; d2 < 500; d2++) bctx.fillRect(Math.random() * 256, Math.random() * 128, 1, 1);
  } else {
    ctx.fillStyle = '#171c23'; ctx.fillRect(0, 0, 256, 128);
    for (var pi = 0; pi < 1100; pi++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,' + (0.02 + Math.random() * 0.035) + ')' : 'rgba(0,0,0,' + (0.04 + Math.random() * 0.09) + ')';
      ctx.fillRect(Math.random() * 256, Math.random() * 128, 1.3, 1.3);
      bctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.9)' : 'rgba(0,0,0,.9)';
      bctx.fillRect(Math.random() * 256, Math.random() * 128, 1, 1);
    }
    ctx.strokeStyle = 'rgba(70,80,94,.5)'; ctx.lineWidth = 1.4;
    for (var sy2 = 22; sy2 < 128; sy2 += 44) { ctx.beginPath(); ctx.moveTo(0, sy2); ctx.lineTo(256, sy2); ctx.stroke(); }
    bctx.strokeStyle = 'rgba(210,210,210,.8)'; bctx.lineWidth = 1.5;
    for (var sy3 = 22; sy3 < 128; sy3 += 44) { ctx.beginPath(); bctx.moveTo(0, sy3); bctx.lineTo(256, sy3); bctx.stroke(); }
    var gr = ctx.createRadialGradient(128, 78, 10, 128, 80, 150);
    gr.addColorStop(0, 'rgba(255,196,120,.3)'); gr.addColorStop(0.6, 'rgba(255,170,90,.08)'); gr.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 256, 128);
  }
  var tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
  tex.bump = new THREE.CanvasTexture(bcv);
  return tex;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
/* 建筑窗户贴图 v2：窗框 + 窗帘(暖/蓝) + 亮窗 + 窗台 + 底层商铺 */
function s3dTexWindows(cols, rows, litChance) {
  return s3dTex(function (ctx, w, h) {
    ctx.fillStyle = '#0a0f18'; ctx.fillRect(0, 0, w, h);
    var cw = w / cols, ch = h / rows;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = c * cw, y = r * ch;
        // 窗框
        ctx.strokeStyle = 'rgba(96,116,146,.2)';
        ctx.lineWidth = Math.max(1, cw * 0.05);
        ctx.strokeRect(x + cw * 0.05, y + ch * 0.05, cw * 0.9, ch * 0.9);
        // 窗帘底（暖色/蓝色 半透明）
        var cur = Math.random();
        if (cur < 0.3) ctx.fillStyle = 'rgba(110,80,60,.32)';
        else if (cur < 0.5) ctx.fillStyle = 'rgba(60,80,110,.3)';
        else ctx.fillStyle = 'rgba(40,50,70,.34)';
        ctx.fillRect(x + cw * 0.16, y + ch * 0.14, cw * 0.68, ch * 0.72);
        var lit = Math.random() < (litChance || 0.42);
        if (lit) {
          var roll = Math.random();
          if (roll < 0.45) ctx.fillStyle = 'rgba(255,208,120,.9)';
          else if (roll < 0.85) ctx.fillStyle = 'rgba(96,172,255,.85)';
          else ctx.fillStyle = 'rgba(235,245,255,.93)';
          ctx.fillRect(x + cw * 0.22, y + ch * 0.2, cw * 0.56, ch * 0.5);
        } else {
          // 暗窗微反光
          ctx.fillStyle = 'rgba(120,140,175,.12)';
          ctx.fillRect(x + cw * 0.2, y + ch * 0.2, cw * 0.6, ch * 0.14);
        }
        // 窗台
        ctx.fillStyle = 'rgba(150,165,190,.35)';
        ctx.fillRect(x + cw * 0.08, y + ch * 0.9, cw * 0.84, ch * 0.06);
      }
    }
    // 楼层横向分隔线
    ctx.fillStyle = 'rgba(20,28,42,.9)';
    for (var rr = 0; rr < rows; rr++) ctx.fillRect(0, rr * ch + ch * 0.97, w, ch * 0.03);
    // 底层商铺发光带（最底两行，独立亮带）
    for (var c2 = 0; c2 < cols; c2++) {
      var g = ctx.createLinearGradient(0, h - ch * 2, 0, h);
      g.addColorStop(0, 'rgba(70,120,220,.12)');
      g.addColorStop(1, 'rgba(255,190,90,.45)');
      ctx.fillStyle = g;
      ctx.fillRect(c2 * cw + 1, h - ch * 2, cw - 2, ch * 2);
      if (Math.random() < 0.7) {
        ctx.fillStyle = 'rgba(255,245,225,.9)';
        ctx.fillRect(c2 * cw + cw * 0.28, h - ch * 1.45, cw * 0.44, ch * 0.8);
      }
    }
  }, cols * 26, rows * 34);
}
/* 砖墙贴图（细腻砖缝+污渍） */
function s3dTexBrick() {
  return s3dTex(function (ctx, w, h) {
    ctx.fillStyle = '#151d29'; ctx.fillRect(0, 0, w, h);
    var bh = 9;
    for (var y = 0; y < h; y += bh) {
      var off = (y / bh) % 2 === 0 ? 0 : 8;
      for (var x = -8; x < w; x += 16) {
        ctx.fillStyle = Math.random() < 0.5 ? '#1b2432' : '#192231';
        ctx.fillRect(x + off, y, 15, bh - 2);
        if (Math.random() < 0.12) {
          ctx.fillStyle = 'rgba(0,0,0,.18)';
          ctx.fillRect(x + off + 3 + Math.random() * 9, y + 2, 4, 4);
        }
      }
    }
  }, 128, 72);
}
/* 霓虹招牌贴图 */
function s3dTexNeon(text, color, sub) {
  return s3dTex(function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(16,22,34,.75)');
    g.addColorStop(1, 'rgba(10,14,22,.85)');
    ctx.fillStyle = g;
    roundRect(ctx, 4, 4, w - 8, h - 8, 10); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.shadowColor = color; ctx.shadowBlur = 10;
    roundRect(ctx, 4, 4, w - 8, h - 8, 10); ctx.stroke();
    ctx.shadowBlur = 16; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.floor(h * 0.4) + 'px "Menlo", "Monaco", "Courier New", monospace';
    ctx.fillStyle = color; ctx.fillText(text, w / 2, h * 0.45);
    ctx.shadowBlur = 5; ctx.fillStyle = '#ffffff'; ctx.fillText(text, w / 2, h * 0.45);
    if (sub) {
      ctx.font = Math.floor(h * 0.15) + 'px "Menlo", monospace';
      ctx.shadowBlur = 8; ctx.fillStyle = color; ctx.fillText(sub, w / 2, h * 0.8);
    }
  }, 512, 128);
}
/* 小广告牌贴图（亮底+字） */
function s3dTexAd(text, c1, c2) {
  return s3dTex(function (ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, c1 || '#3a6ea5'); g.addColorStop(1, c2 || '#2a4d7a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 10;
    ctx.font = 'bold ' + Math.floor(h * 0.42) + 'px "PingFang SC", "Menlo", sans-serif';
    ctx.fillText(text, w / 2, h * 0.54);
  }, 256, 128);
}
/* 径向光晕贴图 */
function s3dTexGlow(inner) {
  return s3dTex(function (ctx, w, h) {
    var g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, inner || 'rgba(255,240,210,1)');
    g.addColorStop(0.22, 'rgba(255,225,170,.5)');
    g.addColorStop(0.55, 'rgba(255,210,140,.14)');
    g.addColorStop(1, 'rgba(255,210,140,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }, 128, 128);
}
/* 城市天际线背景贴图：day=true 日景 / false 夜景 */
function s3dTexSkyline(day) {
  return s3dTex(function (ctx, w, h) {
    if (day) {
      // ---- 日景：淡蓝天 + 云 + 浅色楼剪影 ----
      var dg = ctx.createLinearGradient(0, 0, 0, h);
      dg.addColorStop(0, '#79a3cf'); dg.addColorStop(0.45, '#a7c3e2');
      dg.addColorStop(0.8, '#c7d7e9'); dg.addColorStop(1, '#dde7f1');
      ctx.fillStyle = dg; ctx.fillRect(0, 0, w, h);
      for (var dc = 0; dc < 9; dc++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.32) + ')';
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h * 0.4, 12 + Math.random() * 26, 0, Math.PI * 2);
        ctx.fill();
      }
      var dx = 0;
      while (dx < w) {
        var dbw = 18 + Math.random() * 42;
        var dbh = h * (0.16 + Math.random() * 0.3);
        var dtop = h - dbh;
        // 楼剪影顶部用天空色到楼色的不透明渐变（无硬边且不透出下层）
        var dlg = ctx.createLinearGradient(0, dtop, 0, dtop + dbh * 0.24);
        dlg.addColorStop(0, '#a7c3e2');
        dlg.addColorStop(1, 'rgba(116,134,158,.52)');
        ctx.fillStyle = dlg;
        ctx.fillRect(dx, dtop, dbw, dbh);
        for (var dk = 0; dk < 6; dk++) {
          if (Math.random() < 0.45) {
            ctx.fillStyle = 'rgba(235,242,250,.4)';
            ctx.fillRect(dx + 3 + Math.random() * (dbw - 6), dtop + 4 + Math.random() * (dbh - 8), 2, 3);
          }
        }
        if (Math.random() < 0.35) {
          ctx.fillStyle = 'rgba(104,122,146,.5)';
          ctx.fillRect(dx + dbw / 2 - 1, dtop - 8, 2, 8);
        }
        dx += dbw + 2;
      }
      var dflat = ctx.createLinearGradient(0, h * 0.82, 0, h);
      dflat.addColorStop(0, 'rgba(255,255,255,0)'); dflat.addColorStop(1, 'rgba(255,255,255,.22)');
      ctx.fillStyle = dflat; ctx.fillRect(0, h * 0.82, w, h * 0.18);
      // 四周边缘淡出（防拉伸后露硬边）
      ctx.globalCompositeOperation = 'destination-out';
      var de1 = ctx.createLinearGradient(0, 0, 0, h * 0.05);
      de1.addColorStop(0, 'rgba(0,0,0,1)'); de1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = de1; ctx.fillRect(0, 0, w, h * 0.05);
      var de2 = ctx.createLinearGradient(0, h, 0, h * 0.95);
      de2.addColorStop(0, 'rgba(0,0,0,1)'); de2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = de2; ctx.fillRect(0, h * 0.95, w, h * 0.05);
      var de3 = ctx.createLinearGradient(0, 0, w * 0.04, 0);
      de3.addColorStop(0, 'rgba(0,0,0,1)'); de3.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = de3; ctx.fillRect(0, 0, w * 0.04, h);
      var de4 = ctx.createLinearGradient(w, 0, w * 0.96, 0);
      de4.addColorStop(0, 'rgba(0,0,0,1)'); de4.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = de4; ctx.fillRect(w * 0.96, 0, w * 0.04, h);
      ctx.globalCompositeOperation = 'source-over';
      return;
    }
    // ---- 夜景 ----
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#03050b'); g.addColorStop(0.4, '#081120');
    g.addColorStop(0.75, '#0c1526'); g.addColorStop(1, '#0f1d31');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (var i = 0; i < 140; i++) {
      ctx.fillStyle = 'rgba(215,232,255,' + (0.2 + Math.random() * 0.7) + ')';
      ctx.fillRect(Math.random() * w, Math.random() * h * 0.6, 1.5, 1.5);
    }
    var x = 0;
    while (x < w) {
      var bw = 16 + Math.random() * 40;
      var bh = h * (0.14 + Math.random() * 0.36);
      var top = h - bh;
      // 楼剪影顶部用夜空色到楼色的不透明渐变（无硬边且不透出下层贴图）
      var lg = ctx.createLinearGradient(0, top, 0, top + bh * 0.22);
      lg.addColorStop(0, '#0a1526');
      lg.addColorStop(1, 'rgba(9,15,25,.94)');
      ctx.fillStyle = lg;
      ctx.fillRect(x, top, bw, bh);
      for (var k = 0; k < 6; k++) {
        if (Math.random() < 0.6) {
          ctx.fillStyle = Math.random() < 0.6 ? 'rgba(255,200,120,.4)' : 'rgba(110,180,255,.4)';
          ctx.fillRect(x + 3 + Math.random() * (bw - 6), top + 3 + Math.random() * (bh - 6), 2, 2);
        }
      }
      if (Math.random() < 0.4) {
        ctx.fillStyle = 'rgba(30,40,55,.9)';
        ctx.fillRect(x + bw / 2 - 1, top - 8, 2, 8);
      }
      x += bw + 2;
    }
    var f1 = ctx.createLinearGradient(0, h * 0.8, 0, h);
    f1.addColorStop(0, 'rgba(88,166,255,0)'); f1.addColorStop(1, 'rgba(88,166,255,.13)');
    ctx.fillStyle = f1; ctx.fillRect(0, h * 0.8, w, h * 0.2);
    var f2 = ctx.createLinearGradient(0, h * 0.88, 0, h);
    f2.addColorStop(0, 'rgba(255,95,162,0)'); f2.addColorStop(1, 'rgba(255,95,162,.09)');
    ctx.fillStyle = f2; ctx.fillRect(0, h * 0.88, w, h * 0.12);

  }, 2048, 256);
}
/* 远景楼带贴图：160 世界宽 × 8 高的密集楼群剪影，用于平铺宽屏画面左右两端 */
function s3dTexFarBand(day) {
  return s3dTex(function (ctx, w, h) {
    var W = 160, H = 8;
    var px = w / W, py = h / H;
    var x = 0;
    while (x < W) {
      var bw = 0.9 + Math.random() * 0.9;
      var bh = 1.2 + Math.random() * 2.6;
      var xp = x * px, yp = h - bh * py;
      if (day) {
        var lg = ctx.createLinearGradient(0, yp, 0, h);
        lg.addColorStop(0, '#9db0c9'); lg.addColorStop(1, '#71849f');
        ctx.fillStyle = lg;
      } else {
        var lg2 = ctx.createLinearGradient(0, yp, 0, h);
        lg2.addColorStop(0, '#0d1524'); lg2.addColorStop(1, '#070c15');
        ctx.fillStyle = lg2;
      }
      ctx.fillRect(xp, yp, bw * px, bh * py);
      var rows = Math.max(2, Math.floor(bh * 2.4));
      var cols = Math.max(2, Math.floor(bw * 3.2));
      var cw = bw * px / cols, ch = bh * py / rows;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (Math.random() < (day ? 0.16 : 0.52)) {
            ctx.fillStyle = day ? 'rgba(255,255,255,.28)' : (Math.random() < 0.62 ? 'rgba(255,206,132,.85)' : 'rgba(128,192,255,.85)');
            ctx.fillRect(xp + (c + 0.22) * cw, yp + (r + 0.28) * ch, Math.max(1.4, cw * 0.24), Math.max(1.4, ch * 0.3));
          }
        }
      }
      if (!day && Math.random() < 0.42) {
        ctx.fillStyle = ['rgba(255,80,170,.9)', 'rgba(80,220,255,.9)', 'rgba(255,190,80,.9)'][Math.floor(Math.random() * 3)];
        ctx.fillRect(xp + bw * px * 0.18, yp + bh * py * 0.1, bw * px * 0.64, Math.max(2, bh * py * 0.09));
      }
      x += bw + 0.3 + Math.random() * 0.6;
    }
    // 楼带顶部渐隐（融入天空，无硬边）
    var fade = ctx.createLinearGradient(0, h * 0.8, 0, h);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade; ctx.fillRect(0, h * 0.8, w, h * 0.2);
    ctx.globalCompositeOperation = 'source-over';
  }, 2048, 512);
}
/* 湿路面贴图 v2：细腻柏油颗粒 + 少量斑马线 + 水洼反光，去掉密集横线 */
function s3dTexRoad() {
  return s3dTex(function (ctx, w, h) {
    // 柏油底
    ctx.fillStyle = '#0a0f17'; ctx.fillRect(0, 0, w, h);
    // 细腻颗粒
    for (var n = 0; n < 2600; n++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.028) + ')';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    // 浅色细微裂缝
    for (var c = 0; c < 6; c++) {
      ctx.strokeStyle = 'rgba(60,72,92,.3)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      var sx = Math.random() * w, sy = Math.random() * h;
      ctx.moveTo(sx, sy);
      for (var s2 = 0; s2 < 5; s2++) ctx.lineTo(sx + (Math.random() - 0.5) * 100, sy + (Math.random() - 0.5) * 42);
      ctx.stroke();
    }
    // 人行道（上下路缘）
    ctx.fillStyle = '#171e2b';
    ctx.fillRect(0, 0, w, h * 0.08);
    ctx.fillRect(0, h * 0.92, w, h * 0.08);
    ctx.fillStyle = 'rgba(255,255,255,.11)';
    for (var i = 0; i < 24; i++) {
      ctx.fillRect((i * 37) % w, 0, 15, h * 0.08);
      ctx.fillRect((i * 53 + 11) % w, h * 0.92, 15, h * 0.08);
    }
    // 一条斑马线（中间）
    ctx.fillStyle = 'rgba(225,235,248,.42)';
    for (var b = 0; b < 10; b++) ctx.fillRect(b * 26 + 4, h * 0.44, 12, h * 0.1);
    // 井盖 2 个
    ctx.fillStyle = 'rgba(20,26,38,.95)'; ctx.strokeStyle = 'rgba(120,140,170,.45)'; ctx.lineWidth = 2;
    [h * 0.24, h * 0.72].forEach(function (cy) {
      ctx.beginPath(); ctx.arc(w * 0.5, cy, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    // 水洼反光（椭圆光斑，非线）
    [[0.3, 0.28, 80, 24], [0.68, 0.58, 100, 28], [0.44, 0.8, 66, 20]].forEach(function (p) {
      var pg = ctx.createRadialGradient(p[0] * w, p[1] * h, 0, p[0] * w, p[1] * h, p[2]);
      pg.addColorStop(0, 'rgba(120,175,255,.16)');
      pg.addColorStop(0.6, 'rgba(120,175,255,.05)');
      pg.addColorStop(1, 'rgba(120,175,255,0)');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.ellipse(p[0] * w, p[1] * h, p[2], p[3], 0, 0, Math.PI * 2); ctx.fill();
    });
    // 柔和双色霓虹反射（大渐变色带）
    var rg = ctx.createLinearGradient(0, 0, 0, h);
    rg.addColorStop(0, 'rgba(88,166,255,.1)');
    rg.addColorStop(0.5, 'rgba(255,95,162,.055)');
    rg.addColorStop(1, 'rgba(88,166,255,.12)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
  }, 512, 512);
}
/* 云贴图 */
function s3dTexCloud() {
  return s3dTex(function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < 26; i++) {
      var r = 12 + Math.random() * 28;
      ctx.fillStyle = 'rgba(205,220,240,' + (0.05 + Math.random() * 0.1) + ')';
      ctx.beginPath();
      ctx.arc(w / 2 + (Math.random() - 0.5) * w * 0.5, h / 2 + (Math.random() - 0.5) * h * 0.4, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 256, 128);
}
/* 星空贴图 */
function s3dTexStars() {
  return s3dTex(function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < 110; i++) {
      ctx.fillStyle = 'rgba(220,235,255,' + (0.3 + Math.random() * 0.7) + ')';
      ctx.fillRect(Math.random() * w, Math.random() * h * 0.8, 1.6, 1.6);
      if (Math.random() < 0.3) {
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.fillRect(Math.random() * w, Math.random() * h * 0.8, 2.2, 2.2);
      }
    }
  }, 512, 256);
}
/* ---------------- 场景元素 ---------------- */
/* 远景楼：轻量单箱体 + 密窗贴图，用于铺满宽屏两侧 */
function s3dFarBuilding(x, z, wdt, hgt, dpt) {
  var g = new THREE.Group();
  var winTex = s3dTexWindows(Math.max(3, Math.round(wdt * 3)), Math.max(6, Math.round(hgt * 4)), 0.5);
  var body = new THREE.Mesh(
    new THREE.BoxGeometry(wdt, hgt, dpt),
    [
      new THREE.MeshLambertMaterial({ map: winTex, emissive: 0x16202f, emissiveIntensity: 0.25 }),
      new THREE.MeshLambertMaterial({ map: winTex, emissive: 0x16202f, emissiveIntensity: 0.25 }),
      new THREE.MeshLambertMaterial({ color: 0x0e1420 }),
      new THREE.MeshLambertMaterial({ map: s3dTexBrick() }),
      new THREE.MeshLambertMaterial({ map: winTex, emissive: 0x182334, emissiveIntensity: 0.35 }),
      new THREE.MeshLambertMaterial({ map: s3dTexBrick() })
    ]
  );
  body.position.y = hgt / 2;
  g.add(body);
  g.userData.winMats = [body.material[0], body.material[1], body.material[4]];
  if (Math.random() < 0.5) {
    var fk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.3, 6), s3dMat(0x2a3446));
    fk.position.set(0, hgt + 0.16, 0); g.add(fk);
  }
  g.position.set(x, 0, z);
  return g;
}
/* 店铺招牌贴图（亮底+字，楼下用） */
function s3dTexShop(text) {
  return s3dTex(function (ctx, w, h) {
    var pal = ['#c06a2f', '#2f6fa5', '#8a4fa5', '#2f8f5a', '#a53a4a', '#b58a2f'];
    var col = pal[Math.floor(Math.random() * pal.length)];
    ctx.fillStyle = col; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.floor(h * 0.55) + 'px "PingFang SC", "Menlo", sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8;
    ctx.fillText(text, w / 2, h * 0.55);
  }, 128, 48);
}
/* 楼 v3：侧/正窗 + 砖背 + 女儿墙 + 阳台 + 底商招牌 + 空调 + 楼顶设备 + 信标 */
function s3dBuilding(x, z, wdt, hgt, dpt, opts) {
  var g = new THREE.Group();
  var brick = s3dTexBrick();
  var winTex = s3dTexWindows(Math.max(3, Math.round(wdt * 2.6)), Math.max(5, Math.round(hgt * 3.2)), 0.42);
  var body = new THREE.Mesh(
    new THREE.BoxGeometry(wdt, hgt, dpt),
    [
      new THREE.MeshLambertMaterial({ map: winTex, emissive: 0x16202f, emissiveIntensity: 0.2 }),
      new THREE.MeshLambertMaterial({ map: winTex, emissive: 0x16202f, emissiveIntensity: 0.2 }),
      new THREE.MeshLambertMaterial({ color: 0x0e1420 }),
      new THREE.MeshLambertMaterial({ map: brick }),
      new THREE.MeshLambertMaterial({ map: winTex, emissive: 0x182334, emissiveIntensity: 0.3 }),
      new THREE.MeshLambertMaterial({ map: brick })
    ]
  );
  body.position.y = hgt / 2;
  g.add(body);
  g.userData.winMats = [body.material[0], body.material[1], body.material[4]];
  // 楼顶女儿墙（一圈矮墙）
  var parapet = new THREE.Mesh(new THREE.BoxGeometry(wdt + 0.1, 0.2, dpt + 0.1), s3dMat(0x141c28));
  parapet.position.y = hgt + 0.1;
  g.add(parapet);
  // 阳台（正面挑出小台）
  var balcN = Math.max(2, Math.round(hgt * 1.1));
  for (var bl = 0; bl < balcN; bl++) {
    if (Math.random() < 0.45) continue;
    var bal = new THREE.Mesh(new THREE.BoxGeometry(wdt * 0.72, 0.055, 0.13), s3dMat(0x1e2836));
    bal.position.set((Math.random() - 0.5) * wdt * 0.45, 0.75 + (bl + 0.5) * ((hgt - 1.2) / balcN), dpt / 2 + 0.07);
    g.add(bal);
  }
  // 底商招牌（正面底部）
  if (Math.random() < 0.82) {
    var shopTxt = ['便利店', '奶茶', '药店', '发廊', '烧烤', '洗衣', '五金', '面馆'][Math.floor(Math.random() * 8)];
    var sgn = new THREE.Mesh(new THREE.PlaneGeometry(wdt * 0.92, 0.3),
      new THREE.MeshBasicMaterial({ map: s3dTexShop(shopTxt), transparent: true, depthWrite: false }));
    sgn.position.set(0, 0.42, dpt / 2 + 0.04);
    g.add(sgn);
  }
  // 空调外机（侧面 1-3 个）
  var acn = 1 + Math.floor(Math.random() * 3);
  for (var a = 0; a < acn; a++) {
    var ac = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.2), s3dMat(0x8a949c));
    ac.position.set(-wdt / 2 - 0.11, hgt * (0.2 + a * 0.3), (Math.random() - 0.5) * dpt * 0.6);
    g.add(ac);
  }
  // 楼顶设备（随机）
  if (Math.random() < 0.68) {
    var tank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.36, 8), s3dMat(0x2a3446));
    tank.position.set(wdt * 0.25, hgt + 0.2, 0); g.add(tank);
  }
  if (Math.random() < 0.55) {
    var ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.6, 5), s3dMat(0x3a465a));
    ant.position.set(-wdt * 0.22, hgt + 0.32, 0); g.add(ant);
  }
  if (Math.random() < 0.45) {
    var dish = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 6), s3dMat(0x4a5668));
    dish.position.set(wdt * 0.1, hgt + 0.28, 0); g.add(dish);
  }
  // 信标
  var bcn = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), s3dBasic(0xff5f56, { transparent: true }));
  bcn.position.set(0, hgt + 0.34, 0);
  bcn.userData.phase = Math.random() * 5;
  g.add(bcn);
  g.userData.beacon = bcn;
  // 朝向微转（不呆板）
  if (opts && opts.rot) g.rotation.y = opts.rot;
  g.position.set(x, 0, z);
  return g;
}
/* 中景矮楼（砖面+顶窗行） */
function s3dMidBuilding(x, z, wdt, hgt) {
  var g = new THREE.Group();
  var brick = s3dTexBrick();
  var topTex = s3dTexWindows(Math.max(3, Math.round(wdt * 2.2)), 2, 0.5);
  var body = new THREE.Mesh(
    new THREE.BoxGeometry(wdt, hgt, 1.6),
    [
      new THREE.MeshLambertMaterial({ map: brick }),
      new THREE.MeshLambertMaterial({ map: brick }),
      new THREE.MeshLambertMaterial({ color: 0x0e1420 }),
      new THREE.MeshLambertMaterial({ map: brick }),
      new THREE.MeshLambertMaterial({ map: topTex, emissive: 0x182334, emissiveIntensity: 0.25 }),
      new THREE.MeshLambertMaterial({ map: brick })
    ]
  );
  body.position.y = hgt / 2;
  g.add(body);
  g.userData.winMats = [body.material[4]];
  g.position.set(x, 0, z);
  return g;
}
/* 霓虹招牌（带底框，userData.night 供环境调光） */
function s3dNeonSign(text, color, sub, x, y, z, rotY, scale) {
  var m = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 0.95),
    new THREE.MeshBasicMaterial({ map: s3dTexNeon(text, color, sub), transparent: true, side: THREE.DoubleSide, depthWrite: false })
  );
  m.position.set(x, y, z);
  m.rotation.y = rotY || 0;
  m.scale.set(scale || 1, scale || 1, 1);
  m.userData = { phase: Math.random() * 4, night: 0.5 };
  s3d.scene.add(m);
  return m;
}
/* 小广告牌（挂在楼侧，夜间发光） */
function s3dAdSign(text, c1, c2, x, y, z, ry) {
  var m = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.68),
    new THREE.MeshBasicMaterial({ map: s3dTexAd(text, c1, c2), transparent: true, depthWrite: false })
  );
  m.position.set(x, y, z);
  m.rotation.y = ry || 0;
  m.userData = { night: 0.5 };
  s3d.scene.add(m);
  return m;
}
/* 路灯（光晕呼吸） */
function s3dLamp(x, z) {
  var g = new THREE.Group();
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.7, 6), s3dMat(0x39455a));
  pole.position.y = 0.85; g.add(pole);
  var arm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.06), s3dMat(0x39455a));
  arm.position.set(0.28, 1.7, 0); g.add(arm);
  var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), s3dBasic(0xffe3a0));
  bulb.position.set(0.55, 1.62, 0); g.add(bulb);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: s3dTexGlow('rgba(255,214,140,.95)'), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9
  }));
  glow.scale.set(2.1, 2.1, 1);
  glow.position.set(0.55, 1.62, 0);
  glow.userData.phase = Math.random() * 4;
  g.add(glow);
  g.userData.glow = glow;
  g.position.set(x, 0, z);
  s3d.scene.add(g);
  return g;
}
/* 树（树冠随季节变色/冬季光秃） */
function s3dTree(x, z, s) {
  var g = new THREE.Group();
  var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.9, 6), s3dMat(0x4a3528));
  trunk.position.y = 0.45;
  var crown = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), s3dMat(0x3f8f4f));
  crown.position.y = 1.4;
  g.add(trunk, crown);
  g.scale.setScalar(s || 1);
  g.position.set(x, 0, z);
  g.userData = { crown: crown };
  crown.userData = { baseScale: 1, col: new THREE.Color(0x3f8f4f) };
  s3d.scene.add(g);
  return g;
}
/* 太阳光芒贴图（放射线） */
function s3dTexSunRays() {
  return s3dTex(function (ctx, w, h) {
    // 纯柔和光晕（无放射线）
    var g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,248,228,1)');
    g.addColorStop(0.14, 'rgba(255,240,205,.65)');
    g.addColorStop(0.38, 'rgba(255,230,180,.18)');
    g.addColorStop(1, 'rgba(255,230,180,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }, 256, 256);
}
/* 太阳（本体+光晕+光芒，随昼夜移动） */
function s3dSunSprite() {
  var g = new THREE.Group();
  var core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: s3dTexGlow('rgba(255,247,222,1)'), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9
  }));
  core.scale.set(2.3, 2.3, 1);
  var halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: s3dTexGlow('rgba(255,238,190,.9)'), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55
  }));
  halo.scale.set(5.6, 5.6, 1);
  var rays = new THREE.Sprite(new THREE.SpriteMaterial({
    map: s3dTexSunRays(), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8
  }));
  rays.scale.set(8, 8, 1);
  g.add(core, halo, rays);
  g.position.set(6.4, 5.4, -8.6);
  g.userData.core = core; g.userData.halo = halo; g.userData.rays = rays;
  s3d.scene.add(g);
  return g;
}
/* 月亮（本体+光晕，随昼夜移动） */
function s3dMoonSprite() {
  var g = new THREE.Group();
  var core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: s3dTexGlow('rgba(255,252,240,1)'), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95
  }));
  core.scale.set(1.7, 1.7, 1);
  var halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: s3dTexGlow('rgba(255,233,179,.98)'), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9
  }));
  halo.scale.set(3.8, 3.8, 1);
  g.add(core, halo);
  g.position.set(-7, 4.8, -8);
  g.userData.core = core; g.userData.halo = halo;
  s3d.scene.add(g);
  return g;
}
function s3dStars() {
  var m = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 7),
    new THREE.MeshBasicMaterial({ map: s3dTexStars(), transparent: true, depthWrite: false, opacity: 0.6 })
  );
  m.position.set(0, 5.4, -9.8);
  s3d.scene.add(m);
  return m;
}
function s3dCloud(x, y, z, scale) {
  var m = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 1.8),
    new THREE.MeshBasicMaterial({ map: s3dTexCloud(), transparent: true, depthWrite: false, opacity: 0.75 })
  );
  m.position.set(x, y, z);
  m.scale.set(scale || 1, scale || 1, 1);
  m.userData.speed = 0.1 + Math.random() * 0.1;
  s3d.scene.add(m);
  return m;
}
/* 行人 v3：可配置（外套/发色/背包/伞/前倾/步幅/速度） */
function s3dPerson(opts) {
  var o = opts || {};
  var g = new THREE.Group();
  var coat = s3dMat(o.coat || 0x2f5d8a, { emissive: 0x0d1e2e, emissiveIntensity: 0.25 });
  var skin = s3dMat(0xdfc3a0);
  var pants = s3dMat(o.pants || 0x1d2634);
  var hairC = s3dMat(o.hair || 0x3a2a22);
  var legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.14), pants); legL.position.set(-0.08, 0.24, 0);
  var legR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.14), pants); legR.position.set(0.08, 0.24, 0);
  var body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.5, 8), coat);
  body.position.y = 0.74; body.rotation.z = 0;
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), skin); head.position.y = 1.24;
  var hair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.62), hairC);
  hair.position.y = 1.24; hair.scale.y = 0.8;
  var armL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.4, 0.09), coat); armL.position.set(-0.19, 0.84, 0);
  var armR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.4, 0.09), coat); armR.position.set(0.19, 0.84, 0);
  g.add(legL, legR, body, head, hair, armL, armR);
  if (o.backpack) {
    var bp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.12), s3dMat(0x243347));
    bp.position.set(0, 0.82, -0.2); g.add(bp);
  }
  if (o.umbrella) {
    var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 5), s3dMat(0x222c3a));
    handle.position.set(0.2, 1.36, 0); g.add(handle);
    var umb = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), s3dMat(o.umbColor || 0x3a4a7a));
    umb.scale.y = 0.6; umb.position.set(0.2, 1.62, 0); g.add(umb);
    g.userData.umbrella = umb;
  }
  if (o.tilt) g.rotation.z = o.tilt;
  g.userData.legL = legL; g.userData.legR = legR;
  g.userData.armL = armL; g.userData.armR = armR;
  g.userData.x = o.start || 0;
  g.userData.phase = Math.random() * 5;
  g.userData.speed = o.speed || 0.014;
  g.userData.amp = o.amp || 0.5;
  g.userData.flip = o.flip === true;
  g.userData.name = o.name || 'p';
  s3d.scene.add(g);
  return g;
}
/* 斜雨 */
function s3dRain(count) {
  var geo = new THREE.BufferGeometry();
  var pos = new Float32Array(count * 3);
  for (var i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 1] = Math.random() * 9;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  var m = new THREE.PointsMaterial({
    color: 0x9fc4f0, size: 0.05, transparent: true, opacity: 0.45,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  var p = new THREE.Points(geo, m);
  s3d.scene.add(p);
  return p;
}
/* 光尘 */
function s3dDust(count) {
  var geo = new THREE.BufferGeometry();
  var pos = new Float32Array(count * 3);
  for (var i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = 0.3 + Math.random() * 5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  var m = new THREE.PointsMaterial({
    color: 0xffe3a8, size: 0.07, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  var p = new THREE.Points(geo, m);
  s3d.scene.add(p);
  return p;
}
/* 气候粒子（花瓣/落叶/雪，按季节切换） */
var S3D_CLIMATE = [
  { color: 0xf2a7bb, size: 0.11, vy: -0.014, vx: 0.02, drift: 0.012, visible: true,  name: '花瓣' },
  { color: 0x9fc4f0, size: 0.05, vy: -0.07,  vx: 0.0,   drift: 0.0,   visible: false, name: '夏'   },
  { color: 0xd97a35, size: 0.095, vy: -0.024, vx: 0.018, drift: 0.02,  visible: true,  name: '落叶' },
  { color: 0xe4eeff, size: 0.08,  vy: -0.01,  vx: 0.005, drift: 0.004, visible: true,  name: '雪'   }
];
function s3dClimateParticles(count) {
  var geo = new THREE.BufferGeometry();
  var pos = new Float32Array(count * 3);
  for (var i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 1] = 0.5 + Math.random() * 6.5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 7;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  var m = new THREE.PointsMaterial({
    color: 0xf2a7bb, size: 0.11, transparent: true, opacity: 0.8,
    depthWrite: false
  });
  var p = new THREE.Points(geo, m);
  s3d.scene.add(p);
  return p;
}
/* ---------------- 引擎 ---------------- */
var S3D_C_NIGHT = new THREE.Color(0x04060d);
var S3D_C_DAY = new THREE.Color(0x5a7fa8);
var S3D_TREECOL = [0x5fae63, 0x2f7a45, 0xc96b2f, 0x6a6a70];
function s3dDaylight(ph) {
  if (ph < 0.04 || ph > 0.62) return 0;
  if (ph < 0.16) return (ph - 0.04) / 0.12;
  if (ph < 0.5) return 1;
  if (ph < 0.62) return 1 - (ph - 0.5) / 0.12;
  return 0;
}
function buildCityScene() {
  var scene = s3d.scene;
  // 远景天际线：日景 + 夜景双平面（160 宽 × 24 高，宽屏 aspect 7+ 下视野半宽 ±66 + 相机漂移，完全平铺不露边）
  var skyDay = new THREE.Mesh(new THREE.PlaneGeometry(160, 24), new THREE.MeshBasicMaterial({ map: s3dTexSkyline(true), transparent: true, depthWrite: false, opacity: 0 }));
  skyDay.position.set(0, 5.0, -10.2);
  scene.add(skyDay);
  var skyNight = new THREE.Mesh(new THREE.PlaneGeometry(160, 24), new THREE.MeshBasicMaterial({ map: s3dTexSkyline(false), transparent: true, depthWrite: false, opacity: 0.9 }));
  skyNight.position.set(0, 5.0, -10.2);
  scene.add(skyNight);
  // 远景楼带：2D 楼群剪影平铺画面左右两端（160 宽 × 8 高，z=-9.75 在 3D 楼群之后、天空之前）
  var bandDay = new THREE.Mesh(new THREE.PlaneGeometry(160, 8), new THREE.MeshBasicMaterial({ map: s3dTexFarBand(true), transparent: true, depthWrite: false, opacity: 0 }));
  bandDay.position.set(0, 4.0, -9.75);
  scene.add(bandDay);
  var bandNight = new THREE.Mesh(new THREE.PlaneGeometry(160, 8), new THREE.MeshBasicMaterial({ map: s3dTexFarBand(false), transparent: true, depthWrite: false, opacity: 0.9 }));
  bandNight.position.set(0, 4.0, -9.75);
  scene.add(bandNight);
  // 加宽湿地面（80 宽，覆盖宽屏视野 + 视差，完全不留边）
  var road = new THREE.Mesh(new THREE.PlaneGeometry(80, 14), new THREE.MeshLambertMaterial({ map: s3dTexRoad() }));
  road.rotation.x = -Math.PI / 2;
  scene.add(road);
  // 冬雪覆盖层
  var snowG = new THREE.Mesh(new THREE.PlaneGeometry(80, 14), new THREE.MeshBasicMaterial({ color: 0xe8eef8, transparent: true, opacity: 0, depthWrite: false }));
  snowG.rotation.x = -Math.PI / 2;
  snowG.position.y = 0.02;
  scene.add(snowG);
  // 地面霓虹反射光斑
  var refA = new THREE.Sprite(new THREE.SpriteMaterial({ map: s3dTexGlow('rgba(88,166,255,.5)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
  refA.scale.set(7, 2.2, 1); refA.position.set(-4.5, 0.06, 0.8); refA.userData.phase = 2;
  scene.add(refA);
  var refB = new THREE.Sprite(new THREE.SpriteMaterial({ map: s3dTexGlow('rgba(255,95,162,.42)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.45 }));
  refB.scale.set(6.5, 2, 1); refB.position.set(5, 0.06, -1.2); refB.userData.phase = 4;
  scene.add(refB);
  // 楼群：左右两排各 9 栋（更繁华）
  var heightsL = [4.6, 3.2, 5.4, 2.8, 3.9, 4.2, 3.0, 5.0, 2.6];
  var xsL = [-3.3, -3.7, -4.1, -4.5, -4.9, -5.3, -5.6, -3.45, -4.75];
  var zsL = [-3.0, -0.6, 1.5, 3.2, 4.4, 1.9, -1.2, 5.0, 3.8];
  var heightsR = [3.4, 4.8, 2.9, 5.2, 3.6, 2.7, 4.4, 3.1, 5.0];
  var xsR = [3.3, 3.7, 4.1, 4.5, 4.9, 5.3, 5.6, 3.45, 4.75];
  var zsR = [-2.8, -0.4, 1.7, 3.4, 4.6, 2.1, -1.0, 5.2, 3.6];
  var beacons = [];
  var buildings = [];
  for (var i = 0; i < 9; i++) {
    var bL = s3dBuilding(xsL[i], zsL[i], 2.0 + Math.random() * 0.5, heightsL[i], 1.6);
    scene.add(bL); beacons.push(bL.userData.beacon); buildings.push(bL);
    var bR = s3dBuilding(xsR[i], zsR[i], 2.0 + Math.random() * 0.5, heightsR[i], 1.6);
    scene.add(bR); beacons.push(bR.userData.beacon); buildings.push(bR);
  }
  // 中景矮楼一排（z 深，增加繁华层次）
  var mid = [0, 1.4, 2.8, 4.2, 5.6, 7.2, -1.4, -2.8, -4.2, -5.6, -7.2];
  for (var mi = 0; mi < mid.length; mi++) {
    var mb = s3dMidBuilding(mid[mi] + (Math.random() - 0.5) * 0.3, -6.5, 1.8 + Math.random() * 0.9, 1.9 + Math.random() * 1.0);
    scene.add(mb); buildings.push(mb);
  }
  // 扩展外排楼（±6.4~±9.7，铺满视野中部两侧）
  var xsO = [6.5, 7.1, 7.9, 8.7, 9.4];
  var zsO = [-2.4, -0.2, 1.8, 3.6, 4.7];
  var hsO = [3.6, 2.6, 4.2, 2.2, 3.1];
  for (var oi = 0; oi < 5; oi++) {
    [-1, 1].forEach(function (sg) {
      var bO = s3dBuilding(sg * (xsO[oi] + (Math.random() - 0.5) * 0.2), zsO[oi] + (Math.random() - 0.5) * 0.5, 2.1 + Math.random() * 0.4, hsO[oi], 1.5, { rot: (Math.random() - 0.5) * 0.16 });
      scene.add(bO); beacons.push(bO.userData.beacon); buildings.push(bO);
    });
  }
  // 沿街矮铺（最外沿 ±10.7~±14，填满视野最两侧）
  var xsP = [10.9, 11.7, 12.5, 13.3, 14.1];
  var zsP = [-2.8, -0.6, 1.6, 3.4, 4.8];
  for (var pi = 0; pi < 5; pi++) {
    [-1, 1].forEach(function (sg2) {
      var bP = s3dBuilding(sg2 * (xsP[pi] + (Math.random() - 0.5) * 0.25), zsP[pi] + (Math.random() - 0.5) * 0.6, 2.2 + Math.random() * 0.5, 1.7 + Math.random() * 0.8, 1.4, { rot: (Math.random() - 0.5) * 0.24 });
      scene.add(bP); buildings.push(bP);
      if (Math.random() < 0.65) beacons.push(bP.userData.beacon);
    });
  }
  // 远景楼群（z -8~-9.6、x ±15~±26，铺满宽屏画面两侧）
  var xsF = [15.4, 16.6, 17.9, 19.2, 20.5, 21.8, 23.2, 24.6, 25.8, 16.0, 18.3, 22.5];
  var zsF = [-8.4, -9.0, -8.0, -9.4, -8.6, -9.2, -8.2, -9.5, -8.8, -9.6, -8.3, -9.1];
  var hsF = [2.4, 1.9, 3.0, 2.1, 2.6, 2.0, 2.8, 1.8, 2.2, 2.5, 2.0, 2.3];
  for (var fi = 0; fi < xsF.length; fi++) {
    [-1, 1].forEach(function (sg3) {
      var fb = s3dFarBuilding(sg3 * (xsF[fi] + (Math.random() - 0.5) * 0.3), zsF[fi] + (Math.random() - 0.5) * 0.4, 1.9 + Math.random() * 0.5, hsF[fi], 1.2);
      scene.add(fb); buildings.push(fb);
    });
  }
  // 霓虹招牌
  var neon = [
    s3dNeonSign('打工人模拟器', '#58a6ff', 'WORKER SIM', -3.7, 3.1, 1.2, 0.4, 1),
    s3dNeonSign('宵夜摊 24H', '#ff5fa2', null, 3.7, 2.7, 1.15, -0.35, 0.85),
    s3dNeonSign('城市打工人', '#ffd27a', 'CITY WORKER', 0.4, 3.0, -1.0, 3.14, 0.72),
    s3dNeonSign('好运彩票', '#5dff8f', null, -3.8, 1.9, 1.2, 0.4, 0.6),
    s3dNeonSign('深夜食堂', '#ff9d5c', null, 3.9, 1.9, 1.25, -0.4, 0.6)
  ];
  // 小广告牌（楼侧）
  var ads = [
    s3dAdSign('修', '#3a6ea5', '#2a4d7a', -4.1, 2.2, 1.15, 0.4),
    s3dAdSign('发', '#8a4fa5', '#6a3a80', 4.1, 2.2, 1.15, -0.4),
    s3dAdSign('食', '#c06a2f', '#9a4f1f', -4.5, 1.5, 1.15, 0.4),
    s3dAdSign('酒', '#a53a4a', '#7a2a35', 4.5, 1.5, 1.15, -0.4),
    s3dAdSign('旺', '#2f8f5a', '#1f6a3f', -5.3, 2.4, 1.1, 0.5),
    s3dAdSign('租', '#d9a83a', '#a87f2a', 5.3, 2.4, 1.1, -0.5)
  ];
  // 路灯
  var lamps = [
    s3dLamp(-1.9, 1.6), s3dLamp(2.0, -0.8), s3dLamp(-2.3, -2.9),
    s3dLamp(2.2, 3.2), s3dLamp(0.1, 4.3), s3dLamp(-0.4, -3.7),
    s3dLamp(0.6, -2.2), s3dLamp(-0.9, 3.6)
  ];
  // 太阳/月亮/星空
  var sun = s3dSunSprite();
  var moon = s3dMoonSprite();
  var stars = s3dStars();
  // 树（季节变色）
  var trees = [
    s3dTree(-2.6, 2.6, 1), s3dTree(-1.7, -0.8, 0.85), s3dTree(-3.0, -0.2, 0.9),
    s3dTree(2.6, 1.9, 1), s3dTree(1.7, -1.4, 0.85), s3dTree(3.0, 3.6, 0.95),
    s3dTree(0.2, -3.1, 0.8), s3dTree(-0.5, 4.6, 0.9)
  ];
  // 云
  var c1 = s3dCloud(-3.5, 4.5, -7.0, 1.15);
  var c2 = s3dCloud(3.8, 4.9, -7.8, 0.9);
  var c3 = s3dCloud(0, 5.3, -8.6, 1.35);
  var c4 = s3dCloud(2.2, 4.2, -7.2, 0.7);
  // 行人（三款）
  var worker = s3dPerson({ coat: 0x2f5d8a, pants: 0x1d2634, hair: 0x2a2018, backpack: true, start: -3.2, speed: 0.015, amp: 0.5, name: 'worker' });
  var umb = s3dPerson({ coat: 0x5a3d6b, hair: 0x1a1a22, umbrella: true, umbColor: 0x3a4a7a, start: 3.4, speed: 0.009, amp: 0.42, flip: true, name: 'umb' });
  var runner = s3dPerson({ coat: 0x3f8f4f, pants: 0x222c3a, hair: 0x14141a, backpack: false, start: -1.2, speed: 0.026, amp: 0.85, tilt: 0.16, name: 'runner' });
  // 雨 + 光尘 + 气候粒子
  var rain = s3dRain(340);
  var dust = s3dDust(60);
  var climate = s3dClimateParticles(150);

  /* ---- 灯光（常驻，供环境闭包调强度） ---- */
  s3d.amb = new THREE.AmbientLight(0x3c4a63, 0.6);
  scene.add(s3d.amb);
  s3d.keyL = new THREE.DirectionalLight(0x6f9bff, 0.6);
  s3d.keyL.position.set(3, 7, 6); scene.add(s3d.keyL);
  s3d.fillL = new THREE.DirectionalLight(0xffb454, 0.3);
  s3d.fillL.position.set(-4, 2, -3); scene.add(s3d.fillL);
  s3d.rimL = new THREE.PointLight(0xff5fa2, 0.9, 22);
  s3d.rimL.position.set(0, 1.5, 7); scene.add(s3d.rimL);
  s3d.key2L = new THREE.PointLight(0x58a6ff, 0.55, 20);
  s3d.key2L.position.set(-2, 3, 5); scene.add(s3d.key2L);

  /* ---- 动画（闭包引用） ---- */
  s3d.anims.push(function (t) { // 环境：昼夜 + 四季
    var d = 0; // 固定夜景：常驻霓虹夜晚（去掉白昼）
    s3d.envDaylight = d;
    // 天空/雾（每次新建避免污染常量）
    s3d.cSky = new THREE.Color(0x04060d).lerp(S3D_C_DAY, d);
    s3d.scene.background.copy(s3d.cSky);
    s3d.scene.fog.color.copy(s3d.cSky);
    // 灯光（夜景基础亮度已为 ACES 色调映射补偿）
    s3d.amb.intensity = 0.6;
    s3d.keyL.intensity = 0.42;
    s3d.fillL.intensity = 0.24;
    s3d.rimL.intensity = 1.0;
    s3d.key2L.intensity = 0.6;
    // 霓虹招牌/广告牌（夜间亮）
    for (var i = 0; i < neon.length; i++) neon[i].userData.night = 1 - d;
    for (var j = 0; j < ads.length; j++) ads[j].userData.night = 1 - d;
    // 路灯/月亮/太阳/星空
    for (var k = 0; k < lamps.length; k++) lamps[k].userData.night = 1 - d;
    moon.userData.core.material.opacity = 0.1 + 0.85 * (1 - d);
    moon.userData.halo.material.opacity = 0.1 + 0.8 * (1 - d);
    sun.userData.core.material.opacity = 0;
    sun.userData.halo.material.opacity = 0;
    sun.userData.rays.material.opacity = 0;
    sun.userData.rays.scale.setScalar(1);
    sun.userData.halo.scale.setScalar(1);
    moon.userData.halo.scale.setScalar(3.8 + Math.sin(t * 0.8) * 0.3);
    stars.material.opacity = 0.7 * (1 - d);
    skyDay.material.opacity = 0;
    skyNight.material.opacity = 0.95;
    bandDay.material.opacity = 0;
    bandNight.material.opacity = 0.95;
    // 月亮常驻左上天空（固定夜景，无日月交替）
    moon.position.set(1.8, 5.2, -9.4);
    // 窗户发光随昼夜（白昼熄窗，夜晚亮窗）
    for (var wb = 0; wb < buildings.length; wb++) {
      var wm = buildings[wb].userData.winMats;
      if (wm) {
        var ei = 0.04 + 0.3 * (1 - d);
        for (var wmi = 0; wmi < wm.length; wmi++) wm[wmi].emissiveIntensity = ei;
      }
    }
    // 地面反射（夜间强）
    refA.material.opacity = 0.05 + 0.42 * (1 - d);
    refB.material.opacity = 0.04 + 0.36 * (1 - d);
    // 信标（夜间更亮）
    for (var b = 0; b < beacons.length; b++) {
      beacons[b].material.opacity = 0.3 + 0.7 * (1 - d);
    }
    // 四季（90s/季，全年 360s）
    var season = Math.floor(t / 90) % 4;
    if (season !== s3d.season) {
      s3d.season = season;
      // 气候粒子配置
      var cfg = S3D_CLIMATE[season];
      climate.material.color.setHex(cfg.color);
      climate.material.size = cfg.size;
      climate.material.opacity = cfg.visible ? 0.85 : 0;
      climate.material.visible = cfg.visible;
      // 雪地覆盖
      snowG.material.opacity = season === 3 ? 0.3 : 0;
      // 重置粒子
      var cpos = climate.geometry.attributes.position.array;
      for (var cp = 0; cp < cpos.length / 3; cp++) {
        cpos[cp * 3] = (Math.random() - 0.5) * 30;
        cpos[cp * 3 + 1] = 0.5 + Math.random() * 6.5;
        cpos[cp * 3 + 2] = (Math.random() - 0.5) * 7;
      }
      climate.geometry.attributes.position.needsUpdate = true;
    }
    // 树冠季色（平滑过渡）
    var tc = S3D_TREECOL[season];
    var target = new THREE.Color(tc);
    for (var tr = 0; tr < trees.length; tr++) {
      var crown = trees[tr].userData.crown;
      crown.userData.col.lerp(target, 0.03);
      crown.material.color.copy(crown.userData.col);
      var base = crown.userData.baseScale;
      var want = season === 3 ? 0.28 : 1;
      var cur = crown.scale.x / base;
      var nxt = cur + (want - cur) * 0.02;
      crown.scale.setScalar(base * nxt);
    }
  });
  s3d.anims.push(function (t) { // 信标闪烁
    for (var k = 0; k < beacons.length; k++) {
      var bc = beacons[k];
      bc.material.color.setHex(Math.sin(t * 2.2 + bc.userData.phase) > 0 ? 0xff5f56 : 0x5c1f1f);
    }
  });
  s3d.anims.push(function (t) { // 霓虹招牌呼吸 + 故障（夜间亮）
    for (var k = 0; k < neon.length; k++) {
      var m = neon[k];
      var spd = 2.0 + k * 0.55;
      var base = 0.55 + 0.4 * m.userData.night;
      var breath = base + Math.sin(t * spd + m.userData.phase) * 0.14 * (0.4 + m.userData.night);
      var glitch = Math.sin(t * 7 + k * 2.7) > 0.93 ? 0.15 : 1;
      m.material.opacity = Math.max(0.05, breath * glitch);
      var sc = 1 + Math.sin(t * spd + m.userData.phase) * 0.05;
      m.scale.set(sc, sc, 1);
    }
    for (var a = 0; a < ads.length; a++) {
      ads[a].material.opacity = 0.35 + 0.6 * ads[a].userData.night;
    }
  });
  s3d.anims.push(function (t) { // 路灯晕呼吸（夜间亮）
    for (var k = 0; k < lamps.length; k++) {
      var gl = lamps[k].userData.glow;
      var night = lamps[k].userData.night || 0;
      gl.material.opacity = 0.08 + (0.5 + Math.sin(t * 1.8 + gl.userData.phase) * 0.2) * night + 0.08;
    }
  });
  s3d.anims.push(function (t) { // 气候粒子动画
    var season = s3d.season;
    var cfg = S3D_CLIMATE[season];
    var pos = climate.geometry.attributes.position.array;
    for (var i = 0; i < pos.length / 3; i++) {
      pos[i * 3 + 1] += cfg.vy;
      pos[i * 3] += cfg.vx + Math.sin(t * 1.2 + i) * cfg.drift;
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 6.5 + Math.random() * 0.5;
        pos[i * 3] = (Math.random() - 0.5) * 22;
      }
    }
    climate.geometry.attributes.position.needsUpdate = true;
  });
  s3d.anims.push(function (t) { // 行人走路
    var ppl = [worker, umb, runner];
    for (var p = 0; p < ppl.length; p++) {
      var u = ppl[p].userData;
      var dir = u.flip ? -1 : 1;
      u.x += u.speed * dir;
      if (u.x > 3.4) u.x = -3.4;
      if (u.x < -3.4) u.x = 3.4;
      ppl[p].position.x = u.x;
      var step = Math.sin(t * (5 + u.amp * 3) + u.phase) * u.amp;
      u.legL.rotation.x = step; u.legR.rotation.x = -step;
      u.armL.rotation.x = -step * 0.7; u.armR.rotation.x = step * 0.7;
      ppl[p].position.y = Math.abs(Math.sin(t * (5 + u.amp * 3) + u.phase)) * 0.02;
      ppl[p].scale.x = u.flip ? -1 : 1;
      if (u.umbrella) u.umbrella.rotation.z = Math.sin(t * 4.4 + u.phase) * 0.05;
    }
  });
  s3d.anims.push(function (t) { // 雨
    var pos = rain.geometry.attributes.position.array;
    for (var i = 0; i < pos.length / 3; i++) {
      pos[i * 3 + 1] -= 0.07;
      pos[i * 3] -= 0.012;
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 9;
        pos[i * 3] = (Math.random() - 0.5) * 22;
      }
    }
    rain.geometry.attributes.position.needsUpdate = true;
  });
  s3d.anims.push(function (t) { // 光尘
    var pos = dust.geometry.attributes.position.array;
    for (var i = 0; i < pos.length / 3; i++) {
      pos[i * 3 + 1] += Math.sin(t * 0.6 + i) * 0.004;
      pos[i * 3] += Math.cos(t * 0.4 + i * 1.3) * 0.004;
      if (pos[i * 3 + 1] > 5.3) pos[i * 3 + 1] = 0.3;
      if (pos[i * 3 + 1] < 0.2) pos[i * 3 + 1] = 5;
    }
    dust.geometry.attributes.position.needsUpdate = true;
  });
  s3d.anims.push(function (t) { // 云漂移
    [c1, c2, c3, c4].forEach(function (c) {
      c.position.x += c.userData.speed * 0.004;
      if (c.position.x > 9) c.position.x = -9;
    });
  });
  s3d.anims.push(function (t) { // 地面反射光斑
    refA.material.opacity = (0.3 + Math.sin(t * 1.2 + refA.userData.phase) * 0.2) * (0.25 + 0.75 * (1 - s3d.envDaylight));
    refA.position.x = -4.5 + Math.sin(t * 0.3) * 0.6;
    refB.material.opacity = (0.26 + Math.sin(t * 1.2 + refB.userData.phase) * 0.18) * (0.25 + 0.75 * (1 - s3d.envDaylight));
    refB.position.x = 5 + Math.cos(t * 0.24) * 0.6;
  });
}
function initScene3D() {
  var canvas = document.getElementById('scene3d');
  if (!canvas || !window.THREE) return;
  s3d.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
  s3d.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  // 电影级色彩管线：ACES 色调映射 + SRGB 输出，让夜景灯光/霓虹/月光更有质感
  s3d.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  s3d.renderer.toneMappingExposure = 1.28;
  if (THREE.sRGBEncoding !== undefined) s3d.renderer.outputEncoding = THREE.sRGBEncoding;
  s3d.scene = new THREE.Scene();
  s3d.scene.background = new THREE.Color(0x04060d);
  s3d.scene.fog = new THREE.Fog(0x04060d, 16, 32);
  s3d.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  s3d.camera.position.set(0, 4.6, 11.5);
  s3d.camera.lookAt(0, 1.6, 0);
  buildCityScene();
  s3d.clock = new THREE.Clock();
  s3dResize();
  window.addEventListener('resize', s3dResize);
  window.addEventListener('mousemove', function (e) {
    s3d.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    s3d.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  });
  s3d.ready = true;
  s3d.raf = requestAnimationFrame(s3dAnimate);
}
function s3dResize() {
  if (!s3d.renderer) return;
  var wrap = document.querySelector('.s3d-stage');
  if (!wrap) return;
  var w = wrap.clientWidth, h = wrap.clientHeight;
  if (!w || !h) return;
  if (w !== s3d.w || h !== s3d.h) {
    s3d.w = w; s3d.h = h;
    s3d.renderer.setSize(w, h, false);
    s3d.camera.aspect = w / h;
    s3d.camera.updateProjectionMatrix();
  }
}
function s3dAnimate() {
  s3d.raf = requestAnimationFrame(s3dAnimate);
  if (!s3d.ready) return;
  var dt = Math.min(s3d.clock.getDelta(), 0.05);
  var t = s3d.clock.elapsedTime;
  if (window.__lastHud && window.__lastHud.paused) dt *= 0.15;
  if (document.hidden) return;
  for (var i = 0; i < s3d.anims.length; i++) s3d.anims[i](t, dt);
  // 电影感运镜
  s3d.camAngle += dt * 0.04;
  var ca = s3d.camAngle;
  s3d.camX += ((Math.sin(ca) * 1.5 + s3d.mouseX * 1.0) - s3d.camX) * 0.022;
  s3d.camY += ((Math.sin(ca * 0.6) * 0.35 + Math.cos(t * 0.18) * 0.14 + s3d.mouseY * 0.4) - s3d.camY) * 0.022;
  s3d.camera.position.x = s3d.camX;
  s3d.camera.position.y = 4.6 + s3d.camY;
  s3d.camera.position.z = 11.4 + Math.sin(ca * 0.9) * 0.7;
  s3d.camera.lookAt(Math.sin(ca * 0.5) * 0.25, 1.5 + Math.sin(t * 0.13) * 0.1, 0);
  s3dResize();
  s3d.renderer.render(s3d.scene, s3d.camera);
}

/* ============ 地点专属 3D 场景：进入地点时切换（KTV / 成人大学 / 默认大街） ============ */

/** KTV 霓虹招牌贴图 */
function s3dTexKtvSign() {
  return s3dTex(function (ctx, w, h) {
    ctx.fillStyle = '#120b1e'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ff4fd8'; ctx.lineWidth = 5;
    roundRect(ctx, 4, 4, w - 8, h - 8, 10); ctx.stroke();
    ctx.strokeStyle = '#8a4fff'; ctx.lineWidth = 2;
    roundRect(ctx, 11, 11, w - 22, h - 22, 6); ctx.stroke();
    ctx.font = 'bold ' + Math.floor(h * 0.52) + 'px "Arial Black","PingFang SC",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff4fd8'; ctx.shadowBlur = 22;
    ctx.fillStyle = '#ffb3ec';
    ctx.fillText('KTV', w / 2, h / 2 + 2);
    ctx.shadowBlur = 0;
    for (var i = 0; i < 30; i++) {
      ctx.fillStyle = 'rgba(255,120,230,' + (0.3 + Math.random() * 0.6) + ')';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }, 512, 96);
}

/** KTV 蓝紫螺旋霓虹窗贴图 */
function s3dTexKtvWindow() {
  return s3dTex(function (ctx, w, h) {
    ctx.fillStyle = '#0d0a1a'; ctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    for (var r = 0; r < 7; r++) {
      var rr = (w * 0.42) * (1 - r / 8);
      ctx.strokeStyle = r % 2 === 0 ? 'rgba(122,79,255,.85)' : 'rgba(255,79,216,.85)';
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, rr), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      ctx.beginPath(); ctx.arc(cx + Math.cos(r * 1.1) * rr * 0.5, cy + Math.sin(r * 1.3) * rr * 0.5, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,160,240,.5)';
    ctx.lineWidth = 1.6;
    for (var a = 0; a < 8; a++) {
      var an = a * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(an) * w * 0.42, cy - Math.sin(an) * h * 0.42);
      ctx.lineTo(cx + Math.cos(an) * w * 0.42, cy + Math.sin(an) * h * 0.42);
      ctx.stroke();
    }
  }, 128, 168);
}

/** 成人大学校名牌贴图 */
function s3dTexAduSign() {
  return s3dTex(function (ctx, w, h) {
    ctx.fillStyle = '#d8d2c2'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#6a5a42'; ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.font = 'bold ' + Math.floor(h * 0.5) + 'px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffd98a'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#3a3a3a';
    ctx.fillText('成人大学', w / 2, h / 2 + 1);
    ctx.shadowBlur = 0;
    ctx.font = Math.floor(h * 0.2) + 'px "PingFang SC",sans-serif';
    ctx.fillStyle = '#6a5a42';
    ctx.fillText('ADULT EDUCATION', w / 2, h * 0.8);
  }, 256, 96);
}

/** KTV 赛博霓虹门店场景 */
function buildKtvScene() {
  var scene = s3d.scene;
  scene.background = s3dTexSkyNight();
  scene.fog = new THREE.Fog(0x060412, 10, 26);
  // 灯光：紫粉霓虹氛围（半球光 + 紫粉月光）
  s3d.amb = new THREE.HemisphereLight(0x4a3350, 0x120a18, 0.95); scene.add(s3d.amb);
  s3d.keyL = new THREE.DirectionalLight(0x8a6fff, 0.55); s3d.keyL.position.set(4, 8, 7); scene.add(s3d.keyL);
  var pNeon = new THREE.PointLight(0xff4fd8, 1.0, 9, 1.7); pNeon.position.set(0, 3.5, 2.4); scene.add(pNeon);
  var pSide = new THREE.PointLight(0x7a4fff, 0.5, 8, 1.8); pSide.position.set(-2.8, 1.5, 2.6); scene.add(pSide);

  // 地面：暗色广场砖 + 门前霓虹反光（Standard + bump）
  var kGroundTex = s3dGroundTex('dark');
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(15, 8.5), new THREE.MeshStandardMaterial({
    map: s3dTex(function (ctx, w, h) {
      ctx.drawImage(kGroundTex.image, 0, 0, w, h);
      var grd = ctx.createLinearGradient(0, h * 0.5, 0, h);
      grd.addColorStop(0, 'rgba(255,79,216,0)'); grd.addColorStop(1, 'rgba(255,79,216,.3)');
      ctx.fillStyle = grd; ctx.fillRect(0, h * 0.5, w, h * 0.5);
      var grd2 = ctx.createLinearGradient(w * 0.25, 0, w * 0.75, 0);
      grd2.addColorStop(0, 'rgba(255,79,216,0)'); grd2.addColorStop(0.5, 'rgba(122,79,255,.4)'); grd2.addColorStop(1, 'rgba(255,79,216,0)');
      ctx.fillStyle = grd2; ctx.fillRect(w * 0.25, h * 0.55, w * 0.5, h * 0.35);
    }, 256, 128),
    bumpMap: kGroundTex.bump, bumpScale: 0.7, roughness: 0.72, metalness: 0.08
  }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0; scene.add(ground);

  // 门店主体（深蓝紫，微金属）
  var bld = new THREE.Mesh(new THREE.BoxGeometry(5.4, 3.0, 1.7), s3dStd(0x170f26, { roughness: 0.8, metalness: 0.12 }));
  bld.position.set(0, 1.5, -2.7); scene.add(bld);

  // 正面立面（招牌 + 门 + 霓虹窗 + 竖排灯）
  var signTex = s3dTexKtvSign();
  var winTex = s3dTexKtvWindow();
  var facade = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.0), new THREE.MeshStandardMaterial({ emissive: 0x2a1030, emissiveIntensity: 0.4, roughness: 0.7, metalness: 0.1,
    map: s3dTex(function (ctx, w, h) {
      ctx.fillStyle = '#150d24'; ctx.fillRect(0, 0, w, h);
      // 顶部招牌条
      ctx.fillStyle = '#120b1e'; ctx.fillRect(0, 0, w, h * 0.16);
      // 中央玻璃门（蓝紫渐变）
      var dg = ctx.createLinearGradient(w * 0.38, 0, w * 0.62, 0);
      dg.addColorStop(0, 'rgba(90,60,180,.55)'); dg.addColorStop(1, 'rgba(60,120,220,.5)');
      ctx.fillStyle = dg;
      ctx.fillRect(w * 0.36, h * 0.16, w * 0.28, h * 0.84);
      ctx.strokeStyle = 'rgba(255,120,230,.6)'; ctx.lineWidth = 3;
      ctx.strokeRect(w * 0.36, h * 0.16, w * 0.28, h * 0.84);
      ctx.strokeStyle = 'rgba(255,120,230,.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.16); ctx.lineTo(w * 0.5, h); ctx.stroke();
      // 左右霓虹螺旋窗
      [0.07, 0.79].forEach(function (fx) {
        var sx = w * fx, sw = w * 0.15, sh = h * 0.42, sy = h * 0.3;
        ctx.fillStyle = '#0d0a1a'; ctx.fillRect(sx, sy, sw, sh);
        ctx.strokeStyle = 'rgba(255,79,216,.55)'; ctx.lineWidth = 3;
        ctx.strokeRect(sx, sy, sw, sh);
      });
      // 黄色竖排装饰灯（门两侧）
      [0.3, 0.62].forEach(function (fx) {
        for (var ly = 0; ly < 6; ly++) {
          ctx.fillStyle = ly % 2 === 0 ? 'rgba(255,210,80,.95)' : 'rgba(255,120,60,.4)';
          ctx.fillRect(w * fx, h * (0.24 + ly * 0.1), w * 0.025, h * 0.05);
        }
      });
    }, 540, 300)
  }));
  facade.position.set(0, 1.5, -1.78); scene.add(facade);

  // 3D 招牌板（顶部悬挑）
  var sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.82), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
  sign.position.set(0, 3.1, -1.85); scene.add(sign);
  // 招牌霓虹灯管（3D 发光条）
  var signBar = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.07, 0.07), new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.95 }));
  signBar.position.set(0, 3.14, -1.82); scene.add(signBar);
  var signBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.82, 0.07), new THREE.MeshBasicMaterial({ color: 0x8a4fff, transparent: true, opacity: 0.8 }));
  signBar2.position.set(-2.22, 3.1, -1.82); scene.add(signBar2);
  var signBar3 = signBar2.clone(); signBar3.position.x = 2.22; scene.add(signBar3);

  // 门廊霓虹立柱（左右）
  [-2.3, 2.3].forEach(function (sx) {
    var col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.3, 8), s3dStd(0x241033, { roughness: 0.7, metalness: 0.15 }));
    col.position.set(sx, 1.65, -1.6); scene.add(col);
    [0.5, 1.2, 1.9, 2.6].forEach(function (cy) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.028, 6, 16), s3dBasic(0xff4fd8));
      ring.position.set(sx, cy, -1.6); ring.rotation.x = Math.PI / 2; scene.add(ring);
    });
  });

  // 门口台阶
  for (var i = 0; i < 2; i++) {
    var step = new THREE.Mesh(new THREE.BoxGeometry(2.6 - i * 0.5, 0.14, 0.8), s3dStd(0x1c1228, { roughness: 0.8 }));
    step.position.set(0, 0.07 + i * 0.14, -1.15 + i * 0.4); scene.add(step);
  }

  // 门前射灯（地面灯）
  [-4.2, 4.2].forEach(function (sx) {
    var lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.15, 6), s3dStd(0x1a1426, { roughness: 0.8 }));
    lamp.position.set(sx, 0.58, 0.7); scene.add(lamp);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), s3dBasic(0xffa9ec));
    head.position.set(sx, 1.18, 0.7); scene.add(head);
    var spot = new THREE.PointLight(0xffa9ec, 0.35, 4.5, 1.9);
    spot.position.set(sx, 1.1, 0.7); scene.add(spot);
  });

  // 远楼剪影 + 亮窗
  for (var bx = -8.5; bx <= 8.5; bx += 2.3) {
    var bh = 1.4 + ((bx * 7) % 5) * 0.4;
    var far = new THREE.Mesh(new THREE.BoxGeometry(1.5, bh, 0.7), s3dStd(0x0c0a18, { roughness: 0.95 }));
    far.position.set(bx, bh / 2 - 0.3, -5.8); scene.add(far);
    var fw = new THREE.Mesh(new THREE.PlaneGeometry(1.3, bh * 0.85), new THREE.MeshBasicMaterial({
      map: s3dTexWindows(2, 3, 0.5), transparent: true
    }));
    fw.position.set(bx, bh / 2 - 0.3, -5.4); scene.add(fw);
  }

  // 星空
  var starGeo = new THREE.BufferGeometry();
  var pts = [];
  for (var st = 0; st < 130; st++) pts.push((Math.random() - 0.5) * 30, 4.5 + Math.random() * 5.5, -7 - Math.random() * 9);
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.05, transparent: true, opacity: 0.85 }));
  scene.add(stars);

  // 动画：招牌霓虹呼吸闪烁 + 竖排灯滚动
  s3d.anims.push(function (t) {
    var flick = Math.sin(t * 2.3) > -0.3 ? 1 : 0.35;
    signBar.material.opacity = flick;
    signBar2.material.opacity = Math.sin(t * 1.7 + 1) > 0 ? 0.95 : 0.4;
    signBar3.material.opacity = Math.sin(t * 1.7 + 3) > 0 ? 0.95 : 0.4;
    pNeon.intensity = 1.0 + Math.sin(t * 1.6) * 0.15;
  });
}

/** 成人大学学院夜景场景 */
function buildAduScene() {
  var scene = s3d.scene;
  scene.background = s3dTexSkyNight();
  scene.fog = new THREE.Fog(0x05080f, 12, 28);
  // 灯光：静谧暖黄学院风（半球光 + 暖月光）
  s3d.amb = new THREE.HemisphereLight(0x44557a, 0x151218, 0.9); scene.add(s3d.amb);
  s3d.keyL = new THREE.DirectionalLight(0xbfd4ff, 0.6); s3d.keyL.position.set(4, 9, 7); scene.add(s3d.keyL);
  var warm = new THREE.PointLight(0xffc98a, 0.55, 9, 1.7); warm.position.set(0, 3.4, 2.8); scene.add(warm);

  // 校园广场地面（砖纹 + 暖光）
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(15, 8.5), new THREE.MeshLambertMaterial({
    map: s3dTex(function (ctx, w, h) {
      ctx.fillStyle = '#1a2129'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(90,105,120,.18)'; ctx.lineWidth = 1;
      for (var gx = 0; gx <= w; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
      for (var gy = 0; gy <= h; gy += 32) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
      var grd = ctx.createLinearGradient(0, h * 0.45, 0, h);
      grd.addColorStop(0, 'rgba(255,200,130,0)'); grd.addColorStop(1, 'rgba(255,200,130,.2)');
      ctx.fillStyle = grd; ctx.fillRect(0, h * 0.45, w, h * 0.55);
    }, 256, 128)
  }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0; scene.add(ground);

  // 学院主楼（砖红立面 + 暖光大窗）
  var winTex = s3dTexWindows(8, 5, 0.66);
  var main = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.6, 1.9), [
    new THREE.MeshLambertMaterial({ map: s3dTexBrick(), roughness: .9 }),
    new THREE.MeshLambertMaterial({ map: s3dTexBrick(), roughness: .9 }),
    s3dMat(0x2a3040),
    new THREE.MeshLambertMaterial({ map: s3dTexBrick(), roughness: .9 }),
    new THREE.MeshLambertMaterial({ map: s3dTexBrick(), roughness: .9 }),
    new THREE.MeshLambertMaterial({ map: winTex })
  ]);
  main.position.set(0, 1.8, -3.2); scene.add(main);

  // 正面校名牌匾（楼中央）
  var sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.8), new THREE.MeshBasicMaterial({ map: s3dTexAduSign() }));
  sign.position.set(0, 1.05, -2.14); scene.add(sign);

  // 钟楼塔楼（右上）
  var tower = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 1.3), new THREE.MeshLambertMaterial({ map: s3dTexBrick(), roughness: .9 }));
  tower.position.set(2.6, 4.55, -3.2); scene.add(tower);
  var spire = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.0, 4), s3dMat(0x4a5a6a));
  spire.position.set(2.6, 5.75, -3.2); scene.add(spire);
  var clock = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), s3dBasic(0xf0e8d8));
  clock.position.set(2.6, 4.55, -2.53); scene.add(clock);
  var clockHand = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.02), s3dBasic(0x3a3a3a));
  clockHand.position.set(2.6, 4.56, -2.52); scene.add(clockHand);

  // 铁艺大门（格栅）+ 门柱
  var gate = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.3), new THREE.MeshBasicMaterial({
    map: s3dTex(function (ctx, w, h) {
      ctx.fillStyle = 'rgba(20,24,30,.55)'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(150,160,170,.5)'; ctx.lineWidth = 3;
      for (var gx = 0; gx <= w; gx += 18) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
      for (var gy = 0; gy <= h; gy += 14) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
    }, 220, 65), transparent: true
  }));
  gate.position.set(0, 0.7, 0.35); scene.add(gate);
  [-2.4, 2.4].forEach(function (sx) {
    var post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.5, 0.28), s3dMat(0x5a6068));
    post.position.set(sx, 0.75, 0.35); scene.add(post);
    var ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), s3dBasic(0xd8d0b8));
    ball.position.set(sx, 1.52, 0.35); scene.add(ball);
  });

  // 左侧石质校名牌 + 灯
  var stone = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 0.3), s3dMat(0x8a8278));
  stone.position.set(-3.5, 0.45, 0.55); scene.add(stone);
  var stoneSign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: s3dTexAduSign() }));
  stoneSign.position.set(-3.5, 0.45, 0.7); scene.add(stoneSign);
  var stoneLight = new THREE.PointLight(0xffd98a, 0.4, 3.5, 1.9);
  stoneLight.position.set(-3.5, 1.2, 0.55); scene.add(stoneLight);

  // 岗亭
  var booth = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 1.0), s3dMat(0x6a7684));
  booth.position.set(3.7, 0.6, 0.9); scene.add(booth);
  var boothWin = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: .8 }));
  boothWin.position.set(3.7, 0.75, 1.41); scene.add(boothWin);

  // 校门路灯 2 盏（暖光）
  [-1.7, 1.7].forEach(function (sx) {
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.9, 6), s3dMat(0x3a4248));
    pole.position.set(sx, 0.95, -0.9); scene.add(pole);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), s3dBasic(0xffe0a0));
    head.position.set(sx, 1.98, -0.9); scene.add(head);
    var pl = new THREE.PointLight(0xffc98a, 0.5, 4.5, 1.8);
    pl.position.set(sx, 1.85, -0.9); scene.add(pl);
  });

  // 绿植：门两侧矮树
  [-4.3, 4.3].forEach(function (sx) {
    var tree = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 8), s3dMat(0x2f6e50));
    tree.position.set(sx, 0.75, 0.3); scene.add(tree);
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6), s3dMat(0x5a4632));
    trunk.position.set(sx, 0.2, 0.3); scene.add(trunk);
  });

  // 远楼剪影
  for (var bx = -8.5; bx <= 8.5; bx += 2.2) {
    var bh = 1.3 + ((bx * 5) % 4) * 0.4;
    var far = new THREE.Mesh(new THREE.BoxGeometry(1.6, bh, 0.7), s3dMat(0x0b0f18));
    far.position.set(bx, bh / 2 - 0.3, -6.2); scene.add(far);
    var fw = new THREE.Mesh(new THREE.PlaneGeometry(1.4, bh * 0.85), new THREE.MeshBasicMaterial({
      map: s3dTexWindows(2, 3, 0.4), transparent: true
    }));
    fw.position.set(bx, bh / 2 - 0.3, -5.8); scene.add(fw);
  }

  // 动画：钟摆缓慢摆动 + 灯光轻呼吸（静谧感）
  s3d.anims.push(function (t) {
    clockHand.rotation.z = Math.sin(t * 0.5) * 0.5;
    warm.intensity = 0.55 + Math.sin(t * 0.7) * 0.08;
  });
}

/** 中文霓虹/发光招牌贴图（通用） */
function s3dTexSign(text, color, bg, w, h, sub) {
  return s3dTex(function (ctx, W, H) {
    ctx.fillStyle = bg || '#100a1c'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = color; ctx.lineWidth = 4;
    roundRect(ctx, 4, 4, W - 8, H - 8, 9); ctx.stroke();
    ctx.globalAlpha = .45; ctx.lineWidth = 1.5;
    roundRect(ctx, 10, 10, W - 20, H - 20, 5); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = 'bold ' + Math.floor(H * 0.5) + 'px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = color; ctx.shadowBlur = 16;
    ctx.fillStyle = '#f6f6f2';
    ctx.fillText(text, W / 2, H / 2 + 1);
    ctx.shadowBlur = 0;
    if (sub) { ctx.font = Math.floor(H * 0.18) + 'px "PingFang SC",sans-serif'; ctx.fillStyle = color; ctx.globalAlpha = .9; ctx.fillText(sub, W / 2, H * 0.82); ctx.globalAlpha = 1; }
  }, w || 300, h || 88);
}

/* —— 附加物构建器（门店场景通用部件） —— */
var s3dExtraBuilders = {
  steps: function (scene) {  // 门前台阶
    for (var i = 0; i < 2; i++) {
      var st = new THREE.Mesh(new THREE.BoxGeometry(2.6 - i * 0.5, 0.13, 0.8), s3dMat(0x222a34));
      st.position.set(0, 0.065 + i * 0.13, -1.1 + i * 0.38); scene.add(st);
    }
  },
  pillars: function (scene) {  // 门柱
    [-2.4, 2.4].forEach(function (sx) {
      var p = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.2, 0.32), s3dMat(0x2a3240));
      p.position.set(sx, 1.6, -1.6); scene.add(p);
      var cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.4), s3dMat(0x3a4450));
      cap.position.set(sx, 3.2, -1.6); scene.add(cap);
    });
  },
  trees: function (scene) {  // 两侧绿植
    [-4.3, 4.3].forEach(function (sx) {
      var tr = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 8), s3dMat(0x2f6e50));
      tr.position.set(sx, 0.75, 0.3); scene.add(tr);
      var tk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6), s3dMat(0x5a4632));
      tk.position.set(sx, 0.2, 0.3); scene.add(tk);
    });
  },
  lamps: function (scene) {  // 门口路灯
    [-1.7, 1.7].forEach(function (sx) {
      var po = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.9, 6), s3dMat(0x3a4248));
      po.position.set(sx, 0.95, -0.9); scene.add(po);
      var hd = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), s3dBasic(0xffe0a0));
      hd.position.set(sx, 1.98, -0.9); scene.add(hd);
      var pl = new THREE.PointLight(0xffc98a, 0.5, 4.5, 1.8);
      pl.position.set(sx, 1.85, -0.9); scene.add(pl);
    });
  },
  neon: function (scene) {  // 建筑轮廓霓虹管（上下两条横管 + 两侧竖管）
    var tb = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.07, 0.07), new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: .95 }));
    tb.position.set(0, 3.1, -1.72); scene.add(tb);
    var bb = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.07, 0.07), new THREE.MeshBasicMaterial({ color: 0x8a4fff, transparent: true, opacity: .8 }));
    bb.position.set(0, 0.35, -1.72); scene.add(bb);
    [-2.7, 2.7].forEach(function (sx) {
      var vb = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.8, 0.07), new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: .8 }));
      vb.position.set(sx, 1.55, -1.72); scene.add(vb);
    });
    s3d.anims.push(function (t) {
      tb.material.opacity = Math.sin(t * 2.1) > -0.3 ? 1 : 0.4;
      bb.material.opacity = Math.sin(t * 1.5 + 2) > 0 ? 0.9 : 0.35;
    });
  },
  lanterns: function (scene) {  // 门口红灯笼（门头上方）
    [-1.3, 1.3].forEach(function (sx) {
      var la = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), s3dBasic(0xff5c4a));
      la.position.set(sx, 1.5, -1.55); scene.add(la);
      var l2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .85 }));
      l2.position.set(sx, 1.5, -1.5); scene.add(l2);
      var lp = new THREE.PointLight(0xff7a5c, 0.3, 3, 1.9);
      lp.position.set(sx, 1.5, -1.45); scene.add(lp);
    });
  },
  stalls: function (scene, n) {  // 摊棚（夜市/美食街/鬼市：门前两侧）
    var cnt = n || 2;
    for (var i = 0; i < cnt; i++) {
      var sx = -3.1 + i * 2.2;
      var canopy = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.7), s3dMat(0x8a3a2a));
      canopy.position.set(sx, 1.55, -1.3); scene.add(canopy);
      var leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), s3dMat(0x3a2a20));
      leg1.position.set(sx - 0.85, 0.75, -1.3); scene.add(leg1);
      var leg2 = leg1.clone(); leg2.position.x = sx + 0.85; scene.add(leg2);
      var tab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.75), s3dMat(0x4a3828));
      tab.position.set(sx, 0.8, -1.3); scene.add(tab);
      var lp = new THREE.PointLight(0xffb35c, 0.28, 2.8, 1.9);
      lp.position.set(sx, 1.4, -1.3); scene.add(lp);
    }
  },
  shed: function (scene) {  // 大棚顶（菜市场/麻辣烫）
    var roof = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.8, 0.4, 8, 1, true), s3dMat(0x4a5a54));
    roof.position.set(0, 2.2, -2.2); scene.add(roof);
    var post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.0, 6), s3dMat(0x3a3a3a));
    post.position.set(0, 1.0, -2.2); scene.add(post);
  },
  awning: function (scene) {  // 遮阳棚
    var aw = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.0), s3dMat(0x7a5a3a));
    aw.position.set(0, 2.4, -1.2); scene.add(aw);
    aw.rotation.x = -0.35; scene.add(aw);
  },
  cars: function (scene) {  // 门口车辆（4S 店）
    [-3.0, 3.2].forEach(function (sx, i) {
      var cg = new THREE.Group();
      var body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.34, 0.5), s3dMat(i % 2 ? 0xb05050 : 0x5070b0));
      body.position.y = 0.32; cg.add(body);
      var cab = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.24, 0.44), s3dMat(0x2a3240));
      cab.position.set(0.1, 0.56, 0); cg.add(cab);
      [-0.38, 0.38].forEach(function (wx) {
        [-0.22, 0.22].forEach(function (wz) {
          var wh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 8), s3dBasic(0x1a1a1a));
          wh.position.set(wx, 0.12, wz); wh.rotation.x = Math.PI / 2; cg.add(wh);
        });
      });
      cg.position.set(sx, 0, 0.7); cg.rotation.y = i % 2 ? Math.PI : 0; scene.add(cg);
    });
  },
  flags: function (scene) {  // 彩旗
    for (var i = 0; i < 5; i++) {
      var fl = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), s3dBasic([0xff5c5c, 0x5cd8ff, 0x8ad86a, 0xffd05c, 0xd85cff][i % 5]));
      fl.position.set(-2.2 + i * 1.1, 3.3, -1.5); scene.add(fl);
    }
    s3d.anims.push(function (t) {
      scene.children.forEach(function (o) { if (o.isMesh && o.geometry.type === 'PlaneGeometry' && o.position.y > 3) o.rotation.y = Math.sin(t * 2 + o.position.x) * 0.15; });
    });
  },
  ledpanel: function (scene) {  // 红绿电子屏（交易大厅）
    var led = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.55), new THREE.MeshBasicMaterial({
      map: s3dTex(function (ctx, w, h) {
        ctx.fillStyle = '#06120a'; ctx.fillRect(0, 0, w, h);
        for (var i = 0; i < 12; i++) {
          ctx.fillStyle = Math.random() < 0.5 ? 'rgba(90,255,140,.85)' : 'rgba(255,90,90,.8)';
          ctx.fillRect(8 + i * (w / 13), h * 0.3, w / 16, h * 0.42);
        }
      }, 260, 42)
    }));
    led.position.set(0, 2.85, -1.72); scene.add(led);
    s3d.anims.push(function (t) {
      led.material.color.setHex(Math.floor(t * 3) % 2 === 0 ? 0x7aff9a : 0xff7a7a);
    });
  },
  tables: function (scene) {  // 酒吧门口桌椅
    [-3.0, 3.0].forEach(function (sx) {
      var tb = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.5, 8), s3dMat(0x4a3018));
      tb.position.set(sx, 0.25, 0.5); scene.add(tb);
      [0.5, -0.5].forEach(function (dz) {
        var ch = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), s3dMat(0x3a2010));
        ch.position.set(sx + 0.45, 0.18, 0.5 + dz); scene.add(ch);
      });
    });
  },
  crates: function (scene) {  // 菜篮（菜市场）
    [-3.2, 3.4].forEach(function (sx) {
      var crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), s3dMat(0x6a4a28));
      crate.position.set(sx, 0.25, 0.6); scene.add(crate);
      var veg = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), s3dMat(0x5a8a3a));
      veg.position.set(sx, 0.55, 0.6); scene.add(veg);
    });
  },
  steam: function (scene) {  // 火锅热气（粒子浮动）
    var st = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0e0, transparent: true, opacity: .25 }));
    st.position.set(0, 2.2, -1.2); scene.add(st);
    s3d.anims.push(function (t) {
      st.position.y = 2.2 + Math.sin(t * 1.4) * 0.2;
      st.material.opacity = 0.18 + Math.abs(Math.sin(t * 1.2)) * 0.15;
    });
  },
  flowers: function (scene) {  // 花店门前花篮
    [-3.3, 3.5].forEach(function (sx) {
      var bas = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.5, 8), s3dMat(0x5a3a20));
      bas.position.set(sx, 0.25, 0.5); scene.add(bas);
      for (var i = 0; i < 6; i++) {
        var fl = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 6), s3dMat([0xff7ad8, 0xffd05c, 0x8ad86a, 0xff8a5c, 0x7ad0ff, 0xd85cff][i]));
        fl.position.set(sx + Math.cos(i) * 0.14, 0.7, 0.5 + Math.sin(i) * 0.14); scene.add(fl);
      }
    });
  },
  fence: function (scene) {  // 铁艺栅栏
    var f = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.9), new THREE.MeshBasicMaterial({
      map: s3dTex(function (ctx, w, h) {
        ctx.fillStyle = 'rgba(20,24,30,.45)'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(150,160,170,.5)'; ctx.lineWidth = 3;
        for (var gx = 0; gx <= w; gx += 16) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(0, h * 0.5); ctx.lineTo(w, h * 0.5); ctx.stroke();
      }, 280, 45), transparent: true
    }));
    f.position.set(0, 0.45, 0.4); scene.add(f);
  },
  chimney: function (scene) {  // 烟囱
    var ch = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), s3dMat(0x4a4034));
    ch.position.set(1.8, 2.9, -2.6); scene.add(ch);
  },
  bench: function (scene) {  // 公园长椅
    [-2.2, 2.4].forEach(function (sx) {
      var bt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.9), s3dMat(0x4a3a24));
      bt.position.set(sx, 0.25, 0.8); scene.add(bt);
      var bk = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.8), s3dMat(0x4a3a24));
      bk.position.set(sx, 0.5, 1.2); scene.add(bk);
    });
  },
  fountain: function (scene) {  // 喷泉
    var pool = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.3, 12), s3dMat(0x5a728a));
    pool.position.set(0, 0.15, 0.8); scene.add(pool);
    var jet = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 8), s3dBasic(0xbfe8ff));
    jet.position.set(0, 0.65, 0.8); scene.add(jet);
    s3d.anims.push(function (t) {
      jet.scale.y = 1 + Math.sin(t * 2) * 0.25;
    });
  },
  fog: function (scene) {  // 鬼市薄雾
    var fd = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), new THREE.MeshBasicMaterial({ color: 0x8affd8, transparent: true, opacity: .05, depthWrite: false }));
    fd.position.set(0, 0.1, 0.8); fd.rotation.x = -Math.PI / 2; scene.add(fd);
    s3d.anims.push(function (t) {
      fd.position.z = 0.6 + Math.sin(t * 0.4) * 0.5;
    });
  },
  signs: function (scene) {  // 门口 LED 立牌
    var sb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.0, 0.5), s3dMat(0x222a34));
    sb.position.set(-4.2, 0.5, -0.4); scene.add(sb);
    var ss = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8), new THREE.MeshBasicMaterial({
      map: s3dTex(function (ctx, w, h) {
        ctx.fillStyle = '#0a0e16'; ctx.fillRect(0, 0, w, h);
        for (var i = 0; i < 20; i++) {
          ctx.fillStyle = Math.random() < 0.5 ? 'rgba(90,200,255,.8)' : 'rgba(255,120,120,.7)';
          ctx.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 8, 3);
        }
      }, 130, 80)
    }));
    ss.position.set(-4.2, 0.9, -0.15); scene.add(ss);
    s3d.anims.push(function (t) {
      ss.material.color.setHex(Math.floor(t * 2) % 2 === 0 ? 0x9ae0ff : 0xff9a9a);
    });
  },
  lions: function (scene) {  // 银行石狮
    [-2.2, 2.2].forEach(function (sx) {
      var base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.6), s3dMat(0x8a949e));
      base.position.set(sx, 0.14, -1.0); scene.add(base);
      var body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.45), s3dMat(0x9aa6b0));
      body.position.set(sx, 0.46, -1.0); scene.add(body);
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), s3dMat(0xaeb8c2));
      head.position.set(sx, 0.72, -1.0); scene.add(head);
    });
  },
  atm: function (scene) {  // ATM 柜机
    [2.8].forEach(function (sx) {
      var atm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.4), s3dMat(0x2a3444));
      atm.position.set(sx, 0.75, -1.4); scene.add(atm);
      var sc = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), s3dBasic(0x8ae0ff));
      sc.position.set(sx, 0.95, -1.19); scene.add(sc);
      var slot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.06), s3dMat(0x14181e));
      slot.position.set(sx, 0.35, -1.19); scene.add(slot);
    });
  },
  mannequin: function (scene) {  // 橱窗模特
    [-1.4, 1.4].forEach(function (sx) {
      var mq = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.3, 8), s3dMat(0xd8d8e0));
      mq.position.set(sx, 0.65, -1.35); scene.add(mq);
      var mh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), s3dMat(0xd8d8e0));
      mh.position.set(sx, 1.4, -1.35); scene.add(mh);
    });
  },
  ledwall: function (scene) {  // LED 招聘大屏
    var wall = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.3), new THREE.MeshBasicMaterial({
      map: s3dTex(function (ctx, w, h) {
        ctx.fillStyle = '#020a06'; ctx.fillRect(0, 0, w, h);
        for (var i = 0; i < 40; i++) {
          ctx.fillStyle = Math.random() < 0.4 ? 'rgba(255,200,90,.9)' : 'rgba(90,255,140,.8)';
          ctx.fillRect(Math.random() * w, Math.random() * h, 6, 4);
        }
      }, 300, 130)
    }));
    wall.position.set(0, 4.6, -1.7); scene.add(wall);
    s3d.anims.push(function (t) {
      wall.material.color.setHex(Math.floor(t * 3) % 2 === 0 ? 0xffd05c : 0x7aff9a);
    });
  },
  clockwheel: function (scene) {  // 塔楼时钟
    var face = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ map: s3dTex(function (ctx, w, h) {
      ctx.fillStyle = '#e8ecf0'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#222a34'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); ctx.stroke();
    }, 64, 64) }));
    face.position.set(0, 6.4, -1.78); scene.add(face);
    var hand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.02), s3dBasic(0x1a1a22));
    hand.position.set(0, 6.4, -1.5); scene.add(hand);
    s3d.anims.push(function (t) {
      hand.rotation.z = -t * 0.4;
    });
  },
  cartwheel: function (scene) {  // 旋转展台车（4S）
    var plat = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.18, 12), s3dMat(0x2a343e));
    plat.position.set(0, 0.09, 0.3); scene.add(plat);
    var cg = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.34, 0.5), s3dMat(0x5070b0));
    body.position.y = 0.32; cg.add(body);
    var cab = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.24, 0.44), s3dMat(0x2a3240));
    cab.position.set(0.1, 0.56, 0); cg.add(cab);
    [-0.38, 0.38].forEach(function (wx) {
      [-0.22, 0.22].forEach(function (wz) {
        var wh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 8), s3dBasic(0x1a1a1a));
        wh.position.set(wx, 0.12, wz); wh.rotation.x = Math.PI / 2; cg.add(wh);
      });
    });
    cg.position.y = 0.28; plat.add(cg);
    s3d.anims.push(function (t) {
      plat.rotation.y = t * 0.5;
    });
  },
  lanternstr: function (scene) {  // 灯笼串
    [-2.0, -0.7, 0.7, 2.0].forEach(function (sx) {
      var la = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), s3dBasic(0xff5c4a));
      la.position.set(sx, 2.3, -1.55); scene.add(la);
      var lp = new THREE.PointLight(0xff7a5c, 0.22, 2.6, 1.9);
      lp.position.set(sx, 2.3, -1.5); scene.add(lp);
    });
    s3d.anims.push(function (t) {
      var m = scene.children;
      var k = 0;
      for (var i = 0; i < m.length; i++) {
        if (m[i].isMesh && m[i].geometry.type === 'SphereGeometry' && m[i].material && m[i].material.color && m[i].material.color.getHex() === 0xff5c4a) {
          m[i].material.color.setHex(k % 2 ? 0xff5c4a : 0xffb35c);
          k++;
        }
      }
    });
  },
  crates: function (scene) {  // 货箱堆
    [[-3.0, 0.5, 0.5, 0], [2.6, 0.5, 0.5, 1], [3.2, 0.3, 0.4, 2]].forEach(function (c) {
      var crate = new THREE.Mesh(new THREE.BoxGeometry(c[0], c[1], c[2] ? c[2] : 0.5), s3dMat([0x6a5a3a, 0x5a4a2a, 0x7a6a4a][c[3] || 0]));
      crate.position.set(c[0] > 0 ? c[0] : c[0], c[1] / 2, 0.3); scene.add(crate);
    });
  },
  pricelist: function (scene) {  // 价签板
    var pb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.5), s3dMat(0x3a3a3a));
    pb.position.set(4.1, 0.6, -1.0); scene.add(pb);
    var ps = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0), new THREE.MeshBasicMaterial({
      map: s3dTex(function (ctx, w, h) {
        ctx.fillStyle = '#101a10'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(160,220,120,.8)'; ctx.lineWidth = 3;
        for (var i = 0; i < 5; i++) { ctx.strokeRect(6, 6 + i * h / 5.4, w - 12, h / 6); }
        for (var j = 0; j < 5; j++) {
          ctx.fillStyle = 'rgba(160,220,120,.9)';
          ctx.fillRect(10, 12 + j * h / 5.4, w * 0.4, h / 12);
          ctx.fillRect(w * 0.55, 12 + j * h / 5.4, w * 0.35, h / 12);
        }
      }, 130, 100)
    }));
    ps.position.set(4.1, 0.9, -0.75); scene.add(ps);
  },
  steamer: function (scene) {  // 蒸笼（叠笼+蒸汽）
    var cg = new THREE.Group();
    [0, 1, 2].forEach(function (i) {
      var tier = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.22, 10), s3dMat(0xb8a880));
      tier.position.set(0, 0.1 + i * 0.23, 0); cg.add(tier);
    });
    cg.position.set(-3.4, 0.1, 0.4); scene.add(cg);
    var steam = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0e0, transparent: true, opacity: .3 }));
    steam.position.set(-3.4, 0.9, 0.4); scene.add(steam);
    s3d.anims.push(function (t) {
      steam.position.y = 0.9 + Math.sin(t * 1.6) * 0.25;
      steam.material.opacity = 0.2 + Math.abs(Math.sin(t * 1.3)) * 0.18;
    });
  },
  firepot: function (scene) {  // 火锅/麻辣锅（锅+火苗）
    var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.45, 10), s3dMat(0x5a5a5a));
    pot.position.set(-3.4, 0.22, 0.4); scene.add(pot);
    var flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0xff7a3c, transparent: true, opacity: .85 }));
    flame.position.set(-3.4, 0.6, 0.4); scene.add(flame);
    var lp = new THREE.PointLight(0xff8a4a, 0.35, 2.8, 1.9);
    lp.position.set(-3.4, 0.7, 0.4); scene.add(lp);
    s3d.anims.push(function (t) {
      flame.scale.y = 1 + Math.sin(t * 6) * 0.35;
      flame.material.opacity = 0.6 + Math.abs(Math.sin(t * 5)) * 0.35;
    });
  },
  grill: function (scene) {  // 烤炉（百味鸡）
    var grill = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), s3dMat(0x3a3a3a));
    grill.position.set(-3.4, 0.17, 0.4); scene.add(grill);
    for (var i = 0; i < 4; i++) {
      var skew = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), s3dMat(0x8a5a2a));
      skew.position.set(-3.7 + i * 0.22, 0.45, 0.4); scene.add(skew);
      var meat = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), s3dMat(0x8a3a1a));
      meat.position.set(-3.7 + i * 0.22, 0.3, 0.4); scene.add(meat);
    }
    var glow = new THREE.PointLight(0xff6a3c, 0.3, 2.5, 1.9);
    glow.position.set(-3.4, 0.4, 0.4); scene.add(glow);
  },
  posters: function (scene) {  // 房产海报橱窗
    var win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.1), new THREE.MeshBasicMaterial({
      map: s3dTex(function (ctx, w, h) {
        ctx.fillStyle = '#0a1420'; ctx.fillRect(0, 0, w, h);
        for (var i = 0; i < 3; i++) {
          ctx.strokeStyle = '#5cd8ff'; ctx.lineWidth = 2;
          ctx.strokeRect(8 + i * w / 3.3, 8, w / 4, h - 16);
          ctx.fillStyle = 'rgba(90,216,255,.3)';
          ctx.fillRect(12 + i * w / 3.3, 12, w / 4 - 8, h - 24);
        }
      }, 240, 110)
    }));
    win.position.set(0, 1.7, -1.75); scene.add(win);
  },
  neonball: function (scene) {  // 台球霓虹灯球
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), s3dMat(0x3a3a3a));
    pole.position.set(0, 1.1, -1.3); scene.add(pole);
    var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshBasicMaterial({ color: 0x5cffd8, transparent: true, opacity: .8 }));
    lamp.position.set(0, 2.35, -1.3); scene.add(lamp);
    var ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), s3dBasic(0xffd05c));
    ball.position.set(0, 2.0, -1.2); scene.add(ball);
    var lp = new THREE.PointLight(0x5cffd8, 0.45, 3.5, 1.9);
    lp.position.set(0, 2.3, -1.2); scene.add(lp);
    s3d.anims.push(function (t) {
      lamp.material.opacity = 0.6 + Math.sin(t * 2.2) * 0.3;
    });
  },
  wheel: function (scene) {  // 彩票大转盘
    var post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6), s3dMat(0x3a3a3a));
    post.position.set(3.2, 0.7, -0.6); scene.add(post);
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 16), s3dBasic(0xff5cd8));
    disc.position.set(3.2, 1.5, -0.6); scene.add(disc);
    var dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), s3dBasic(0xffd05c));
    dot.position.set(3.55, 1.5, -0.6); scene.add(dot);
    s3d.anims.push(function (t) {
      disc.rotation.z = t * 1.2;
    });
  },
  blackboard: function (scene) {  // 培训宣传板
    var board = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 0.08), s3dMat(0x1e2a1e));
    board.position.set(0, 1.9, -1.75); scene.add(board);
    var bb = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.9), new THREE.MeshBasicMaterial({
      map: s3dTex(function (ctx, w, h) {
        ctx.fillStyle = '#12281c'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(220,240,220,.7)'; ctx.lineWidth = 2;
        for (var i = 0; i < 4; i++) {
          ctx.beginPath(); ctx.moveTo(8, 14 + i * 22); ctx.lineTo(w - 8, 14 + i * 22); ctx.stroke();
        }
      }, 170, 90)
    }));
    bb.position.set(0, 1.9, -1.7); scene.add(bb);
  },
  carpet: function (scene) {  // 迎宾红毯+门童
    var cpt = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshLambertMaterial({ map: s3dTex(function (ctx, w, h) {
      ctx.fillStyle = '#7a1a1a'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#b85c3c';
      for (var i = 0; i < 8; i++) { ctx.fillRect(0, i * h / 8, w, 2); }
    }, 70, 120), transparent: true }));
    cpt.rotation.x = -Math.PI / 2; cpt.position.set(0, 0.01, -0.4); scene.add(cpt);
    [-1.9, 1.9].forEach(function (sx) {
      var db = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 8), s3dMat(0x3a3a4a));
      db.position.set(sx, 0.6, -0.4); scene.add(db);
      var dh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), s3dMat(0xd8b89a));
      dh.position.set(sx, 1.3, -0.4); scene.add(dh);
    });
  },
  flowers: function (scene) {  // 花店花墙+花车
    var fw = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.4), new THREE.MeshBasicMaterial({
      map: s3dTex(function (ctx, w, h) {
        ctx.fillStyle = '#14121c'; ctx.fillRect(0, 0, w, h);
        for (var i = 0; i < 90; i++) {
          var cx = Math.random() * w, cy = Math.random() * h;
          ctx.fillStyle = ['#ff7ad8', '#ffd05c', '#8ad86a', '#ff8a5c', '#7ad0ff', '#d85cff'][Math.floor(Math.random() * 6)];
          ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(80,180,100,.6)';
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 8); ctx.stroke();
        }
      }, 340, 140)
    }));
    fw.position.set(0, 2.1, -1.75); scene.add(fw);
    var cart = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.7), s3dMat(0x5a3a20));
    cart.position.set(-3.2, 0.25, 0.4); scene.add(cart);
    for (var k = 0; k < 8; k++) {
      var b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4), s3dMat([0xff7ad8, 0xffd05c, 0x8ad86a][k % 3]));
      b.position.set(-3.2 + Math.cos(k) * 0.3, 0.55 + Math.sin(k) * 0.1, 0.4); scene.add(b);
    }
  },
  flagpole: function (scene) {  // 旗杆+旗帜
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.6, 8), s3dMat(0xb8c0c8));
    pole.position.set(-3.4, 2.3, 0.2); scene.add(pole);
    var flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), s3dMat(0xd83a3a));
    flag.position.set(-3.0, 4.2, 0.2); scene.add(flag);
    s3d.anims.push(function (t) {
      flag.rotation.y = Math.sin(t * 1.5) * 0.12;
    });
  },
  ghostflame: function (scene) {  // 鬼市青火
    [-2.8, 2.8].forEach(function (sx) {
      var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.3, 8), s3dMat(0x2a3434));
      pot.position.set(sx, 0.15, 0.5); scene.add(pot);
      var fl = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0x8affd8, transparent: true, opacity: .8 }));
      fl.position.set(sx, 0.5, 0.5); scene.add(fl);
      var lp = new THREE.PointLight(0x5ad8a0, 0.3, 2.5, 1.9);
      lp.position.set(sx, 0.55, 0.5); scene.add(lp);
      s3d.anims.push(function (t) {
        fl.scale.y = 1 + Math.sin(t * 5 + sx) * 0.4;
        fl.material.opacity = 0.5 + Math.abs(Math.sin(t * 4 + sx)) * 0.4;
      });
    });
  }
};

/** 按主题生成墙面贴图（6 种质感） */
function s3dWall(style) {
  var cv = document.createElement('canvas'); cv.width = 256; cv.height = 192;
  var ctx = cv.getContext('2d');
  var bcv = document.createElement('canvas'); bcv.width = 256; bcv.height = 192;
  var bctx = bcv.getContext('2d');
  var drawBump = function (fn) {
    bctx.fillStyle = '#808080'; bctx.fillRect(0, 0, 256, 192);
    fn(bctx);
  };
  if (style === 'stone') {  // 大理石：斜纹 + 水平板缝
    ctx.fillStyle = '#232a33'; ctx.fillRect(0, 0, 256, 192);
    for (var i = 0; i < 30; i++) {
      ctx.strokeStyle = 'rgba(150,160,175,' + (0.05 + Math.random() * 0.1) + ')';
      ctx.lineWidth = 1 + Math.random() * 2.5;
      ctx.beginPath();
      ctx.moveTo(-50 + Math.random() * 256, -50 + Math.random() * 192);
      ctx.lineTo(Math.random() * 358, Math.random() * 268);
      ctx.stroke();
      bctx.strokeStyle = 'rgba(220,220,225,1)'; bctx.lineWidth = 1.5;
      bctx.beginPath(); bctx.moveTo(-50 + Math.random() * 256, -50 + Math.random() * 192);
      bctx.lineTo(Math.random() * 358, Math.random() * 268); bctx.stroke();
    }
    ctx.strokeStyle = 'rgba(120,130,145,.25)'; ctx.lineWidth = 2;
    for (var sy = 0; sy <= 192; sy += 38) { ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(256, sy); ctx.stroke(); }
    bctx.strokeStyle = 'rgba(140,140,150,.9)'; bctx.lineWidth = 2;
    for (var sy2 = 0; sy2 <= 192; sy2 += 38) { bctx.beginPath(); bctx.moveTo(0, sy2); bctx.lineTo(256, sy2); bctx.stroke(); }
  } else if (style === 'glass') {  // 玻璃幕墙
    ctx.fillStyle = '#101822'; ctx.fillRect(0, 0, 256, 192);
    var cols = 6, rows = 5;
    for (var gx = 0; gx < cols; gx++) {
      for (var gy = 0; gy < rows; gy++) {
        var gl = ctx.createLinearGradient(gx * 256 / cols, gy * 192 / rows, gx * 256 / cols + 256 / cols, gy * 192 / rows + 192 / rows);
        gl.addColorStop(0, 'rgba(90,140,200,' + (0.12 + Math.random() * 0.18) + ')');
        gl.addColorStop(1, 'rgba(40,70,110,' + (0.08 + Math.random() * 0.15) + ')');
        ctx.fillStyle = gl;
        ctx.fillRect(gx * 256 / cols + 3, gy * 192 / rows + 3, 256 / cols - 6, 192 / rows - 6);
      }
    }
    ctx.strokeStyle = 'rgba(140,170,210,.4)'; ctx.lineWidth = 2;
    for (var vx = 0; vx <= 256; vx += 256 / cols) { ctx.beginPath(); ctx.moveTo(vx, 0); ctx.lineTo(vx, 192); ctx.stroke(); }
    for (var hy = 0; hy <= 192; hy += 192 / rows) { ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(256, hy); ctx.stroke(); }
    bctx.strokeStyle = 'rgba(200,220,240,1)'; bctx.lineWidth = 3;
    for (var vx2 = 0; vx2 <= 256; vx2 += 256 / cols) { bctx.beginPath(); bctx.moveTo(vx2, 0); bctx.lineTo(vx2, 192); bctx.stroke(); }
    for (var hy2 = 0; hy2 <= 192; hy2 += 192 / rows) { bctx.beginPath(); bctx.moveTo(0, hy2); bctx.lineTo(256, hy2); bctx.stroke(); }
  } else if (style === 'panel') {  // 铝板横条
    ctx.fillStyle = '#232b33'; ctx.fillRect(0, 0, 256, 192);
    for (var p = 0; p < 6; p++) {
      var y = p * 32;
      ctx.fillStyle = p % 2 ? '#2a333c' : '#232b33';
      ctx.fillRect(0, y, 256, 32);
      ctx.strokeStyle = 'rgba(90,100,115,.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y + 16); ctx.lineTo(256, y + 16); ctx.stroke();
      bctx.strokeStyle = 'rgba(190,200,210,.95)'; bctx.lineWidth = 2;
      bctx.beginPath(); bctx.moveTo(0, y); bctx.lineTo(256, y); bctx.stroke();
      bctx.beginPath(); bctx.moveTo(0, y + 16); bctx.lineTo(256, y + 16); bctx.stroke();
    }
    for (var pv = 0; pv < 8; pv++) {
      ctx.strokeStyle = 'rgba(90,100,115,.2)';
      ctx.beginPath(); ctx.moveTo(pv * 32, 0); ctx.lineTo(pv * 32, 192); ctx.stroke();
    }
  } else if (style === 'wood') {  // 木条板
    ctx.fillStyle = '#3a2e1e'; ctx.fillRect(0, 0, 256, 192);
    for (var b = 0; b < 12; b++) {
      var by = b * 16;
      ctx.fillStyle = b % 2 ? '#42331f' : '#3a2e1e';
      ctx.fillRect(0, by, 256, 16);
      ctx.strokeStyle = 'rgba(30,22,12,.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(256, by); ctx.stroke();
      bctx.strokeStyle = 'rgba(140,120,90,1)'; bctx.lineWidth = 1.8;
      bctx.beginPath(); bctx.moveTo(0, by); bctx.lineTo(256, by); bctx.stroke();
      for (var k = 0; k < 6; k++) {
        ctx.fillStyle = 'rgba(60,45,25,.8)';
        ctx.fillRect(k * 42.6 + 8, by + 3, 3, 10);
        bctx.fillStyle = 'rgba(60,45,25,1)';
        bctx.fillRect(k * 42.6 + 8, by + 3, 2, 10);
      }
    }
  } else if (style === 'brick') {  // 红砖
    ctx.fillStyle = '#3a241c'; ctx.fillRect(0, 0, 256, 192);
    var bh2 = 192 / 7, bw2 = 256 / 9;
    for (var r = 0; r < 7; r++) {
      for (var c = 0; c < 10; c++) {
        var ox = (r % 2) * bw2 / 2;
        ctx.fillStyle = (r * 10 + c) % 3 ? '#4a2e22' : '#412820';
        ctx.fillRect(c * bw2 + ox, r * bh2, bw2 - 2, bh2 - 2);
        bctx.fillStyle = 'rgba(170,140,110,1)';
        bctx.fillRect(c * bw2 + ox + 1, r * bh2 + 1, bw2 - 4, bh2 - 4);
      }
    }
    ctx.strokeStyle = 'rgba(20,14,10,.6)'; ctx.lineWidth = 1.5;
    for (var ry = 0; ry <= 192; ry += bh2) { ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(256, ry); ctx.stroke(); }
    for (var rx = 0; rx <= 256; rx += bw2 / 2) { ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, 192); ctx.stroke(); }
    bctx.strokeStyle = 'rgba(60,40,30,1)'; bctx.lineWidth = 2;
    for (var ry2 = 0; ry2 <= 192; ry2 += bh2) { bctx.beginPath(); bctx.moveTo(0, ry2); bctx.lineTo(256, ry2); bctx.stroke(); }
    for (var rx2 = 0; rx2 <= 256; rx2 += bw2 / 2) { bctx.beginPath(); bctx.moveTo(rx2, 0); bctx.lineTo(rx2, 192); bctx.stroke(); }
  } else if (style === 'plaster') {  // 水泥涂装
    ctx.fillStyle = '#2e3438'; ctx.fillRect(0, 0, 256, 192);
    for (var i2 = 0; i2 < 200; i2++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.03 + Math.random() * 0.05) + ')';
      ctx.fillRect(Math.random() * 256, Math.random() * 192, 3 + Math.random() * 8, 2);
      bctx.fillStyle = 'rgba(200,200,200,.8)';
      bctx.fillRect(Math.random() * 256, Math.random() * 192, 3 + Math.random() * 8, 2);
    }
    ctx.strokeStyle = 'rgba(200,210,220,.2)'; ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, 252, 188);
  } else {  // dark 深色砖/水泥（酒吧夜店）
    ctx.fillStyle = '#141820'; ctx.fillRect(0, 0, 256, 192);
    for (var d = 0; d < 260; d++) {
      ctx.fillStyle = 'rgba(80,90,110,' + (0.04 + Math.random() * 0.08) + ')';
      ctx.fillRect(Math.random() * 256, Math.random() * 192, 2 + Math.random() * 6, 2);
      bctx.fillStyle = 'rgba(160,170,190,.7)';
      bctx.fillRect(Math.random() * 256, Math.random() * 192, 2 + Math.random() * 6, 2);
    }
    ctx.strokeStyle = 'rgba(50,60,80,.35)'; ctx.lineWidth = 1.5;
    for (var dg = 0; dg <= 256; dg += 42) { ctx.beginPath(); ctx.moveTo(dg, 0); ctx.lineTo(dg, 192); ctx.stroke(); }
    for (var dgy = 0; dgy <= 192; dgy += 42) { ctx.beginPath(); ctx.moveTo(0, dgy); ctx.lineTo(256, dgy); ctx.stroke(); }
    bctx.strokeStyle = 'rgba(120,130,150,.8)'; bctx.lineWidth = 2;
    for (var dg2 = 0; dg2 <= 256; dg2 += 42) { bctx.beginPath(); bctx.moveTo(dg2, 0); bctx.lineTo(dg2, 192); bctx.stroke(); }
    for (var dgy2 = 0; dgy2 <= 192; dgy2 += 42) { bctx.beginPath(); bctx.moveTo(0, dgy2); bctx.lineTo(256, dgy2); bctx.stroke(); }
  }
  var tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
  tex.bump = new THREE.CanvasTexture(bcv);
  return tex;
}

/** 竖排匾额贴图 */
function s3dTexSignV(text, color, bg, w, h) {
  return s3dTex(function (ctx, W, H) {
    ctx.fillStyle = bg || '#100a1c'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = color; ctx.lineWidth = 4;
    roundRect(ctx, 3, 3, W - 6, H - 6, 7); ctx.stroke();
    ctx.strokeStyle = color; ctx.globalAlpha = .5; ctx.lineWidth = 1.5;
    roundRect(ctx, 8, 8, W - 16, H - 16, 5); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = 'bold ' + Math.floor(W * 0.2) + 'px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 0; i < text.length; i++) {
      ctx.shadowColor = color; ctx.shadowBlur = 10;
      ctx.fillStyle = '#f6f6f2';
      ctx.fillText(text[i], W / 2, (i + 0.5) * H / text.length);
      ctx.shadowBlur = 0;
    }
  }, w || 64, h || 220);
}

/** 通用门店场景：按地点配置生成专属 3D 门店建筑 */
function buildStoreScene(cfg) {
  var scene = s3d.scene;
  var bgc = cfg.bg || 0x05080f;
  scene.background = s3dTexSkyNight();
  scene.fog = new THREE.Fog(bgc, 14, 30);
  // 半球光（天空冷蓝 + 地面暖褐）替代平面环境光，体积感更强
  s3d.amb = new THREE.HemisphereLight(0x44557a, 0x151218, 0.9); scene.add(s3d.amb);
  s3d.keyL = new THREE.DirectionalLight(cfg.key || 0x9fb4ff, 0.65); s3d.keyL.position.set(4, 9, 7); scene.add(s3d.keyL);
  var warm = new THREE.PointLight(cfg.warm || 0xffc98a, 1.0, 11, 1.6); warm.position.set(0, 3.2, 3.0); scene.add(warm);
  var glow = new THREE.PointLight(cfg.glowColor || 0xffc98a, 0.5, 6, 1.8); glow.position.set(0, 1.2, 0.8); scene.add(glow);

  // 地面类型：沥青质感 + bump 颗粒 + 门前暖光晕
  var gGround = cfg.ground || 'plaza';
  var groundTex = s3dGroundTex(gGround);
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(15, 8.5), new THREE.MeshStandardMaterial({
    map: groundTex, bumpMap: groundTex.bump, bumpScale: 0.8,
    roughness: 0.8, metalness: 0.08
  }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0; scene.add(ground);

  // —— 建筑形态参数 ——
  var form = cfg.form || 'shop';
  var bw, bh, bd, frontH, winRows;
  if (form === 'tower') { bw = 3.4; bh = 6.2; bd = 1.6; frontH = 500; winRows = 4; }
  else if (form === 'duplex') { bw = 5.4; bh = 4.0; bd = 1.8; frontH = 360; winRows = 2; }
  else if (form === 'lowwide') { bw = 6.6; bh = 2.3; bd = 2.0; frontH = 220; winRows = 1; }
  else if (form === 'showcase') { bw = 6.0; bh = 3.3; bd = 1.9; frontH = 310; winRows = 2; }
  else { bw = 5.2; bh = 2.9; bd = 1.7; frontH = 270; winRows = 1; }

  var wallTex = cfg.wall ? s3dWall(cfg.wall) : s3dTexBrick();
  var wallMat = new THREE.MeshStandardMaterial({ map: wallTex, bumpMap: wallTex.bump, bumpScale: 0.55, roughness: 0.88, metalness: 0.06 });
  var roofWallTex = s3dWall(cfg.wall === 'glass' ? 'panel' : (cfg.wall || 'brick'));
  var roofMat = new THREE.MeshStandardMaterial({ map: roofWallTex, color: 0x2a3040, bumpMap: roofWallTex.bump, bumpScale: 0.4, roughness: 0.9, metalness: 0.04 });
  var winTex = s3dTexWindows(cfg.winCols || 4, winRows + 1, cfg.winLit !== undefined ? cfg.winLit : 0.45);
  var signColor = cfg.signColor || '#ffd05c';
  var signBg = cfg.signBg || '#100a1c';

  // —— 正面贴图：按形态排布窗/门/招牌 ——
  var frontTex = s3dTex(function (ctx, w, h) {
    ctx.fillStyle = '#10141c'; ctx.fillRect(0, 0, w, h);
    var doorType = cfg.door || 'store';
    var dw = w * 0.2, dh = h * 0.42, dx = w * 0.4, dy = h * 0.58;
    // 门
    if (doorType === 'store' || doorType === 'glass2' || doorType === 'showroom') {
      var dg = ctx.createLinearGradient(dx, 0, dx + dw, 0);
      dg.addColorStop(0, 'rgba(90,120,180,.5)'); dg.addColorStop(1, 'rgba(60,90,150,.45)');
      ctx.fillStyle = dg; ctx.fillRect(dx, dy, dw, dh);
      ctx.strokeStyle = signColor; ctx.globalAlpha = .7; ctx.lineWidth = 2.5;
      ctx.strokeRect(dx, dy, dw, dh); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(dx + dw / 2, dy); ctx.lineTo(dx + dw / 2, dy + dh); ctx.stroke();
    } else if (doorType === 'bank') {
      ctx.fillStyle = 'rgba(70,100,150,.5)';
      ctx.fillRect(dx, dy, dw, dh);
      ctx.strokeStyle = '#cfe0f0'; ctx.lineWidth = 3;
      ctx.strokeRect(dx, dy, dw, dh);
    } else if (doorType === 'shutter') {
      ctx.fillStyle = '#5a5e66'; ctx.fillRect(dx, dy, dw, dh);
      for (var sk = 0; sk < 7; sk++) {
        ctx.strokeStyle = '#7a7e86'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(dx, dy + sk * dh / 7); ctx.lineTo(dx + dw, dy + sk * dh / 7); ctx.stroke();
      }
      ctx.strokeStyle = '#3a3e46'; ctx.lineWidth = 3; ctx.strokeRect(dx, dy, dw, dh);
    } else if (doorType === 'stall') {
      ctx.fillStyle = '#6a4a3a'; ctx.fillRect(dx, dy, dw, dh);
      ctx.fillStyle = '#3a2018'; ctx.fillRect(dx + 4, dy + 4, dw - 8, dh - 8);
    }
    // 窗：按形态排布
    if (form === 'tower') {
      var cw = w * 0.16, ch = h * 0.12;
      for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 3; c++) {
          var sx2 = w * 0.18 + c * w * 0.21, sy2 = h * 0.16 + r * h * 0.16;
          ctx.drawImage(winTex.image, sx2, sy2, cw, ch);
          ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1;
          ctx.strokeRect(sx2, sy2, cw, ch);
        }
      }
    } else if (form === 'duplex') {
      [[0.08, 0.12, w * 0.16, h * 0.13], [0.62, 0.12, w * 0.16, h * 0.13],
       [0.08, 0.46, w * 0.16, h * 0.13], [0.62, 0.46, w * 0.16, h * 0.13]].forEach(function (q) {
        var sx3 = w * q[0], sy3 = h * q[1], sw3 = w * q[2], sh3 = h * q[3];
        ctx.drawImage(winTex.image, sx3, sy3, sw3, sh3);
        ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(sx3, sy3, sw3, sh3);
      });
    } else if (form === 'lowwide') {
      for (var lc = 0; lc < 4; lc++) {
        var lx = w * (0.06 + lc * 0.24), ly = h * 0.34, lw2 = w * 0.17, lh2 = h * 0.36;
        ctx.drawImage(winTex.image, lx, ly, lw2, lh2);
        ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(lx, ly, lw2, lh2);
      }
    } else if (form === 'showcase') {
      // 大橱窗
      ctx.fillStyle = 'rgba(120,170,220,.22)';
      ctx.fillRect(w * 0.07, h * 0.24, w * 0.26, h * 0.5);
      ctx.fillRect(w * 0.67, h * 0.24, w * 0.26, h * 0.5);
      ctx.strokeStyle = 'rgba(170,200,230,.4)'; ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.07, h * 0.24, w * 0.26, h * 0.5);
      ctx.strokeRect(w * 0.67, h * 0.24, w * 0.26, h * 0.5);
    } else {
      [0.06, 0.68].forEach(function (fx) {
        var sx = w * fx, sw = w * 0.2, sh = h * 0.42, sy = h * 0.3;
        ctx.drawImage(winTex.image, sx, sy, sw, sh);
        ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(sx, sy, sw, sh);
      });
    }
  }, 540, frontH);
  var frontMat = new THREE.MeshStandardMaterial({ map: frontTex, emissive: 0x221508, emissiveIntensity: 0.5, roughness: 0.85, metalness: 0.05 });

  var main = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), [
    wallMat, wallMat, roofMat, wallMat, wallMat, frontMat
  ]);
  main.position.set(0, bh / 2, -2.6); scene.add(main);

  // —— 3D 招牌（按 signStyle 差异化） ——
  var signStyle = cfg.signStyle || 'board';
  if (signStyle === 'board') {  // 横灯箱 + 支柱
    var sb1 = new THREE.Mesh(new THREE.PlaneGeometry(bw > 5 ? 4.2 : 3.6, 1.0),
      new THREE.MeshBasicMaterial({ map: s3dTexSign(cfg.title || '', signColor, signBg, 300, 72) }));
    sb1.position.set(0, bh + 0.5, -1.1); scene.add(sb1);
    var sg1 = new THREE.PointLight(new THREE.Color(signColor), 0.4, 4, 1.9);
    sg1.position.set(0, bh + 0.5, -0.9); scene.add(sg1);
    var sp1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 0.14), s3dMat(0x3a4450));
    sp1.position.set(0, bh - 0.4, -1.1); scene.add(sp1);
  } else if (signStyle === 'vertical') {  // 竖匾（右侧）
    var sv = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.5),
      new THREE.MeshBasicMaterial({ map: s3dTexSignV(cfg.title || '', signColor, signBg, 70, 220) }));
    sv.position.set(bw / 2 + 0.55, bh * 0.62, -2.35); scene.add(sv);
    var sgl = new THREE.PointLight(new THREE.Color(signColor), 0.35, 3.2, 1.9);
    sgl.position.set(bw / 2 + 0.55, bh * 0.6, -2.2); scene.add(sgl);
  } else if (signStyle === 'neon') {  // 霓虹字（无底板大发光字）
    var sn = new THREE.Mesh(new THREE.PlaneGeometry(bw > 5 ? 4.4 : 3.8, 1.2),
      new THREE.MeshBasicMaterial({
        map: s3dTex(function (ctx, w, h) {
          ctx.clearRect(0, 0, w, h);
          ctx.font = 'bold ' + Math.floor(h * 0.72) + 'px "PingFang SC","Microsoft YaHei",sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.shadowColor = signColor; ctx.shadowBlur = 18;
          ctx.fillStyle = signColor;
          ctx.fillText(cfg.title || '', w / 2, h / 2);
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(cfg.title || '', w / 2, h / 2);
        }, 380, 90), transparent: true, depthWrite: false
      }));
    sn.position.set(0, bh + 0.55, -1.25); scene.add(sn);
    var sng = new THREE.PointLight(new THREE.Color(signColor), 0.55, 5, 1.7);
    sng.position.set(0, bh + 0.55, -1.0); scene.add(sng);
    s3d.anims.push(function (t) {
      sn.material.opacity = 0.75 + Math.sin(t * 2) * 0.25;
    });
  } else if (signStyle === 'led') {  // LED 滚动字幕屏
    var sl = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.85), new THREE.MeshBasicMaterial({
      map: s3dTex(function (ctx, w, h) {
        ctx.fillStyle = '#02060a'; ctx.fillRect(0, 0, w, h);
        ctx.font = 'bold ' + Math.floor(h * 0.6) + 'px "PingFang SC",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = signColor; ctx.shadowBlur = 10;
        ctx.fillStyle = signColor;
        ctx.fillText(cfg.title || '', w / 2, h / 2);
      }, 340, 66)
    }));
    sl.position.set(0, bh + 0.45, -1.15); scene.add(sl);
    var slg = new THREE.PointLight(new THREE.Color(signColor), 0.4, 4, 1.9);
    slg.position.set(0, bh + 0.45, -0.95); scene.add(slg);
    s3d.anims.push(function (t) {
      sl.material.color.setHex(Math.floor(t * 4) % 2 === 0 ? 0xffffff : 0x88c8ff);
    });
  } else {  // metal 金属字（深底金字 + 柱）
    var sm = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.0),
      new THREE.MeshBasicMaterial({ map: s3dTexSign(cfg.title || '', '#d8c08a', '#141822', 300, 72) }));
    sm.position.set(0, bh + 0.5, -1.2); scene.add(sm);
    var smg = new THREE.PointLight(0xffd8a0, 0.35, 3.8, 1.9);
    smg.position.set(0, bh + 0.5, -1.0); scene.add(smg);
    var smp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), s3dMat(0x3a4450));
    smp.position.set(0, bh - 0.4, -1.2); scene.add(smp);
  }

  // —— 屋顶 ——
  if (cfg.roof === 'gable' || form === 'duplex') {
    var gable = new THREE.Mesh(new THREE.ConeGeometry(bw * 0.78, 1.05, 4), s3dMat(0x4a4034));
    gable.position.set(0, bh + 0.42, -2.6); gable.rotation.y = Math.PI / 4; scene.add(gable);
  } else if (form === 'tower' && cfg.roof !== 'none') {
    var tw = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 1.3), wallMat);
    tw.position.set(0, bh + 0.75, -2.6); scene.add(tw);
    var sp = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.0, 4), s3dMat(0x4a5a6a));
    sp.position.set(0, bh + 2.0, -2.6); scene.add(sp);
  } else if (form === 'lowwide') {
    var shed = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.3, 0.5, 10, 1, true), s3dMat(0x3a4650));
    shed.position.set(0, bh + 0.15, -2.6); scene.add(shed);
  }

  // —— 附加物 ——
  (cfg.extras || []).forEach(function (ex) {
    if (s3dExtraBuilders[ex]) s3dExtraBuilders[ex](scene);
  });
  if (cfg.special && s3dExtraBuilders[cfg.special]) s3dExtraBuilders[cfg.special](scene);

  // —— 远楼剪影 ——
  for (var bx = -8.5; bx <= 8.5; bx += 2.2) {
    var fh = 1.3 + ((bx * 5) % 4) * 0.4;
    var far = new THREE.Mesh(new THREE.BoxGeometry(1.6, fh, 0.7), s3dStd(0x0b0f18, { roughness: 0.95 }));
    far.position.set(bx, fh / 2 - 0.3, -6.2); scene.add(far);
    var fw = new THREE.Mesh(new THREE.PlaneGeometry(1.4, fh * 0.85), new THREE.MeshBasicMaterial({
      map: s3dTexWindows(2, 3, 0.4), transparent: true
    }));
    fw.position.set(bx, fh / 2 - 0.3, -5.8); scene.add(fw);
  }

  // —— 星空 ——
  if (cfg.stars !== false) {
    var starGeo = new THREE.BufferGeometry();
    var pts = [];
    for (var st = 0; st < 90; st++) pts.push((Math.random() - 0.5) * 30, 4.5 + Math.random() * 5.5, -7 - Math.random() * 9);
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.045, transparent: true, opacity: 0.7 })));
  }

  // 暖光呼吸
  s3d.anims.push(function (t) {
    warm.intensity = 0.55 + Math.sin(t * 0.7) * 0.08;
  });
}

/** 家：温馨小楼（人字顶 + 暖窗 + 小院） */
function buildHomeScene() {
  var scene = s3d.scene;
  scene.background = s3dTexSkyNight();
  scene.fog = new THREE.Fog(0x0a0d12, 12, 26);
  s3d.amb = new THREE.HemisphereLight(0x44557a, 0x151218, 0.9); scene.add(s3d.amb);
  s3d.keyL = new THREE.DirectionalLight(0xc8d8ff, 0.6); s3d.keyL.position.set(4, 9, 7); scene.add(s3d.keyL);
  var warm = new THREE.PointLight(0xffc98a, 0.6, 10, 1.7); warm.position.set(0, 3.6, 2.6); scene.add(warm);
  // 草地
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(15, 8.5), new THREE.MeshLambertMaterial({
    map: s3dTex(function (ctx, w, h) {
      ctx.fillStyle = '#152820'; ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 700; i++) {
        ctx.fillStyle = 'rgba(100,160,110,' + (0.15 + Math.random() * 0.3) + ')';
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
      var grd = ctx.createLinearGradient(0, h * 0.4, 0, h);
      grd.addColorStop(0, 'rgba(255,200,130,0)'); grd.addColorStop(1, 'rgba(255,200,130,.22)');
      ctx.fillStyle = grd; ctx.fillRect(0, h * 0.4, w, h * 0.6);
    }, 256, 128)
  }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // 小楼
  var winTex = s3dTexWindows(5, 4, 0.8);
  var wall = new THREE.MeshLambertMaterial({ map: s3dTexBrick(), roughness: .9 });
  var house = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.6, 2.0), [
    wall, wall, s3dMat(0x4a4034), wall, wall, new THREE.MeshLambertMaterial({ map: winTex })
  ]);
  house.position.set(0, 1.3, -2.9); scene.add(house);
  // 人字屋顶
  var roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.3, 4), s3dMat(0x5a4632));
  roof.position.set(0, 3.0, -2.9); roof.rotation.y = Math.PI / 4; scene.add(roof);
  // 烟囱
  var chimney = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.8, 0.32), s3dMat(0x4a4034));
  chimney.position.set(1.5, 3.0, -3.6); scene.add(chimney);
  // 门（暖光）
  var door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), s3dBasic(0xffd98a));
  door.position.set(0, 0.7, -1.88); scene.add(door);
  var dl = new THREE.PointLight(0xffc98a, 0.5, 4, 1.8); dl.position.set(0, 1.2, -1.6); scene.add(dl);
  // 小院栅栏
  var fence = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.7), new THREE.MeshBasicMaterial({
    map: s3dTex(function (ctx, w, h) {
      ctx.fillStyle = 'rgba(30,26,18,.35)'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(200,180,140,.55)'; ctx.lineWidth = 2;
      for (var gx = 0; gx <= w; gx += 14) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, h * 0.6); ctx.lineTo(w, h * 0.6); ctx.stroke();
    }, 300, 35), transparent: true
  }));
  fence.position.set(0, 0.35, 0.5); scene.add(fence);
  // 小院门柱
  [-3.1, 3.1].forEach(function (sx) {
    var p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), s3dMat(0x5a4a34));
    p.position.set(sx, 0.45, 0.5); scene.add(p);
    var l = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), s3dBasic(0xffe0a0));
    l.position.set(sx, 0.95, 0.5); scene.add(l);
  });
  // 两侧树
  [-3.8, 3.8].forEach(function (sx) {
    var tr = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.5, 8), s3dMat(0x2f6e50));
    tr.position.set(sx, 1.0, 0.2); scene.add(tr);
    var tk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.6, 6), s3dMat(0x5a4632));
    tk.position.set(sx, 0.25, 0.2); scene.add(tk);
  });
  // 远楼剪影 + 星
  for (var bx = -8.5; bx <= 8.5; bx += 2.2) {
    var fh = 1.2 + ((bx * 5) % 4) * 0.4;
    var far = new THREE.Mesh(new THREE.BoxGeometry(1.6, fh, 0.7), s3dMat(0x0b0f18));
    far.position.set(bx, fh / 2 - 0.3, -6.4); scene.add(far);
    var fw = new THREE.Mesh(new THREE.PlaneGeometry(1.4, fh * 0.85), new THREE.MeshBasicMaterial({
      map: s3dTexWindows(2, 3, 0.4), transparent: true
    }));
    fw.position.set(bx, fh / 2 - 0.3, -6.0); scene.add(fw);
  }
  var starGeo = new THREE.BufferGeometry();
  var pts = [];
  for (var st = 0; st < 100; st++) pts.push((Math.random() - 0.5) * 30, 4.5 + Math.random() * 5.5, -7 - Math.random() * 9);
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.045, transparent: true, opacity: 0.7 })));
  s3d.anims.push(function (t) {
    warm.intensity = 0.6 + Math.sin(t * 0.6) * 0.08;
  });
}

/** 城市公园：入口拱门 + 绿化 + 长椅 + 喷泉 + 路灯 */
function buildParkScene() {
  var scene = s3d.scene;
  scene.background = s3dTexSkyNight();
  scene.fog = new THREE.Fog(0x0a1010, 12, 26);
  s3d.amb = new THREE.HemisphereLight(0x44557a, 0x151218, 0.9); scene.add(s3d.amb);
  s3d.keyL = new THREE.DirectionalLight(0xbfe0c8, 0.6); s3d.keyL.position.set(4, 9, 7); scene.add(s3d.keyL);
  var warm = new THREE.PointLight(0xffd8a0, 0.5, 10, 1.7); warm.position.set(0, 3.4, 2.6); scene.add(warm);
  // 草地
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(15, 8.5), new THREE.MeshLambertMaterial({
    map: s3dTex(function (ctx, w, h) {
      ctx.fillStyle = '#162a1e'; ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 900; i++) {
        ctx.fillStyle = 'rgba(90,160,100,' + (0.12 + Math.random() * 0.28) + ')';
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
      ctx.fillStyle = 'rgba(255,220,160,.12)';
      for (var p = 0; p < 60; p++) {
        ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
      }
    }, 256, 128)
  }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // 公园拱门（双柱 + 弧顶 + 灯）
  [-1.9, 1.9].forEach(function (sx) {
    var p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.6, 0.4), s3dMat(0x3a4450));
    p.position.set(sx, 1.3, -2.2); scene.add(p);
    var ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), s3dBasic(0xffe8b0));
    ball.position.set(sx, 2.62, -2.2); scene.add(ball);
    var pl = new THREE.PointLight(0xffe0a0, 0.4, 3.5, 1.9);
    pl.position.set(sx, 2.5, -2.2); scene.add(pl);
  });
  // 拱门横梁
  var beam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.16, 0.35), s3dMat(0x3a4450));
  beam.position.set(0, 2.5, -2.2); scene.add(beam);
  // 门匾 "公园"
  var sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), new THREE.MeshBasicMaterial({ map: s3dTexSign('公园', '#8ad86a', '#101a14', 220, 60) }));
  sign.position.set(0, 2.42, -2.0); scene.add(sign);
  // 树丛（前后多棵）
  [-5.2, -3.8, 3.9, 5.4].forEach(function (sx, i) {
    var s = 0.8 + (i % 2) * 0.4;
    var tr = new THREE.Mesh(new THREE.ConeGeometry(0.75 * s, 1.8 * s, 8), s3dMat(0x2f6e50));
    tr.position.set(sx, 1.0 * s, 0.4); scene.add(tr);
    var tk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.55 * s, 6), s3dMat(0x5a4632));
    tk.position.set(sx, 0.25 * s, 0.4); scene.add(tk);
  });
  // 喷泉
  var pool = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.32, 12), s3dMat(0x5a728a));
  pool.position.set(0, 0.16, 0.9); scene.add(pool);
  var jet = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.8, 8), s3dBasic(0xbfe8ff));
  jet.position.set(0, 0.7, 0.9); scene.add(jet);
  // 长椅
  [-2.6, 2.8].forEach(function (sx) {
    var bt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.9), s3dMat(0x4a3a24));
    bt.position.set(sx, 0.25, 0.9); scene.add(bt);
    var bk = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.8), s3dMat(0x4a3a24));
    bk.position.set(sx, 0.5, 1.3); scene.add(bk);
  });
  // 路灯
  [-4.4, 4.4].forEach(function (sx) {
    var po = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 6), s3dMat(0x3a4248));
    po.position.set(sx, 1.1, -1.4); scene.add(po);
    var hd = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), s3dBasic(0xffe0a0));
    hd.position.set(sx, 2.3, -1.4); scene.add(hd);
    var pl = new THREE.PointLight(0xffc98a, 0.45, 4.5, 1.8);
    pl.position.set(sx, 2.15, -1.4); scene.add(pl);
  });
  // 远树剪影
  for (var bx = -8.5; bx <= 8.5; bx += 1.8) {
    var tr2 = new THREE.Mesh(new THREE.ConeGeometry(0.7 + ((bx * 7) % 5) * 0.2, 1.4, 7), s3dMat(0x0d1a12));
    tr2.position.set(bx, 0.7, -6.3); scene.add(tr2);
  }
  s3d.anims.push(function (t) {
    jet.scale.y = 1 + Math.sin(t * 2) * 0.3;
    warm.intensity = 0.5 + Math.sin(t * 0.6) * 0.06;
  });
}

/** 地点 → 3D 场景构建器 */
var s3dStoreCfgs = {
  jobmarket: { title: '人才市场', form: 'duplex', signStyle: 'led', wall: 'glass', signColor: '#ffb35c', signBg: '#141012', body: 0x232a36, door: 'glass2', ground: 'tile', extras: ['steps', 'lamps'], special: 'ledwall' },
  bar:       { title: 'BAR',     form: 'shop', signStyle: 'neon', wall: 'dark', signColor: '#ff8a5c', signBg: '#18101a', body: 0x2a1a20, door: 'store', ground: 'dark', extras: ['tables', 'neon'], special: 'neonball' },
  bank:      { title: '银行',     form: 'tower', signStyle: 'metal', wall: 'stone', signColor: '#7ad0ff', signBg: '#0a1420', body: 0x1a2434, door: 'bank', ground: 'plaza', extras: ['pillars', 'steps', 'lamps'], special: 'lions' },
  mall:      { title: 'MALL',     form: 'showcase', signStyle: 'neon', wall: 'glass', signColor: '#ff5c8a', signBg: '#14101e', body: 0x241a30, door: 'showroom', ground: 'plaza', extras: ['flags', 'neon'], special: 'mannequin' },
  stock:     { title: '交易大厅', form: 'tower', signStyle: 'led', wall: 'glass', signColor: '#5cff8a', signBg: '#06120a', body: 0x141e1c, door: 'glass2', ground: 'dark', extras: ['ledpanel', 'steps'], special: 'clockwheel' },
  carshop:   { title: '4S',       form: 'showcase', signStyle: 'neon', wall: 'glass', signColor: '#8ad0ff', signBg: '#0a1420', body: 0x1c2430, door: 'showroom', ground: 'plaza', extras: ['flags'], special: 'cartwheel' },
  foodstreet:{ title: '美食街',   form: 'lowwide', signStyle: 'board', wall: 'wood', signColor: '#ffb35c', signBg: '#160e08', body: 0x2a2430, door: 'none', ground: 'tile', extras: ['lanterns'], special: 'lanternstr' },
  nightmarket:{ title: '夜市',    form: 'lowwide', signStyle: 'board', wall: 'dark', signColor: '#ff5c5c', signBg: '#160a0a', body: 0x2a1a1a, door: 'none', ground: 'dark', extras: ['stalls', 'lanterns'], special: 'lanternstr' },
  wholesale: { title: '小商品批发', form: 'tower', signStyle: 'board', wall: 'panel', signColor: '#ffd05c', signBg: '#14120a', body: 0x242a36, door: 'shutter', ground: 'tile', special: 'crates' },
  market:    { title: '菜市场',   form: 'lowwide', signStyle: 'board', wall: 'panel', signColor: '#8ad86a', signBg: '#0a140a', body: 0x1e2622, door: 'none', ground: 'tile', extras: ['shed', 'crates'], special: 'pricelist' },
  dumpling:  { title: '饺子馆',   form: 'shop', signStyle: 'vertical', wall: 'wood', signColor: '#ffb35c', signBg: '#140e08', body: 0x2a2218, door: 'store', ground: 'tile', extras: ['lanterns'], special: 'steamer' },
  hotpot:    { title: '火锅店',   form: 'shop', signStyle: 'vertical', wall: 'brick', signColor: '#ff5c3c', signBg: '#140a08', body: 0x2a1616, door: 'store', ground: 'tile', extras: ['lanterns'], special: 'firepot' },
  malatang:  { title: '麻辣烫',   form: 'lowwide', signStyle: 'board', wall: 'wood', signColor: '#ff8a3c', signBg: '#140e08', body: 0x2a1e14, door: 'stall', ground: 'dark', extras: ['shed', 'lanterns'], special: 'firepot' },
  braised:   { title: '百味鸡',   form: 'shop', signStyle: 'board', wall: 'wood', signColor: '#ffd05c', signBg: '#140e06', body: 0x2a2014, door: 'store', ground: 'tile', extras: ['awning', 'lanterns'], special: 'grill' },
  estate:    { title: '房产中介', form: 'shop', signStyle: 'board', wall: 'plaster', signColor: '#5cd8ff', signBg: '#08141c', body: 0x1c2434, door: 'store', ground: 'tile', extras: ['signs', 'steps'], special: 'posters' },
  billiards: { title: '台球厅',   form: 'duplex', signStyle: 'neon', wall: 'dark', signColor: '#5cffd8', signBg: '#081418', body: 0x141e24, door: 'store', ground: 'dark', extras: ['neon'], special: 'neonball' },
  lottery:   { title: '彩票店',   form: 'shop', signStyle: 'led', wall: 'plaster', signColor: '#ff5cd8', signBg: '#12081a', body: 0x241a2a, door: 'store', ground: 'dark', extras: ['signs'], special: 'wheel' },
  training:  { title: '培训中心', form: 'duplex', signStyle: 'board', wall: 'brick', signColor: '#7ad8ff', signBg: '#08121c', body: 0x22283a, door: 'glass2', ground: 'tile', extras: ['steps', 'lamps', 'trees'], special: 'blackboard' },
  club:      { title: '会所',     form: 'duplex', signStyle: 'metal', wall: 'stone', signColor: '#ffd05c', signBg: '#141008', body: 0x2a2430, door: 'bank', ground: 'plaza', extras: ['pillars', 'lamps', 'awning'], special: 'carpet' },
  pvclub:    { title: '私人会所', form: 'duplex', signStyle: 'metal', wall: 'stone', signColor: '#c8a8ff', signBg: '#0e0818', body: 0x1c1830, door: 'bank', ground: 'dark', extras: ['pillars', 'trees', 'lamps', 'fence'], special: 'carpet' },
  flower:    { title: '花店',     form: 'shop', signStyle: 'vertical', wall: 'wood', signColor: '#ff8ad8', signBg: '#14081a', body: 0x2a2028, door: 'store', ground: 'tile', extras: ['flowers', 'awning'], special: 'flowers' },
  ghostmarket:{ title: '鬼市',    form: 'lowwide', signStyle: 'board', wall: 'dark', signColor: '#8affd8', signBg: '#020a08', body: 0x0e1a1a, door: 'stall', ground: 'dark', extras: ['stalls', 'fog'], special: 'ghostflame', bg: 0x030a0c },
  workplace: { title: '工作地点', form: 'tower', signStyle: 'metal', wall: 'glass', signColor: '#9ab8ff', signBg: '#0a1018', body: 0x1c2430, door: 'glass2', ground: 'plaza', extras: ['steps', 'lamps'], special: 'flagpole' }
};

var s3dPlaceBuilders = {
  ktv: buildKtvScene,
  adu: buildAduScene,
  home: buildHomeScene,
  park: buildParkScene
};
Object.keys(s3dStoreCfgs).forEach(function (k) {
  s3dPlaceBuilders[k] = (function (cfg) { return function () { buildStoreScene(cfg); }; })(s3dStoreCfgs[k]);
});
var s3dCurrentPlace = '';

/** 切换主页面 3D 场景到当前地点（未定制的地址回退默认大街场景） */
function s3dSwitchPlace(id) {
  if (!s3d.ready || id === s3dCurrentPlace) return;
  s3dCurrentPlace = id;
  s3d.anims = [];
  s3d.scene.clear();
  s3d.scene.background = new THREE.Color(0x04060d);
  s3d.scene.fog = new THREE.Fog(0x04060d, 16, 32);
  var b = s3dPlaceBuilders[id] || buildCityScene;
  b();
  // 重置运镜，避免切换时突兀
  s3d.camX = 0; s3d.camY = 0; s3d.camAngle = 0;
}

/* ============ 城市地图 3D 微缩沙盘（Three.js 俯视城市：楼群 / 行人 / 汽车） ============ */
var _map3d = null;

/** 楼群窗格贴图：暗墙底 + 随机暖色亮窗 */
function m3dWindowTex() {
  var c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  var x = c.getContext('2d');
  x.fillStyle = '#0b1220';
  x.fillRect(0, 0, 256, 256);
  // 规整窗格网格（8 列 × 6 行）
  var cw = 26, ch = 36, gap = 4;
  for (var row = 0; row < 6; row++) {
    for (var col = 0; col < 8; col++) {
      var px = 6 + col * (cw + gap), py = 6 + row * (ch + gap);
      var lit = Math.random() < 0.66;
      if (lit) {
        var glow = 0.5 + Math.random() * 0.5;
        x.fillStyle = 'rgba(255,' + Math.floor(178 + Math.random() * 52) + ',' + Math.floor(86 + Math.random() * 76) + ',' + glow + ')';
        x.fillRect(px, py, cw, ch);
        x.fillStyle = 'rgba(255,214,110,.4)';
        x.fillRect(px + cw / 2 - 1.2, py + ch / 2 - 1.2, 2.4, 2.4);
      } else {
        x.fillStyle = 'rgba(28,40,58,.95)';
        x.fillRect(px, py, cw, ch);
        // 暗窗微反光
        x.fillStyle = 'rgba(140,170,220,.06)';
        x.fillRect(px + 2, py + 2, cw / 2 - 3, ch / 2 - 3);
      }
    }
  }
  // 楼体分隔线 + 霓虹窗框
  x.strokeStyle = 'rgba(6,10,16,.8)';
  x.lineWidth = 3;
  for (var gx = 0; gx <= 256; gx += cw + gap) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, 256); x.stroke(); }
  for (var gy = 0; gy <= 256; gy += ch + gap) { x.beginPath(); x.moveTo(0, gy); x.lineTo(256, gy); x.stroke(); }
  x.strokeStyle = 'rgba(120,170,255,.28)';
  x.lineWidth = 2;
  x.strokeRect(2, 2, 252, 252);
  var t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** 沥青路面贴图：颗粒噪点 + 细微裂缝 */
function m3dRoadTex() {
  var c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  var x = c.getContext('2d');
  x.fillStyle = '#18202b';
  x.fillRect(0, 0, 256, 256);
  // 细腻沥青颗粒（三层：亮/暗/杂色）
  for (var i = 0; i < 2600; i++) {
    var g = 24 + Math.random() * 30;
    x.fillStyle = 'rgba(' + g + ',' + (g + 4) + ',' + (g + 10) + ',' + (0.35 + Math.random() * 0.4) + ')';
    x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 1.6, 1 + Math.random() * 1.6);
  }
  // 发丝级裂缝
  x.strokeStyle = 'rgba(8,12,18,.35)';
  x.lineWidth = 0.8;
  for (var k = 0; k < 30; k++) {
    x.beginPath();
    x.moveTo(Math.random() * 256, Math.random() * 256);
    x.lineTo(Math.random() * 256, Math.random() * 256);
    x.stroke();
  }
  // 沥青修补块（深色补丁）
  for (var p = 0; p < 5; p++) {
    var px = Math.random() * 210 + 10, py = Math.random() * 210 + 10;
    x.fillStyle = 'rgba(12,16,24,.4)';
    x.beginPath();
    x.ellipse(px, py, 8 + Math.random() * 18, 6 + Math.random() * 12, Math.random() * 3, 0, Math.PI * 2);
    x.fill();
  }
  // 车辙微痕（横向细条）
  x.fillStyle = 'rgba(10,14,22,.18)';
  for (var r = 0; r < 6; r++) {
    var ry = Math.random() * 256;
    x.fillRect(0, ry, 256, 1.5);
  }
  var t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

/** 人行道砖纹贴图：砖缝 + 微色差 */
function m3dSideTex() {
  var c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  var x = c.getContext('2d');
  x.fillStyle = '#2c3644';
  x.fillRect(0, 0, 128, 128);
  // 错缝砖块铺装（每砖 16×32，隔行错半块）
  var bw = 16, bh = 32;
  for (var row = 0; row < 4; row++) {
    for (var col = 0; col < 8; col++) {
      var px = col * bw + (row % 2) * (bw / 2), py = row * bh;
      var v = 42 + Math.random() * 12;
      x.fillStyle = 'rgb(' + v + ',' + (v + 5) + ',' + (v + 14) + ')';
      x.fillRect(px, py, bw - 2, bh - 2);
      // 砖面颗粒
      for (var i = 0; i < 8; i++) {
        x.fillStyle = 'rgba(10,16,26,' + (0.05 + Math.random() * 0.12) + ')';
        x.fillRect(px + Math.random() * (bw - 6), py + Math.random() * (bh - 6), 2, 2);
      }
      // 砖缝描边
      x.strokeStyle = 'rgba(10,15,24,.7)';
      x.lineWidth = 1;
      x.strokeRect(px, py, bw - 2, bh - 2);
    }
  }
  // 整体积灰/磨损
  x.fillStyle = 'rgba(0,0,0,.08)';
  x.fillRect(0, 0, 128, 128);
  var t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/** 道路中线虚线贴图 */
function m3dDashTex() {
  var c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  var x = c.getContext('2d');
  x.clearRect(0, 0, 64, 64);
  x.strokeStyle = 'rgba(255,205,96,.5)';
  x.lineWidth = 5;
  x.setLineDash([18, 14]);
  x.beginPath(); x.moveTo(32, 0); x.lineTo(32, 64); x.stroke();
  var t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** 楼顶贴图：深色屋面 + 网格 + 顶部设备（正俯视可见） */
function m3dRoofTex() {
  var c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  var x = c.getContext('2d');
  x.fillStyle = '#121a2b';
  x.fillRect(0, 0, 256, 256);
  // 屋面铺装网格（更细）
  x.strokeStyle = 'rgba(150,180,220,.12)';
  x.lineWidth = 1;
  for (var gx = 0; gx <= 256; gx += 16) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, 256); x.stroke(); }
  for (var gy = 0; gy <= 256; gy += 16) { x.beginPath(); x.moveTo(0, gy); x.lineTo(256, gy); x.stroke(); }
  // 边缘护栏（双层）
  x.strokeStyle = 'rgba(180,210,250,.4)';
  x.lineWidth = 4;
  x.strokeRect(2, 2, 252, 252);
  x.strokeStyle = 'rgba(255,255,255,.14)';
  x.lineWidth = 1;
  x.strokeRect(5, 5, 246, 246);
  // 天台走道虚线
  x.strokeStyle = 'rgba(140,170,215,.2)';
  x.setLineDash([8, 10]);
  x.beginPath(); x.moveTo(16, 16); x.lineTo(240, 16); x.lineTo(240, 240); x.lineTo(16, 240); x.closePath(); x.stroke();
  x.setLineDash([]);
  // 设备：机房 / 水箱 / 亮灯
  for (var k = 0; k < 14; k++) {
    var dx = 14 + Math.random() * 220, dy = 14 + Math.random() * 220;
    var dw = 12 + Math.random() * 22, dh = 9 + Math.random() * 14;
    x.fillStyle = 'rgba(52,72,100,.9)';
    x.fillRect(dx, dy, dw, dh);
    x.strokeStyle = 'rgba(120,150,195,.6)';
    x.lineWidth = 1.2;
    x.strokeRect(dx, dy, dw, dh);
    if (Math.random() < 0.6) {
      x.fillStyle = 'rgba(255,214,110,.5)';
      x.fillRect(dx + dw - 6, dy + 2, 4, 4);
    }
  }
  // 空调外机阵列（规整点阵）
  for (var ax = 0; ax < 8; ax++) {
    for (var ay = 0; ay < 4; ay++) {
      x.fillStyle = 'rgba(70,90,120,.5)';
      x.fillRect(38 + ax * 24 + (ay % 2) * 12, 60 + ay * 22, 14, 9);
    }
  }
  // 通风管道线
  x.strokeStyle = 'rgba(90,115,150,.35)';
  x.lineWidth = 3;
  x.beginPath(); x.moveTo(90, 40); x.lineTo(140, 40); x.lineTo(140, 130);
  x.stroke();
  // 楼顶积水/斑驳
  for (var b = 0; b < 40; b++) {
    x.fillStyle = 'rgba(90,120,160,' + (0.04 + Math.random() * 0.08) + ')';
    x.fillRect(Math.random() * 240 + 8, Math.random() * 240 + 8, 3 + Math.random() * 10, 2 + Math.random() * 6);
  }
  var tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

/** 创建一个人（微缩小人，带走路摆动） */
function m3dPerson(clr, skin) {
  var g = new THREE.Group();
  // 身体：窄身（人行道宽 0.34），布料质感 + 弱自发光
  var body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.095, 0.4, 7),
    new THREE.MeshStandardMaterial({
      color: clr, roughness: .45, metalness: .1,
      emissive: clr, emissiveIntensity: .16
    })
  );
  body.position.y = 0.23;
  // 头部：肤色 + 微反光
  var head = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 8),
    new THREE.MeshStandardMaterial({ color: skin || 0xd8b49a, roughness: .4, metalness: .05 })
  );
  head.position.y = 0.52;
  g.add(body, head);
  return g;
}

/** 创建一辆车：尺寸适配车道（宽 0.44 ≤ 车道 0.5），带轮子/车窗/前后灯 */
function m3dCar(clr) {
  var g = new THREE.Group();
  var bodyMat = new THREE.MeshStandardMaterial({ color: clr, roughness: .26, metalness: .68 });
  var glassMat = new THREE.MeshStandardMaterial({
    color: 0x0e1a2a, roughness: .1, metalness: .9,
    transparent: true, opacity: .82, emissive: 0x0a1a2e, emissiveIntensity: .4
  });
  var body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.44), bodyMat);
  body.position.y = 0.16;
  var cab = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.2, 0.38), glassMat);
  cab.position.y = 0.33;
  var wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: .9 });
  [[-0.34, 0.09, 0.23], [0.34, 0.09, 0.23], [-0.34, 0.09, -0.23], [0.34, 0.09, -0.23]].forEach(function (w) {
    var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 8), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(w[0], w[1], w[2]);
    g.add(wheel);
  });
  // 前灯（暖白）+ 尾灯（红）
  var headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  var tailMat = new THREE.MeshBasicMaterial({ color: 0xff5540 });
  var h1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05), headMat); h1.position.set(0.55, 0.16, 0.16);
  var h2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05), headMat); h2.position.set(0.55, 0.16, -0.16);
  var t1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05), tailMat); t1.position.set(-0.55, 0.16, 0.16);
  var t2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05), tailMat); t2.position.set(-0.55, 0.16, -0.16);
  g.add(body, cab, h1, h2, t1, t2);
  return g;
}

/** 初始化地图 3D 场景（惰性：首次打开地图时创建） */
function initMap3D() {
  var wrap = document.getElementById('city-map');
  var canvas = document.getElementById('map3d');
  if (!wrap || !canvas || typeof THREE === 'undefined') return;
  var W = Math.max(wrap.clientWidth, 300);
  var H = Math.max(wrap.clientHeight, 180);
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H);
  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b1220, 24, 44);
  // 底部夜色地面：覆盖整个视野，保证弹窗 100% 铺满无露边
  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 44),
    new THREE.MeshStandardMaterial({ color: 0x0b1322, roughness: .97, metalness: .02 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
  scene.add(ground);
  var camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 200);
  // 自适应铺满：按地图内容（高 11.0 / 宽 19.8）fit，微放大 1.03 让内容撑满弹窗
  var tanF = Math.tan(camera.fov * Math.PI / 360);
  var fitY = Math.max(11.0 / (2 * tanF), 19.8 / (2 * tanF * (W / H))) * 1.03;
  camera.position.set(0, fitY, 0.02);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);

  /* —— 灯光：冷蓝夜色 + 中心暖光 —— */
  scene.add(new THREE.AmbientLight(0x445577, 1.15));
  var key = new THREE.DirectionalLight(0x88aaff, 0.85);
  key.position.set(6, 18, 8);
  scene.add(key);
  var centerGlow = new THREE.PointLight(0xffb85c, 1.5, 32);
  centerGlow.position.set(0, 1.4, 0);
  scene.add(centerGlow);
  var rim = new THREE.DirectionalLight(0x5a6f9e, 0.35);
  rim.position.set(-8, 6, -6);
  scene.add(rim);

  /* —— 地面 —— */
  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(17.6, 10.8),
    new THREE.MeshStandardMaterial({ color: 0x0e1726, roughness: .92, metalness: .05 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  /* —— 街道：沥青路面 + 两侧人行道 + 车道白实线 + 中线黄虚线 + 路口斑马线 —— */
  var roadMat = new THREE.MeshStandardMaterial({ map: m3dRoadTex(), roughness: .92, metalness: .05 });
  var sideMat = new THREE.MeshStandardMaterial({ map: m3dSideTex(), roughness: .85, metalness: .06 });
  var lineMat = new THREE.MeshBasicMaterial({ color: 0xb8c8dc, transparent: true, opacity: .6, depthWrite: false });
  var dashTex = m3dDashTex();
  var roads = [
    { axis: 'v', p: -3.4 }, { axis: 'v', p: 0.6 }, { axis: 'v', p: 4.7 },
    { axis: 'h', p: -0.7 }, { axis: 'h', p: 2.0 }
  ];
  roads.forEach(function (r) {
    var isV = r.axis === 'v';
    var L = isV ? 10.8 : 17.6;
    // 路面
    var m = new THREE.Mesh(
      new THREE.PlaneGeometry(isV ? 1.05 : L, isV ? L : 1.05),
      roadMat
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(isV ? r.p : 0, 0.028, isV ? 0 : r.p);
    scene.add(m);
    // 两侧人行道
    [-1, 1].forEach(function (sd) {
      var s = new THREE.Mesh(
        new THREE.PlaneGeometry(isV ? 0.34 : L, isV ? L : 0.34),
        sideMat
      );
      s.rotation.x = -Math.PI / 2;
      if (isV) { s.position.set(r.p + sd * 0.7, 0.034, 0); } else { s.position.set(0, 0.034, r.p + sd * 0.7); }
      scene.add(s);
    });
    // 中线黄虚线
    var d = new THREE.Mesh(
      new THREE.PlaneGeometry(isV ? 0.06 : L, isV ? L : 0.06),
      new THREE.MeshBasicMaterial({ map: dashTex, transparent: true, depthWrite: false })
    );
    d.rotation.x = -Math.PI / 2;
    d.position.set(isV ? r.p : 0, 0.055, isV ? 0 : r.p);
    scene.add(d);
  });
  // 路口斑马线（6 个交叉点）
  var vPs = [-3.4, 0.6, 4.7], hPs = [-0.7, 2.0];
  var zebraMat = new THREE.MeshBasicMaterial({ color: 0xcfd6e2, transparent: true, opacity: .5, depthWrite: false });
  var stopMat = new THREE.MeshBasicMaterial({ color: 0xc8d4e4, transparent: true, opacity: .6, depthWrite: false });
  vPs.forEach(function (vx) {
    hPs.forEach(function (hz) {
      for (var zi = -2; zi <= 2; zi++) {
        var z1 = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.12), zebraMat);
        z1.rotation.x = -Math.PI / 2;
        z1.position.set(vx, 0.062, hz + zi * 0.22);
        scene.add(z1);
        var z2 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.8), zebraMat);
        z2.rotation.x = -Math.PI / 2;
        z2.position.set(vx + zi * 0.22, 0.062, hz);
        scene.add(z2);
      }
      // 停止线（斑马线后 0.55，横跨本向半幅路面）
      [-0.55, 0.55].forEach(function (of) {
        var st1 = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 0.045), stopMat);
        st1.rotation.x = -Math.PI / 2;
        st1.position.set(vx, 0.07, hz + of);
        scene.add(st1);
        var st2 = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 1.02), stopMat);
        st2.rotation.x = -Math.PI / 2;
        st2.position.set(vx + of, 0.07, hz);
        scene.add(st2);
      });
    });
  });

  /* —— 楼群（避开道路，分布于 3×4 街区；正俯视：顶面屋顶贴图，侧面霓虹窗格） —— */
  var winTex = m3dWindowTex();
  var roofTex = m3dRoofTex();
  var blocks = [];
  function addBlock(x, z, w, d, h) {
    var side = new THREE.MeshStandardMaterial({
      map: winTex, roughness: .7, metalness: .15,
      emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: .8
    });
    var roof = new THREE.MeshStandardMaterial({
      map: roofTex, roughness: .85, metalness: .1,
      emissive: 0x35455f, emissiveMap: roofTex, emissiveIntensity: .4
    });
    // Box 面序：+x -x +y -y +z -z → 顶面 +y 用屋顶贴图
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roof, side, side, side]);
    mesh.position.set(x, h / 2, z);
    scene.add(mesh);
    blocks.push(mesh);
    return mesh;
  }
  // 街区布局：左带 x∈[-7,-4]、中左 x∈[-2.5,0.2]、中右 x∈[1,3.8]、右带 x∈[5.2,7.6]
  // 横带 z∈[-3.8,-1.2]（上）、z∈[-0.1,1.4]（中）、z∈[2.6,4.1]（下）
  var specs = [];
  // 楼群严格按街区网格排布：道路带（含人行道）绝不放楼
  // 街区 x 中心：-6.53 / -1.40 / 2.65 / 7.18；上排 z=-3.48，中排 z=0.65，下排 z=4.13
  // 上排街区1（宽街区 3 栋）
  addBlock(-8.1, -3.48, 1.0, 1.05, 1.5);
  addBlock(-6.9, -3.48, 1.2, 1.1, 1.9);
  addBlock(-5.7, -3.48, 1.0, 1.05, 1.6);
  // 上排街区2/3（窄街区 2 栋）
  addBlock(-2.0, -3.48, 0.95, 1.05, 1.7);
  addBlock(-0.8, -3.48, 0.95, 1.05, 1.4);
  addBlock(2.05, -3.48, 0.95, 1.05, 1.5);
  addBlock(3.25, -3.48, 0.95, 1.05, 1.8);
  // 上排街区4（2 栋）
  addBlock(6.33, -3.48, 1.0, 1.05, 1.6);
  addBlock(8.03, -3.48, 1.0, 1.05, 1.5);
  // 上排地标（街区1 中央）
  addBlock(-6.9, -3.48, 1.15, 1.1, 3.0);

  // 下排街区（z=4.13）
  addBlock(-8.1, 4.13, 1.0, 1.05, 1.45);
  addBlock(-6.9, 4.13, 1.2, 1.1, 1.8);
  addBlock(-5.7, 4.13, 1.0, 1.05, 1.55);
  addBlock(-2.0, 4.13, 0.95, 1.05, 1.6);
  addBlock(-0.8, 4.13, 0.95, 1.05, 1.35);
  addBlock(2.05, 4.13, 0.95, 1.05, 1.45);
  addBlock(3.25, 4.13, 0.95, 1.05, 1.7);
  addBlock(6.33, 4.13, 1.0, 1.05, 1.5);
  addBlock(8.03, 4.13, 1.0, 1.05, 1.65);
  // 下排地标（街区4 右侧）
  addBlock(8.03, 4.13, 1.0, 1.05, 2.6);

  // 中排街区（窄深楼，恰好夹在两条横路之间）
  addBlock(-6.53, 0.65, 1.1, 0.8, 1.7);
  addBlock(-1.40, 0.65, 0.9, 0.8, 1.5);
  addBlock(2.65, 0.65, 0.95, 0.8, 1.8);
  addBlock(7.18, 0.65, 1.0, 0.8, 1.6);

  // 左右边缘贴边楼（仅贴地图边缘，不压路）
  [[-9.35, -3.48, 1.5, 1.1, 1.5], [-9.35, 0.65, 1.5, 0.8, 1.7], [-9.35, 4.13, 1.5, 1.1, 1.4],
   [9.35, -3.48, 1.5, 1.1, 1.5], [9.35, 0.65, 1.5, 0.8, 1.7], [9.35, 4.13, 1.5, 1.1, 1.4]].forEach(function (b) { addBlock(b[0], b[1], b[2], b[3], b[4]); });

  /* —— 路灯：沿道路两侧布置（杆 + 暖光灯头） —— */
  function m3dLamp(x, z, ry) {
    var g = new THREE.Group();
    var pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.055, 1.15, 6),
      new THREE.MeshStandardMaterial({ color: 0x3c485c, roughness: .55, metalness: .45 })
    );
    pole.position.y = 0.58;
    var head = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffeeb0 })
    );
    head.position.set(0.28, 1.06, 0);
    var glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: .26, depthWrite: false })
    );
    glow.position.copy(head.position);
    // 点光：照亮地面（distance 3.5，柔和衰减，范围适中不扩散过大）
    var light = new THREE.PointLight(0xffd98a, 1.15, 3.5, 1.6);
    light.position.set(0.28, 0.95, 0);
    g.add(pole, head, glow, light);
    g.position.set(x, 0, z);
    g.rotation.y = ry || 0;
    scene.add(g);
    return g;
  }
  // 路灯：避开十字路口（路口区 ±1.2），只分布在路段中段，灯头朝向路面（真实城市分布）
  // 竖路人行道（x = vx ± 0.80）：下段 z=-3.3 / 上段 z=3.9 各 1 盏，左右侧交替
  [-3.4, 0.6, 4.7].forEach(function (vx) {
    m3dLamp(vx - 0.80, -3.3, 0);          // 左侧下段：灯头朝 +x（路面）
    m3dLamp(vx + 0.80, 3.9, Math.PI);     // 右侧上段：灯头朝 -x（路面）
  });
  // 横路人行道（z = hz ± 0.80）：4 段各 1 盏（x=-6.2 / -1.4 / 2.6 / 6.6，全部远离路口），上下侧交替
  [-0.7, 2.0].forEach(function (hz) {
    m3dLamp(-6.2, hz - 0.80, -Math.PI / 2);  // 上侧左段：灯头朝 +z（路面）
    m3dLamp(-1.4, hz + 0.80, Math.PI / 2);   // 下侧左中段：灯头朝 -z（路面）
    m3dLamp(2.6, hz - 0.80, -Math.PI / 2);   // 上侧右中段：灯头朝 +z（路面）
    m3dLamp(6.6, hz + 0.80, Math.PI / 2);    // 下侧右段：灯头朝 -z（路面）
  });

  /* —— 树木：街区角落与广场（树干 + 树冠） —— */
  function m3dTree(x, z, s) {
    var g = new THREE.Group();
    var trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05 * s, 0.075 * s, 0.5 * s, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: .9 })
    );
    trunk.position.y = 0.26 * s;
    var crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.46 * s, 0.72 * s, 8),
      new THREE.MeshStandardMaterial({ color: 0x2f6e50, roughness: .85, emissive: 0x0b2418, emissiveIntensity: .3 })
    );
    crown.position.y = 0.78 * s;
    // 树影：月光向左上投影，增加仿真感
    var sh = new THREE.Mesh(
      new THREE.CircleGeometry(0.36 * s, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .3, depthWrite: false })
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(0.2, 0.012, 0.16);
    g.add(trunk, crown, sh);
    g.position.set(x, 0, z);
    scene.add(g);
    return g;
  }
  // 树木：同样避开十字路口，只分布在路段中段，与路灯左右错开（真实城市行道树）
  // 竖路人行道：右侧下段 z=-3.3 / 左侧上段 z=3.9（与路灯相反侧）
  [-3.4, 0.6, 4.7].forEach(function (vx) {
    m3dTree(vx + 0.80, -3.3, 0.6 + Math.random() * 0.1);
    m3dTree(vx - 0.80, 3.9, 0.6 + Math.random() * 0.1);
  });
  // 横路人行道：与路灯相反侧交替（上侧 x=-1.4/6.6、下侧 x=-6.2/2.6）
  [-0.7, 2.0].forEach(function (hz) {
    m3dTree(-1.4, hz - 0.80, 0.6 + Math.random() * 0.1);
    m3dTree(6.6, hz - 0.80, 0.6 + Math.random() * 0.1);
    m3dTree(-6.2, hz + 0.80, 0.6 + Math.random() * 0.1);
    m3dTree(2.6, hz + 0.80, 0.6 + Math.random() * 0.1);
  });

  /* —— 行人：沿道路行走（横路 z=-0.7 / 2.0，竖路 x=-3.4 / 0.6 / 4.7） —— */
  // 行人：只在人行道上走（人行道中心 = 路中心 ± 0.70）
  var walkers = [];
  var sideWalks = [
    { axis: 'h', line: -1.32 }, { axis: 'h', line: -0.08 },
    { axis: 'h', line: 1.38 }, { axis: 'h', line: 2.62 },
    { axis: 'v', line: -4.02 }, { axis: 'v', line: -2.78 },
    { axis: 'v', line: -0.02 }, { axis: 'v', line: 1.22 },
    { axis: 'v', line: 4.08 }, { axis: 'v', line: 5.32 }
  ];
  var pClrs = [0x4a6ba8, 0x8a5a7a, 0x5a8a6a, 0x9a7a4a, 0x6a7a9a, 0xb06060, 0x60a0b0, 0x8a90c0];
  var pSkins = [0xd8b49a, 0xc89a80, 0xb88a70, 0xe0c0a8];
  for (var i = 0; i < 16; i++) {
    var sw = sideWalks[i % sideWalks.length];
    var dir = Math.random() < 0.5 ? -1 : 1;
    var start = sw.axis === 'h' ? -7.4 + Math.random() * 14.8 : -4.5 + Math.random() * 9.0;
    var p = m3dPerson(pClrs[i % pClrs.length], pSkins[i % pSkins.length]);
    if (sw.axis === 'h') { p.position.set(start, 0, sw.line); p.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { p.position.set(sw.line, 0, start); p.rotation.y = dir > 0 ? 0 : Math.PI; }
    scene.add(p);
    walkers.push({ g: p, axis: sw.axis, lane: sw.line, dir: dir, pos: start, speed: 0.55 + Math.random() * 0.45, phase: Math.random() * 6 });
  }

  /* —— 汽车：沿横路行驶 —— */
  var cars = [];
  var cClrs = [0xd8b860, 0x9ac0e8, 0xd08080, 0x88c0a0, 0xb090d0, 0xe0a050];
  // 车流：3 辆横路（沿 x）+ 3 辆竖路（沿 z），车身长轴始终对齐行进方向
  var carPlans = [
    { axis: 'h', lane: -0.7, side: 1, start: 5 },
    { axis: 'h', lane: -0.7, side: -1, start: -3 },
    { axis: 'h', lane: 2.0, side: 1, start: -7 },
    { axis: 'v', lane: -3.4, side: 1, start: 2 },
    { axis: 'v', lane: 0.6, side: -1, start: -3 },
    { axis: 'v', lane: 4.7, side: 1, start: 1 }
  ];
  carPlans.forEach(function (pl, j) {
    var dir2 = Math.random() < 0.5 ? -1 : 1;
    var c = m3dCar(cClrs[j % cClrs.length]);
    var off = pl.side * 0.26; // 车道中心（±0.26）
    var pos = pl.start + (Math.random() * 2 - 1) * 0.5;
    if (pl.axis === 'h') {
      c.rotation.y = dir2 > 0 ? 0 : Math.PI; // 长轴朝 x
      c.position.set(pos, 0, pl.lane + off);
    } else {
      c.rotation.y = dir2 > 0 ? Math.PI / 2 : -Math.PI / 2; // 长轴朝 z
      c.position.set(pl.lane + off, 0, pos);
    }
    scene.add(c);
    cars.push({ g: c, axis: pl.axis, lane: pl.lane, dir: dir2, pos: pos, speed: 1.5 + Math.random() * 1.2 });
  });

  _map3d = {
    renderer: renderer, scene: scene, camera: camera,
    walkers: walkers, cars: cars, blocks: blocks,
    angle: 0.9, running: false, raf: null, clock: new THREE.Clock()
  };
}

/** 启动地图 3D 动画（打开地图时调用） */
function startMap3D() {
  var wrap = document.getElementById('city-map');
  var canvas = document.getElementById('map3d');
  if (!wrap || !canvas) return;
  if (!_map3d) initMap3D();
  if (!_map3d) return;
  if (_map3d.running) return;
  var w = wrap.clientWidth, h = wrap.clientHeight;
  if (w > 50 && h > 50) {
    _map3d.renderer.setSize(w, h);
    _map3d.camera.aspect = w / h;
    _map3d.camera.updateProjectionMatrix();
  }
  _map3d.running = true;
  _map3d.clock.getDelta();
  function frame() {
    if (!_map3d || !_map3d.running) return;
    var dt = Math.min(_map3d.clock.getDelta(), 0.05);
    var t = _map3d.clock.elapsedTime;
    var s3d = _map3d;
    // 行人移动
    s3d.walkers.forEach(function (wk) {
      wk.pos += wk.dir * wk.speed * dt;
      if (wk.axis === 'h') {
        if (wk.pos > 7.9) { wk.pos = -7.9; }
        if (wk.pos < -7.9) { wk.pos = 7.9; }
        wk.g.position.x = wk.pos;
      } else {
        if (wk.pos > 4.9) { wk.pos = -4.9; }
        if (wk.pos < -4.9) { wk.pos = 4.9; }
        wk.g.position.z = wk.pos;
      }
      // 走路摆动
      var bob = Math.sin(t * 7 + wk.phase) * 0.04;
      wk.g.position.y = Math.abs(bob) * 0.5;
      wk.g.rotation.z = Math.sin(t * 7 + wk.phase) * 0.16;
    });
    // 汽车行驶
    s3d.cars.forEach(function (car) {
      car.pos += car.dir * car.speed * dt;
      if (car.pos > 8.2) { car.pos = -8.2; }
      if (car.pos < -8.2) { car.pos = 8.2; }
      if (car.axis === 'h') { car.g.position.x = car.pos; }
      else { car.g.position.z = car.pos; }
    });
    // 相机固定正俯视（不旋转）
    s3d.renderer.render(s3d.scene, s3d.camera);
    s3d.raf = requestAnimationFrame(frame);
  }
  _map3d.raf = requestAnimationFrame(frame);
}

/** 停止地图 3D 动画（关闭地图时调用） */
function stopMap3D() {
  if (!_map3d) return;
  _map3d.running = false;
  if (_map3d.raf) cancelAnimationFrame(_map3d.raf);
  _map3d.raf = null;
}
