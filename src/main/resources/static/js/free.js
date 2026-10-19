/* ============================================================
   城市自由模式 v72 · 第三人称 3D 城市漫游（高仿真画质）
   WASD 移动 / 按住鼠标左键拖拽视角 / E 进入地点 / 小地图雷达
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 地图数据（与主游戏 MAP_LOCS 一致） ---------- */
  var MAP_LOCS = [
    { id: 'jobmarket',  name: '人才市场', icon: '🏢', x: 10, y: 19, type: '招聘', color: 0x29b6f6 },
    { id: 'bar',        name: '酒吧',     icon: '🍸', x: 24, y: 20, type: '夜生活', color: 0x7c6cff },
    { id: 'bank',       name: '银行',     icon: '🏦', x: 54, y: 15, type: '金融', color: 0xdfe6f0 },
    { id: 'mall',       name: '商场',     icon: '🛍️', x: 72, y: 12, type: '购物', color: 0x3a7dff },
    { id: 'stock',      name: '交易大厅', icon: '📈', x: 90, y: 17, type: '金融', color: 0x22d3aa },
    { id: 'carshop',    name: '4S店',     icon: '🚗', x: 76, y: 26, type: '汽车', color: 0xff9d5c },
    { id: 'foodstreet', name: '美食街',   icon: '🍜', x: 50, y: 32, type: '美食', color: 0xffb454 },
    { id: 'nightmarket',name: '夜市',     icon: '🏮', x: 34, y: 34, type: '美食', color: 0xff5a6e },
    { id: 'wholesale',  name: '小商品批发', icon: '📦', x: 7, y: 37, type: '购物', color: 0xaab7c4 },
    { id: 'market',     name: '菜市场',   icon: '🥬', x: 20, y: 44, type: '生活', color: 0x8bc34a },
    { id: 'dumpling',   name: '饺子馆',   icon: '🥟', x: 92, y: 36, type: '美食', color: 0xc96f4a },
    { id: 'hotpot',     name: '火锅店',   icon: '🔥', x: 62, y: 44, type: '美食', color: 0xcf4d3a },
    { id: 'malatang',   name: '地摊麻辣烫', icon: '🍲', x: 58, y: 68, type: '美食', color: 0x9a5f3c },
    { id: 'braised',    name: '百味鸡',   icon: '🍗', x: 30, y: 54, type: '美食', color: 0x8d5a3a },
    { id: 'street',     name: '大街',     icon: '🏙️', x: 52, y: 55, type: '地标', color: 0x6a7a99 },
    { id: 'estate',     name: '房产中介', icon: '🏘️', x: 16, y: 64, type: '置业', color: 0x4dd0e1 },
    { id: 'billiards',  name: '台球厅',   icon: '🎱', x: 88, y: 56, type: '休闲', color: 0x3f51b5 },
    { id: 'lottery',    name: '彩票店',   icon: '🎰', x: 70, y: 58, type: '娱乐', color: 0xffd54f },
    { id: 'training',   name: '培训中心', icon: '🎓', x: 36, y: 68, type: '教育', color: 0x7e57c2 },
    { id: 'adu',        name: '成人大学', icon: '🏛️', x: 50, y: 70, type: '教育', color: 0xffb74d },
    { id: 'park',       name: '城市公园', icon: '🌳', x: 90, y: 74, type: '休闲', color: 0x4caf6e },
    { id: 'club',       name: '会所',     icon: '🥂', x: 72, y: 78, type: '夜生活', color: 0xd4af37 },
    { id: 'ktv',        name: 'KTV',      icon: '🎤', x: 78, y: 82, type: '夜生活', color: 0xff4fd8 },
    { id: 'pvclub',     name: '私人会所', icon: '💆', x: 62, y: 84, type: '夜生活', color: 0xc084fc },
    { id: 'flower',     name: '花店',     icon: '🌷', x: 44, y: 82, type: '生活', color: 0xff8fab },
    { id: 'ghostmarket',name: '鬼市',     icon: '🕯️', x: 8, y: 86, type: '神秘', color: 0x6d4c41 },
    { id: 'home',       name: '住处',     icon: '🏠', x: 56, y: 88, type: '居所', color: 0xf3e5ab },
    { id: 'workplace',  name: '工作地点', icon: '💼', x: 28, y: 90, type: '职场', color: 0x90a4ae }
  ];
  var LOC_META = {
    jobmarket: ['在这里求职、面试，找到人生第一份正式工作。', ['求职', '面试', '招工']],
    bar: ['夜色的庇护所，点一杯鸡尾酒放松身心，也可能遇到有趣的陌生人。', ['鸡尾酒', '夜场', '社交']],
    bank: ['存取款、办理业务，是这座城市里最稳固的金钱中转站。', ['存款', '取款', '理财']],
    mall: ['琳琅满目的商场，购物、闲逛，刷卡一时爽。', ['购物', '奢侈品']],
    stock: ['交易大厅，K 线跳动的背后是机遇与风险。', ['炒股', 'K线', '行情']],
    carshop: ['4S 店，挑一辆心仪的车，从此出行自由。', ['买车', '试驾']],
    foodstreet: ['一整条街的美食，从街头吃到街尾。', ['小吃', '夜宵']],
    nightmarket: ['华灯初上，夜市里藏着这座城市最热闹的人间烟火。', ['小吃', '地摊', '灯笼']],
    wholesale: ['小商品批发市场，进货、砍价、做点小生意。', ['批发', '进货']],
    market: ['菜市场，讨价还价的烟火气，最新鲜的食材。', ['买菜', '讲价']],
    dumpling: ['热气腾腾的饺子馆，一口咬下去都是家的味道。', ['水饺', '夜宵']],
    hotpot: ['红油翻滚的火锅店，越夜越沸腾。', ['火锅', '麻辣']],
    malatang: ['街边麻辣烫，一人一锅，自选随心。', ['麻辣烫', '路边摊']],
    braised: ['卤味飘香的百味鸡，酱香浓郁，回味无穷。', ['卤味', '烧鸡']],
    street: ['这座城市的主干道，人来人往，故事每天都在发生。', ['地标', '主干道']],
    estate: ['房产中介，帮你在这座城市安一个家。', ['买房', '租房']],
    billiards: ['台球厅，一杆清台，输赢都在方寸之间。', ['台球', '竞技']],
    lottery: ['彩票店，花两块钱买一个一夜暴富的梦。', ['刮刮乐', '彩票']],
    training: ['培训中心，提升技能，为更好的工作铺路。', ['培训', '考证']],
    adu: ['成人大学，白天打工晚上求学，学历是敲门砖。', ['学习', '考试', '学历']],
    park: ['城市公园，绿树成荫，是散步放空的好去处。', ['散步', '散心']],
    club: ['高级会所，非富即贵的社交场。', ['品酒', '社交']],
    ktv: ['KTV，点几个果盘，唱到天亮。', ['K歌', '包间']],
    pvclub: ['私人会所，私密、奢华、服务周到。', ['SPA', '贵宾']],
    flower: ['花店，买一束花，送给想送的人。', ['鲜花', '绿植']],
    ghostmarket: ['凌晨才出现的鬼市，来路不明，神秘莫测。', ['古董', '神秘']],
    home: ['你在城市的落脚点，疲惫时的港湾。', ['休息', '家']],
    workplace: ['你的工作地点，搬砖的地方。', ['上班', '加班']]
  };

  /* ---------- 世界参数 ---------- */
  var HALF = 68, ROAD = 7, GRID = 24, SIDEWALK_W = 3.1;
  var SPAWN = { x: 0, z: 9 };   // 出生点：横路南侧人行道内侧（避开路灯与楼群）
  var AI_SKY = null, AI_ASPHALT = null, AI_BRICK = null, AI_SIDEWALK = null, AI_CONCRETE = null, AI_GLASS = null, AI_WOOD = null, AI_STONE = null, AI_DARK = null, AI_PLASTER = null, AI_SIGNBOX = null, AI_CURTAIN = null, AI_RES = null, AI_OLDFLAT = null, AI_APART = null, AI_BIQ = null, AI_OFFICE = null, AI_TILE = null, AI_PANEL = null;   // AI 生成贴图（模块级，供 buildLoc/buildTower 使用）
  var AI_LAMP = null, AI_BARK = null, AI_LEAF = null, AI_CARPAINT = null, AI_TIRE = null, AI_CLOTH = null;   // AI 贴图：路灯/树木/车辆/人物

  /* ---------- Three ---------- */
  var container = document.getElementById('free3d');
  var renderer, scene, camera, clock;

  /* GPU 型号解析：从 ANGLE/WebGL 渲染器字符串中提取真实显卡名（v139e） */
  function gpuShortName(info) {
    var s = String(info || '');
    s = s.replace(/^ANGLE\s*\(/i, '').replace(/\)$/, '');
    var m = s.match(/(AMD|NVIDIA|Intel|Apple)\s+(?!ANGLE)[A-Za-z0-9][A-Za-z0-9()\- ]{2,60}/);
    if (m) return m[0].trim().replace(/\s+/g, ' ').slice(0, 34);
    var m2 = s.match(/Renderer:\s*([^,)]+)/);
    if (m2) return m2[1].trim().slice(0, 34);
    var head = s.split(/[\/(,]/)[0].trim();
    return (head || info || '未知 GPU').slice(0, 26);
  }
  var hemiL, moonL;
  var composer = null;

  /* 昼夜系统（v143）：游戏时间 + 天空穹顶 + 太阳/月亮 + 灯光混合 */
  var GAME_DAY_SPEED = 1;               // 每真实秒 1 游戏分钟 → 24h = 24 真实分钟一轮（v143c 节奏调整）
  var gameHour = 8.5, dayFactor = 0;
  /* 时间同步（v175）：进入自由模式时对齐终端模式时间 ——
     优先 URL ?h=（从 /game 跳转时由 openFreeMode 写入快照），
     否则请求服务端 /api/game/state 的 fullTime（"第N天 HH:MM"）兜底，
     保证每次进入时昼夜小时与终端模式一致。 */
  function parseFullTime(t) {
    if (!t) return null;
    var m = /第\d+天\s+(\d{1,2}):(\d{2})/.exec(t);
    if (!m) return null;
    var hh = parseInt(m[1], 10), mm = parseInt(m[2], 10);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return hh + mm / 60;
  }
  (function syncTerminalTime() {
    var u = /[?&]h=([\d.]+)/.exec(location.search);
    var v = u ? parseFloat(u[1]) : NaN;
    if (!isNaN(v) && v >= 0 && v < 24) { gameHour = v; return; }
    fetch('/api/game/state', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var v2 = d && d.hud ? parseFullTime(d.hud.fullTime) : null;
        if (v2 !== null) gameHour = v2;
      })
      .catch(function () {});
  })();
  var skyGroup = null, skyUni = null, skylineMats = [];
  var lampBulbs = [], lampGlows = [], lampSpots = [], pointLights = [], emissiveMats = [];
  var backL = null, fillL = null, lastClockT = 0;
  var rainPts = null;
  var pushedLocs = [];   // 地点建筑推至人行道内侧后的坐标
  var buildings = [];   // 碰撞盒
  var locGroups = [];   // 地点组
  var gStat = { tries: 0, road: 0, loc: 0, built: 0 };

  /* ---------- 贴图工具 ---------- */
  function tex(draw, w, h) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var x = cv.getContext('2d');
    draw(x, w, h);
    var t = new THREE.CanvasTexture(cv);
    t.anisotropy = 16;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  function bumpTex() {
    return cachedTex('bump', function () { return tex(function (x, w, h) {
      x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 1600; i++) {
        var v = Math.random();
        x.fillStyle = v < 0.5 ? 'rgba(255,255,255,' + v * 0.45 + ')' : 'rgba(0,0,0,' + (v - 0.5) * 0.65 + ')';
        x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
    }, 128, 128);
  });
  }
  var _texCache = {}, _matCache = {}, _solidCache = {};
  function cachedTex(key, fn) { if (_texCache[key]) return _texCache[key]; return _texCache[key] = fn(); }
  function cachedMat(key, fn) { if (_matCache[key]) return _matCache[key]; return _matCache[key] = fn(); }
  function solidMat(color, roughness, metalness, extra) {
    var k = 's|' + color + '|' + (roughness || 0.8) + '|' + (metalness === undefined ? '' : metalness);
    if (extra) { for (var kk in extra) { var v = extra[kk]; k += '|' + kk + '=' + (v === undefined ? '' : v.toString ? v.toString() : v); } }
    if (_solidCache[k]) return _solidCache[k];
    var o = { color: color, roughness: roughness || 0.8 };
    if (metalness !== undefined) o.metalness = metalness;
    if (extra) { for (var kk2 in extra) o[kk2] = extra[kk2]; }
    return _solidCache[k] = new THREE.MeshStandardMaterial(o);
  }


  function winTex(cols, rows, lit) {
    return cachedTex('win|'+cols+'|'+rows+'|'+lit, function () { return tex(function (x, w, h) {
      x.fillStyle = '#0b111c'; x.fillRect(0, 0, w, h);
      var cw = w / cols, ch = h / rows;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var px = c * cw + cw * 0.08, py = r * ch + ch * 0.08, pw = cw * 0.84, ph = ch * 0.84;
        if (Math.random() < (lit || 0.5)) {
          var glow = 0.55 + Math.random() * 0.45;
          x.fillStyle = 'rgba(255,' + Math.floor(170 + Math.random() * 60) + ',' + Math.floor(80 + Math.random() * 70) + ',' + glow + ')';
          x.fillRect(px, py, pw, ph);
          x.fillStyle = 'rgba(255,255,255,.25)';
          x.fillRect(px, py, pw, ph * 0.14);
        } else {
          x.fillStyle = 'rgba(24,34,52,.98)'; x.fillRect(px, py, pw, ph);
          x.fillStyle = 'rgba(120,150,200,.18)'; x.fillRect(px, py, pw, ph * 0.16);
        }
      }
    }, cols * 28, rows * 34);
  });
  }

  function winTex2(cols, rows, lit, kind) {
    return cachedTex('win2|'+cols+'|'+rows+'|'+lit+'|'+kind, function () { return tex(function (x, w, h) {
      x.fillStyle = '#0b111c'; x.fillRect(0, 0, w, h);
      var cw = w / cols, ch = h / rows;
      if (kind === 1) {
        for (var r = 0; r < rows; r++) {
          var py = r * ch + ch * 0.08, ph = ch * 0.84;
          if (Math.random() < (lit || 0.5)) {
            var glow = 0.5 + Math.random() * 0.4;
            x.fillStyle = 'rgba(255,' + Math.floor(168 + Math.random() * 64) + ',' + Math.floor(80 + Math.random() * 70) + ',' + glow + ')';
            x.fillRect(0, py, w, ph);
            x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, py, w, ph * 0.16);
          } else {
            x.fillStyle = 'rgba(20,30,48,.98)'; x.fillRect(0, py, w, ph);
          }
        }
      } else if (kind === 2) {
        for (var r2 = 0; r2 < rows; r2++) for (var c2 = 0; c2 < cols; c2++) {
          var px = c2 * cw + cw * 0.06, py = r2 * ch + ch * 0.06, pw = cw * 0.88, ph = ch * 0.88;
          if (Math.random() < 0.85) {
            var glow2 = 0.5 + Math.random() * 0.4;
            x.fillStyle = 'rgba(255,' + Math.floor(160 + Math.random() * 70) + ',' + Math.floor(70 + Math.random() * 80) + ',' + glow2 + ')';
            x.fillRect(px, py, pw, ph);
            x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(px, py, pw, ph * 0.12);
          } else {
            x.fillStyle = 'rgba(16,26,44,.98)'; x.fillRect(px, py, pw, ph);
          }
        }
      } else {
        for (var r3 = 0; r3 < rows; r3++) for (var c3 = 0; c3 < cols; c3++) {
          var px3 = c3 * cw + cw * 0.08, py3 = r3 * ch + ch * 0.08, pw3 = cw * 0.84, ph3 = ch * 0.84;
          if (Math.random() < (lit || 0.5)) {
            var glow3 = 0.55 + Math.random() * 0.45;
            x.fillStyle = 'rgba(255,' + Math.floor(170 + Math.random() * 60) + ',' + Math.floor(80 + Math.random() * 70) + ',' + glow3 + ')';
            x.fillRect(px3, py3, pw3, ph3);
            x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(px3, py3, pw3, ph3 * 0.14);
          } else {
            x.fillStyle = 'rgba(24,34,52,.98)'; x.fillRect(px3, py3, pw3, ph3);
            x.fillStyle = 'rgba(120,150,200,.18)'; x.fillRect(px3, py3, pw3, ph3 * 0.16);
          }
        }
      }
    }, cols * 28, rows * 34);
  });
  }
  function wallTex(style) {
    return cachedTex('wall|'+style, function () {

    var cv = document.createElement('canvas');
    cv.width = 192; cv.height = 128;
    var x = cv.getContext('2d');
    if (style === 'brick') {
      x.fillStyle = '#4a342a'; x.fillRect(0, 0, 192, 128);
      var bh = 128 / 8, bw = 192 / 10;
      for (var r = 0; r < 8; r++) for (var c = 0; c < 10; c++) {
        var shade = (r * 10 + c) % 3;
        x.fillStyle = shade === 0 ? '#5a3d30' : (shade === 1 ? '#523628' : '#462d21');
        x.fillRect(c * bw + (r % 2) * bw / 2, r * bh, bw - 1.8, bh - 1.8);
        x.fillStyle = 'rgba(255,190,140,.06)';
        x.fillRect(c * bw + (r % 2) * bw / 2, r * bh, bw - 1.8, 1.2);
      }
      x.strokeStyle = 'rgba(26,18,12,.8)'; x.lineWidth = 1.8;
      for (var hr = 0; hr <= 8; hr++) { x.beginPath(); x.moveTo(0, hr * bh); x.lineTo(192, hr * bh); x.stroke(); }
      for (var hc = 0; hc <= 10; hc++) { x.beginPath(); x.moveTo(hc * bw, 0); x.lineTo(hc * bw, 128); x.stroke(); }
      for (var mi = 0; mi < 26; mi++) {
        x.fillStyle = 'rgba(70,95,55,' + (0.10 + Math.random() * 0.2) + ')';
        x.fillRect(Math.random() * 192, Math.random() * 128, 4 + Math.random() * 16, 3 + Math.random() * 8);
      }
    } else if (style === 'concrete') {
      x.fillStyle = '#4c5057'; x.fillRect(0, 0, 192, 128);
      for (var ci = 0; ci < 1400; ci++) {
        x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,' + (0.03 + Math.random() * 0.06) + ')' : 'rgba(0,0,0,' + (0.05 + Math.random() * 0.1) + ')';
        x.fillRect(Math.random() * 192, Math.random() * 128, 1.5 + Math.random() * 3, 1.5 + Math.random() * 3);
      }
      x.strokeStyle = 'rgba(30,32,36,.6)'; x.lineWidth = 1.5;
      for (var ts = 0; ts < 6; ts++) {
        var txy = ts * 21 + 6;
        x.beginPath(); x.moveTo(0, txy); x.lineTo(192, txy); x.stroke();
        for (var tb = 0; tb < 8; tb++) {
          x.beginPath(); x.moveTo(tb * 24, txy); x.lineTo(tb * 24, txy + 21); x.stroke();
        }
      }
      for (var run = 0; run < 14; run++) {
        var rx = Math.random() * 192;
        x.fillStyle = 'rgba(25,26,28,' + (0.10 + Math.random() * 0.18) + ')';
        x.beginPath(); x.moveTo(rx, 0); x.lineTo(rx + 5, 0); x.lineTo(rx + 2, 128); x.lineTo(rx - 2, 128); x.fill();
      }
    } else if (style === 'tile') {
      x.fillStyle = '#3a3f46'; x.fillRect(0, 0, 192, 128);
      var tw = 24, th = 16;
      for (var r2 = 0; r2 < Math.ceil(128 / th); r2++) for (var c2 = 0; c2 < Math.ceil(192 / tw); c2++) {
        var pal = ['#4a515a', '#454c55', '#52575e', '#464c52'];
        x.fillStyle = pal[(r2 * 7 + c2) % 4];
        x.fillRect(c2 * tw, r2 * th, tw - 1.5, th - 1.5);
        x.fillStyle = 'rgba(255,255,255,.05)';
        x.fillRect(c2 * tw, r2 * th, tw - 1.5, 1.6);
      }
      x.strokeStyle = 'rgba(18,20,22,.75)'; x.lineWidth = 1.6;
      for (var gx2 = 0; gx2 <= 192; gx2 += tw) { x.beginPath(); x.moveTo(gx2, 0); x.lineTo(gx2, 128); x.stroke(); }
      for (var gy2 = 0; gy2 <= 128; gy2 += th) { x.beginPath(); x.moveTo(0, gy2); x.lineTo(192, gy2); x.stroke(); }
    } else if (style === 'glass') {
      x.fillStyle = '#0d1520'; x.fillRect(0, 0, 192, 128);
      var gw = 24, gh = 21;
      for (var gx = 0; gx < 192; gx += gw) for (var gy = 0; gy < 128; gy += gh) {
        x.fillStyle = 'rgba(96,150,214,' + (0.08 + Math.random() * 0.2) + ')';
        x.fillRect(gx + 2, gy + 2, gw - 4, gh - 4);
        var lg = x.createLinearGradient(gx + 2, gy + 2, gx + 2, gy + gh - 4);
        lg.addColorStop(0, 'rgba(180,215,255,.22)');
        lg.addColorStop(0.4, 'rgba(120,170,230,.08)');
        lg.addColorStop(1, 'rgba(20,35,60,.25)');
        x.fillStyle = lg; x.fillRect(gx + 2, gy + 2, gw - 4, gh - 4);
        if (Math.random() < 0.3) { x.fillStyle = 'rgba(255,190,110,.5)'; x.fillRect(gx + 2, gy + 2, gw - 4, 2.6); }
      }
      x.strokeStyle = 'rgba(140,165,195,.5)'; x.lineWidth = 1.4;
      for (var gx3 = 0; gx3 <= 192; gx3 += gw) { x.beginPath(); x.moveTo(gx3, 0); x.lineTo(gx3, 128); x.stroke(); }
      for (var gy3 = 0; gy3 <= 128; gy3 += gh) { x.beginPath(); x.moveTo(0, gy3); x.lineTo(192, gy3); x.stroke(); }
      x.strokeStyle = 'rgba(190,215,245,.18)'; x.lineWidth = 10;
      x.beginPath(); x.moveTo(-20, 40); x.lineTo(70, 128); x.stroke();
    } else if (style === 'panel') {
      x.fillStyle = '#232b33'; x.fillRect(0, 0, 192, 128);
      for (var p = 0; p < 7; p++) {
        x.fillStyle = p % 2 ? '#2b343d' : '#232b33';
        x.fillRect(0, p * 128 / 7, 192, 128 / 7);
        x.strokeStyle = 'rgba(95,105,120,.35)'; x.lineWidth = 1.5;
        x.beginPath(); x.moveTo(0, p * 128 / 7); x.lineTo(192, p * 128 / 7); x.stroke();
      }
      for (var rust = 0; rust < 30; rust++) {
        x.fillStyle = 'rgba(120,80,40,' + (0.06 + Math.random() * 0.1) + ')';
        x.fillRect(Math.random() * 192, Math.random() * 128, 3 + Math.random() * 10, 2 + Math.random() * 6);
      }
    } else if (style === 'wood') {
      x.fillStyle = '#3a2e1e'; x.fillRect(0, 0, 192, 128);
      for (var b = 0; b < 12; b++) {
        x.fillStyle = b % 2 ? '#443420' : '#3a2e1e';
        x.fillRect(0, b * 128 / 12, 192, 128 / 12);
        x.strokeStyle = 'rgba(30,22,12,.55)'; x.lineWidth = 1.5;
        x.beginPath(); x.moveTo(0, b * 128 / 12); x.lineTo(192, b * 128 / 12); x.stroke();
      }
      for (var wg = 0; wg < 40; wg++) {
        x.strokeStyle = 'rgba(60,44,26,.4)'; x.lineWidth = 1;
        x.beginPath(); x.moveTo(Math.random() * 192, 0); x.lineTo(Math.random() * 192, 128); x.stroke();
      }
    } else if (style === 'plaster') {
      x.fillStyle = '#2e3438'; x.fillRect(0, 0, 192, 128);
      for (var i2 = 0; i2 < 400; i2++) {
        x.fillStyle = 'rgba(255,255,255,' + (0.03 + Math.random() * 0.05) + ')';
        x.fillRect(Math.random() * 192, Math.random() * 128, 3 + Math.random() * 9, 2);
      }
      for (var crk = 0; crk < 12; crk++) {
        x.strokeStyle = 'rgba(30,32,36,.35)'; x.lineWidth = 1;
        x.beginPath();
        var cyy = Math.random() * 128, cxx = Math.random() * 192;
        x.moveTo(cxx, cyy);
        for (var ck = 0; ck < 5; ck++) x.lineTo(cxx + (Math.random() - 0.5) * 24, cyy + 8 + Math.random() * 18);
        x.stroke();
      }
    } else if (style === 'stone') {
      x.fillStyle = '#2a313b'; x.fillRect(0, 0, 192, 128);
      for (var i = 0; i < 90; i++) {
        x.strokeStyle = 'rgba(170,180,195,' + (0.05 + Math.random() * 0.09) + ')';
        x.lineWidth = 1 + Math.random() * 1.5;
        x.beginPath(); x.moveTo(Math.random() * 192, -20 + Math.random() * 128);
        x.lineTo(Math.random() * 192, Math.random() * 128); x.stroke();
      }
      for (var st = 0; st < 26; st++) {
        x.fillStyle = 'rgba(255,255,255,.04)';
        x.beginPath();
        x.arc(Math.random() * 192, Math.random() * 128, 4 + Math.random() * 8, 0, Math.PI * 2);
        x.fill();
      }
    } else {
      x.fillStyle = '#141820'; x.fillRect(0, 0, 192, 128);
      for (var d = 0; d < 500; d++) {
        x.fillStyle = 'rgba(85,95,115,' + (0.04 + Math.random() * 0.08) + ')';
        x.fillRect(Math.random() * 192, Math.random() * 128, 2 + Math.random() * 7, 2);
      }
    }
    var t = new THREE.CanvasTexture(cv);
    t.anisotropy = 16;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
    });
  }

  function signTex(text, color, w, h) {
    return cachedTex('sign|'+text+'|'+color+'|'+(w||320)+'|'+(h||76), function () { return tex(function (x, W, H) {
      x.clearRect(0, 0, W, H);
      var g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(12,16,28,.86)'); g.addColorStop(1, 'rgba(8,10,20,.92)');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = color; x.lineWidth = 2.5; x.shadowColor = color; x.shadowBlur = 12;
      x.strokeRect(2, 2, W - 4, H - 4);
      x.shadowBlur = 16; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = 'bold ' + Math.floor(H * 0.46) + 'px "PingFang SC","Microsoft YaHei",sans-serif';
      x.fillStyle = color; x.fillText(text, W / 2, H * 0.5);
      x.shadowBlur = 4; x.fillStyle = '#ffffff'; x.fillText(text, W / 2, H * 0.5);
    }, w || 320, h || 76);
  });
  }
  function stdMat(texMap, opts) {
    var r = (opts && opts.roughness) || 0.8, mm = (opts && opts.metalness) || 0.05;
    var b = (opts && opts.bump) ? 1 : 0, bs = (opts && opts.bumpScale) || 0.5;
    var key = 'm|' + (texMap ? texMap.uuid : 'none') + '|' + r + '|' + mm + '|' + b + '|' + bs;
    if (_matCache[key]) return _matCache[key];
    return _matCache[key] = new THREE.MeshStandardMaterial({
      map: texMap,
      roughness: r,
      metalness: mm,
      bumpMap: (opts && opts.bump) ? bumpTex() : null,
      bumpScale: bs
    });
  }

  /* ---------- 车道标线（透明底，叠加在 AI 沥青路面之上） ---------- */
  function roadLinesTex() {
    return tex(function (x, w, h) {
      x.clearRect(0, 0, w, h);
      // 真实公路标线（v107）：双向两车道支路——仅中央黄色虚线，线长 4m/间隔 6m 均匀分段；路口中心断开
      x.fillStyle = 'rgba(216,188,98,.94)';
      var seg = 32 + 38;             // 线 32px(≈4.4m) + 间隔 38px(≈5.2m)
      for (var i = 0; i < w; i += seg) {
        if (Math.abs(i + seg / 2 - w / 2) < 76) continue;   // 路口断开
        if (Math.random() < 0.035) continue;                // 轻微磨损
        x.fillRect(i + 3, h / 2 - 1.7, 27, 3.4);
      }
    }, 1024, 128);
  }
  function roadOverlayTex() {
    return tex(function (x, w, h) {
      x.clearRect(0, 0, w, h);
      // 纵向施工接缝（沿路方向 3 条细暗线，真实沥青分幅施工）
      x.fillStyle = 'rgba(18,20,24,.38)';
      [h * 0.16, h * 0.5, h * 0.84].forEach(function (cy) { x.fillRect(0, cy, w, 1.5); });
      // 井盖（沿路 2 个圆，真实市政细节）
      [w * 0.3, w * 0.74].forEach(function (cx2) {
        x.fillStyle = 'rgba(14,16,20,.55)';
        x.beginPath(); x.arc(cx2, h * 0.5, 5, 0, Math.PI * 2); x.fill();
        x.strokeStyle = 'rgba(52,56,62,.55)'; x.lineWidth = 1.2; x.stroke();
      });
      // 油渍与修补暗斑
      for (var k2 = 0; k2 < 16; k2++) {
        x.fillStyle = 'rgba(10,12,16,' + (0.04 + Math.random() * 0.09) + ')';
        x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 0, Math.PI * 2); x.fill();
      }
    }, 1024, 128);
  }
  function hardGroundTex() {
    return tex(function (x, w, h) {
      x.fillStyle = '#45494f'; x.fillRect(0, 0, w, h);
      var s2 = 64;
      for (var r2 = 0; r2 < Math.ceil(h / s2); r2++) for (var c2 = 0; c2 < Math.ceil(w / s2); c2++) {
        var dv = Math.floor(Math.random() * 8) - 4;
        x.fillStyle = 'rgb(' + (69 + dv) + ',' + (73 + dv) + ',' + (79 + dv) + ')';
        x.fillRect(c2 * s2, r2 * s2, s2, s2);
        x.strokeStyle = 'rgba(16,18,22,.12)'; x.lineWidth = 2;
        x.strokeRect(c2 * s2 + 1, r2 * s2 + 1, s2 - 2, s2 - 2);
        if (Math.random() < 0.22) {
          x.fillStyle = 'rgba(0,0,0,' + (0.04 + Math.random() * 0.05) + ')';
          x.fillRect(c2 * s2 + 8, r2 * s2 + 8, s2 * 0.5, 2);
        }
      }
      for (var i = 0; i < 1400; i++) {
        x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,' + (0.012 + Math.random() * 0.02) + ')' : 'rgba(0,0,0,' + (0.02 + Math.random() * 0.04) + ')';
        x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
    }, 1024, 1024);
  }
  function sidewalkTex() {
    return tex(function (x, w, h) {
      x.fillStyle = '#3b4149'; x.fillRect(0, 0, w, h);
      var s = 44;
      for (var r = 0; r < Math.ceil(h / s); r++) for (var c = 0; c < Math.ceil(w / s); c++) {
        // 同色砖 + 随机微色差（不规律，避免棋盘明暗在灯光下形成条纹）
        var dv = Math.floor(Math.random() * 10) - 5;
        x.fillStyle = 'rgb(' + (59 + dv) + ',' + (65 + dv) + ',' + (73 + dv) + ')';
        x.fillRect(c * s, r * s, s, s);
        // 砖缝（低对比，远处不形成条纹）
        x.strokeStyle = 'rgba(18,20,24,0.10)'; x.lineWidth = 2;
        x.strokeRect(c * s + 1, r * s + 1, s - 2, s - 2);
        // 污渍划痕
        if (Math.random() < 0.4) {
          x.fillStyle = 'rgba(0,0,0,' + (0.05 + Math.random() * 0.08) + ')';
          x.fillRect(c * s + 6, r * s + 6, s * 0.6, 2);
        }
        // 青苔点
        if (Math.random() < 0.25) {
          x.fillStyle = 'rgba(70,120,80,.18)';
          x.fillRect(c * s + 8, r * s + 8, 4, 4);
        }
      }
      // 整体颗粒
      for (var i = 0; i < 1600; i++) {
        x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,' + (0.015 + Math.random() * 0.03) + ')' : 'rgba(0,0,0,' + (0.03 + Math.random() * 0.05) + ')';
        x.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
      }
      // 裂缝
      for (var k = 0; k < 24; k++) {
        x.strokeStyle = 'rgba(20,22,26,.5)'; x.lineWidth = 1.2;
        x.beginPath();
        var cx0 = Math.random() * w, cy0 = Math.random() * h;
        x.moveTo(cx0, cy0);
        for (var seg2 = 0; seg2 < 6; seg2++) x.lineTo(cx0 + (Math.random() - 0.5) * 30, cy0 + (Math.random() - 0.5) * 30);
        x.stroke();
      }
    }, 512, 512);
  }

  /* ---------- 城市构建 ---------- */
  function aiReadyNow() {
    var keys = [AI_BRICK, AI_CONCRETE, AI_GLASS, AI_PLASTER, AI_CURTAIN, AI_RES, AI_OLDFLAT,
      AI_APART, AI_BIQ, AI_OFFICE, AI_TILE, AI_PANEL, AI_SKY, AI_ASPHALT, AI_SIDEWALK];
    for (var i = 0; i < keys.length; i++) if (!(keys[i] && keys[i].userData && keys[i].userData.loaded)) return false;
    return true;
  }
  function texReadyCount() {
    var keys = [AI_BRICK, AI_CONCRETE, AI_GLASS, AI_PLASTER, AI_CURTAIN, AI_RES, AI_OLDFLAT,
      AI_APART, AI_BIQ, AI_OFFICE, AI_TILE, AI_PANEL, AI_SKY, AI_ASPHALT, AI_SIDEWALK];
    var n = 0;
    for (var i = 0; i < keys.length; i++) if (keys[i] && keys[i].userData && keys[i].userData.loaded) n++;
    return n;
  }
  function buildCityWhenReady() {
    var ldEl = document.getElementById('ft-loading');
    var ldSub = document.getElementById('ft-loading-sub');
    var ldBar = document.getElementById('ft-loading-bar');
    var ldTxt = document.getElementById('ft-loading-text');
    function setLd(pct, sub) {
      if (ldBar) ldBar.style.width = pct + '%';
      if (ldSub) ldSub.textContent = sub;
      if (pct >= 100 && ldTxt) ldTxt.textContent = '正在生成城市天际线…';
    }
    function hideLd() {
      if (ldEl) ldEl.classList.add('hide');
      setTimeout(function () { if (ldEl) ldEl.parentNode && ldEl.parentNode.removeChild(ldEl); }, 1000);
    }
    preloadTextures();
    if (aiReadyNow()) {
      setLd(100, '全部资源就绪，正在生成城市…');
      buildCity();
      markSceneReady();
      setTimeout(hideLd, 350);
      return;
    }
    setLd(texReadyCount() / 15 * 100, '正在加载城市资源 ' + texReadyCount() + '/15');
    if (window.__aiPoll) return;
    window.__aiStart = Date.now();
    window.__aiPoll = setInterval(function () {
      var n = texReadyCount();
      setLd(n / 15 * 100, '正在加载城市资源 ' + n + '/15');
      if (aiReadyNow() || Date.now() - window.__aiStart > 12000) {
        clearInterval(window.__aiPoll); window.__aiPoll = null;
        setLd(100, '资源加载完成，正在生成城市天际线…');
        buildCity();
        markSceneReady();
        setTimeout(hideLd, 350);
      }
    }, 150);
  }
  function preloadTextures() {
    // AI 生成贴图：全部贴图先并行预加载，加载完成（userData.loaded）后再构建城市，
    // 避免城市先建、贴图后到而呈现“方块楼”
    var loader = new THREE.TextureLoader();
    function safeLoad(u, ok) {
      return loader.load(u, function (t) {
        t.userData.loaded = true;
        if (ok) ok(t);
      }, undefined, function () { console.warn('texture load failed: ' + u); });
    }
    var loader = new THREE.TextureLoader();
    function safeLoad(u, ok) {
      return loader.load(u, ok, undefined, function () { console.warn('texture load failed: ' + u); });
    }
    AI_SKY = safeLoad('/textures/night_sky.jpg', function (t) {
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      // 用 AI 夜空图生成 PMREM 环境反射：楼群玻璃/金属与路面获得真实夜景反光
      try {
        var ec = t.clone();
        ec.colorSpace = THREE.SRGBColorSpace;
        ec.mapping = THREE.EquirectangularReflectionMapping;
        var pm = new THREE.PMREMGenerator(renderer);
        var rt = pm.fromEquirectangular(ec);
        scene.environment = rt.texture;
        pm.dispose(); ec.dispose();
      } catch (e) { console.warn('env pmrem fail: ' + e); }
    });
    AI_ASPHALT = safeLoad('/textures/asphalt2.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 16.7);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_BRICK = safeLoad('/textures/brick_wall.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.2, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_SIDEWALK = safeLoad('/textures/sidewalk_brick.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20, 20);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_CONCRETE = safeLoad('/textures/concrete.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_GLASS = safeLoad('/textures/glass.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_WOOD = safeLoad('/textures/wood.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_STONE = safeLoad('/textures/stone.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_DARK = safeLoad('/textures/dark.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_PLASTER = safeLoad('/textures/plaster.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_SIGNBOX = safeLoad('/textures/signbox.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1);
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    });
    AI_CURTAIN = safeLoad('/textures/curtainwall.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_RES = safeLoad('/textures/res_brick.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_OLDFLAT = safeLoad('/textures/oldflat.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_APART = safeLoad('/textures/ai_apart.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_BIQ = safeLoad('/textures/ai_biqilou.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_OFFICE = safeLoad('/textures/ai_office.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_TILE = safeLoad('/textures/ai_tile.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_PANEL = safeLoad('/textures/ai_panel.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1);
      t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    });
    AI_LAMP = safeLoad('/textures/lamp_pole_1024.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2);
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    });
    AI_BARK = safeLoad('/textures/tree_bark_1024.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    });
    AI_LEAF = safeLoad('/textures/tree_leaf_1024.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1);
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    });
    AI_CARPAINT = safeLoad('/textures/car_paint_1024.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1);
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    });
    AI_TIRE = safeLoad('/textures/tire_1024.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1);
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    });
    AI_CLOTH = safeLoad('/textures/cloth_1024.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1);
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    });
  }
  /* ---------- pelican 风格公路贴图（v151）：沥青颗粒 + 修补块 + 车辙暗带 ---------- */
  function pelicanRoadTex() {
    var W = 2048, H = 512;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d');
    x.fillStyle = '#44464b'; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 140000; i++) {
      var g = Math.floor(42 + Math.random() * 66);
      x.fillStyle = 'rgb(' + g + ',' + (g + 1) + ',' + (g + 4) + ')';
      x.fillRect(Math.random() * W, Math.random() * H, Math.random() * 1.4 + 0.45, Math.random() * 1.4 + 0.45);
    }
    for (var i = 0; i < 6; i++) {
      x.fillStyle = 'rgba(20,20,24,' + (0.12 + Math.random() * 0.12) + ')';
      x.fillRect(Math.random() * W, Math.random() * H, 60 + Math.random() * 160, 30 + Math.random() * 90);
    }
    var grd = x.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0.0, 'rgba(0,0,0,0)'); grd.addColorStop(0.3, 'rgba(0,0,0,0.10)');
    grd.addColorStop(0.36, 'rgba(0,0,0,0)'); grd.addColorStop(0.64, 'rgba(0,0,0,0)');
    grd.addColorStop(0.7, 'rgba(0,0,0,0.10)'); grd.addColorStop(1.0, 'rgba(0,0,0,0)');
    x.fillStyle = grd; x.fillRect(0, 0, W, H);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  function pelicanRoadBump() {
    var W = 2048, H = 512;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d');
    x.fillStyle = '#808080'; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 140000; i++) {
      var bg = Math.floor(92 + Math.random() * 116);
      x.fillStyle = 'rgb(' + bg + ',' + bg + ',' + bg + ')';
      x.fillRect(Math.random() * W, Math.random() * H, Math.random() * 1.4 + 0.45, Math.random() * 1.4 + 0.45);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  /* ---- v168g 静态几何合批（顶层作用域）---- */
  var _batch = {};
  function splitBoxFaces(geo) {
    var gs = geo.groups;
    if (!gs || gs.length <= 1) return [geo];
    var out = [];
    var pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
    var srcIdx = geo.index;
    for (var gi = 0; gi < gs.length; gi++) {
      var gr = gs[gi];
      var remap = {}, nPos = [], nNor = null, nUv = null, nIdx = [];
      if (nor) nNor = [];
      if (uv) nUv = [];
      for (var j = 0; j < gr.count; j++) {
        var v = srcIdx ? srcIdx.getX(gr.start + j) : (gr.start + j);
        var nv;
        if (remap[v] === undefined) {
          nv = nPos.length / 3;
          remap[v] = nv;
          nPos.push(pos.getX(v), pos.getY(v), pos.getZ(v));
          if (nNor) nNor.push(nor.getX(v), nor.getY(v), nor.getZ(v));
          if (nUv) nUv.push(uv.getX(v), uv.getY(v));
        } else { nv = remap[v]; }
        nIdx.push(nv);
      }
      var fg = new THREE.BufferGeometry();
      fg.setAttribute('position', new THREE.Float32BufferAttribute(nPos, 3));
      if (nNor) fg.setAttribute('normal', new THREE.Float32BufferAttribute(nNor, 3));
      if (nUv) fg.setAttribute('uv', new THREE.Float32BufferAttribute(nUv, 2));
      fg.setIndex(new THREE.BufferAttribute(nIdx.length > 65535 ? Uint32Array.from(nIdx) : Uint16Array.from(nIdx), 1));
      fg.computeBoundingSphere();
      out.push(fg);
    }
    return out;
  }
  function batchAdd(geometry, material, cast, recv, matrix) {
    if (!geometry || !material) return;
    var k = material.uuid + '|' + (cast ? 1 : 0) + '|' + (recv ? 1 : 0);
    var e = _batch[k];
    if (!e) e = _batch[k] = { geoms: [], mat: material, cast: cast, recv: recv };
    var g = geometry;
    if (matrix) g.applyMatrix4(matrix);
    e.geoms.push(g);
  }
  function mergeGeomsSimple(geoms) {
    var totalV = 0, totalI = 0, hasN = false, hasU = false, i, j;
    for (i = 0; i < geoms.length; i++) {
      var gg = geoms[i], pp = gg.attributes.position;
      totalV += pp.count;
      totalI += gg.index ? gg.index.count : pp.count;
      if (gg.attributes.normal) hasN = true;
      if (gg.attributes.uv) hasU = true;
    }
    var pos = new Float32Array(totalV * 3);
    var nor = hasN ? new Float32Array(totalV * 3) : null;
    var uvA = hasU ? new Float32Array(totalV * 2) : null;
    var idx = new (totalV > 65535 ? Uint32Array : Uint16Array)(totalI);
    var vo = 0, io = 0;
    for (i = 0; i < geoms.length; i++) {
      var g = geoms[i], p = g.attributes.position;
      pos.set(p.array, vo * 3);
      if (nor && g.attributes.normal) nor.set(g.attributes.normal.array, vo * 3);
      if (uvA && g.attributes.uv) uvA.set(g.attributes.uv.array, vo * 2);
      var ix = g.index, cnt = ix ? ix.count : p.count;
      if (ix) {
        var src = ix.array;
        for (j = 0; j < cnt; j++) idx[io + j] = src[j] + vo;
      } else {
        for (j = 0; j < cnt; j++) idx[io + j] = vo + j;
      }
      io += cnt; vo += p.count;
    }
    var ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (nor) ng.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    if (uvA) ng.setAttribute('uv', new THREE.Float32BufferAttribute(uvA, 2));
    ng.setIndex(new THREE.BufferAttribute(idx, 1));
    ng.computeBoundingSphere();
    return ng;
  }
  function flushBatch() {
    for (var k in _batch) {
      var e = _batch[k];
      if (!e.geoms.length) continue;
      var m;
      if (e.geoms.length === 1) {
        m = new THREE.Mesh(e.geoms[0], e.mat);
      } else {
        m = new THREE.Mesh(mergeGeomsSimple(e.geoms), e.mat);
      }
      m.castShadow = e.cast; m.receiveShadow = e.recv;
      scene.add(m);
    }
    _batch = {};
  }
  function collectBatchGroup(root) {
    root.updateMatrixWorld(true);
    var keep = [];
    root.traverse(function (m) {
      if (!m.isMesh && !m.isSprite) return;
      if (m.userData && m.userData.keepAlive) { keep.push(m); return; }
      if (m.isMesh) {
        if (m.geometry.groups && m.geometry.groups.length > 1 && Array.isArray(m.material)) {
          var faces = splitBoxFaces(m.geometry);
          for (var fi = 0; fi < faces.length; fi++) batchAdd(faces[fi], m.material[fi], m.castShadow, m.receiveShadow, m.matrixWorld);
        } else {
          batchAdd(m.geometry, m.material, m.castShadow, m.receiveShadow, m.matrixWorld);
        }
      }
    });
    for (var i = 0; i < keep.length; i++) {
      var m2 = keep[i];
      if (m2.isSprite) {
        var ns = new THREE.Sprite(m2.material);
        ns.position.setFromMatrixPosition(m2.matrixWorld);
        ns.scale.setFromMatrixScale(m2.matrixWorld);
        scene.add(ns);
      } else {
        var gm = m2.geometry.clone(); gm.applyMatrix4(m2.matrixWorld);
        var nm = new THREE.Mesh(gm, m2.material);
        nm.castShadow = m2.castShadow; nm.receiveShadow = m2.receiveShadow;
        scene.add(nm);
        if (m2.userData.neon) neonMats.push({ mat: nm.material, baseOp: m2.userData.baseOp, ph: m2.userData.ph });
      }
    }
  }

  function buildCity() {


    scene.fog = new THREE.Fog(0x0d1020, 36, 118);
    buildSky();

    hemiL = new THREE.HemisphereLight(0x47587e, 0x171216, 0.72); scene.add(hemiL);
    moonL = new THREE.DirectionalLight(0xa8bbff, 0.85); moonL.position.set(28, 62, 18);
    moonL.castShadow = true;
    moonL.shadow.mapSize.set(2048, 2048);
    moonL.shadow.radius = 3;
    moonL.shadow.camera.left = -24; moonL.shadow.camera.right = 24;
    moonL.shadow.camera.top = 24; moonL.shadow.camera.bottom = -24;
    moonL.shadow.camera.near = 1; moonL.shadow.camera.far = 85;
    moonL.shadow.camera.updateProjectionMatrix();
    moonL.shadow.bias = -0.0004; moonL.shadow.normalBias = 0.8;
    scene.add(moonL);
    scene.add(moonL.target);
    backL = new THREE.DirectionalLight(0x3a2f55, 0.22); backL.position.set(-30, 20, -40); scene.add(backL);
    fillL = new THREE.DirectionalLight(0x4a5a80, 0.34); fillL.position.set(-16, 28, -22); scene.add(fillL);

    var base = new THREE.Mesh(new THREE.PlaneGeometry(140, 140),
      new THREE.MeshStandardMaterial({ map: AI_SIDEWALK, roughness: 0.93, metalness: 0.02, envMapIntensity: 0.12 }));
    base.rotation.x = -Math.PI / 2; base.position.y = 0; base.receiveShadow = true; scene.add(base);

    var rTex = roadLinesTex();
    var rbTex = bumpTex(); rbTex.repeat.set(24, 6);
    // 沥青拉伸贴图（v106）：横路长向 140m 拉伸、竖路长向 140m 拉伸，不再平铺密格子
    var aspH = pelicanRoadTex(); aspH.repeat.set(4, 0.8);
    var aspV = pelicanRoadTex(); aspV.repeat.set(0.2, 16);
    var pBumpH = pelicanRoadBump(); pBumpH.repeat.set(4, 0.8);
    var pBumpV = pelicanRoadBump(); pBumpV.repeat.set(0.2, 16);
    var roadMatH = new THREE.MeshStandardMaterial({ map: aspH, roughness: 0.85, metalness: 0.05, envMapIntensity: 0.25, bumpMap: pBumpH, bumpScale: 0.9 });
    var roadMatV = new THREE.MeshStandardMaterial({ map: aspV, roughness: 0.85, metalness: 0.05, envMapIntensity: 0.25, bumpMap: pBumpV, bumpScale: 0.9 });
    var oTex = roadOverlayTex();
    var overlayMat = new THREE.MeshBasicMaterial({ map: oTex, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -1 });
    var lineMat = new THREE.MeshBasicMaterial({ map: rTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -1 });
    var edgeMat = new THREE.MeshBasicMaterial({ color: 0x989da4, transparent: true, opacity: 0.3, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    var lines = [];
    for (var v = -60; v <= 60; v += GRID) lines.push(v);

    // 地点建筑若贴/压马路，推至人行道内侧（楼缘距路缘 ≥ 1.2m）
    pushedLocs = [];
    MAP_LOCS.forEach(function (loc) {
      var wx2 = (loc.x - 50) / 50 * 68, wz2 = (loc.y - 50) / 50 * 68;
      var half2 = loc.id === 'park' ? 5 : 2.5;
      var mnx = 999, mnz = 999, tx = 0, tz = 0;
      for (var ti = 0; ti < lines.length; ti++) {
        var dax = Math.abs(wx2 - lines[ti]); if (dax < mnx) { mnx = dax; tx = lines[ti]; }
        var daz = Math.abs(wz2 - lines[ti]); if (daz < mnz) { mnz = daz; tz = lines[ti]; }
      }
      var pushD = loc.id === 'park' ? 5.0 : 6.6;
      if (mnx < pushD + half2) wx2 = tx + (wx2 > tx ? 1 : -1) * (pushD + half2);
      if (mnz < pushD + half2) wz2 = tz + (wz2 > tz ? 1 : -1) * (pushD + half2);
      pushedLocs.push({ id: loc.id, x: wx2, z: wz2 });
    });
    lines.forEach(function (v) {
      // 横/竖路面错开 0.001 高度，避免交叉口共面闪烁
      var h1 = new THREE.Mesh(new THREE.PlaneGeometry(140, ROAD), roadMatH);
      h1.rotation.x = -Math.PI / 2; h1.position.set(0, 0.015, v); h1.receiveShadow = true; scene.add(h1);
      var v1 = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, 140), roadMatV);
      v1.rotation.x = -Math.PI / 2; v1.position.set(v, 0.016, 0); v1.receiveShadow = true; scene.add(v1);
      var ho = new THREE.Mesh(new THREE.PlaneGeometry(140, ROAD), overlayMat);
      ho.rotation.x = -Math.PI / 2; ho.position.set(0, 0.0165, v); scene.add(ho);
      var vo = new THREE.Mesh(new THREE.PlaneGeometry(140, ROAD), overlayMat);
      vo.rotation.x = -Math.PI / 2; vo.rotation.z = Math.PI / 2; vo.position.set(v, 0.0165, 0); scene.add(vo);
      var hl = new THREE.Mesh(new THREE.PlaneGeometry(140, ROAD), lineMat);
      hl.rotation.x = -Math.PI / 2; hl.position.set(0, 0.017, v); scene.add(hl);
      var vl = new THREE.Mesh(new THREE.PlaneGeometry(140, ROAD), lineMat);
      vl.rotation.x = -Math.PI / 2; vl.rotation.z = Math.PI / 2; vl.position.set(v, 0.018, 0); scene.add(vl);
      // 路缘收边线（浅灰细线界定公路边界，美化路面收口）
      var eo = ROAD / 2 + 0.07;
      var e1a = new THREE.Mesh(new THREE.PlaneGeometry(140, 0.13), edgeMat);
      e1a.rotation.x = -Math.PI / 2; e1a.position.set(0, 0.019, v - eo); scene.add(e1a);
      var e1b = new THREE.Mesh(new THREE.PlaneGeometry(140, 0.13), edgeMat);
      e1b.rotation.x = -Math.PI / 2; e1b.position.set(0, 0.019, v + eo); scene.add(e1b);
      var e2a = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 140), edgeMat);
      e2a.rotation.x = -Math.PI / 2; e2a.position.set(v - eo, 0.019, 0); scene.add(e2a);
      var e2b = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 140), edgeMat);
      e2b.rotation.x = -Math.PI / 2; e2b.position.set(v + eo, 0.019, 0); scene.add(e2b);
      // 路缘石已移除：路口不再有地面凸起
    });

    var zebraMat = new THREE.MeshStandardMaterial({ color: 0xc6c2ba, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -1 });
    lines.forEach(function (vx) {
      lines.forEach(function (vz) {
        if (Math.abs(vx) > 60 || Math.abs(vz) > 60) return;
        // 白色斑马线已移除（保留停止线）
        // 停止线已移除
      });
    });

    gStat.tries = gStat.road = gStat.loc = gStat.built = 0;
    var gridVals = [-48, -24, 0, 24, 48];
    for (var ri = 0; ri < 5; ri++) {
      for (var ci = 0; ci < 5; ci++) {
        var cx = gridVals[ci], cz = gridVals[ri];
        // 楼群四角分布：楼缘距路中心 ≥ 6.6m（人行道砖带内预留空隙，不压路）
        // 格半宽 12m，楼中心偏移 = 12 - (6.6 + 楼半宽)，四角 (±off, ±off)
        var pts = [];
        var corners = [[1, 1], [-1, -1], [1, -1], [-1, 1]];
        for (var vi = 0; vi < corners.length; vi++) {
          var bwN = 2.8 + Math.random() * 1.4, hwN = (bwN + 0.8) / 2;
          var offN = 12 - (6.6 + hwN);
          var bxN = cx + corners[vi][0] * offN, bzN = cz + corners[vi][1] * offN, okN = true;
          for (var qn = 0; qn < pts.length; qn++) {
            var ddn = Math.sqrt((bxN - pts[qn][0]) * (bxN - pts[qn][0]) + (bzN - pts[qn][1]) * (bzN - pts[qn][1]));
            if (ddn < (bwN + pts[qn][2]) / 2 + 1.2) { okN = false; break; }
          }
          if (okN) pts.push([bxN, bzN, bwN]);
        }
        for (var k = 0; k < pts.length; k++) {
          var bx = pts[k][0], bz = pts[k][1], bw2 = pts[k][2];
          var hw = (bw2 + 0.8) / 2;
          gStat.tries++;
          if (nearRoad(bx, hw) || nearRoad(bz, hw)) { gStat.road++; continue; }
          var nearLocB = false;
          for (var li = 0; li < pushedLocs.length; li++) {
            var ldx = bx - pushedLocs[li].x, ldz = bz - pushedLocs[li].z;
            if (ldx * ldx + ldz * ldz < 3.6 * 3.6) { nearLocB = true; break; }
          }
          if (nearLocB) { gStat.loc++; continue; }
          // 楼高差异化：市中心高楼多，边缘低矮，天际线更真实（整体压低，避免楼顶进入天空区）
          var d0 = Math.sqrt(bx * bx + bz * bz);
          var tallP = d0 < 8 ? 0.8 : (d0 < 30 ? 0.5 : 0.3);
          var bh = Math.random() < tallP ? 22 + Math.random() * 12 : 8 + Math.random() * 4;
          gStat.built++;
          buildTower(bx, bz, bw2, bh);
        }
      }
    }

    MAP_LOCS.forEach(function (loc) {
      var g = buildLoc(loc);
      scene.add(g);
      locGroups.push({ id: loc.id, name: loc.name, icon: loc.icon, type: loc.type, color: loc.color, group: g, wx: g.position.x, wz: g.position.z });
      var bb = computeLocBox(g.position, loc);
      if (bb) buildings.push(bb);
    });

    lines.forEach(function (lv) {
      // 路灯基准取街区中心（-48,-24,0,24,48），+4.15 后距最近路中心 7.85m，
      // 全部位于人行道砖带内，杜绝压在沥青路面上（v139d）
      [-48, -24, 0, 24, 48].forEach(function (c) {
        var px = c + 4.15;
        buildLamp(px, lv - 4.15, -Math.PI / 2);  // 横路南侧 → 灯臂朝 +Z（路面）
        buildLamp(px, lv + 4.15, Math.PI / 2);   // 横路北侧 → 灯臂朝 -Z（路面）
        buildLamp(lv - 4.15, px, 0);             // 纵路西侧 → 灯臂朝 +X（路面）
        buildLamp(lv + 4.15, px, Math.PI);       // 纵路东侧 → 灯臂朝 -X（路面）
      });
    });

    buildExtras();
    buildCityTraffic();
    buildCityProps();
    flushBatch();
    scene.traverse(function (m) {
      if (m.isPointLight) { m.userData.base = m.intensity; pointLights.push(m); }
      if (m.isMesh && m.material && m.material.emissive && m.material.emissiveIntensity > 0.2) {
        m.material.userData.baseEI = m.material.emissiveIntensity;
        if (emissiveMats.indexOf(m.material) < 0) emissiveMats.push(m.material);
      }
    });
    // 雨粒子已移除：空中雨丝会形成斜条纹干扰视线，夜空保持干净
    // （湿润路面与霓虹倒影保留，雨夜氛围不受影响）
    var rainPts = null;
  }

  function updateRain(dt) {
    if (!rainPts) return;
    rainPts.position.x = player.x; rainPts.position.z = player.z;
    var p = rainPts.geometry.attributes.position.array;
    for (var i = 0; i < p.length; i += 3) {
      p[i + 1] -= 17 * dt;
      p[i] -= 3.4 * dt;
      if (p[i + 1] < -1) {
        p[i + 1] = 46; p[i] = (Math.random() * 2 - 1) * 150; p[i + 2] = (Math.random() * 2 - 1) * 150;
      }
    }
    rainPts.geometry.attributes.position.needsUpdate = true;
  }

  function nearRoad(v, hw) {
    for (var t = -60; t <= 60; t += GRID) {
      // 楼缘必须位于人行道内侧：距路中心 ≥ 路缘 + 2.2m 人行道 + 楼半宽（v104 路灯不再压楼）
      if (Math.abs(v - t) < ROAD / 2 + SIDEWALK_W + (hw || 0)) return true;
    }
    return false;
  }
  function computeLocBox(pos, loc) {
    var half = loc.id === 'park' ? 5 : 2.5;
    return { x1: pos.x - half, x2: pos.x + half, z1: pos.z - half, z2: pos.z + half, obj: null };
  }

  /* 楼群建模：裙楼 + 塔楼 + 市井装饰（空调/晾衣架/防盗窗）+ 灯箱霓虹 */
  function buildTower(bx, bz, w, h) {
    var d = w * 0.82;
    var style = ['brick', 'concrete', 'tile', 'glass', 'panel', 'plaster', 'curtain', 'res', 'oldflat', 'apart', 'biqilou', 'office'][Math.floor(Math.random() * 12)];
    var aiMap2 = { brick: AI_BRICK, concrete: AI_CONCRETE, glass: AI_GLASS, plaster: AI_PLASTER, curtain: AI_CURTAIN, res: AI_RES, oldflat: AI_OLDFLAT, apart: AI_APART, biqilou: AI_BIQ, office: AI_OFFICE, tile: AI_TILE, panel: AI_PANEL };
    var wallS = aiMap2[style] || wallTex(style);
    wallS.repeat.set(2, 1);
    var tallB = h >= 14;
    var win = winTex2(tallB ? 6 : 5, tallB ? 7 : 6, tallB ? 0.8 : 0.55,
      tallB ? (Math.random() < 0.6 ? 2 : 0) : Math.floor(Math.random() * 3));
    var sideA = Math.random() < 0.7 ? wallS : win, sideB = Math.random() < 0.7 ? wallS : win,
        sideC = Math.random() < 0.7 ? wallS : win, sideD = Math.random() < 0.7 ? wallS : win;
    var mats = [stdMat(AI_GLASS || wallTex('glass'), { roughness: 0.26, metalness: 0.6 }),
                stdMat(AI_GLASS || wallTex('glass'), { roughness: 0.26, metalness: 0.6 }),
                stdMat(sideA, { roughness: 0.5 }), stdMat(sideB, { roughness: 0.5 }), stdMat(sideC, { roughness: 0.5 }), stdMat(sideD, { roughness: 0.5 })];
    var group = new THREE.Group();
    group.position.set(bx, 0, bz);

    // 落地台基：强化楼底接地轮廓（不会悬浮）
    var basePlate = new THREE.Mesh(new THREE.BoxGeometry(w + 1.1, 0.14, d + 1.1),
      solidMat(0x2a2e34, 0.92));
    basePlate.position.y = 0.07;
    basePlate.receiveShadow = true;
    group.add(basePlate);

    // 裙楼（临街底商，部分楼无裙楼直接落地）
    var hasPodium = Math.random() < 0.78;
    if (hasPodium) {
      var podium = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 1.5, d + 0.8),
        stdMat(AI_BRICK || wallTex('tile'), { roughness: 0.8 }));
      podium.position.y = 0.75;
      podium.castShadow = true; podium.receiveShadow = true;
      group.add(podium);
      var podiumWin = new THREE.Mesh(new THREE.BoxGeometry(w - 0.4, 0.85, d + 0.81),
        stdMat(winTex(4, 1, 0.75), { roughness: 0.5 }));
      podiumWin.position.y = 0.95;
      group.add(podiumWin);
    }
    // 塔楼底座基准高度：有裙楼 1.5m，无裙楼直接落地面（防止悬空）
    var baseY = hasPodium ? 1.5 : 0.14;
    // 门廊柱 + 雨棚（中式街铺门面）
    if (hasPodium && Math.random() < 0.4) {
      var porch = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.16, 0.42),
        solidMat(0x333b48, 0.85));
      porch.position.set(0, 1.32, d / 2 + 0.18); group.add(porch);
      [-w * 0.32, w * 0.32].forEach(function (pxo) {
        var pl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.5, 6),
          solidMat(0x3d4654, 0.85));
        pl.position.set(pxo, 0.75, d / 2 + 0.3); group.add(pl);
      });
    }

    // 塔楼
    var box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    box.position.y = baseY + h / 2;
    box.castShadow = true; box.receiveShadow = true;
    group.add(box);
    if (tallB) {
      var trimM = solidMat(0x232a36, 0.6, 0.35);
      var tw = w / 2 - 0.06, td = d / 2 - 0.06;
      [[tw, 0, td], [-tw, 0, td], [tw, 0, -td], [-tw, 0, -td]].forEach(function (cpos) {
        var mull = new THREE.Mesh(new THREE.BoxGeometry(0.09, h, 0.09), trimM);
        mull.position.set(cpos[0], baseY + h / 2, cpos[2]); mull.castShadow = false; group.add(mull);
      });
      var midMull = new THREE.Mesh(new THREE.BoxGeometry(0.07, h, d), trimM);
      midMull.position.set(0, baseY + h / 2, 0); midMull.castShadow = false; group.add(midMull);
      var segs = Math.floor(h / 4);
      for (var si = 1; si <= segs; si++) {
        var belt = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.07, d + 0.1), trimM);
        belt.position.y = baseY + si * 4; belt.castShadow = false; group.add(belt);
      }
      if (!hasPodium) {
        var plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.42, d + 0.16),
          solidMat(0x303743, 0.85));
        plinth.position.y = 0.21; plinth.receiveShadow = true; group.add(plinth);
      }
    }
    if (Math.random() < 0.62) {
      var acSide = Math.random() < 0.5 ? 0 : 1;
      var ac = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.55, 0.26),
        cachedMat('acmat', function () { return new THREE.MeshStandardMaterial({ map: acTex(), color: 0xffffff, roughness: 0.85 }); }));
      var acY = 2.6 + Math.random() * 2.4;
      if (acSide === 0) {
        ac.position.set((Math.random() * 2 - 1) * (w / 2 - 0.6), acY, d / 2 + 0.02);
      } else {
        ac.rotation.y = Math.PI / 2;
        ac.position.set(w / 2 + 0.02, acY, (Math.random() * 2 - 1) * (d / 2 - 0.6));
      }
      group.add(ac);
    }
    if (Math.random() < 0.22) {
      var nsC = [0xff4fd8, 0x3ddcff, 0xffd34d, 0x7dff6b][Math.floor(Math.random() * 4)];
      var ns = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.85, 1.35),
        solidMat(0x101418, 0.5, undefined, { emissive: nsC, emissiveIntensity: 1.25 }));
      ns.position.set(w / 2 + 0.03, 3.2 + Math.random() * 2.2, (Math.random() * 2 - 1) * (d / 2 - 0.4));
      group.add(ns);
    }
    buildings.push({ x1: bx - (w + 0.8) / 2, x2: bx + (w + 0.8) / 2, z1: bz - (d + 0.8) / 2, z2: bz + (d + 0.8) / 2, obj: group });
    scene.add(group);

    // 屋顶设备与楼侧挂件已移除：避免楼顶水箱/天线/红球/空调等“方块物”在天空区形成悬空物
    // （保留干净楼体 + 贴墙市井招牌，保持真实街区观感）

    // 市井招牌：贴裙楼立面（贴墙不伸向天空），保留街铺烟火气
    if (Math.random() < 0.8) {
      var names = ['招待所', '棋牌室', '网吧', '宾馆', '足浴', '餐馆', '粮油店', '理发', '火锅', 'KTV', '便利店', '五金'];
      var sn = names[Math.floor(Math.random() * names.length)];
      var neon = [0x4fd8ff, 0xff5ab5, 0xffd24f, 0x7affb0][Math.floor(Math.random() * 4)];
      var sg = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.42, 0.6),
        new THREE.MeshBasicMaterial({ map: signTex(sn, '#' + neon.toString(16).padStart(6, '0'), 180, 60), transparent: true }));
      sg.position.set(bx, 0.95, bz + d / 2 + 0.06); scene.add(sg);
      neonMats.push({ mat: sg.material, baseOp: 1, ph: Math.random() * 6.28 });
    }
    // 楼顶样式多样（贴顶不悬空）：退台 / 穹顶 / 天线+水箱
    var roofK = Math.floor(Math.random() * 5);
    if (roofK === 1) {
      var up = new THREE.Mesh(new THREE.BoxGeometry(w * 0.68, h * 0.35, d * 0.68),
        stdMat(wallS, { roughness: 0.85 }));
      up.position.y = baseY + h + h * 0.17;
      group.add(up);
    } else if (roofK === 4) {
      var spire = new THREE.Mesh(new THREE.ConeGeometry(Math.min(w, d) * 0.4, 1.7, 4),
        solidMat(0x3a4454, 0.6, 0.3));
      spire.position.y = baseY + h + 0.85; group.add(spire);
    } else if (roofK === 2) {
      var dome = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w, d) * 0.36, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        stdMat(AI_PLASTER || wallTex('plaster'), { roughness: 0.7 }));
      dome.position.y = baseY + h + Math.min(w, d) * 0.2;
      group.add(dome);
    } else if (roofK === 3) {
      var tank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9),
        solidMat(0x4a525e, 0.8));
      tank.position.y = baseY + h + 0.35; group.add(tank);
      var ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 5),
        solidMat(0x8a929e, 0.6, 0.5));
      ant.position.y = baseY + h + 1.3; group.add(ant);
    }
    // 双塔：主楼侧附塔（30% 概率）
    if (Math.random() < 0.3) {
      var tower2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.35, h * 0.6, d * 0.35),
        stdMat(Math.random() < 0.7 ? wallS : win, { roughness: 0.5 }));
      tower2.position.set(w * 0.3, baseY + h * 0.3, 0);
      tower2.castShadow = true;
      group.add(tower2);
    }
    // 楼顶霓虹灯带：贴顶沿一圈（不悬空），点亮城市天际线
    var neon2 = [0x4fd8ff, 0xff5ab5, 0xffd24f, 0x7affb0, 0xff8844][Math.floor(Math.random() * 5)];
    var topNeon = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.05, d - 0.3),
      new THREE.MeshBasicMaterial({ color: neon2, transparent: true, opacity: 0.85 }));
    topNeon.position.y = baseY + h + (roofK === 1 ? h * 0.35 + 0.05 : 0.03);
    group.add(topNeon);
    neonMats.push({ mat: topNeon.material, baseOp: 0.85, ph: Math.random() * 6.28 });
  }

  /* 地点建筑造型 */
  /* 地点建筑样式（v138）：6 种立面造型，按地点类型分配，正面不再是一块光方块 */
  function locStyleOf(id) {
    var s = { bank: 'bank', stock: 'bank', court: 'bank', mall: 'shop', carshop: 'shop',
      workplace: 'modern', jobmarket: 'modern', university: 'modern', hospital: 'modern', gym: 'modern',
      ktv: 'neon', bar: 'neon', pvclub: 'neon', home: 'apartment', lottery: 'apartment', billiards: 'apartment',
      flower: 'arcade', dumpling: 'arcade', hotpot: 'arcade', nightmarket: 'arcade', street: 'arcade' };
    return s[id] || 'arcade';
  }
  function addLocDetail(g, loc, w, h, d, color) {
    if (loc.id === 'park' || loc.id === 'ghostmarket') return;
    var st = locStyleOf(loc.id);
    var d2 = d / 2;
    var glassMat = new THREE.MeshStandardMaterial({ color: 0x9fc8e8, roughness: 0.15, metalness: 0.55, envMapIntensity: 1.1 });
    if (st === 'modern') {
      var baseC = new THREE.Mesh(new THREE.BoxGeometry(w + 0.22, 0.55, d + 0.22),
        new THREE.MeshStandardMaterial({ color: 0x2a3546, roughness: 0.85 }));
      baseC.position.set(0, 0.28, 0); g.add(baseC);
      var lv = 2;
      while (lv < h - 0.6) {
        var belt = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.07, d + 0.08),
          new THREE.MeshStandardMaterial({ color: 0x1c2432, roughness: 0.7 }));
        belt.position.set(0, lv, 0); g.add(belt);
        lv += 2;
      }
      // 竖向玻璃肋条：强化写字楼幕墙立面的分段感
      var ribs = Math.max(4, Math.round(w / 1.0));
      for (var i = 0; i < ribs; i++) {
        var rx = -w / 2 + 0.35 + i * (w - 0.7) / (ribs - 1);
        var rb = new THREE.Mesh(new THREE.BoxGeometry(0.09, h - 0.7, 0.05), glassMat);
        rb.position.set(rx, h / 2 + 0.25, d2 + 0.02); g.add(rb);
      }
      // 顶部檐口灯带
      var eave = new THREE.Mesh(new THREE.BoxGeometry(w + 0.55, 0.16, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x232a36, emissive: 0x66aaff, emissiveIntensity: 0.28, roughness: 0.6 }));
      eave.position.set(0, h - 0.08, d2 + 0.2); g.add(eave);
      // 入口雨棚 + 门柱
      var aw = w - 1.1;
      var awn = new THREE.Mesh(new THREE.BoxGeometry(aw, 0.14, 0.75),
        new THREE.MeshStandardMaterial({ color: 0x2c3440, roughness: 0.7 }));
      awn.position.set(0, 1.65, d2 + 0.38); g.add(awn);
      [-aw / 2 + 0.15, aw / 2 - 0.15].forEach(function (px) {
        var cl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.65, 6),
          new THREE.MeshStandardMaterial({ color: 0x39424f, roughness: 0.8 }));
        cl.position.set(px, 0.82, d2 + 0.48); g.add(cl);
      });
    } else if (st === 'shop') {
      var baseS = new THREE.Mesh(new THREE.BoxGeometry(w + 0.22, 0.5, d + 0.22),
        new THREE.MeshStandardMaterial({ color: 0x6a7280, roughness: 0.85 }));
      baseS.position.set(0, 0.25, 0); g.add(baseS);
      // 大橱窗 + 雨棚 + 广告横带
      var win = new THREE.Mesh(new THREE.PlaneGeometry(w - 1.3, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x8fc0e6, roughness: 0.12, metalness: 0.5, transparent: true, opacity: 0.82, envMapIntensity: 1.2 }));
      win.position.set(0, 1.12, d2 + 0.055); g.add(win);
      var sill = new THREE.Mesh(new THREE.BoxGeometry(w - 1.1, 0.1, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x3a4450, roughness: 0.8 }));
      sill.position.set(0, 1.64, d2 + 0.06); g.add(sill);
      var aw2 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.14, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x2c3440, roughness: 0.7 }));
      aw2.position.set(0, 2.1, d2 + 0.36); g.add(aw2);
    } else if (st === 'arcade') {
      // 骑楼柱廊：门头外一排柱 + 顶部连梁
      var baseA = new THREE.Mesh(new THREE.BoxGeometry(w + 0.22, 0.55, d + 0.5),
        new THREE.MeshStandardMaterial({ map: AI_BRICK, color: 0xffffff, roughness: 0.9 }));
      baseA.position.set(0, 0.28, 0.1); g.add(baseA);
      var cxs = [1.5, 0.75, -0.75, -1.5];
      for (var i = 0; i < cxs.length; i++) {
        var col = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.25, h - 0.85, 9),
          new THREE.MeshStandardMaterial({ map: AI_BRICK, color: 0xffffff, roughness: 0.85 }));
        col.position.set(cxs[i], (h - 0.9) / 2, d2 + 0.52); col.castShadow = false; g.add(col);
      }
      var beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.45, 0.32, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x232a36, roughness: 0.7 }));
      beam.position.set(0, h - 0.16, d2 + 0.58); g.add(beam);
      // 柱间橱窗横条
      var strip = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.6, 0.7), winTex(6, 1, 0.7));
      strip.position.set(0, 1.25, d2 + 0.35); strip.material.side = THREE.DoubleSide; g.add(strip);
    } else if (st === 'apartment') {
      var baseP = new THREE.Mesh(new THREE.BoxGeometry(w + 0.22, 0.55, d + 0.22),
        new THREE.MeshStandardMaterial({ color: 0x4a5160, roughness: 0.85 }));
      baseP.position.set(0, 0.28, 0); g.add(baseP);
      // 阳台阵列：正立面分层阳台 + 护栏
      var rows = Math.max(2, Math.floor((h - 2.4) / 1.8));
      for (var i = 0; i < rows; i++) {
        for (var k = -1; k <= 1; k++) {
          var y = 1.75 + i * 1.75;
          var bal = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.07, 0.62),
            new THREE.MeshStandardMaterial({ color: 0x454f5e, roughness: 0.8 }));
          bal.position.set(k * 1.3, y, d2 + 0.06); g.add(bal);
          var rail = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.34, 0.035),
            new THREE.MeshStandardMaterial({ color: 0x333b48, roughness: 0.8 }));
          rail.position.set(k * 1.3, y + 0.21, d2 + 0.33); g.add(rail);
        }
      }
      // 晾衣杆 + 衣物（生活烟火气）
      var rodM = new THREE.MeshStandardMaterial({ color: 0x5a626e, roughness: 0.8 });
      var rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 4), rodM);
      rod.rotation.z = Math.PI / 2; rod.position.set(0, 2.05, d2 + 0.4); g.add(rod);
      var clothCols = [0xff8fa8, 0x8fd0ff, 0xf5f5f5, 0xffd34d, 0x9be0b0];
      for (var ci = 0; ci < 4; ci++) {
        var cl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.035),
          new THREE.MeshBasicMaterial({ color: clothCols[Math.floor(Math.random() * clothCols.length)] }));
        cl.position.set(-0.6 + ci * 0.42, 2.05, d2 + 0.44); g.add(cl);
      }
    } else if (st === 'bank') {
      // 双石柱 + 门楣三角 + 檐线
      var baseB = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.6, d + 0.3),
        new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.7 }));
      baseB.position.set(0, 0.3, 0); g.add(baseB);
      [-w / 2 + 0.7, w / 2 - 0.7].forEach(function (px) {
        var col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.37, h, 10),
          new THREE.MeshStandardMaterial({ map: AI_STONE, color: 0xffffff, roughness: 0.5, metalness: 0.2 }));
        col.position.set(px, h / 2, d2 + 0.14); g.add(col);
      });
      var tri = new THREE.Mesh(new THREE.ConeGeometry(w * 0.42, 0.55, 3),
        new THREE.MeshStandardMaterial({ map: AI_STONE, color: 0xffffff, roughness: 0.5, metalness: 0.15 }));
      tri.rotation.x = Math.PI / 2;
      tri.position.set(0, h + 0.62, d2 + 0.18); g.add(tri);
      var corn = new THREE.Mesh(new THREE.BoxGeometry(w + 0.45, 0.28, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x39424f, roughness: 0.7 }));
      corn.position.set(0, h + 0.14, d2 + 0.14); g.add(corn);
    } else if (st === 'neon') {
      var baseN = new THREE.Mesh(new THREE.BoxGeometry(w + 0.22, 0.55, d + 0.22),
        new THREE.MeshStandardMaterial({ color: 0x141821, roughness: 0.8, emissive: 0x10131c, emissiveIntensity: 0.2 }));
      baseN.position.set(0, 0.28, 0); g.add(baseN);
      // 霓虹门框 + 灯带 + 射灯
      var nm = new THREE.MeshStandardMaterial({ color: 0x101418, emissive: new THREE.Color(color), emissiveIntensity: 1.5, roughness: 0.5 });
      var stripH = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 0.1, 0.035), nm);
      stripH.position.set(0, 1.3, d2 + 0.05); g.add(stripH);
      [-w / 2 + 0.18, w / 2 - 0.18].forEach(function (px) {
        var s2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.35, 0.035), nm);
        s2.position.set(px, 1.32, d2 + 0.05); g.add(s2);
      });
      var spot = new THREE.PointLight(new THREE.Color(color), 1.1, 9, 1.6);
      spot.position.set(0, 2.2, d2 + 1.2); g.add(spot);
    }
  }
  function buildLoc(loc) {
    var g = new THREE.Group();
    var pp = null;
    for (var pi = 0; pi < pushedLocs.length; pi++) {
      if (pushedLocs[pi].id === loc.id) { pp = pushedLocs[pi]; break; }
    }
    var wx = pp ? pp.x : (loc.x - 50) / 50 * 68;
    var wz = pp ? pp.z : (loc.y - 50) / 50 * 68;
    g.position.set(wx, 0, wz);
    var color = loc.color;

    if (loc.id === 'park') {
      var lawn = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.6, 0.14, 24),
        new THREE.MeshStandardMaterial({ color: 0x2e7d4f, roughness: 0.95 }));
      lawn.position.y = 0.07; g.add(lawn);
      [[-2.2, -1.6], [2.4, -1.2], [-1.8, 1.9], [2.2, 2.0], [0.3, 2.6]].forEach(function (p) {
        var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.5, 6),
          new THREE.MeshStandardMaterial({ map: AI_BARK, color: 0xffffff, roughness: 0.9 }));
        trunk.position.set(p[0], 0.85, p[1]); g.add(trunk);
        var crown = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 6),
          new THREE.MeshStandardMaterial({ map: AI_LEAF, color: 0xffffff, roughness: 0.85 }));
        crown.position.set(p[0], 2.2, p[1]); g.add(crown);
      });
      var kiosk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 1.4),
        new THREE.MeshStandardMaterial({ color: 0xc8b59a, roughness: 0.8 }));
      kiosk.position.set(0.3, 0.78, -2.4); g.add(kiosk);
      var roof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.7, 4),
        new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.8 }));
      roof.position.set(0.3, 1.62, -2.4); roof.rotation.y = Math.PI / 4; g.add(roof);
      return g;
    }

    var isTower = loc.id === 'bank' || loc.id === 'stock' || loc.id === 'mall' || loc.id === 'workplace' || loc.id === 'jobmarket';
    var w = isTower ? 3.6 : 4.4;
    var h = isTower ? 6.8 : 3.8;
    var d = isTower ? 3.0 : 2.6;
    var wallS = loc.id === 'bank' ? 'stone' : (loc.id === 'mall' || loc.id === 'carshop' ? 'glass' : (loc.id === 'flower' || loc.id === 'dumpling' ? 'wood' : (loc.id === 'hotpot' || loc.id === 'nightmarket' ? 'brick' : (loc.id === 'ktv' || loc.id === 'bar' || loc.id === 'pvclub' ? 'dark' : 'plaster'))));
    var aiMap = { brick: AI_BRICK, stone: AI_STONE, glass: AI_GLASS, wood: AI_WOOD, dark: AI_DARK, plaster: AI_PLASTER };
    var wt = aiMap[wallS] || wallTex(wallS);
    wt.repeat.set(aiMap[wallS] ? 1.2 : 1.5, 1);
    var baseOpt = wallS === 'glass' ? { roughness: 0.3, metalness: 0.55 } : { roughness: 0.8, bump: true };
    var mats = [stdMat(wt, baseOpt), stdMat(wt, baseOpt), stdMat(wallTex('panel'), { roughness: 0.85 }),
                stdMat(winTex(3, 3, 0.65), { roughness: 0.5 }), stdMat(winTex(3, 3, 0.65), { roughness: 0.5 }), stdMat(winTex(3, 3, 0.65), { roughness: 0.5 })];
    var body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);

    var door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x223044, emissive: 0x224466, emissiveIntensity: 0.4, roughness: 0.5 }));
    door.position.set(0, 0.78, d / 2 + 0.01); g.add(door);

    var sc = '#' + color.toString(16).padStart(6, '0');
    var signBox = new THREE.Mesh(new THREE.BoxGeometry(w + 0.75, 0.8, 0.07),
      new THREE.MeshStandardMaterial({ map: AI_SIGNBOX, color: 0xffffff, roughness: 0.6, metalness: 0.1 }));
    signBox.position.set(0, h + 0.42, 0.02); signBox.castShadow = true; g.add(signBox);
    var sign = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.6, 0.7),
      new THREE.MeshBasicMaterial({ map: signTex(loc.name, sc, 300, 64), transparent: true }));
    sign.position.set(0, h + 0.42, 0.07); g.add(sign);
    var signGlow = new THREE.PointLight(new THREE.Color(color), 0.8, 10, 1.8);
    signGlow.position.set(0, h + 0.44, 1.2); g.add(signGlow);

    if (isTower) {
      var spire = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 4),
        solidMat(0x3a4454, 0.6, 0.3));
      spire.position.set(0, h + 0.7, 0); spire.rotation.y = Math.PI / 4; g.add(spire);
    }
    var step = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.12, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x3a4450, roughness: 0.85 }));
    step.position.set(0, 0.07, d / 2 + 0.4); g.add(step);
    addLocDetail(g, loc, w, h, d, color);
    // 地点标示牌：立在门口旁（立柱 + 牌面朝向街道）
    var sp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a626e, roughness: 0.85 }));
    sp.position.set(w / 2 + 0.45, 0.65, d / 2 + 0.45); g.add(sp);
    var sb = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.52),
      new THREE.MeshBasicMaterial({ map: signTex(loc.name, sc, 220, 56), transparent: true, side: THREE.DoubleSide }));
    sb.position.set(w / 2 + 0.45, 1.42, d / 2 + 0.45); g.add(sb);

    if (loc.id === 'ktv') {
      var n1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: color }));
      n1.position.set(0, h + 0.78, 0.05); g.add(n1);
    } else if (loc.id === 'bank') {
      [-1.6, 1.6].forEach(function (px) {
        var lion = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.4),
          new THREE.MeshStandardMaterial({ color: 0xbfc7d2, roughness: 0.4, metalness: 0.5 }));
        lion.position.set(px, 0.5, d / 2 + 0.8); g.add(lion);
      });
    } else if (loc.id === 'ghostmarket') {
      var gw = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.0, 1.6, 8, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x2a2026, roughness: 0.9, side: THREE.DoubleSide }));
      gw.position.set(0, 1.0, 0); g.add(gw);
      body.visible = false; door.visible = false;
      var lamp = new THREE.PointLight(0x66ffcc, 0.5, 5, 2); lamp.position.set(0, 1.6, 0); g.add(lamp);
    } else if (loc.id === 'home') {
      var fence = new THREE.Mesh(new THREE.BoxGeometry(w + 1.6, 0.7, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.8 }));
      fence.position.set(0, 0.35, d / 2 + 1.1); g.add(fence);
    } else if (loc.id === 'flower') {
      [-1.7, 1.7].forEach(function (px) {
        var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.5, 6),
          new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.8 }));
        pot.position.set(px, 0.28, d / 2 + 0.7); g.add(pot);
        var fl = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 4),
          new THREE.MeshStandardMaterial({ color: 0xff6b9a, roughness: 0.6 }));
        fl.position.set(px, 0.72, d / 2 + 0.7); g.add(fl);
      });
    } else if (loc.id === 'lottery' || loc.id === 'billiards') {
      var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 12),
        new THREE.MeshStandardMaterial({ color: 0xd8a03c, roughness: 0.5, metalness: 0.4 }));
      wheel.position.set(w / 2 + 0.8, 1.1, 0); wheel.rotation.z = Math.PI / 2; g.add(wheel);
    } else if (loc.id === 'carshop') {
      var car = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.9),
        new THREE.MeshStandardMaterial({ map: AI_CARPAINT, color: 0xffffff, roughness: 0.32, metalness: 0.62, envMapIntensity: 0.9 }));
      car.position.set(w / 2 + 0.9, 0.35, 0); g.add(car);
    } else if (loc.id === 'street') {
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x33404e, roughness: 0.7 }));
      pole.position.set(0, 2.9, d / 2 + 0.6); g.add(pole);
      var flag = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.05),
        new THREE.MeshStandardMaterial({ color: 0xc74a3a, roughness: 0.6 }));
      flag.position.set(0.65, 4.4, d / 2 + 0.6); g.add(flag);
    }
    return g;
  }

  var trafficLamps = [];   // 全局红绿灯相位（v139）


  function acTex() {
    return cachedTex('ac', function () { return tex(function (x, w, h) {
      x.fillStyle = '#e6e6e6'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#9aa0a8';
      x.fillRect(0, 0, w, h * 0.08); x.fillRect(0, h * 0.92, w, h * 0.08);
      x.fillRect(0, h * 0.5, w, 2);
      for (var i = 0; i < 10; i++) x.fillRect(i * (w / 10), h * 0.1, 1.5, h * 0.78);
    }, 128, 96);
  });
  }

  function roadSignTex(text, w, h) {
    return cachedTex('roadsign|'+text+'|'+(w||256)+'|'+(h||56), function () { return tex(function (x, W, H) {
      x.clearRect(0, 0, W, H);
      var g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1f6fd0'); g.addColorStop(1, '#1a5cb0');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = '#eef6ff'; x.lineWidth = 2;
      x.strokeRect(1, 1, W - 2, H - 2);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = 'bold ' + Math.floor(H * 0.5) + 'px "PingFang SC","Microsoft YaHei",sans-serif';
      x.fillStyle = '#ffffff'; x.fillText(text, W / 2, H * 0.52);
    }, w || 256, h || 56);
  });
  }

  function speedSignTex(text, w, h) {
    return cachedTex('speed|'+text, function () { return tex(function (x, W, H) {
      x.clearRect(0, 0, W, H);
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(W / 2, H / 2, Math.min(W, H) * 0.46, 0, Math.PI * 2); x.fill();
      x.lineWidth = Math.max(4, H * 0.14); x.strokeStyle = '#d33a2e';
      x.beginPath(); x.arc(W / 2, H / 2, Math.min(W, H) * 0.36, 0, Math.PI * 2); x.stroke();
      x.fillStyle = '#d33a2e'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = 'bold ' + Math.floor(H * 0.5) + 'px "Arial","PingFang SC",sans-serif'; x.fillText(text, W / 2, H / 2 + 1);
    }, 128, 128);
  });
  }
  /* 红绿灯：路口四角灯柱，红黄绿三色发光（emissive 模拟，不增加真实光源） */
  function buildTrafficLight(x, z, ry) {
    var g = new THREE.Group();
    var poleM = new THREE.MeshStandardMaterial({ color: 0x1d2229, roughness: 0.65, metalness: 0.4 });
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 3.5, 7), poleM);
    pole.position.y = 1.75; g.add(pole);
    var arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.085, 0.085), poleM);
    arm.position.set(0.72, 3.44, 0); g.add(arm);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.94, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x12161c, roughness: 0.55 }));
    head.position.set(1.46, 3.12, 0); g.add(head);
    var cols = [0xff5544, 0xffcc33, 0x4dff77];
    for (var i = 0; i < 3; i++) {
      var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), new THREE.MeshBasicMaterial({ color: 0x0d0d0d }));
      lamp.position.set(1.46, 3.44 - i * 0.26, 0.095); lamp.userData.tl = true; g.add(lamp);
      trafficLamps.push({ mat: lamp.material, color: cols[i], idx: i });
    }
    g.position.set(x, 0, z); g.rotation.y = ry;
    scene.add(g);
  }
  /* 指路牌 + 限速牌（蓝底白字路名，符合国内道路风格） */
  function buildStreetSign(x, z, ry, nsName, ewName) {
    var g = new THREE.Group();
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.9, 6),
      new THREE.MeshStandardMaterial({ color: 0x39424e, roughness: 0.75 }));
    pole.position.y = 1.45; g.add(pole);
    var p1 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.42),
      new THREE.MeshBasicMaterial({ map: roadSignTex(nsName, 256, 56), transparent: true, side: THREE.DoubleSide }));
    p1.position.set(0, 2.6, 0); g.add(p1);
    var p2 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.42),
      new THREE.MeshBasicMaterial({ map: roadSignTex(ewName, 256, 56), transparent: true, side: THREE.DoubleSide }));
    p2.position.set(0, 2.18, 0); g.add(p2);
    var sp = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.44),
      new THREE.MeshBasicMaterial({ map: speedSignTex('40', 128, 128), transparent: true, side: THREE.DoubleSide }));
    sp.position.set(0.92, 2.42, 0); g.add(sp);
    g.position.set(x, 0, z); g.rotation.y = ry;
    scene.add(g);
  }
  /* 交通设施：主路交叉口红绿灯 + 路名牌 */
  function buildCityTraffic() {
    var c = ROAD_CENTERS;
    var nsNames = ['中山路', '解放路', '建设路', '人民路', '青年路', '和平路'];
    var ewNames = ['柳荫街', '朝阳街', '幸福街', '文化街', '春风街', '光明街'];
    var off = ROAD / 2 + 1.5;
    for (var ix = 0; ix < c.length; ix++) {
      for (var iz = 0; iz < c.length; iz++) {
        if ((ix + iz) % 2 !== 0) continue;
        var cx = c[ix], cz = c[iz];
        [[cx - off, cz - off], [cx + off, cz - off], [cx - off, cz + off], [cx + off, cz + off]].forEach(function (cor) {
          var ry = Math.atan2(cz - cor[1], cx - cor[0]);
          buildTrafficLight(cor[0], cor[1], ry);
        });
        buildStreetSign(cx - off + 1.2, cz - off + 1.2, -Math.PI / 4, nsNames[ix % 6], ewNames[iz % 6]);
      }
    }
  }
  /* 烟火气：垃圾桶 / 盆栽 / 自行车 / 小吃摊沿人行道散布 */
  function buildCityProps() {
    var trashM = new THREE.MeshStandardMaterial({ color: 0x4a525c, roughness: 0.9 });
    var cnt = 0;
    buildings.forEach(function (b, bi) {
      if (bi % 4 !== 0) return;
      var fx = b.x2 + 0.55, fz = b.z2 + 0.6;
      var t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.62, 8), trashM);
      t1.position.set(fx, 0.31, fz); t1.updateMatrix(); batchAdd(t1.geometry, t1.material, t1.castShadow, t1.receiveShadow, t1.matrix);
      var t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8),
        new THREE.MeshStandardMaterial({ color: 0x353c46, roughness: 0.8 }));
      t2.position.set(fx, 0.67, fz); t2.updateMatrix(); batchAdd(t2.geometry, t2.material, t2.castShadow, t2.receiveShadow, t2.matrix);
      cnt++;
      if (cnt % 3 === 0) {
        var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.34, 6),
          new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.8 }));
        pot.position.set(b.x1 - 0.45, 0.17, b.z2 + 0.6); pot.updateMatrix(); batchAdd(pot.geometry, pot.material, pot.castShadow, pot.receiveShadow, pot.matrix);
        var pl = new THREE.Mesh(new THREE.SphereGeometry(0.23, 6, 4),
          new THREE.MeshStandardMaterial({ color: 0x3d8f4f, roughness: 0.8 }));
        pl.position.set(b.x1 - 0.45, 0.5, b.z2 + 0.6); pl.updateMatrix(); batchAdd(pl.geometry, pl.material, pl.castShadow, pl.receiveShadow, pl.matrix);
      }
    });
    var bikeM = new THREE.MeshStandardMaterial({ color: 0x5a6472, roughness: 0.7, metalness: 0.3 });
    for (var k = 0; k < 3; k++) {
      var bx = -44 + k * 44, bz = k % 2 === 0 ? 5 : -5;
      for (var j = 0; j < 3; j++) {
        var w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 10), bikeM);
        w1.rotation.z = Math.PI / 2; w1.position.set(bx + j * 1.1 - 0.45, 0.32, bz - 0.2); w1.updateMatrix(); batchAdd(w1.geometry, w1.material, w1.castShadow, w1.receiveShadow, w1.matrix);
        var w2 = w1.clone(); w2.position.set(bx + j * 1.1 + 0.45, 0.32, bz + 0.2); w2.updateMatrix(); batchAdd(w2.geometry, w2.material, w2.castShadow, w2.receiveShadow, w2.matrix);
        var fr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.95), bikeM);
        fr.rotation.x = Math.PI / 2; fr.position.set(bx + j * 1.1, 0.32, bz); fr.updateMatrix(); batchAdd(fr.geometry, fr.material, fr.castShadow, fr.receiveShadow, fr.matrix);
        var seat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.24), bikeM);
        seat.position.set(bx + j * 1.1, 0.44, bz - 0.26); seat.updateMatrix(); batchAdd(seat.geometry, seat.material, seat.castShadow, seat.receiveShadow, seat.matrix);
        var hb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 0.04), bikeM);
        hb.position.set(bx + j * 1.1, 0.56, bz + 0.42); hb.updateMatrix(); batchAdd(hb.geometry, hb.material, hb.castShadow, hb.receiveShadow, hb.matrix);
      }
    }
    for (var s = 0; s < 2; s++) {
      var sx = -18 + s * 36, sz = s === 0 ? 18 : -18;
      var table = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.75, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x6b6257, roughness: 0.85 }));
      table.position.set(sx, 0.37, sz); table.updateMatrix(); batchAdd(table.geometry, table.material, table.castShadow, table.receiveShadow, table.matrix);
      var poleS = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6),
        new THREE.MeshStandardMaterial({ color: 0x333b44, roughness: 0.8 }));
      poleS.position.set(sx, 1.15, sz); poleS.updateMatrix(); batchAdd(poleS.geometry, poleS.material, poleS.castShadow, poleS.receiveShadow, poleS.matrix);
      var umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.55, 8),
        new THREE.MeshStandardMaterial({ color: 0xc74a3a, roughness: 0.7, side: THREE.DoubleSide }));
      umbrella.position.set(sx, 2.05, sz); umbrella.updateMatrix(); batchAdd(umbrella.geometry, umbrella.material, umbrella.castShadow, umbrella.receiveShadow, umbrella.matrix);
      var warm = new THREE.PointLight(0xffc98a, 0.55, 5.5, 1.8);
      warm.position.set(sx, 1.35, sz); warm.updateMatrix(); batchAdd(warm.geometry, warm.material, warm.castShadow, warm.receiveShadow, warm.matrix);
    }
  }


  /* 路灯：仿真造型 + 光晕 + 地面光斑 */
  function buildLamp(x, z, rotY) {
    var g = new THREE.Group();
    var lampMat = cachedMat('lampMat', function () { return AI_LAMP ? new THREE.MeshStandardMaterial({ map: AI_LAMP, color: 0xffffff, roughness: 0.62, metalness: 0.35 }) : new THREE.MeshStandardMaterial({ color: 0x2c3644, roughness: 0.7, metalness: 0.3 }); });
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 4.6, 7), lampMat);
    pole.position.y = 2.3; g.add(pole);
    var arm1 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 0.1), lampMat);
    arm1.position.set(0.55, 4.55, 0); g.add(arm1);
    var arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.1), lampMat);
    arm2.position.set(1.1, 4.28, 0); g.add(arm2);
    var head = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.22, 8),
      solidMat(0x39424e, 0.5, undefined, { emissive: 0x2a2418, emissiveIntensity: 0.85 }));
    head.position.set(1.1, 4.12, 0); g.add(head);
    var bulbMat = cachedMat('bulbMat', function () { return new THREE.MeshBasicMaterial({ color: 0xffe6b0 }); }); lampBulbs.push(bulbMat);
    var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), bulbMat);
    bulb.position.set(1.1, 4.02, 0); g.add(bulb);
    var glow = new THREE.Sprite(cachedMat('lampGlowMat', function () { return new THREE.SpriteMaterial({
      map: cachedTex('lampGlow', function () { return tex(function (x, w, h) {
        var rg = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
        rg.addColorStop(0, 'rgba(255,224,170,.92)');
        rg.addColorStop(0.35, 'rgba(255,204,138,.4)');
        rg.addColorStop(1, 'rgba(255,190,120,0)');
        x.fillStyle = rg; x.fillRect(0, 0, w, h);
      }, 96, 96); }),
      transparent: true, depthWrite: false
    }); }));
    glow.scale.set(2.8, 2.8, 1); glow.position.set(1.1, 4.0, 0); g.add(glow);
    lampGlows.push(glow.material);
    // 灯下暖光斑（柔和径向渐变，真实照亮路面，中和夜景冷蓝）
    var spot = new THREE.Mesh(new THREE.CircleGeometry(2.6, 28),
      cachedMat('lampSpotMat', function () { return new THREE.MeshBasicMaterial({
        map: cachedTex('lampSpot', function () { return tex(function (xx, w2, h2) {
          var rg2 = xx.createRadialGradient(w2 / 2, h2 / 2, 2, w2 / 2, h2 / 2, w2 / 2);
          rg2.addColorStop(0, 'rgba(255,218,156,0.72)');
          rg2.addColorStop(0.5, 'rgba(255,204,138,0.36)');
          rg2.addColorStop(1, 'rgba(255,190,120,0)');
          xx.fillStyle = rg2; xx.fillRect(0, 0, w2, h2);
        }, 160, 160); }),
        transparent: true, depthWrite: false
      }); }));
    spot.rotation.x = -Math.PI / 2; spot.position.set(1.1, 0.03, 0); g.add(spot);
    lampSpots.push(spot.material);
    bulb.userData.keepAlive = true; glow.userData.keepAlive = true; spot.userData.keepAlive = true;
    g.position.set(x, 0, z); g.rotation.y = rotY;
    scene.add(g);
    collectBatchGroup(g);
    scene.remove(g);
  }

  /* ---------- 人物模型（精细化：圆润柱体 + 五官 + 围巾/背包） ---------- */
  var player = {
    x: SPAWN.x, z: SPAWN.z, yaw: 0,
    speed: 0, running: false, moving: false,
    g: null,
    legL1: null, legR1: null, armL1: null, armR1: null
  };

  /* ================= 昼夜系统（v143） =================
     移植参考项目（pelican-bike）程序化天空：一天色板插值 + 太阳/月亮圆盘 + 星空银河 + 程序化云层 + 三层辉光 */
  function lerpC(a, b, t) {
    var r = { r: (a >> 16 & 255) / 255, g: (a >> 8 & 255) / 255, b: (a & 255) / 255 };
    var s = { r: (b >> 16 & 255) / 255, g: (b >> 8 & 255) / 255, b: (b & 255) / 255 };
    return new THREE.Color(r.r + (s.r - r.r) * t, r.g + (s.g - r.g) * t, r.b + (s.b - r.b) * t);
  }
  function sstep(e0, e1, x) {
    var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }
  var SKY_VERT = 'varying vec3 vDir; void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }';
  var SKY_BASE = ['uniform vec3 uSunDir;','uniform vec3 uMoonDir;','uniform vec3 uZenith;','uniform vec3 uHorizon;','uniform vec3 uGround;','uniform vec3 uSunColor;','uniform float uSunGlow;','uniform float uNight;','uniform float uTime;','vec3 skyBase(vec3 dir) {','  float y = dir.y;','  float h = pow(1.0 - clamp(y, 0.0, 1.0), 3.5);','  vec3 col = mix(uZenith, uHorizon, h);','  if (y < 0.0) col = mix(uHorizon, uGround, smoothstep(0.0, -0.3, y));','  float sd = max(dot(dir, uSunDir), 0.0);','  float glow = pow(sd, 6.0) * 0.28 + pow(sd, 48.0) * 0.55 + pow(sd, 400.0) * 1.2;','  col += uSunColor * glow * uSunGlow * (0.45 + 0.55 * h);','  float md = max(dot(dir, uMoonDir), 0.0);','  col += vec3(0.35, 0.45, 0.7) * (pow(md, 24.0) * 0.05 + pow(md, 300.0) * 0.2) * uNight;','  return col;','}'].join('\n');
  var NOISE_GLSL = ['float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }','float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }','float vnoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y); }','float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }'].join('\n');
  var SKY_FRAG = SKY_BASE + '\n' + NOISE_GLSL + '\n' + ['uniform vec2 uCloudOffset;','uniform float uCloudCover;','uniform vec3 uCloudTint;','uniform vec3 uCloudShade;','varying vec3 vDir;','void main() {','  vec3 dir = normalize(vDir);','  vec3 col = skyBase(dir);','  if (uNight > 0.01 && dir.y > -0.05) {','    vec3 p = dir * 320.0;','    vec3 cell = floor(p);','    float h = hash13(cell);','    if (h > 0.9955) {','      vec3 c = cell + 0.5 + (vec3(hash13(cell + 1.3), hash13(cell + 7.1), hash13(cell + 3.7)) - 0.5) * 0.7;','      float d = length(p - c);','      float star = smoothstep(0.42, 0.0, d);','      float tw = 0.55 + 0.45 * sin(uTime * (1.5 + h * 7.0) + h * 91.0);','      vec3 sc = mix(vec3(1.0, 0.82, 0.7), vec3(0.75, 0.85, 1.0), hash13(cell + 5.0));','      col += sc * star * tw * uNight * 3.0 * smoothstep(-0.02, 0.2, dir.y);','    }','    vec3 axis = normalize(vec3(0.3, 0.55, 0.78));','    float band = exp(-pow(dot(dir, axis) * 5.0, 2.0));','    float mw = fbm(dir.xz * 9.0 + dir.y * 4.0);','    col += vec3(0.28, 0.3, 0.45) * band * mw * mw * 0.35 * uNight * smoothstep(0.0, 0.3, dir.y);','  }','  float sd = dot(dir, uSunDir);','  col += uSunColor * smoothstep(0.9993, 0.9997, sd) * 22.0 * (1.0 - uNight);',
'  col += uSunColor * pow(max(sd, 0.0), 4.0) * 1.15 * (1.0 - uNight);','  float md = dot(dir, uMoonDir);',
'  col += vec3(0.7, 0.78, 0.95) * pow(max(md, 0.0), 5.0) * 0.45 * uNight;','  float moon = smoothstep(0.99925, 0.99945, md);','  if (moon > 0.0) {','    vec3 t1 = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));','    vec3 t2 = cross(t1, uMoonDir);','    vec2 mp = vec2(dot(dir, t1), dot(dir, t2)) / 0.033;','    float lit = smoothstep(-0.25, 0.35, mp.x + 0.35);','    float craters = 0.82 + 0.18 * vnoise(mp * 6.0);','    col = mix(col, vec3(1.0, 0.97, 0.9) * 2.4 * craters * mix(0.12, 1.0, lit), moon * smoothstep(0.0, 0.5, uNight));','  }','  if (dir.y > 0.0) {','    vec2 uv = dir.xz / (dir.y + 0.1) * 0.55 + uCloudOffset;','    float n = fbm(uv * 0.9);','    float n2 = fbm(uv * 2.3 + 4.0);','    float d = n * 0.75 + n2 * 0.35;','    float cover = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.32, d);','    float lightN = fbm(uv * 0.9 - uSunDir.xz * 0.12);','    float lit = clamp(0.55 + (n - lightN) * 3.0, 0.0, 1.0);','    float sunSide = pow(max(dot(dir, uSunDir), 0.0), 3.0);','    vec3 cc = mix(uCloudShade, uCloudTint, lit) + uSunColor * sunSide * 0.5 * (1.0 - uNight);','    float horizonFade = smoothstep(0.0, 0.14, dir.y);','    col = mix(col, cc, cover * horizonFade * 0.92);','  }','  gl_FragColor = vec4(col, 1.0);','}'].join('\n');
  var _pal = {};
  var SKY_KEYS = [
{ e: -24, zen: '#02030a', hor: '#070a18', gnd: '#030409', sun: '#000000', li: 0.0, hs: '#1f2c58', hg: '#07070c', hi: 0.42, fog: '#080c1a', exp: 1.5, ct: '#161b2c', cs: '#070912', bloom: 0.95 },
{ e: -9, zen: '#081028', hor: '#23264a', gnd: '#0b0c16', sun: '#ff5a3a', li: 0.0, hs: '#2a3564', hg: '#0c0c14', hi: 0.45, fog: '#161a33', exp: 1.4, ct: '#2d2a48', cs: '#0f1024', bloom: 0.85 },
{ e: -2, zen: '#1c2a5e', hor: '#d0694a', gnd: '#2b1d20', sun: '#ff5b2a', li: 0.25, hs: '#50507a', hg: '#2b1c1c', hi: 0.45, fog: '#6a4a5a', exp: 1.18, ct: '#f07a5a', cs: '#3a2a4a', bloom: 0.7 },
{ e: 3, zen: '#2f4f9a', hor: '#ff9658', gnd: '#5a3a2c', sun: '#ff8a3c', li: 1.3, hs: '#8a86b0', hg: '#4a3326', hi: 0.55, fog: '#d58a6a', exp: 1.0, ct: '#ffb487', cs: '#6a5070', bloom: 0.55 },
{ e: 10, zen: '#3a6fc0', hor: '#ffc896', gnd: '#6e5a48', sun: '#ffc27e', li: 2.3, hs: '#a9c2e6', hg: '#6b5a40', hi: 0.65, fog: '#e8c2a2', exp: 0.88, ct: '#fff0dc', cs: '#9aa2b8', bloom: 0.42 },
{ e: 28, zen: '#2f76d2', hor: '#b9dbf4', gnd: '#7a7058', sun: '#fff0d6', li: 3.0, hs: '#b8d8ff', hg: '#6f6448', hi: 0.8, fog: '#bcd6ea', exp: 0.84, ct: '#ffffff', cs: '#b4c2d6', bloom: 0.32 },
{ e: 75, zen: '#256bd4', hor: '#c6e3fb', gnd: '#7c7460', sun: '#ffffff', li: 3.3, hs: '#c0dcff', hg: '#6f6448', hi: 0.85, fog: '#c4dcf0', exp: 0.82, ct: '#ffffff', cs: '#bcc8da', bloom: 0.3 }
  ].map(function (k) {
    return { e: k.e, zen: new THREE.Color(k.zen), hor: new THREE.Color(k.hor), gnd: new THREE.Color(k.gnd),
      sun: new THREE.Color(k.sun), li: k.li, hs: new THREE.Color(k.hs), hg: new THREE.Color(k.hg),
      hi: k.hi, fog: new THREE.Color(k.fog), exp: k.exp, ct: new THREE.Color(k.ct), cs: new THREE.Color(k.cs), bloom: k.bloom };
  });
  var PAL_COLORS = ['zen', 'hor', 'gnd', 'sun', 'hs', 'hg', 'fog', 'ct', 'cs'];
  var PAL_NUMS = ['li', 'hi', 'exp', 'bloom'];
  function samplePalette(elevDeg, out) {
    var i = 0;
    while (i < SKY_KEYS.length - 2 && elevDeg > SKY_KEYS[i + 1].e) i++;
    var a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
    var t = Math.max(0, Math.min(1, (elevDeg - a.e) / (b.e - a.e)));
    for (var ci = 0; ci < PAL_COLORS.length; ci++) {
      var k = PAL_COLORS[ci];
      if (!out[k]) out[k] = new THREE.Color();
      out[k].copy(a[k]).lerp(b[k], t);
    }
    for (var ni = 0; ni < PAL_NUMS.length; ni++) {
      var k2 = PAL_NUMS[ni];
      out[k2] = a[k2] + (b[k2] - a[k2]) * t;
    }
    return out;
  }
  function sunDirection(hour, out) {
    var dayT = (hour - 6) / 12;
    var nightT = ((hour - 18 + 24) % 24) / 12;
    var e = hour >= 6 && hour <= 18 ? Math.sin(dayT * Math.PI) * (66 * Math.PI / 180) : -Math.sin(nightT * Math.PI) * 0.9;
    var az = (120 - dayT * 180) * Math.PI / 180;
    out.set(Math.cos(e) * Math.cos(az), Math.sin(e), Math.cos(e) * Math.sin(az));
    return out;
  }
  function moonDirection(hour, out) {
    var nt = ((hour - 18 + 24) % 24) / 12;
    var e = Math.sin(Math.max(0, Math.min(1, nt)) * Math.PI) * 0.95 - 0.12;
    var az = (-110 + nt * 150) * Math.PI / 180;
    out.set(Math.cos(e) * Math.cos(az), Math.sin(e), Math.cos(e) * Math.sin(az)).normalize();
    return out;
  }
  function nightFactor(elevDeg) { return sstep(-1.5, -11, elevDeg); }
  function buildSky() {
    skyGroup = new THREE.Group();
    skyUni = {
      uSunDir: { value: new THREE.Vector3(0.5, 0.3, -0.8).normalize() },
      uMoonDir: { value: new THREE.Vector3(-0.5, 0.5, 0.7).normalize() },
      uZenith: { value: new THREE.Color(0x0a1026) },
      uHorizon: { value: new THREE.Color(0x1a2038) },
      uGround: { value: new THREE.Color(0x0c0d16) },
      uSunColor: { value: new THREE.Color(0xfff3d6) },
      uSunGlow: { value: 1 },
      uNight: { value: 0 },
      uTime: { value: 0 },
      uCloudOffset: { value: new THREE.Vector2() },
      uCloudCover: { value: 0.42 },
      uCloudTint: { value: new THREE.Color(0xffffff) },
      uCloudShade: { value: new THREE.Color(0x9aa2b8) }
    };
    var skyMat = new THREE.ShaderMaterial({
      uniforms: skyUni,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide, depthWrite: false
    });
    var sky = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), skyMat);
    sky.frustumCulled = false;
    skyGroup.add(sky);
    skyGroup.position.copy(camera.position);
    scene.add(skyGroup);
  }
  function updateClockUI(h) {
    var el = document.getElementById('ftc-time'); if (!el) return;
    var hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    el.textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
    var ico = document.getElementById('ftc-ico'), ph = document.getElementById('ftc-phase');
    if (!ico || !ph) return;
    if (h >= 5.2 && h < 8) { ico.textContent = '🌅'; ph.textContent = '清晨'; }
    else if (h >= 8 && h < 16.8) { ico.textContent = '☀️'; ph.textContent = '白天'; }
    else if (h >= 16.8 && h < 19.5) { ico.textContent = '🌇'; ph.textContent = '黄昏'; }
    else { ico.textContent = '🌙'; ph.textContent = '夜晚'; }
  }
  function updateDayNight(dt) {
    if (!scene || !scene.fog || !hemiL || !moonL) return;
    gameHour += dt * GAME_DAY_SPEED / 60;
    if (gameHour >= 24) gameHour -= 24;
    var h = gameHour, nowT = performance.now();
    var sunD = new THREE.Vector3(); sunDirection(h, sunD);
    var moonD = new THREE.Vector3(); moonDirection(h, moonD);
    var elevDeg = Math.asin(Math.max(-1, Math.min(1, sunD.y))) * 180 / Math.PI;
    var n = nightFactor(elevDeg);
    var df = 1 - n;
    dayFactor = df;
    var pal = samplePalette(elevDeg, _pal);
    if (skyUni) {
      skyUni.uSunDir.value.copy(sunD);
      skyUni.uMoonDir.value.copy(moonD);
      skyUni.uZenith.value.copy(pal.zen);
      skyUni.uHorizon.value.copy(pal.hor);
      skyUni.uGround.value.copy(pal.gnd);
      skyUni.uSunColor.value.copy(pal.sun);
      skyUni.uSunGlow.value = 1 - n * 0.9;
      skyUni.uNight.value = n;
      skyUni.uTime.value = nowT * 0.001;
      skyUni.uCloudOffset.value.set(nowT * 0.00007, nowT * 0.000035);
      skyUni.uCloudTint.value.copy(pal.ct);
      skyUni.uCloudShade.value.copy(pal.cs);
      scene.fog.color.copy(pal.fog);
      scene.fog.near = 34 + 24 * df;
      scene.fog.far = 112 + 78 * df;
      renderer.toneMappingExposure = pal.exp;
    }
    hemiL.color.copy(pal.hs);
    hemiL.groundColor.copy(pal.hg);
    hemiL.intensity = pal.hi;
    moonL.color.copy(pal.sun);
    moonL.intensity = Math.max(0.12, pal.li * 0.62);
    moonL.userData.orbit = new THREE.Vector3(sunD.x * 70, Math.max(10, sunD.y * 95), sunD.z * 70);
    if (player && player.g) {
      moonL.position.copy(player.g.position).add(moonL.userData.orbit);
      moonL.target.position.copy(player.g.position);
      moonL.target.updateMatrixWorld();
    } else {
      moonL.position.copy(moonL.userData.orbit);
    }
    if (backL) backL.intensity = 0.22 - 0.1 * df;
    if (fillL) fillL.intensity = 0.34 - 0.12 * df;
    for (var li = 0; li < lampBulbs.length; li++) lampBulbs[li].color.copy(lerpC(0xffe6b0, 0xf4f8ff, df));
    for (var gi = 0; gi < lampGlows.length; gi++) lampGlows[gi].opacity = 0.9 * (1 - df) + 0.04;
    for (var si = 0; si < lampSpots.length; si++) lampSpots[si].opacity = 0.8 * (1 - df) + 0.04;
    for (var pi = 0; pi < pointLights.length; pi++) { var pl = pointLights[pi]; pl.intensity = pl.userData.base * (0.1 + 0.9 * (1 - df)); }
    for (var ei = 0; ei < emissiveMats.length; ei++) { var em = emissiveMats[ei]; em.emissiveIntensity = em.userData.baseEI * (0.1 + 0.9 * (1 - df)); }
    if (bloomPass) { var bb = qSettings.q === 2 ? 1 : qSettings.q === 1 ? 0.8 : 0.6; bloomPass.strength = pal.bloom * bb; }

    if (oceanUni) {
      oceanUni.uSunDir.value.copy(sunD);
      oceanUni.uMoonDir.value.copy(moonD);
      oceanUni.uZenith.value.copy(pal.zen);
      oceanUni.uHorizon.value.copy(pal.hor);
      oceanUni.uGround.value.copy(pal.gnd);
      oceanUni.uSunColor.value.copy(pal.sun);
      oceanUni.uSunGlow.value = 1 - n * 0.9;
      oceanUni.uNight.value = n;
      oceanUni.uTime.value = nowT * 0.001;
      oceanUni.uCloudOffset.value.set(nowT * 0.00007, nowT * 0.000035);
      oceanUni.uCloudTint.value.copy(pal.ct);
      oceanUni.uCloudShade.value.copy(pal.cs);
      oceanUni.uDayLight.value = Math.max(0.08, Math.min(1, pal.li / 3 + pal.hi * 0.25));
      oceanUni.uAmp.value = 1;
      oceanUni.uOffset.value = 0;
      for (var oi = 0; oi < OCEAN_WAVES.length; oi++) {
        var ok = 6.28318 / OCEAN_WAVES[oi][3];
        var oc = Math.sqrt(9.8 / ok) * OCEAN_WAVES[oi][4];
        oceanUni.uPhase.value[oi] = ((-ok * oc * nowT * 0.001) % 6.28318 + 6.28318) % 6.28318;
      }
    }
    for (var smi = 0; smi < skylineMats.length; smi++) {
      var smm = skylineMats[smi];
      smm.color.copy(pal.hor).multiplyScalar(smm.userData.horK || 0.7);
      if (smm.userData.baseEI !== undefined) smm.emissiveIntensity = smm.userData.baseEI * (0.12 + 0.88 * (1 - df));
    }
    if (skyGroup) { skyGroup.position.copy(camera.position); }
    if (nowT - lastClockT > 250) { lastClockT = nowT; updateClockUI(h); }
  }


  function buildRoadBlock(x, z, rotY) {
    var g = new THREE.Group();
    var poleMat = new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.7, metalness: 0.3 });
    var railMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    var redMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.6 });
    [-1.1, 1.1].forEach(function (sx) {
      var p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.0, 8), poleMat);
      p.position.set(sx, 0.5, 0); g.add(p);
    });
    for (var i = -2; i <= 2; i++) {
      var seg = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.1), i % 2 === 0 ? redMat : railMat);
      seg.position.set(i * 0.44 + 0.22, 0.95, 0); g.add(seg);
    }
    g.position.set(x, 0, z); g.rotation.y = rotY;
    scene.add(g);
    collectBatchGroup(g);
    scene.remove(g);
  }

  function buildCone(x, z) {
    var c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xd8731f, roughness: 0.7 }));
    c.position.set(x, 0.25, z); c.castShadow = true; c.updateMatrix();
    batchAdd(c.geometry, c.material, c.castShadow, c.receiveShadow, c.matrix);
    var band = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 }));
    band.position.set(x, 0.28, z); band.updateMatrix();
    batchAdd(band.geometry, band.material, band.castShadow, band.receiveShadow, band.matrix);
  }

  // 城市光污染层：四边竖立暖橙→紫的柔和发光面（隐约氛围光）
  function edgeGlowTex() {
    return tex(function (x, w, h) {
      var g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,190,110,0.20)');
      g.addColorStop(0.45, 'rgba(150,100,210,0.10)');
      g.addColorStop(1, 'rgba(20,24,40,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }, 256, 64);
  }
  // 边缘地面渐变延伸条（内侧透明 → 外侧夜色，融入背景）
  function edgeGroundTexH() {
    return tex(function (x, w, h) {
      var g = x.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(26,30,44,0)');
      g.addColorStop(1, 'rgba(6,8,14,0.92)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }, 512, 128);
  }
  function edgeGroundTexV() {
    return tex(function (x, w, h) {
      var g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(26,30,44,0)');
      g.addColorStop(1, 'rgba(6,8,14,0.92)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }, 128, 512);
  }
  function makeEdgeStrip(w, len, flipU, flipV) {
    var g = new THREE.PlaneGeometry(w, len);
    var uv = g.attributes.uv.array;
    for (var i = 0; i < uv.length; i += 2) {
      if (flipU) uv[i] = 1 - uv[i];
      if (flipV) uv[i + 1] = 1 - uv[i + 1];
    }
    return g;
  }


  /* ---------- 海滨 -z 侧（移植参考项目 ocean.js，与天空共享色板，海平线融入天空） ---------- */
  var OCEAN_WAVES = [[0.18,1.0,0.2,21.0,1.0],[-0.45,1.0,0.17,12.5,1.0],[0.75,0.62,0.13,7.0,1.0],[-0.9,0.45,0.1,4.2,1.0],[0.3,1.0,0.07,2.6,1.0]];
  var SHORE_Z = -77.5;
  var oceanUni = null;
  var OCEAN_VERT = `uniform float uTime;
uniform float uOffset;
uniform float uAmp;
uniform float uPhase[5];
varying vec3 vWorld;
varying vec3 vNormal;
varying float vHeight;
varying vec2 vWP;
const float SHORE = -77.5;
vec3 gerstner(vec2 p, vec2 dir, float steep, float wl, float phase, float amp, inout vec3 tangent, inout vec3 binormal) {
  float k = 6.28318 / wl;
  vec2 d = normalize(dir);
  float f = k * dot(d, p) + phase;
  float st = steep * amp;
  float a = st / k;
  float sf = sin(f);
  float cf = cos(f);
  tangent += vec3(-d.x * d.x * st * sf, d.x * st * cf, -d.x * d.y * st * sf);
  binormal += vec3(-d.x * d.y * st * sf, d.y * st * cf, -d.y * d.y * st * sf);
  return vec3(d.x * a * cf, a * sf, d.y * a * cf);
}
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec2 p = vec2(wp.x, wp.z);
  float off = smoothstep(SHORE + 1.0, SHORE - 30.0, wp.z);
  float amp = uAmp * mix(0.35, 1.0, off);
  vec3 tangent = vec3(1.0, 0.0, 0.0);
  vec3 binormal = vec3(0.0, 0.0, 1.0);
  vec3 disp = vec3(0.0);
  disp += gerstner(p, vec2(0.180, 1.000), 0.200, 21.000, uPhase[0], amp, tangent, binormal);
  disp += gerstner(p, vec2(-0.450, 1.000), 0.170, 12.500, uPhase[1], amp, tangent, binormal);
  disp += gerstner(p, vec2(0.750, 0.620), 0.130, 7.000, uPhase[2], amp, tangent, binormal);
  disp += gerstner(p, vec2(-0.900, 0.450), 0.100, 4.200, uPhase[3], amp, tangent, binormal);
  disp += gerstner(p, vec2(0.300, 1.000), 0.070, 2.600, uPhase[4], amp, tangent, binormal);
  wp.xyz += disp;
  vNormal = normalize(cross(binormal, tangent));
  vWorld = wp.xyz;
  vHeight = disp.y / max(uAmp, 0.05);
  vWP = vec2(wp.x + uOffset, wp.z);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
  var OCEAN_FRAG = SKY_BASE + '\n' + NOISE_GLSL + '\n' + `uniform vec3 uDeep;
uniform vec3 uShallow;
uniform float uFogDensity;
uniform float uDayLight;
uniform float uOffset;
uniform vec3 uLampColor;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vHeight;
varying vec2 vWP;
const float SHORE = -77.5;
void main() {
  vec3 N = normalize(vNormal);
  float dist = length(vWorld - cameraPosition);
  vec2 q = vWP * 0.55;
  float e = 0.35;
  vec2 f1 = vec2(0.35, 0.6) * uTime;
  vec2 f2 = vec2(-0.5, 0.25) * uTime;
  float h0 = vnoise(q + f1) + 0.5 * vnoise(q * 2.7 + f2);
  float hx = vnoise(q + vec2(e, 0.0) + f1) + 0.5 * vnoise((q + vec2(e, 0.0)) * 2.7 + f2);
  float hz = vnoise(q + vec2(0.0, e) + f1) + 0.5 * vnoise((q + vec2(0.0, e)) * 2.7 + f2);
  float detail = 0.55 * (1.0 - smoothstep(20.0, 160.0, dist));
  N = normalize(N + vec3(h0 - hx, 0.0, h0 - hz) * detail);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = max(dot(N, V), 0.0);
  float fres = 0.02 + 0.98 * pow(clamp(1.0 - ndv, 0.0, 1.0), 5.0);
  vec3 R = reflect(-V, N);
  R.y = abs(R.y) + 0.02;
  R = normalize(R);
  vec3 refl = skyBase(R);
  float depthF = smoothstep(SHORE - 2.0, SHORE - 45.0, vWorld.z);
  vec3 water = mix(uShallow, uDeep, depthF) * (0.12 + 0.88 * uDayLight);
  float sss = pow(max(dot(V, -uSunDir), 0.0), 3.0) * clamp(vHeight + 0.3, 0.0, 1.5);
  water += uShallow * uSunColor * sss * 0.35 * (1.0 - uNight);
  vec3 col = mix(water, refl, fres);
  float rs = max(dot(R, uSunDir), 0.0);
  col += uSunColor * (pow(rs, 420.0) * 30.0 + pow(rs, 60.0) * 0.7) * (1.0 - uNight) * step(-0.05, uSunDir.y);
  float rm = max(dot(R, uMoonDir), 0.0);
  col += vec3(0.75, 0.82, 1.0) * (pow(rm, 250.0) * 2.2 + pow(rm, 30.0) * 0.06) * uNight;
  float fn = vnoise(vWP * 1.3 + uTime * 0.4) * 0.6 + vnoise(vWP * 4.0 - uTime * 0.3) * 0.4;
  float crest = smoothstep(0.62, 1.05, vHeight + fn * 0.35) * smoothstep(-8.0, -40.0, vWorld.z);
  float shoreLine = SHORE + 0.9 * sin(vWP.x * 0.045) + 0.5 * sin(vWP.x * 0.13 + 1.7);
  float surge = sin(uTime * 0.7 + vWP.x * 0.021) * 1.3;
  float sd = vWorld.z - (shoreLine + surge * 0.5);
  float shoreFoam = smoothstep(-5.5, 0.5, sd) * (0.55 + 0.45 * fn);
  shoreFoam *= smoothstep(0.35, 0.55, fn + smoothstep(-2.5, 0.8, sd) * 0.5);
  float foam = clamp(max(crest * 0.75, shoreFoam), 0.0, 1.0);
  vec3 foamCol = mix(vec3(0.06, 0.08, 0.12), vec3(0.95, 0.97, 1.0), uDayLight) * (0.6 + 0.4 * uSunGlow);
  col = mix(col, foamCol, foam * 0.85);
  float lampRow = pow(max(0.0, 1.0 - abs(fract((vWP.x - 12.0) / 36.0 + 0.5) - 0.5) * 7.0), 2.0);
  col += uLampColor * lampRow * smoothstep(-40.0, -14.0, vWorld.z) * uNight * 0.25 * (0.5 + 0.5 * fn);
  float fogF = 1.0 - exp(-pow(dist * uFogDensity, 1.35));
  vec3 fd = vWorld - cameraPosition;
  vec3 fogCol = skyBase(normalize(vec3(fd.x, max(fd.y * 0.02, 0.0) + 0.004, fd.z)));
  col = mix(col, fogCol, clamp(fogF, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;
  function createOcean() {
    var uni = {
      uSunDir: { value: new THREE.Vector3(0.5, 0.3, -0.8).normalize() },
      uMoonDir: { value: new THREE.Vector3(-0.5, 0.5, 0.7).normalize() },
      uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGround: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() }, uSunGlow: { value: 1 }, uNight: { value: 0 }, uTime: { value: 0 },
      uCloudOffset: { value: new THREE.Vector2() }, uCloudCover: { value: 0.45 },
      uCloudTint: { value: new THREE.Color() }, uCloudShade: { value: new THREE.Color() },
      uOffset: { value: 0 }, uAmp: { value: 1 }, uPhase: { value: new Float32Array(OCEAN_WAVES.length) },
      uDeep: { value: new THREE.Color('#0b3a5a') }, uShallow: { value: new THREE.Color('#1fa3a8') },
      uFogDensity: { value: 0.004 }, uDayLight: { value: 1 }, uLampColor: { value: new THREE.Color('#ffb46a') }
    };
    var mat = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: OCEAN_VERT, fragmentShader: OCEAN_FRAG });
    var xs = [];
    for (var x = -200; x <= 200; x += (x > -60 && x < 60) ? 1.5 : ((x > -110 && x < 110) ? 3 : 7)) xs.push(x);
    var zs = [];
    for (var z = -78; z >= -400; z -= (z > -120) ? 1.2 : ((z > -200) ? 3 : 8)) zs.push(z);
    var pos = [], idx = [];
    for (var j = 0; j < zs.length; j++) for (var i = 0; i < xs.length; i++) pos.push(xs[i], 0, zs[j]);
    var nx = xs.length;
    for (var j = 0; j < zs.length - 1; j++) for (var i = 0; i < nx - 1; i++) {
      var a = j * nx + i, b = a + nx;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0;
    mesh.frustumCulled = false;
    scene.add(mesh);
    oceanUni = uni;
    return mesh;
  }

  // 城市边缘：远景楼群剪影（环带随机错落，融入雾色，无矩形框感）
  function buildSkyline() {
    // v171：柔和楼影——3 方向（东/西/南，海侧除外）。
    // 关键修复：项目渲染管线中 PlaneGeometry 不上屏（地面/楼群均为薄 Box 合批），
    // 旧版用 PlaneGeometry 导致剪影材质采样异常、显示为半透明亮矩形；
    // 现改为薄 BoxGeometry，贴图正常采样，剪影加高加密，观感更繁华真实。
    function makeTex(seed) {
      var cw = 1024, ch = 512;
      var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      var ctx = cv.getContext('2d');
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      ctx.clearRect(0, 0, cw, ch);
      // 剪影底部贴近贴图底缘（贴地，不悬空）
      var baseY = 508;
      // 极短底缘过渡（8px）：仅消除硬切，不形成可见矩形带
      var grad = ctx.createLinearGradient(0, baseY - 8, 0, ch);
      grad.addColorStop(0, 'rgba(13,17,33,' + '0.5)');
      grad.addColorStop(1, 'rgba(13,17,33,0)');
      ctx.fillStyle = grad; ctx.fillRect(0, baseY - 8, cw, ch - (baseY - 8));
      // 楼群剪影：更高、更密、高低错落（h 60-360px，映射 14-84m 高楼天际线）
      var x = 0;
      while (x < cw) {
        var w = 14 + rnd() * 30;
        var h = 60 + rnd() * 300;
        var a = 0.6 + rnd() * 0.24;   // 更实，真实剪影感
        ctx.fillStyle = 'rgba(12,16,30,' + a.toFixed(2) + ')';
        ctx.fillRect(x, baseY - h, w, h);
        // 顶部轮廓细节：塔尖/天线/收分
        if (rnd() < 0.5) {
          ctx.fillStyle = 'rgba(10,14,26,' + (a * 0.92).toFixed(2) + ')';
          ctx.fillRect(x + w * 0.3, baseY - h - (8 + rnd() * 16), w * 0.13, 8 + rnd() * 16);
        }
        if (rnd() < 0.3) {
          ctx.fillStyle = 'rgba(16,21,38,' + (a * 0.75).toFixed(2) + ')';
          ctx.fillRect(x, baseY - h - 2, w, 2 + rnd() * 4);   // 顶楼收边
        }
        // 稀疏微亮窗点（极淡）
        if (rnd() < 0.45) {
          ctx.fillStyle = 'rgba(255,200,130,0.10)';
          for (var wi = 0; wi < 6; wi++) {
            var wx = x + 3 + rnd() * (w - 6), wy = baseY - h + 10 + rnd() * (h - 22);
            ctx.fillRect(wx, wy, 2, 3);
          }
        }
        x += w + 3 + rnd() * 8;
      }
      var tex = new THREE.CanvasTexture(cv);
      tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = 4;
      return tex;
    }
    // 三个方向：+x(东) / -x(西) / +z(南)；海侧 -z 不放
    var dirs = [[1, 0], [-1, 0], [0, 1]];
    var mats = [];
    for (var di = 0; di < dirs.length; di++) {
      var dx = dirs[di][0], dz = dirs[di][1];
      var dist = 132 + di * 11;
      var mat = new THREE.MeshBasicMaterial({ map: makeTex(13 + di * 37), transparent: true,
        depthWrite: false, fog: false });
      mat.color.set(0x9aa8cc);   // 随昼夜渐变（pal.hor 乘算）
      mat.userData.horK = 0.55;   // 白天更暗，避免偏亮矩形感
      // 薄 BoxGeometry（高 120m，贴图 1024x512 沿高度映射 14-84m 楼影）
      var box = new THREE.Mesh(new THREE.BoxGeometry(300, 120, 0.2), mat);
      box.position.set(dx * dist, 60, dz * dist);
      if (dx === 1) box.rotation.y = -Math.PI / 2;      // 东侧 -> 面向原点(-x)
      else if (dx === -1) box.rotation.y = Math.PI / 2; // 西侧 -> 面向原点(+x)
      // dz=1（南侧）默认朝 -z = 面向原点
      box.renderOrder = 1;   // 最后渲染（天空之后），depthTest 保近景遮挡
      scene.add(box);
      mats.push(mat);
    }
    skylineMats = mats;
  }
  function mergeBoxes(baseGeo, items, mat) {
    var pos = baseGeo.attributes.position, nor = baseGeo.attributes.normal, uv = baseGeo.attributes.uv, idx = baseGeo.index;
    var vc = pos.count, ic = idx.count, n = items.length;
    var P = new Float32Array(n * vc * 3), N = new Float32Array(n * vc * 3), U = new Float32Array(n * vc * 2), I = new Uint32Array(n * ic);
    for (var i = 0; i < n; i++) {
      var it = items[i], px = it.p[0], py = it.p[1], pz = it.p[2];
      var sx = it.s ? it.s[0] : 1, sy = it.s ? it.s[1] : 1, sz = it.s ? it.s[2] : 1;
      var o = i * vc;
      for (var v = 0; v < vc; v++) {
        P[(o + v) * 3] = pos.getX(v) * sx + px;
        P[(o + v) * 3 + 1] = pos.getY(v) * sy + py;
        P[(o + v) * 3 + 2] = pos.getZ(v) * sz + pz;
        N[(o + v) * 3] = nor.getX(v); N[(o + v) * 3 + 1] = nor.getY(v); N[(o + v) * 3 + 2] = nor.getZ(v);
        U[(o + v) * 2] = uv.getX(v); U[(o + v) * 2 + 1] = uv.getY(v);
      }
      for (var k = 0; k < ic; k++) I[i * ic + k] = idx.getX(k) + o;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    g.setIndex(new THREE.BufferAttribute(I, 1));
    g.computeBoundingSphere();
    var m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  /* ---------- 人行道护栏（v151）：仿 pelican 双横杆护栏，路口留行人横穿口 ---------- */
  var GAP_RAIL = 6;
  function guardSegs(a0, a1) {
    var segs = [], cur = a0;
    for (var i = 0; i < ROAD_CENTERS.length; i++) {
      var c0 = ROAD_CENTERS[i] - GAP_RAIL, c1 = ROAD_CENTERS[i] + GAP_RAIL;
      if (c0 > cur) segs.push([cur, Math.min(c0, a1)]);
      cur = Math.max(cur, Math.min(c1, a1));
    }
    if (cur < a1) segs.push([cur, a1]);
    return segs.filter(function (sg) { return sg[1] - sg[0] > 0.5; });
  }
  function buildGuardrails() {
    var OFF = ROAD / 2 + 0.7;
    var posts = [], railsH = [], railsV = [];
    ROAD_CENTERS.forEach(function (c) {
      [OFF, -OFF].forEach(function (off) {
        guardSegs(-64, 64).forEach(function (seg) {
          var a0 = seg[0], a1 = seg[1], len = a1 - a0;
          for (var p = a0 + 1.2; p < a1 - 0.2; p += 2.4) posts.push({ p: [p, 0.4, c + off] });
          railsH.push({ p: [(a0 + a1) / 2, 0.74, c + off], s: [len, 1, 1] });
          railsH.push({ p: [(a0 + a1) / 2, 0.42, c + off], s: [len, 1, 1] });
        });
        guardSegs(-64, 64).forEach(function (seg) {
          var b0 = seg[0], b1 = seg[1], len2 = b1 - b0;
          for (var pz = b0 + 1.2; pz < b1 - 0.2; pz += 2.4) posts.push({ p: [c + off, 0.4, pz] });
          railsV.push({ p: [c + off, 0.74, (b0 + b1) / 2], s: [1, 1, len2] });
          railsV.push({ p: [c + off, 0.42, (b0 + b1) / 2], s: [1, 1, len2] });
        });
      });
    });
    if (posts.length) scene.add(mergeBoxes(new THREE.BoxGeometry(0.08, 0.8, 0.08), posts, new THREE.MeshStandardMaterial({ color: 0xf0f0ec, roughness: 0.55, metalness: 0.18 })));
    if (railsH.length) scene.add(mergeBoxes(new THREE.BoxGeometry(1, 0.07, 0.04), railsH, new THREE.MeshStandardMaterial({ color: 0xd9dcdf, roughness: 0.5, metalness: 0.22 })));
    if (railsV.length) scene.add(mergeBoxes(new THREE.BoxGeometry(0.04, 0.07, 1), railsV, new THREE.MeshStandardMaterial({ color: 0xd9dcdf, roughness: 0.5, metalness: 0.22 })));
  }
  /* ---------- 海边棕榈（v151）：仿 pelican 弯曲树干 + 下垂叶片 ---------- */
  function buildBeachPalms() {
    var trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.72, metalness: 0.05 });
    var leafMats = [
      new THREE.MeshStandardMaterial({ color: 0x2f7a3d, roughness: 0.8, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x3e8f4f, roughness: 0.8, side: THREE.DoubleSide })
    ];
    var spots = [[-52, -71.5], [-34, -73.5], [-20, -69.5], [-6, -74.5], [10, -70.5], [26, -73], [42, -69.8], [56, -72.5]];
    spots.forEach(function (sp) {
      var g = new THREE.Group();
      // 平滑弯曲渐细树干：单几何体逐顶点弯曲，无分段阶梯感
      var trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 8.5, 10, 18);
      var pos = trunkGeo.attributes.position;
      for (var i = 0; i < pos.count; i++) {
        var y = pos.getY(i) + 4.25;
        var t = Math.max(0, Math.min(1, y / 8.5));
        pos.setX(i, pos.getX(i) + Math.pow(t, 1.8) * 1.9);
        pos.setZ(i, pos.getZ(i) + t * 0.55);
      }
      trunkGeo.computeVertexNormals();
      var trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.12;
      g.add(trunk);
      var topX = 1.9, topZ = 0.55, topY = 4.45;
      // 双层树冠：上层长叶片上仰展开（树叶在树顶上方）、下层短叶片充实
      for (var layer = 0; layer < 2; layer++) {
        var n = layer === 0 ? 14 : 12;
        var baseLen = layer === 0 ? 3.3 : 2.1;
        var raise = layer === 0 ? 0.34 : 0.85;
        for (var f = 0; f < n; f++) {
          var ang = (f / n) * Math.PI * 2 + (layer === 0 ? 0 : 0.24) + (f % 2) * 0.14;
          var len = baseLen + (f % 4) * 0.35;
          var lg = new THREE.Group();
          var leaf = new THREE.Mesh(new THREE.ConeGeometry(layer === 0 ? 0.36 : 0.28, len, 6), leafMats[f % 2]);
          leaf.rotation.x = Math.PI / 2 - raise;
          leaf.scale.set(1, 1, 0.34);
          leaf.position.set(len * 0.42, 0, 0);
          lg.add(leaf);
          lg.position.set(topX, topY, topZ);
          lg.rotation.y = ang;
          g.add(lg);
        }
      }
      g.position.set(sp[0], 0, sp[1]);
      scene.add(g);
      collectBatchGroup(g);
      scene.remove(g);
    });
  }

  // v174：出城大道 —— 城市最外层主干道（±60 路）向东/西/南延伸 60m 至剪影脚下，
  // 使公路视觉上直达天际线；大道两侧铺郊区暗色地面带，城市边缘不再悬空截断。
  function outlandTex() {
    return tex(function (x, w, h) {
      x.fillStyle = '#252a35'; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 4200; i++) {
        var v = 14 + Math.random() * 22;
        x.fillStyle = 'rgba(' + v + ',' + (v + 3) + ',' + (v + 7) + ',0.6)';
        x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      var g = x.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(14,18,28,0)');
      g.addColorStop(1, 'rgba(7,9,16,0.92)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }, 512, 256);
  }
  function buildOutboundRoads() {
    // 延伸段材质：沥青（按 60m 长比例 repeat）+ overlay + 中线 + 路缘
    var aspH = pelicanRoadTex(); aspH.repeat.set(4 * 60 / 140, 0.8);
    var bumpH = pelicanRoadBump(); bumpH.repeat.set(4 * 60 / 140, 0.8);
    var aspV = pelicanRoadTex(); aspV.repeat.set(0.2, 16 * 60 / 140);
    var bumpV = pelicanRoadBump(); bumpV.repeat.set(0.2, 16 * 60 / 140);
    var roadH = new THREE.MeshStandardMaterial({ map: aspH, roughness: 0.85, metalness: 0.05, envMapIntensity: 0.25, bumpMap: bumpH, bumpScale: 0.9 });
    var roadV = new THREE.MeshStandardMaterial({ map: aspV, roughness: 0.85, metalness: 0.05, envMapIntensity: 0.25, bumpMap: bumpV, bumpScale: 0.9 });
    var ov = new THREE.MeshBasicMaterial({ map: roadOverlayTex(), transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -1 });
    var ln = new THREE.MeshBasicMaterial({ map: roadLinesTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -1 });
    var eg = new THREE.MeshBasicMaterial({ color: 0x989da4, transparent: true, opacity: 0.3, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    function addH(cx, cz) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(60, ROAD), roadH);
      m.rotation.x = -Math.PI / 2; m.position.set(cx, 0.015, cz); m.receiveShadow = true; scene.add(m);
      var o = new THREE.Mesh(new THREE.PlaneGeometry(60, ROAD), ov);
      o.rotation.x = -Math.PI / 2; o.position.set(cx, 0.0165, cz); scene.add(o);
      var l = new THREE.Mesh(new THREE.PlaneGeometry(60, ROAD), ln);
      l.rotation.x = -Math.PI / 2; l.position.set(cx, 0.017, cz); scene.add(l);
      [-1, 1].forEach(function (s) {
        var e = new THREE.Mesh(new THREE.PlaneGeometry(60, 0.13), eg);
        e.rotation.x = -Math.PI / 2; e.position.set(cx, 0.019, cz + s * (ROAD / 2 + 0.07)); scene.add(e);
      });
    }
    function addV(cx, cz) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, 60), roadV);
      m.rotation.x = -Math.PI / 2; m.position.set(cx, 0.015, cz); m.receiveShadow = true; scene.add(m);
      var o = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, 60), ov);
      o.rotation.x = -Math.PI / 2; o.rotation.z = Math.PI / 2; o.position.set(cx, 0.0165, cz); scene.add(o);
      var l = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, 60), ln);
      l.rotation.x = -Math.PI / 2; l.rotation.z = Math.PI / 2; l.position.set(cx, 0.017, cz); scene.add(l);
      [-1, 1].forEach(function (s) {
        var e = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 60), eg);
        e.rotation.x = -Math.PI / 2; e.position.set(cx + s * (ROAD / 2 + 0.07), 0.019, cz); scene.add(e);
      });
    }
    // 东/西：横大道 v=±60 从 x=70 延伸到 x=±130
    [60, -60].forEach(function (v) {
      addH(100, v); addH(-100, v);
    });
    // 南：纵大道 u=±60 从 z=70 延伸到 z=130
    [60, -60].forEach(function (u) {
      addV(u, 100);
    });
  }
  function buildOutland() {
    // 三方向郊区地面带：城市边缘 ±70 → 剪影脚下（东 132 / 西 143 / 南 154）
    var mat = new THREE.MeshStandardMaterial({ map: outlandTex(), roughness: 0.95, metalness: 0, envMapIntensity: 0.05 });
    mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping; mat.map.repeat.set(3, 3);
    var east = new THREE.Mesh(new THREE.PlaneGeometry(64, 150), mat);
    east.rotation.x = -Math.PI / 2; east.position.set(101, 0.004, 0); east.receiveShadow = true; scene.add(east);
    // 西侧剪影更远（143m），地面带加长到剪影脚下
    var west = new THREE.Mesh(new THREE.PlaneGeometry(76, 150), mat);
    west.rotation.x = -Math.PI / 2; west.position.set(-106.5, 0.004, 0); west.receiveShadow = true; scene.add(west);
    var south = new THREE.Mesh(new THREE.PlaneGeometry(150, 86), mat);
    south.rotation.x = -Math.PI / 2; south.position.set(0, 0.0045, 112); south.receiveShadow = true; scene.add(south);
  }

  function initEdge() {
    buildSkyline();
    createOcean();
    // v174：出城大道 + 郊区地面带（公路延伸至剪影脚下，替代旧边缘渐变条）
    buildOutland();
    buildOutboundRoads();
    // 城市光污染发光面（3 边，加法混合，朝向城内）—— 随城市边界外移至大道末端内侧
    var glow = new THREE.MeshBasicMaterial({ map: edgeGlowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    var gl1 = new THREE.Mesh(new THREE.PlaneGeometry(140, 26), glow); gl1.rotation.y = -Math.PI / 2; gl1.position.set(127, 13, 0); scene.add(gl1);
    var gl2 = new THREE.Mesh(new THREE.PlaneGeometry(140, 26), glow); gl2.rotation.y = Math.PI / 2; gl2.position.set(-127, 13, 0); scene.add(gl2);
    var gl3 = new THREE.Mesh(new THREE.PlaneGeometry(140, 26), glow); gl3.rotation.y = Math.PI; gl3.position.set(0, 13, 127); scene.add(gl3);
    // 内部路（±36/±12）路障保留在城市边界 ±60.5；出城大道（±60）路障移至大道末端 ±130
    [-36, -12, 12, 36].forEach(function (lv) {
      buildRoadBlock(60.5, lv, Math.PI / 2); buildCone(61.0, lv + 2.6); buildCone(61.0, lv - 2.6);
      buildRoadBlock(-60.5, lv, Math.PI / 2); buildCone(-61.0, lv + 2.6); buildCone(-61.0, lv - 2.6);
      buildRoadBlock(lv, 60.5, 0); buildCone(lv + 2.6, 61.0); buildCone(lv - 2.6, 61.0);
    });
    [60, -60].forEach(function (lv) {
      buildRoadBlock(130, lv, Math.PI / 2); buildCone(130.5, lv + 2.6); buildCone(130.5, lv - 2.6);
      buildRoadBlock(-130, lv, Math.PI / 2); buildCone(-130.5, lv + 2.6); buildCone(-130.5, lv - 2.6);
      buildRoadBlock(lv, 130, 0); buildCone(lv + 2.6, 130.5); buildCone(lv - 2.6, 130.5);
    });
    buildGuardrails();
    // 海滨沙滩（-z 侧）：细沙颗粒 + 近海湿度渐变 + 碎浪白沫，浪花由海洋 shader 生成
    var shoreTex = tex(function (x, w, h) {
      x.fillStyle = '#e8d5a6'; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 5200; i++) {
        var v = Math.random();
        x.fillStyle = v < 0.5 ? 'rgba(255,244,214,' + (0.2 + v * 0.35) + ')' : 'rgba(148,116,70,' + (0.16 + (1 - v) * 0.3) + ')';
        var ss = 0.5 + Math.random() * 1.5;
        x.fillRect(Math.random() * w, Math.random() * h, ss, ss);
      }
      var g = x.createLinearGradient(0, h - 30, 0, h);
      g.addColorStop(0, 'rgba(196,156,100,0.0)');
      g.addColorStop(0.6, 'rgba(168,126,76,0.35)');
      g.addColorStop(1, 'rgba(138,100,62,0.6)');
      x.fillStyle = g; x.fillRect(0, h - 30, w, 30);
      x.fillStyle = 'rgba(118,88,56,0.3)';
      for (var i = 0; i < 34; i++) { x.fillRect((i * 43) % w, h - 8 - (i % 2) * 4, 16, 2); }
      x.fillStyle = 'rgba(246,249,255,0.7)';
      for (var i = 0; i < 46; i++) {
        var yy = h - 13 - (i % 3) * 3;
        x.fillRect((i * 29) % w, yy, 9 + (i % 5) * 4, 1.6);
      }
    }, 1024, 256);
    var shore = new THREE.Mesh(new THREE.PlaneGeometry(320, 12), new THREE.MeshStandardMaterial({ map: shoreTex, roughness: 1, metalness: 0 }));
    shore.rotation.x = -Math.PI / 2; shore.position.set(0, 0.006, -72); scene.add(shore);
    buildBeachPalms();
  }

  /* ---------- 动态交通（行人 + 汽车，v111）：仿真城市道路 ---------- */
  var ROAD_CENTERS = [-60, -36, -12, 12, 36, 60];
  var npcs = [], cars = [], neonMats = [];

  // 行人：低模仿真小人（沿人行道砖带行走，路口垂直横穿沥青马路）
  function buildNpc(idx) {
    var g = new THREE.Group();
    var palettes = [[0x3a5a8a, 0x2e4a6e], [0x8a4a3a, 0x6e3a2e], [0x3a7a5a, 0x2e5e44], [0x6a5a8a, 0x4e3a6e], [0x8a7a3a, 0x6e5e2e], [0x4a6a7a, 0x3a4a5e]];
    var p = palettes[idx % palettes.length];
    var jacket = new THREE.MeshStandardMaterial({ map: AI_CLOTH, color: p[0], roughness: 0.65 });
    var pant = new THREE.MeshStandardMaterial({ map: AI_CLOTH, color: p[1], roughness: 0.75 });
    var skin = new THREE.MeshStandardMaterial({ color: 0xe6b98c, roughness: 0.55 });
    var hairM = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.6 });
    var shoe = new THREE.MeshStandardMaterial({ color: 0x171a1f, roughness: 0.65 });
    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 8), jacket);
    torso.position.y = 0.85; g.add(torso);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), skin);
    head.position.y = 1.3; g.add(head);
    var hair = new THREE.Mesh(new THREE.SphereGeometry(0.195, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2.1), hairM);
    hair.position.y = 1.34; g.add(hair);
    var nose = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), skin);
    nose.position.set(0, 1.28, 0.17); g.add(nose);
    var legL = new THREE.Group(); legL.position.set(-0.11, 0.6, 0); g.add(legL);
    var legM = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.6, 6), pant);
    legM.position.y = -0.3; legL.add(legM);
    var foot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.24), shoe);
    foot.position.set(0, -0.62, 0.05); legL.add(foot);
    var legR = legL.clone(); legR.position.x = 0.11; g.add(legR);
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.userData.anim = true; } });
    scene.add(g);
    return { g: g, legL: legL, legR: legR };
  }

  // 汽车：低模轿车（车漆/轮胎 AI 贴图 + 玻璃 + 头灯尾灯）
  function buildCar(idx) {
    var g = new THREE.Group();
    var paints = [0x3a5a8a, 0xb04040, 0x3a7a5a, 0x8a7a3a, 0x5a6a8a, 0x7a4a4a, 0x4a6a7a, 0x9a9a9a];
    var paintMat = new THREE.MeshStandardMaterial({ map: AI_CARPAINT, color: paints[idx % paints.length], roughness: 0.28, metalness: 0.66, envMapIntensity: 1.15 });
    var glassMat = new THREE.MeshStandardMaterial({ color: 0x16202c, roughness: 0.12, metalness: 0.85, envMapIntensity: 1.2 });
    var tireMat = AI_TIRE ? new THREE.MeshStandardMaterial({ map: AI_TIRE, color: 0xffffff, roughness: 0.88 }) : new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.85 });
    var under = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x0f1116, roughness: 0.92 }));
    under.position.y = 0.16; g.add(under);
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.85), paintMat);
    body.position.y = 0.42; g.add(body);
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.72), glassMat);
    cabin.position.set(-0.12, 0.88, 0); g.add(cabin);
    var hood = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.78), paintMat);
    hood.position.set(0.72, 0.68, 0); g.add(hood);
    var trunk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.8), paintMat);
    trunk.position.set(-0.78, 0.6, 0); g.add(trunk);
    var hl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.16), new THREE.MeshBasicMaterial({ color: 0xfff2cf }));
    hl.position.set(0.92, 0.48, 0.36); g.add(hl);
    var hl2 = hl.clone(); hl2.position.z = -0.36; g.add(hl2);
    var tl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.14), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
    tl.position.set(-0.92, 0.48, 0.36); g.add(tl);
    var tl2 = tl.clone(); tl2.position.z = -0.36; g.add(tl2);
    [[0.62, 0.42, 0.44], [0.62, -0.42, 0.44], [-0.62, 0.42, 0.44], [-0.62, -0.42, 0.44]].forEach(function (w) {
      var t = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 10), tireMat);
      t.rotation.x = Math.PI / 2; t.position.set(w[0], w[2], w[1]); g.add(t);
      var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.13, 8), new THREE.MeshStandardMaterial({ color: 0x9aa2ac, roughness: 0.3, metalness: 0.8 }));
      hub.rotation.x = Math.PI / 2; hub.position.set(w[0], w[2], w[1]); g.add(hub);
    });
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.userData.anim = true; } });
    scene.add(g);
    return g;
  }

  // 判断穿过某条路时该车道上是否有来车（行人避让，真实过马路）
  function roadClear(center, dirAxis, near) {
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      if (dirAxis === 'x') {
        if (Math.abs(c.fixed - center) < 2.1 && Math.abs(c.g.position.z - near) < 15) return false;
      } else {
        if (Math.abs(c.fixed - center) < 2.1 && Math.abs(c.g.position.x - near) < 15) return false;
      }
    }
    return true;
  }

  function buildBillboard(x, z, rotY) {
    var g = new THREE.Group();
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 4.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a5563, roughness: 0.75 }));
    pole.position.y = 2.2; g.add(pole);
    var texts = ['城市之光广场', '星光KTV', '环球购物中心', '幸福里小区', '盛世金融中心', '璀璨夜宴酒店'];
    var cols = [0x4fd8ff, 0xff5ab5, 0xffd24f, 0x7affb0];
    var board = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.3),
      new THREE.MeshBasicMaterial({ map: signTex(texts[Math.floor(Math.random() * texts.length)], '#' + cols[Math.floor(Math.random() * 4)].toString(16).padStart(6, '0'), 420, 90), transparent: true, side: THREE.DoubleSide }));
    board.position.y = 4.8; g.add(board);
    board.userData.keepAlive = true; board.userData.neon = true; board.userData.baseOp = 1; board.userData.ph = Math.random() * 6.28;
    g.position.set(x, 0, z); g.rotation.y = rotY;
    scene.add(g);
    collectBatchGroup(g);
    scene.remove(g);
  }
  function billboardSpotFree(x, z) {
    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i];
      if (x > b.x1 - 0.9 && x < b.x2 + 0.9 && z > b.z1 - 0.9 && z < b.z2 + 0.9) return false;
    }
    return true;
  }
  function buildProp(x, z, kind, rotY) {
    var g = new THREE.Group();
    if (kind === 0) {
      var base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.5, 10),
        new THREE.MeshStandardMaterial({ map: AI_CONCRETE, color: 0xffffff, roughness: 0.85 }));
      base.position.y = 0.25; g.add(base);
      var bush = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6),
        new THREE.MeshStandardMaterial({ map: AI_LEAF, color: 0xffffff, roughness: 0.85 }));
      bush.position.y = 0.78; g.add(bush);
    } else if (kind === 1) {
      var box = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.7, 1.0),
        new THREE.MeshStandardMaterial({ map: AI_BRICK, color: 0xffffff, roughness: 0.8 }));
      box.position.y = 0.95; g.add(box);
      var roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x2e3a4a, roughness: 0.8 }));
      roof.position.y = 1.9; g.add(roof);
      var glow = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.95 }));
      glow.position.set(0, 1.15, 0.52); g.add(glow);
    } else if (kind === 2) {
      var booth = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.0, 0.85),
        new THREE.MeshStandardMaterial({ color: 0x9aa2ac, roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.5 }));
      booth.position.y = 1.0; g.add(booth);
      var frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.1, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.7 }));
      frame.position.y = 1.05; g.add(frame);
    } else if (kind === 3) {
      var seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.45),
        new THREE.MeshStandardMaterial({ map: AI_WOOD, color: 0xffffff, roughness: 0.8 }));
      seat.position.y = 0.5; g.add(seat);
      var back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.08),
        new THREE.MeshStandardMaterial({ map: AI_WOOD, color: 0xffffff, roughness: 0.8 }));
      back.position.set(0, 0.78, -0.19); g.add(back);
    } else if (kind === 4) {
      var vm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.5, metalness: 0.3 }));
      vm.position.y = 0.9; g.add(vm);
      var screen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x7ad8ff, transparent: true, opacity: 0.9 }));
      screen.position.set(0, 1.25, 0.31); g.add(screen);
    } else {
      var ball = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x9aa2ac, roughness: 0.35, metalness: 0.4 }));
      ball.position.y = 0.4; g.add(ball);
      var col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.4, 8),
        new THREE.MeshStandardMaterial({ map: AI_CONCRETE, color: 0xffffff, roughness: 0.85 }));
      col.position.y = 0.2; g.add(col);
    }
    g.position.set(x, 0, z); g.rotation.y = rotY || 0;
    scene.add(g);
    collectBatchGroup(g);
    scene.remove(g);
  }
  function buildExtras() {
    // 路边广告大牌 ×4（立于白色人行道砖带外缘，避开建筑与路灯）
    var spots = [[15, 6.2, Math.PI], [-15, 6.2, Math.PI], [6.2, 15, -Math.PI / 2], [6.2, -15, -Math.PI / 2]];
    for (var bi2 = 0; bi2 < spots.length; bi2++) {
      if (!billboardSpotFree(spots[bi2][0], spots[bi2][1])) continue;
      buildBillboard(spots[bi2][0], spots[bi2][1], spots[bi2][2]);
    }
    // 人行道砖上市井道具（花坛/报刊亭/电话亭/长椅/售货亭/石墩）：仅砖带内，不占路不碰楼
    ROAD_CENTERS.forEach(function (lv) {
      [-20, 20].forEach(function (px2) {
        [1, -1].forEach(function (sd2) {
          if (Math.random() < 0.8 && billboardSpotFree(px2, lv + sd2 * 5.7)) {
            buildProp(px2, lv + sd2 * 5.7, Math.floor(Math.random() * 6), sd2 > 0 ? Math.PI : 0);
          }
          if (Math.random() < 0.8 && billboardSpotFree(lv + sd2 * 5.7, px2)) {
            buildProp(lv + sd2 * 5.7, px2, Math.floor(Math.random() * 6), sd2 > 0 ? -Math.PI / 2 : Math.PI / 2);
          }
        });
      });
    });
  }

  function initTraffic() {
    // 行人：均匀撒在横/纵人行道砖带（距路中心 4.7m，砖区 3.5~5.92 内）
    for (var i = 0; i < 32; i++) {
      var npc = buildNpc(i);
      var n = { g: npc.g, legL: npc.legL, legR: npc.legR, phase: Math.random() * 6,
        x: 0, z: 0, speed: 1.3 + (i % 5) * 0.25, state: 'walkX', dir: 1, rotY: -Math.PI / 2 };
      if (i % 2 === 0) { n.z = ROAD_CENTERS[i % 6] + (i % 4 < 2 ? 4.7 : -4.7); n.x = -62 + Math.random() * 124; }
      else { n.x = ROAD_CENTERS[i % 6] + (i % 4 < 2 ? 4.7 : -4.7); n.z = -62 + Math.random() * 124; n.state = 'walkZ'; n.dir = n.z < 0 ? 1 : -1; n.rotY = n.dir > 0 ? 0 : Math.PI; }
      npcs.push(n);
    }
    // 汽车：每条横/竖路双向两车道各 1 辆（横路车道 z=c±1.5，竖路车道 x=c±1.5）
    var ci = 0;
    ROAD_CENTERS.forEach(function (c) {
      [1, -1].forEach(function (side) {
        var car = buildCar(ci++);
        cars.push({ g: car, axis: 'x', fixed: c + side * 1.5, pos: -64 + Math.random() * 24,
          dir: side > 0 ? 1 : -1, speed: 4.5 + Math.random() * 2.5, rotY: side > 0 ? 0 : Math.PI });
        var car2 = buildCar(ci++);
        cars.push({ g: car2, axis: 'x', fixed: c + side * 1.5, pos: -60 + Math.random() * 20 + 28,
          dir: side > 0 ? 1 : -1, speed: 4.5 + Math.random() * 2.5 + 0.35, rotY: side > 0 ? 0 : Math.PI });
      });
      [1, -1].forEach(function (side) {
        var car = buildCar(ci++);
        cars.push({ g: car, axis: 'z', fixed: c + side * 1.5, pos: -64 + Math.random() * 24,
          dir: side > 0 ? -1 : 1, speed: 4.5 + Math.random() * 2.5, rotY: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
      });
    });
  }

  function updateTraffic(dt) {
    var i, c;
    // —— 行人 ——
    for (i = 0; i < npcs.length; i++) {
      var n = npcs[i];
      n.phase += dt * 7;
      var sw = Math.sin(n.phase) * 0.55;
      n.legL.rotation.x = sw; n.legR.rotation.x = -sw;
      if (n.state === 'walkX') {
        n.x += n.dir * n.speed * dt;
        if (n.x > 66) { n.x = 66; n.dir = -1; n.rotY = -Math.PI / 2; }
        else if (n.x < -66) { n.x = -66; n.dir = 1; n.rotY = Math.PI / 2; }
        var edge = null, cx = null;
        for (var k = 0; k < 7; k++) {
          var c1 = ROAD_CENTERS[k];
          if ((n.dir > 0 && c1 > n.x && c1 - n.x < 6.5) || (n.dir < 0 && c1 < n.x && n.x - c1 < 6.5)) { cx = c1; break; }
        }
        if (cx !== null) {
          edge = cx + (n.dir > 0 ? 4.7 : -4.7);
          if (Math.abs(n.x - edge) < 0.6) {
            if (roadClear(cx, 'x', n.z)) {
              n.state = 'crossV';
              n.crossTo = cx + (n.dir > 0 ? 4.7 : -4.7);
              n.dir = (n.crossTo > n.x) ? 1 : -1;
              n.rotY = n.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
            } else {
              n.state = 'waitV'; n.crossX = cx;
              n.crossTo = cx + (n.dir > 0 ? 4.7 : -4.7);
              n.wantDir = n.crossTo > n.x ? 1 : -1;
              n.rotY = n.wantDir > 0 ? Math.PI / 2 : -Math.PI / 2;
            }
          }
        }
      } else if (n.state === 'walkZ') {
        n.z += n.dir * n.speed * dt;
        if (n.z > 66) { n.z = 66; n.dir = -1; n.rotY = Math.PI; }
        else if (n.z < -66) { n.z = -66; n.dir = 1; n.rotY = 0; }
        var cx2 = null;
        for (var k2 = 0; k2 < 7; k2++) {
          var c2 = ROAD_CENTERS[k2];
          if ((n.dir > 0 && c2 > n.z && c2 - n.z < 6.5) || (n.dir < 0 && c2 < n.z && n.z - c2 < 6.5)) { cx2 = c2; break; }
        }
        if (cx2 !== null) {
          edge = cx2 + (n.dir > 0 ? 4.7 : -4.7);
          if (Math.abs(n.z - edge) < 0.6) {
            if (roadClear(cx2, 'z', n.x)) {
              n.state = 'crossH';
              n.crossTo = cx2 + (n.dir > 0 ? 4.7 : -4.7);
              n.dir = (n.crossTo > n.z) ? 1 : -1;
              n.rotY = n.dir > 0 ? 0 : Math.PI;
            } else {
              n.state = 'waitH'; n.crossX = cx2;
              n.crossTo = cx2 + (n.dir > 0 ? 4.7 : -4.7);
              n.wantDir = n.crossTo > n.z ? 1 : -1;
              n.rotY = n.wantDir > 0 ? 0 : Math.PI;
            }
          }
        }
      } else if (n.state === 'crossV') {
        n.x += n.dir * n.speed * 1.5 * dt;
        if ((n.dir > 0 && n.x >= n.crossTo) || (n.dir < 0 && n.x <= n.crossTo)) {
          n.x = n.crossTo;
          n.dir = Math.random() < 0.6 ? n.dir : -n.dir;
          n.state = 'walkX';
          n.rotY = n.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          if (Math.random() < 0.3) {
            n.state = 'walkZ';
            n.dir = n.z < 0 ? 1 : -1;
            n.rotY = n.dir > 0 ? 0 : Math.PI;
          }
        }
      } else if (n.state === 'crossH') {
        n.z += n.dir * n.speed * 1.5 * dt;
        if ((n.dir > 0 && n.z >= n.crossTo) || (n.dir < 0 && n.z <= n.crossTo)) {
          n.z = n.crossTo;
          n.dir = Math.random() < 0.6 ? n.dir : -n.dir;
          n.state = 'walkZ';
          n.rotY = n.dir > 0 ? 0 : Math.PI;
          if (Math.random() < 0.3) {
            n.state = 'walkX';
            n.dir = n.x < 0 ? 1 : -1;
            n.rotY = n.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          }
        }
      } else if (n.state === 'waitV') {
        if (roadClear(n.crossX, 'x', n.z)) {
          n.state = 'crossV'; n.dir = n.wantDir;
          n.crossTo = n.crossX + (n.wantDir > 0 ? 4.7 : -4.7);
          n.rotY = n.wantDir > 0 ? Math.PI / 2 : -Math.PI / 2;
        }
      } else if (n.state === 'waitH') {
        if (roadClear(n.crossX, 'z', n.x)) {
          n.state = 'crossH'; n.dir = n.wantDir;
          n.crossTo = n.crossX + (n.wantDir > 0 ? 4.7 : -4.7);
          n.rotY = n.wantDir > 0 ? 0 : Math.PI;
        }
      }
      n.g.rotation.y = n.rotY;
      n.g.position.set(n.x, 0, n.z);
    }
    // —— 汽车 ——
    for (i = 0; i < cars.length; i++) {
      c = cars[i];
      c.pos += c.dir * c.speed * dt;
      if (c.pos > 66) c.pos = -66;
      else if (c.pos < -66) c.pos = 66;
      c.g.rotation.y = c.rotY;
      if (c.axis === 'x') c.g.position.set(c.pos, 0, c.fixed);
      else c.g.position.set(c.fixed, 0, c.pos);
    }
  }

  function buildPlayer() {
    var g = new THREE.Group();
    var cloth = new THREE.MeshStandardMaterial({ map: AI_CLOTH, color: 0xffffff, roughness: 0.65 });
    var cloth2 = new THREE.MeshStandardMaterial({ map: AI_CLOTH, color: 0xc6ccd4, roughness: 0.7 });
    var pant = new THREE.MeshStandardMaterial({ map: AI_CLOTH, color: 0x6a7078, roughness: 0.75 });
    var shoe = new THREE.MeshStandardMaterial({ color: 0x171a1f, roughness: 0.65 });
    var skin = new THREE.MeshStandardMaterial({ color: 0xe6b98c, roughness: 0.55 });
    var hairM = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.6 });

    // 躯干：圆润圆柱 + 外套下摆 + 拉链
    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.62, 10), cloth);
    torso.position.y = 1.06; g.add(torso);
    var coat = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.2, 10), cloth2);
    coat.position.y = 0.82; g.add(coat);
    var belt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.33), new THREE.MeshStandardMaterial({ color: 0x0d0f13, roughness: 0.6 }));
    belt.position.y = 0.8; g.add(belt);
    var collar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.28), new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: 0.5 }));
    collar.position.y = 1.32; g.add(collar);
    var zipper = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.01), new THREE.MeshStandardMaterial({ color: 0x9aa2ac, roughness: 0.4, metalness: 0.5 }));
    zipper.position.set(0, 1.05, 0.26); g.add(zipper);
    [-0.27, 0.27].forEach(function (sx) {
      var sh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), cloth);
      sh.position.set(sx, 1.32, 0); g.add(sh);
    });

    // 头部 + 五官
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 12), skin);
    head.position.y = 1.62; g.add(head);
    var hair = new THREE.Mesh(new THREE.SphereGeometry(0.235, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2.05), hairM);
    hair.position.y = 1.67; g.add(hair);
    var hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 6, 0, Math.PI * 2, Math.PI / 2.4, Math.PI / 2.2), hairM);
    hairBack.position.y = 1.55; g.add(hairBack);
    [-0.08, 0.08].forEach(function (ex2) {
      var eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 4), new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.3 }));
      eye.position.set(ex2, 1.645, 0.2); g.add(eye);
    });
    var brow = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.016, 0.02), hairM);
    brow.position.set(0, 1.695, 0.215); g.add(brow);
    var mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.015, 0.02), new THREE.MeshStandardMaterial({ color: 0xa05548, roughness: 0.5 }));
    mouth.position.set(0, 1.575, 0.218); g.add(mouth);
    var earL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), skin);
    earL.position.set(-0.21, 1.62, 0); g.add(earL);
    var earR = earL.clone(); earR.position.x = 0.21; g.add(earR);
    var scarf = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.03, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0xc74a3a, roughness: 0.8 }));
    scarf.position.y = 1.37; scarf.rotation.x = Math.PI / 2; g.add(scarf);

    // 背包 + 肩带
    var pack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.4, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.85 }));
    pack.position.set(0, 1.06, -0.27); g.add(pack);
    [-0.13, 0.13].forEach(function (sx2) {
      var strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x131a24, roughness: 0.8 }));
      strap.position.set(sx2, 1.2, -0.2); g.add(strap);
    });

    function makeLeg(sideX) {
      var hip = new THREE.Group();
      hip.position.set(sideX, 0.82, 0); g.add(hip);
      var t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.42, 8), pant);
      t1.position.y = -0.21; hip.add(t1);
      var knee = new THREE.Group();
      knee.position.y = -0.42; hip.add(knee);
      var t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.058, 0.4, 8), pant);
      t2.position.y = -0.2; knee.add(t2);
      var foot = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.3), shoe);
      foot.position.set(0, -0.42, 0.07); knee.add(foot);
      return { hip: hip, knee: knee };
    }
    function makeArm(sideX) {
      var sh = new THREE.Group();
      sh.position.set(sideX, 1.34, 0); g.add(sh);
      var a1 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.34, 7), cloth);
      a1.position.y = -0.17; sh.add(a1);
      var el = new THREE.Group();
      el.position.y = -0.34; sh.add(el);
      var a2 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.3, 7), cloth2);
      a2.position.y = -0.15; el.add(a2);
      var hand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 6, 5), skin);
      hand.position.y = -0.32; el.add(hand);
      return { sh: sh, el: el };
    }

    player.legL1 = makeLeg(-0.15); player.legR1 = makeLeg(0.15);
    player.armL1 = makeArm(-0.33); player.armR1 = makeArm(0.33);

    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.userData.anim = true; } });
    g.position.set(player.x, 0, player.z);
    scene.add(g);
    player.g = g;
    var tag = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 20),
      new THREE.MeshBasicMaterial({ color: 0x8bffd2, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    tag.rotation.x = -Math.PI / 2; tag.position.set(0, 2.15, 0); g.add(tag);
  }

  /* ---------- 输入 ---------- */
  var keys = {};
  var camYaw = 0, camPitch = 0.42;
  var dragging = false, lastMX = 0, lastMY = 0;
  var nearLoc = null;
  var modalOpen = false;

  function bindInput() {
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (inRoom) { exitInterior(); return; }
        window.location.href = '/game'; return;
      }
      if (e.key.toLowerCase() === 'e' && nearLoc && !modalOpen && !inRoom) { openLocModal(nearLoc); return; }
      keys[e.code] = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') player.running = true;
      e.preventDefault();
    });
    window.addEventListener('keyup', function (e) {
      keys[e.code] = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') player.running = false;
    });
    var cv = container.querySelector('canvas');
    cv.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      dragging = true; lastMX = e.clientX; lastMY = e.clientY;
      cv.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastMX, dy = e.clientY - lastMY;
      lastMX = e.clientX; lastMY = e.clientY;
      camYaw -= dx * 0.005;
      camPitch = Math.max(inRoom ? -1.05 : -0.35, Math.min(inRoom ? 1.1 : 1.25, camPitch + dy * 0.004));
    });
    window.addEventListener('mouseup', function () {
      dragging = false;
      if (container) container.querySelector('canvas').style.cursor = '';
    });
    cv.addEventListener('wheel', function (e) {
      dist = Math.max(4, Math.min(12, dist + e.deltaY * 0.01));
    });
    window.addEventListener('blur', function () { keys = {}; });
  }

  var dist = 7;

  function updatePlayer(dt) {
    if (inRoom) {
      if (roomView) {
        camera.position.set(roomView.x, roomView.y, roomView.z);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = camYaw;
        camera.rotation.x = camPitch;
      }
      return;
    }
    // 方向修正（v72）：W 前进 = 相机正前方（lookAt 方向）
    var f = 0, s = 0;
    if (keys['KeyW']) f += 1;
    if (keys['KeyS']) f -= 1;
    if (keys['KeyA']) s -= 1;
    if (keys['KeyD']) s += 1;
    var spd = player.running ? 9.5 : 5.2;
    var mx = 0, mz = 0;
    if (f !== 0 || s !== 0) {
      mx = -Math.sin(camYaw) * f + Math.cos(camYaw) * s;
      mz = -Math.cos(camYaw) * f - Math.sin(camYaw) * s;
      player.moving = true;
      player.yaw = Math.atan2(mx, mz);
    } else {
      player.moving = false;
    }
    var nx = player.x + mx * spd * dt;
    var nz = player.z + mz * spd * dt;
    if (!hitTest(nx, nz)) { player.x = nx; player.z = nz; }
    else if (!hitTest(player.x, nz)) { player.z = nz; }
    else if (!hitTest(nx, player.z)) { player.x = nx; }
    player.x = Math.max(-66, Math.min(66, player.x));
    player.z = Math.max(-66, Math.min(66, player.z));
    player.speed = player.moving ? spd : 0;

    player.g.position.x = player.x;
    player.g.position.z = player.z;
    player.g.rotation.y = player.yaw;
    var ph = player.moving ? clock.elapsedTime * 9 : 0;
    var sw = player.moving ? Math.sin(ph) : 0;
    var sw2 = player.moving ? Math.sin(ph + Math.PI) : 0;
    player.legL1.hip.rotation.x = sw * 0.55;
    player.legL1.knee.rotation.x = -Math.max(0, sw) * 0.7;
    player.legR1.hip.rotation.x = sw2 * 0.55;
    player.legR1.knee.rotation.x = -Math.max(0, sw2) * 0.7;
    player.armL1.sh.rotation.x = sw2 * 0.5;
    player.armL1.el.rotation.x = -Math.abs(sw2) * 0.3;
    player.armR1.sh.rotation.x = sw * 0.5;
    player.armR1.el.rotation.x = -Math.abs(sw) * 0.3;
    player.g.position.y = player.moving ? Math.abs(Math.sin(ph)) * 0.04 : 0;

    var cx = player.x + Math.sin(camYaw) * dist * Math.cos(camPitch);
    var cz = player.z + Math.cos(camYaw) * dist * Math.cos(camPitch);
    var cy = Math.max(0.55, 1.7 + Math.sin(camPitch) * dist * 0.5);
    camera.position.lerp(new THREE.Vector3(cx, cy, cz), 1 - Math.pow(0.001, dt));
    camera.lookAt(player.x, 1.55, player.z);

    var best = null, bd = 3.4;
    locGroups.forEach(function (lg) {
      var dx2 = player.x - lg.wx, dz2 = player.z - lg.wz;
      var d2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);
      if (d2 < bd) { bd = d2; best = lg; }
    });
    nearLoc = best;
    var entry = document.getElementById('ft-entry');
    if (best && !modalOpen) {
      document.getElementById('fe-icon').textContent = best.icon;
      document.getElementById('fe-name').textContent = best.name;
      entry.style.display = 'flex';
      document.getElementById('ft-loc').textContent = '📍 ' + best.name;
    } else {
      entry.style.display = 'none';
    }
  }

  function hitTest(x, z) {
    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i];
      if (x > b.x1 && x < b.x2 && z > b.z1 && z < b.z2) return true;
    }
    return false;
  }

  /* ---------- 地点卡片 ---------- */
  function openLocModal(loc) {
    modalOpen = true;
    document.getElementById('fm-icon').textContent = loc.icon;
    document.getElementById('fm-name').textContent = loc.name;
    document.getElementById('fm-type').textContent = loc.type;
    var meta = LOC_META[loc.id] || ['一座城市中的地点。', ['地标']];
    document.getElementById('fm-desc').textContent = meta[0];
    var tags = document.getElementById('fm-tags');
    tags.innerHTML = '';
    (meta[1] || []).forEach(function (t) {
      var sp = document.createElement('span');
      sp.textContent = '#' + t;
      tags.appendChild(sp);
    });
    document.getElementById('ft-modal').style.display = 'flex';
    document.getElementById('ft-entry').style.display = 'none';
  }
  function closeLocModal() {
    modalOpen = false;
    document.getElementById('ft-modal').style.display = 'none';
  }
  function enterLoc(loc) {
    // 保存当前位置（离开室内后回到此位置）
    try { localStorage.setItem('ws_free_pos', JSON.stringify({ x: player.x, z: player.z, yaw: player.yaw })); } catch (e) {}
    // 大街无室内场景 → 直接进入终端模式的大街
    if (loc.id === 'street') { window.location.href = '/game?goto=street'; return; }
    // 显示过渡遮罩 → 跳转独立室内页面 /room?loc=xxx
    var transit = document.getElementById('ft-transit');
    if (transit) {
      var txt = document.getElementById('ft-transit-text');
      if (txt) txt.textContent = '正在进入「' + loc.name + '」…';
      transit.style.display = 'flex';
      requestAnimationFrame(function () { requestAnimationFrame(function () { transit.style.opacity = '1'; }); });
    }
    setTimeout(function () { window.location.href = '/room?loc=' + encodeURIComponent(loc.id); }, 650);
  }

  /* ============================================================
     室内场景系统（v179）：进入地点后直接进入对应 3D 室内场景
     每类地点一套主题室内：家具模型 + AI 贴图 + 暖色灯光
     ============================================================ */
  var interiorRoot = null;     // 所有室内组的容器
  var inRoom = null;           // 当前所在室内地点 id
  var roomView = null;         // 室内相机视点 {x,y,z}
  var citySnap = [];           // 进入室内时隐藏的城市对象
  var R = null;                // 当前构建的室内组
  function rb(w, h, d, mat, x, y, z, ry) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; R.add(m); return m; }
  function rc(rt, r2, h, seg, mat, x, y, z, rx) { var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, r2, h, seg), mat); m.position.set(x, y, z); if (rx) m.rotation.x = rx; R.add(m); return m; }
  function rs(r, mat, x, y, z) { var m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat); m.position.set(x, y, z); R.add(m); return m; }
  function matS(c, r, m) { return new THREE.MeshStandardMaterial({ color: c, roughness: r !== undefined ? r : 0.75, metalness: m !== undefined ? m : 0.05 }); }
  function matT(tex, r, m) { return new THREE.MeshStandardMaterial({ map: tex, roughness: r !== undefined ? r : 0.8, metalness: m !== undefined ? m : 0.05 }); }
  /* 室内房间壳：地板 + 四墙 + 天花板 + 吊灯 */
  function roomShell(floorTex, wallTex, lampCol, lampY) {
    rb(10, 0.12, 8, matT(floorTex, 0.6), 0, -0.06, 0);
    rb(0.14, 3.3, 8, matT(wallTex, 0.9), -5, 1.6, 0);
    rb(0.14, 3.3, 8, matT(wallTex, 0.9), 5, 1.6, 0);
    rb(10, 3.3, 0.14, matT(wallTex, 0.9), 0, 1.6, -4);
    rb(10, 3.3, 0.14, matT(wallTex, 0.9), 0, 1.6, 4);
    rb(10, 0.14, 8, matT(AI_CONCRETE, 0.95), 0, 3.33, 0);
    var ly = lampY || 3.05;
    rs(0.13, new THREE.MeshBasicMaterial({ color: 0xfff3d6 }), 0, ly, 0);
    rc(0.42, 0.52, 0.16, 14, matS(0x1c1f28, 0.5, 0.25), 0, ly + 0.12, 0);
    var lp = new THREE.PointLight(lampCol || 0xffe2b8, 1.7, 16, 2);
    lp.position.set(0, ly - 0.12, 0); R.add(lp);
  }
  function roomLampOnly(col) {   // 无吊灯罩的补充灯
    var lp = new THREE.PointLight(col, 0.9, 9, 2); lp.position.set(0, 3.0, 0); R.add(lp); return lp;
  }

  function buildRoom(id, room) {
    R = room;
    var WOOD = AI_WOOD, TILE = AI_TILE, WALL = AI_PLASTER, CONC = AI_CONCRETE, CLOTH = AI_CLOTH, PANEL = AI_PANEL, CURT = AI_CURTAIN, SIGN = AI_SIGNBOX, DARK = AI_DARK, GLASS = AI_GLASS;
    switch (id) {
      case 'home': {   // 住处：卧室 + 客厅
        roomShell(TILE, WALL, 0xffd9a8);
        rb(1.5, 0.28, 2.0, matT(WOOD, 0.6), -3.3, 0.06, -1.6);                       // 床架
        rb(1.7, 0.16, 2.2, matT(WOOD, 0.6), -3.3, 0.28, -1.6);                        // 床垫
        rb(1.3, 0.14, 1.9, matT(CLOTH, 0.95), -3.3, 0.44, -1.6);                      // 被子
        rb(0.34, 0.2, 1.95, matT(WOOD, 0.6), -2.38, 0.28, -1.6);                      // 床头
        rb(0.55, 0.5, 0.55, matT(WOOD, 0.6), -1.4, 0.25, -1.6);                       // 床头柜
        rs(0.16, new THREE.MeshBasicMaterial({ color: 0xffe6b8 }), -1.4, 0.66, -1.6); // 台灯
        rb(1.1, 1.9, 0.55, matT(WOOD, 0.6), -3.35, 0.95, 2.2);                        // 衣柜
        rb(0.95, 0.12, 0.85, matT(CLOTH, 0.9), 2.2, 0.06, -0.6);                      // 沙发底座
        rb(0.95, 0.5, 0.7, matT(CLOTH, 0.9), 2.2, 0.45, -0.5);                        // 沙发靠背
        rb(0.85, 0.42, 0.85, matT(CLOTH, 0.9), 2.2, 0.34, -0.62);                     // 坐垫
        rb(0.6, 0.45, 0.6, matT(WOOD, 0.6), 1.3, 0.22, -0.5);                         // 茶几
        rb(1.6, 1.05, 0.5, matT(WOOD, 0.6), 1.35, 0.55, 2.5);                         // 电视柜
        rb(1.15, 0.68, 0.08, matT(DARK, 0.4), 1.35, 0.95, 2.2);                       // 电视
        rb(2.6, 0.04, 1.8, matT(CLOTH, 0.95), 0.2, 0.02, -0.2);                       // 地毯
        rb(0.7, 0.55, 0.06, matT(SIGN, 0.8), 4.62, 1.75, -1.6, 0);                    // 装饰画
        break;
      }
      case 'workplace': {   // 办公室
        roomShell(CONC, WALL, 0xd8e8ff);
        for (var w1 = 0; w1 < 4; w1++) {
          var wx = -3 + (w1 % 2) * 3.4, wz = -2.2 + Math.floor(w1 / 2) * 3.1;
          rb(1.0, 1.35, 0.06, matS(0x9fb6d8, 0.7, 0.1), wx, 0.72, wz);                // 隔断
          rb(1.15, 0.06, 0.7, matT(WOOD, 0.55), wx, 0.73, wz - 0.38);                 // 桌面
          rb(0.42, 0.5, 0.36, matS(0x2b2f38, 0.6, 0.1), wx, 0.35, wz - 0.45);         // 主机
          rb(0.55, 0.55, 0.08, matT(DARK, 0.4), wx, 1.12, wz - 0.12);                 // 显示器
          rb(0.45, 0.05, 0.45, matT(CLOTH, 0.9), wx - 0.5, 0.42, wz - 0.4);           // 椅面
          rc(0.06, 0.06, 0.45, 8, matS(0x33363f, 0.6, 0.2), wx - 0.5, 0.2, wz - 0.4);
        }
        rb(1.8, 0.08, 0.9, matT(WOOD, 0.55), 2.6, 0.74, -0.2);                         // 会议桌
        rb(0.4, 0.06, 0.4, matT(CLOTH, 0.9), 2.6, 0.9, -0.75); rb(0.4, 0.06, 0.4, matT(CLOTH, 0.9), 2.6, 0.9, 0.35);
        rb(2.0, 1.6, 0.07, matS(0xf5f7fa, 0.7), 0.4, 1.0, -3.55);                      // 白板
        rb(0.9, 1.7, 0.55, matT(WOOD, 0.6), -4.3, 0.85, 2.4);                          // 文件柜
        rb(0.5, 1.0, 0.5, matS(0xcfd6e2, 0.6), 4.2, 0.55, 2.6);                        // 饮水机
        break;
      }
      case 'jobmarket': {   // 招聘大厅
        roomShell(CONC, WALL, 0xcfe8ff);
        for (var j1 = 0; j1 < 3; j1++) {
          var jx = -3 + j1 * 3;
          rb(1.6, 0.07, 0.7, matT(WOOD, 0.6), jx, 0.74, -2.6);                         // 摊位桌
          rb(0.06, 1.9, 0.05, matS(0xdfe6f0, 0.7), jx + 0.85, 1.1, -2.9);              // 易拉宝
          rb(0.02, 1.7, 0.9, matT(SIGN, 0.7), jx + 0.85, 1.0, -2.9);                   // 海报
          rb(0.45, 0.05, 0.45, matT(CLOTH, 0.9), jx - 0.5, 0.42, -2.6);                // 椅
          rc(0.06, 0.06, 0.42, 8, matS(0x33363f, 0.6), jx - 0.5, 0.2, -2.6);
        }
        rb(3.4, 1.3, 0.1, matS(0x0d1c33, 0.3, 0.1), 0, 1.0, 3.1);                      // 大屏
        rb(3.0, 0.9, 0.04, new THREE.MeshBasicMaterial({ color: 0x3d7dff }), 0, 1.05, 3.35);  // 屏显
        rb(1.8, 0.1, 0.5, matT(WOOD, 0.6), -3.4, 0.5, 2.2); rb(1.8, 0.1, 0.5, matT(WOOD, 0.6), 3.4, 0.5, 2.2);  // 长椅
        rb(1.8, 0.02, 0.55, matT(CLOTH, 0.9), -3.4, 0.55, 2.2); rb(1.8, 0.02, 0.55, matT(CLOTH, 0.9), 3.4, 0.55, 2.2);
        break;
      }
      case 'bank': {   // 银行大厅
        roomShell(TILE, WALL, 0xffe6c0);
        rb(7.2, 0.85, 0.5, matT(PANEL, 0.45, 0.15), 0, 0.43, 3.0);                     // 柜台
        rb(7.2, 0.5, 0.05, GLASS ? matT(GLASS, 0.15, 0.1) : matS(0xbfd9f2, 0.2), 0, 1.0, 3.35);  // 玻璃
        rb(0.7, 0.06, 0.5, matS(0x444b57, 0.5, 0.4), -3.2, 0.86, 3.0);                 // 台面
        rb(0.7, 0.06, 0.5, matS(0x444b57, 0.5, 0.4), 3.2, 0.86, 3.0);
        rb(0.6, 1.4, 0.45, matT(PANEL, 0.5, 0.15), 3.8, 0.7, 1.8);                     // 取号机
        rb(0.42, 0.35, 0.06, new THREE.MeshBasicMaterial({ color: 0xff5a4e }), 3.8, 1.5, 1.8);  // 叫号屏
        rc(0.32, 0.32, 3.3, 12, matT(WOOD, 0.5), -4.4, 1.65, -2.8);                    // 立柱
        rc(0.32, 0.32, 3.3, 12, matT(WOOD, 0.5), 4.4, 1.65, -2.8);
        rb(1.2, 0.08, 0.6, matT(WOOD, 0.6), -3.8, 0.5, -2.4); rb(1.2, 0.5, 0.55, matT(CLOTH, 0.9), -3.8, 0.9, -2.4);  // 等候沙发
        rb(1.4, 2.2, 0.2, matS(0x3a4250, 0.4, 0.5), -3.9, 1.1, 2.8);                    // 金库门
        roomLampOnly(0xfff0d0);
        break;
      }
      case 'mall': {   // 商场
        roomShell(TILE, WALL, 0xe8f2ff);
        for (var m1 = 0; m1 < 4; m1++) {
          var mx = -4.6 + (m1 % 2) * 9.2, mz = -2.8 + Math.floor(m1 / 2) * 4.4;
          rb(0.5, 2.0, 1.6, matT(PANEL, 0.6), mx, 1.0, mz);                            // 货架立柱
          rb(0.5, 0.06, 1.55, matT(WOOD, 0.6), mx, 0.6, mz);
          rb(0.5, 0.06, 1.55, matT(WOOD, 0.6), mx, 1.3, mz);
          rb(0.5, 0.06, 1.55, matT(WOOD, 0.6), mx, 1.95, mz);
        }
        rb(1.6, 0.85, 0.7, matT(PANEL, 0.5), 4.4, 0.43, -3.5);                          // 收银台
        rb(1.1, 1.4, 0.05, new THREE.MeshBasicMaterial({ color: 0x9fe0ff }), 0, 1.6, 3.6); // 灯带
        rb(3.0, 0.4, 1.2, matS(0x9aa4b8, 0.8), -1, 1.4, 2.6);                            // 扶梯
        rc(0.3, 0.3, 3.3, 10, matS(0xdfe6f0, 0.5, 0.2), -4.5, 1.65, 0.2);               // 立柱
        rc(0.3, 0.3, 3.3, 10, matS(0xdfe6f0, 0.5, 0.2), 4.5, 1.65, 0.2);
        rb(1.0, 0.04, 0.6, matT(CLOTH, 0.8), 2.6, 1.15, -0.5);                          // 装饰
        break;
      }
      case 'stock': {   // 交易大厅
        roomShell(CONC, WALL, 0xbfe8ff);
        rb(7.6, 1.5, 0.12, matS(0x071a2e, 0.3), 0, 1.15, 3.2);                          // 行情墙
        rb(7.0, 1.1, 0.03, new THREE.MeshBasicMaterial({ color: 0x19d98a }), 0, 1.2, 3.4);  // 绿色屏
        rb(0.5, 0.4, 0.03, new THREE.MeshBasicMaterial({ color: 0xff4d4d }), -3.0, 1.35, 3.4);  // 红色涨
        rb(0.5, 0.4, 0.03, new THREE.MeshBasicMaterial({ color: 0xff4d4d }), -1.2, 1.05, 3.4);
        rb(0.5, 0.4, 0.03, new THREE.MeshBasicMaterial({ color: 0xff4d4d }), 1.5, 1.55, 3.4);
        for (var s1 = 0; s1 < 3; s1++) {
          var sx = -3 + s1 * 3;
          rb(1.2, 0.07, 0.8, matT(WOOD, 0.55), sx, 0.72, -2.4);                          // 操作台
          rb(0.5, 0.45, 0.06, matT(DARK, 0.4), sx - 0.2, 1.02, -2.2);                    // 左屏
          rb(0.5, 0.45, 0.06, matT(DARK, 0.4), sx + 0.3, 1.02, -2.2);                    // 右屏
          rb(0.45, 0.05, 0.45, matT(CLOTH, 0.9), sx, 0.42, -2.4);
          rc(0.06, 0.06, 0.4, 8, matS(0x33363f, 0.6), sx, 0.2, -2.4);
        }
        rc(0.3, 0.3, 3.3, 10, matS(0x9aa4b8, 0.6, 0.2), -4.5, 1.65, 0.4);
        rc(0.3, 0.3, 3.3, 10, matS(0x9aa4b8, 0.6, 0.2), 4.5, 1.65, 0.4);
        break;
      }
      case 'carshop': {   // 4S 展厅
        roomShell(TILE, GLASS ? matT(GLASS, 0.2) : matS(0xbfd9f2, 0.3), 0xf0f6ff);
        for (var c1 = 0; c1 < 2; c1++) {
          var cx = -2.4 + c1 * 4.8;
          rc(1.6, 1.6, 0.1, 24, matS(0xdfe6f0, 0.6), cx, 0.05, -1.4);                   // 展台
          rb(1.0, 0.35, 0.5, matS(c1 === 0 ? 0xdfe6f0 : 0xbfd9f2, 0.3, 0.6), cx, 0.32, -1.4);  // 车身
          rb(0.42, 0.16, 0.35, matS(0xbfd9f2, 0.3, 0.6), cx - 0.4, 0.18, -1.7);         // 车头
          rb(0.42, 0.16, 0.35, matS(0xbfd9f2, 0.3, 0.6), cx + 0.4, 0.18, -1.1);         // 车尾
          for (var w2 = -1; w2 <= 1; w2 += 2) {
            rc(0.17, 0.17, 0.12, 12, matT(AI_TIRE, 0.9), cx + w2 * 0.38, 0.13, -1.75);
            rc(0.17, 0.17, 0.12, 12, matT(AI_TIRE, 0.9), cx + w2 * 0.38, 0.13, -1.05);
          }
          rb(0.08, 0.06, 0.16, matS(0xffe9a8, 0.2), cx + 0.42, 0.24, -1.08);            // 车灯
        }
        rb(8.6, 0.06, 0.06, new THREE.MeshBasicMaterial({ color: 0x9fe0ff }), 0, 1.1, 2.9);  // 灯带
        rc(0.3, 0.3, 3.3, 10, matS(0xcfd6e2, 0.5, 0.3), -4.5, 1.65, 1.6);
        rc(0.3, 0.3, 3.3, 10, matS(0xcfd6e2, 0.5, 0.3), 4.5, 1.65, 1.6);
        rb(1.6, 0.06, 0.8, matT(WOOD, 0.6), 3.6, 0.6, -3.2);                             // 洽谈桌
        break;
      }
      case 'adu': case 'training': {   // 教室
        roomShell(CONC, WALL, 0xf2e6c8);
        for (var t1 = 0; t1 < 3; t1++) {
          for (var t2 = 0; t2 < 4; t2++) {
            var tx = -3.4 + t1 * 3.4, tz = -2.6 + t2 * 1.5;
            rb(1.0, 0.07, 0.6, matT(WOOD, 0.55), tx, 0.74, tz);                          // 课桌
            rb(0.9, 0.03, 0.5, matS(0x2b3a2b, 0.7), tx, 0.78, tz);                        // 桌面
            rb(0.35, 0.06, 0.35, matT(WOOD, 0.55), tx, 0.44, tz + 0.42);                 // 椅面
            rc(0.05, 0.05, 0.44, 8, matS(0x33363f, 0.6), tx, 0.2, tz + 0.42);
          }
        }
        rb(1.4, 0.1, 0.8, matT(WOOD, 0.55), 3.6, 0.76, -2.2);                            // 讲台
        rb(4.2, 1.5, 0.06, matS(0x1d3a2d, 0.6), 0.2, 1.0, 3.55);                         // 黑板
        rb(3.8, 1.35, 0.03, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.2, 1.05, 3.5);  // 投影幕
        rb(2.2, 0.6, 1.0, matT(WOOD, 0.6), -3.9, 0.6, 1.8);                              // 书架
        rb(2.0, 0.6, 0.9, matS(0x9aa4b8, 0.7), -3.9, 0.9, 1.8);                          // 书层
        rb(2.0, 0.6, 0.9, matS(0x8d9db8, 0.7), -3.9, 1.55, 1.8);
        break;
      }
      case 'bar': case 'club': {   // 酒吧 / 会所
        roomShell(WOOD, WALL, 0xffb890);
        rb(4.4, 1.1, 0.7, matT(WOOD, 0.5), -0.4, 0.55, 2.6);                              // 吧台
        rb(4.4, 0.06, 0.6, matS(0x8a5a3a, 0.4), -0.4, 1.1, 2.6);
        rb(0.12, 2.2, 0.5, matT(GLASS || WOOD, 0.2, 0.1), -2.6, 1.1, 2.6);                // 酒柜隔板
        rb(0.12, 2.2, 0.5, matT(GLASS || WOOD, 0.2, 0.1), 1.8, 1.1, 2.6);
        rb(3.0, 1.6, 0.3, matS(0x3a2a18, 0.4), 0.4, 0.8, 3.35);                           // 酒架背景
        rb(2.8, 1.3, 0.04, matT(SIGN, 0.6), 0.4, 1.05, 3.5);                              // 酒标装饰
        for (var b1 = 0; b1 < 4; b1++) {
          var bx = -2.6 + b1 * 1.7;
          rc(0.16, 0.16, 0.75, 10, matT(WOOD, 0.6), bx, 0.38, 2.4);                       // 高脚凳
          rc(0.13, 0.13, 0.06, 10, matS(0x2b1f14, 0.5), bx, 0.77, 2.4);
        }
        rb(2.0, 0.1, 0.9, matT(CLOTH, 0.9), 2.8, 0.32, -1.2);                            // 卡座
        rb(2.0, 0.5, 0.85, matT(CLOTH, 0.9), 2.8, 0.62, -1.3);
        rb(1.2, 0.08, 0.7, matT(WOOD, 0.6), 1.7, 0.42, -1.2);                             // 小桌
        rb(0.04, 0.5, 1.6, new THREE.MeshBasicMaterial({ color: 0x9a5cff }), -4.5, 2.0, -0.6);  // 霓虹条
        rb(0.04, 0.5, 1.6, new THREE.MeshBasicMaterial({ color: 0xff4fd8 }), -4.48, 2.0, -0.6);
        var stage = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 24), matS(0x4a3a2a, 0.6));
        stage.position.set(-2.5, 0.05, -2.6); R.add(stage);
        roomLampOnly(0xffd0a0);
        break;
      }
      case 'ktv': {   // KTV 包间
        roomShell(CONC, WALL, 0xff9ad5);
        rb(4.0, 0.14, 1.1, matT(CLOTH, 0.95), 0, 0.35, -2.8);                              // 沙发底座
        rb(4.0, 0.6, 0.4, matT(CLOTH, 0.95), 0, 0.72, -3.1);                               // 沙发靠背
        rb(4.0, 0.16, 1.0, matT(CLOTH, 0.95), 0, 0.55, -2.85);                             // 坐垫
        rb(2.0, 0.42, 0.8, matT(WOOD, 0.6), 0, 0.21, -0.8);                                // 茶几
        rb(2.4, 1.2, 0.1, matT(DARK, 0.4), 0, 0.8, 3.4);                                   // 电视墙
        rb(2.0, 1.0, 0.03, new THREE.MeshBasicMaterial({ color: 0x88ddff }), 0, 0.9, 3.42);  // 电视屏
        rc(0.06, 0.06, 1.0, 8, matS(0x33363f, 0.6), -1.5, 0.5, -1.5);                       // 麦克风架
        rs(0.05, matS(0x22252e, 0.6), -1.5, 1.15, -1.5);
        var disco = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff66dd }));
        disco.position.set(0, 3.1, 0); R.add(disco);
        var dp = new THREE.PointLight(0xff66dd, 0.8, 10, 2); dp.position.set(0, 3.0, 0); R.add(dp);
        rb(2.2, 0.04, 1.8, matT(CLOTH, 0.95), 0.4, 0.02, -0.6);                            // 地毯
        break;
      }
      case 'pvclub': {   // 私人会所
        roomShell(WOOD, WALL, 0xffcaa0);
        rb(3.6, 0.16, 1.2, matT(CLOTH, 0.95), 0, 0.4, -2.6);                                // 主沙发
        rb(3.6, 0.7, 0.5, matT(CLOTH, 0.95), 0, 0.85, -2.9);
        rb(1.0, 0.1, 0.7, matT(WOOD, 0.6), -2.0, 0.55, -2.5);                                // 扶手
        rb(1.0, 0.1, 0.7, matT(WOOD, 0.6), 2.0, 0.55, -2.5);
        rb(1.2, 0.1, 0.7, matT(WOOD, 0.6), 3.2, 0.55, -0.4);                                 // 边桌
        rb(1.9, 0.5, 0.9, matT(CLOTH, 0.9), -3.4, 0.4, 0.6);                                 // 按摩床
        rc(0.35, 0.35, 0.12, 12, matS(0x2b1f14, 0.5), 2.6, 0.14, 1.8);                       // 香薰台
        rs(0.22, new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), 2.6, 0.4, 1.8);           // 香薰灯
        rb(0.06, 2.2, 2.6, matT(CURT, 0.8), -4.55, 1.1, 0.2);                                // 帷幔
        rb(2.6, 0.04, 3.4, matT(CLOTH, 0.95), 0.2, 0.02, 0.4);                               // 地毯
        roomLampOnly(0xffd0a0);
        break;
      }
      case 'billiards': {   // 台球厅
        roomShell(CONC, WALL, 0xbfe8d8);
        rb(2.4, 0.12, 1.4, matT(WOOD, 0.55), 0, 0.7, -1.6);                                  // 台边框
        rb(2.2, 0.02, 1.2, matT(CLOTH, 0.9), 0, 0.78, -1.6);                                 // 台呢
        for (var p1 = 0; p1 < 6; p1++) { var pa = p1 / 6 * Math.PI * 2; var px = Math.cos(pa) * 1.7, pz = -1.6 + Math.sin(pa) * 1.1; rc(0.05, 0.05, 0.16, 8, matS(0x1c1f28, 0.5), px, 0.05, pz); }
        for (var p2 = 0; p2 < 4; p2++) { rc(0.07, 0.09, 0.7, 8, matT(WOOD, 0.6), -0.9 + p2 * 0.6, 0.35, -1.6); }
        rc(0.1, 0.1, 1.2, 8, matT(WOOD, 0.6), -3.6, 0.6, 1.6);                                // 球杆架
        rc(0.05, 0.05, 1.2, 8, matS(0x8a5a3a, 0.5), -3.6, 0.6, 1.45);
        rc(0.16, 0.16, 0.75, 10, matT(WOOD, 0.6), 3.6, 0.38, -0.4);                           // 高脚椅
        rc(0.8, 0.2, 0.1, 14, matS(0x2b1f14, 0.5), 0, 1.3, -1.6);                             // 吊灯罩
        rs(0.2, new THREE.MeshBasicMaterial({ color: 0xfff3d6 }), 0, 0.95, -1.6);             // 灯球
        break;
      }
      case 'lottery': {   // 彩票店
        roomShell(CONC, WALL, 0xffe8c0);
        rb(1.8, 0.85, 0.7, matT(PANEL, 0.5), 3.2, 0.43, 2.4);                                 // 柜台
        rb(0.5, 0.4, 0.06, matT(DARK, 0.4), 3.2, 0.85, 2.1);                                  // 彩票机
        rb(3.6, 1.7, 0.06, matS(0xf5f7fa, 0.7), -0.6, 1.0, -3.5);                             // 走势图墙
        for (var l1 = 0; l1 < 20; l1++) {
          rb(0.16, 0.1, 0.02, matS(l1 % 2 === 0 ? 0xe84c4c : 0x4ca86c, 0.7), -2.8 + (l1 % 10) * 0.56, 1.5 - Math.floor(l1 / 10) * 1.0, -3.35);
        }
        rb(0.5, 0.05, 0.5, matT(CLOTH, 0.9), 1.2, 0.42, 2.4);                                 // 凳
        rc(0.06, 0.06, 0.42, 8, matS(0x33363f, 0.6), 1.2, 0.2, 2.4);
        rb(0.7, 0.02, 0.4, new THREE.MeshBasicMaterial({ color: 0xffd54f }), -3.2, 2.6, -2.8); // 彩灯
        break;
      }
      case 'estate': {   // 房产中介
        roomShell(TILE, WALL, 0xbfe8f2);
        rb(1.1, 1.2, 0.06, matS(0xf5f7fa, 0.7), -3.4, 0.8, -3.4);                             // 房源墙
        for (var e1 = 0; e1 < 4; e1++) { rb(0.9, 0.5, 0.03, matT(SIGN, 0.7), -3.4, 1.3 - e1 * 0.45, -3.3); }
        rb(1.0, 0.07, 0.7, matT(WOOD, 0.6), -2.2, 0.74, -1.4);                                // 工位
        rb(0.5, 0.45, 0.06, matT(DARK, 0.4), -2.2, 1.0, -1.2);
        rb(2.4, 0.14, 1.5, matT(WOOD, 0.6), 0.6, 0.6, 0.8);                                    // 沙盘
        rb(0.25, 0.4, 0.25, matS(0x9ab8d8, 0.7), 0.3, 0.8, 0.5);
        rb(0.25, 0.55, 0.25, matS(0xbfd9f2, 0.7), 0.9, 0.9, 1.1);
        rb(1.2, 0.1, 0.6, matT(CLOTH, 0.9), 2.6, 0.5, -1.2);                                  // 沙发
        rb(1.2, 0.5, 0.55, matT(CLOTH, 0.9), 2.6, 0.9, -1.3);
        break;
      }
      case 'flower': {   // 花店
        roomShell(TILE, WALL, 0xffd8e8);
        for (var f1 = 0; f1 < 3; f1++) {
          var fx = -3.2 + f1 * 3.2;
          rb(0.1, 2.0, 1.0, matT(WOOD, 0.6), fx, 1.0, -2.2);                                  // 花架柱
          rb(0.55, 0.05, 0.9, matT(WOOD, 0.6), fx, 0.6, -2.2);
          rb(0.55, 0.05, 0.9, matT(WOOD, 0.6), fx, 1.3, -2.2);
          rb(0.55, 0.05, 0.9, matT(WOOD, 0.6), fx, 1.95, -2.2);
          for (var f2 = 0; f2 < 5; f2++) {
            var fc = [0xff8fab, 0xff5a8e, 0xffc14d, 0x8bc34a, 0xff9d5c][f2 % 5];
            rs(0.09, matS(fc, 0.7), fx - 0.3 + (f2 % 3) * 0.3, 1.35 + Math.floor(f2 / 3) * 0.6, -2.2);
          }
        }
        rb(1.2, 0.85, 0.6, matT(PANEL, 0.5), 3.6, 0.43, 2.6);                                 // 柜台
        rb(0.6, 0.3, 0.6, matS(0x4caf6e, 0.8), 2.2, 0.6, 1.0);                                 // 绿植盆
        rc(0.05, 0.05, 0.5, 8, matS(0x3a6e4a, 0.7), 2.2, 0.9, 1.0);                            // 枝
        rs(0.22, matS(0x4caf6e, 0.8), 2.2, 1.15, 1.0);                                          // 冠
        break;
      }
      case 'dumpling': case 'hotpot': case 'malatang': case 'braised': {   // 餐馆
        roomShell(TILE, WALL, 0xffc890);
        for (var r1 = 0; r1 < 4; r1++) {
          var rx = -3.4 + (r1 % 2) * 4.6, rz = -2.4 + Math.floor(r1 / 2) * 3.4;
          rb(0.95, 0.07, 0.95, matT(WOOD, 0.55), rx, 0.73, rz);                               // 方桌
          for (var r2 = 0; r2 < 4; r2++) {
            var ang = r2 / 4 * Math.PI * 2;
            rb(0.34, 0.05, 0.34, matT(WOOD, 0.55), rx + Math.cos(ang) * 0.8, 0.44, rz + Math.sin(ang) * 0.8);
          }
        }
        rb(0.04, 0.5, 2.4, matT(SIGN, 0.7), 4.5, 1.6, -1.0);                                   // 招牌
        var lg1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff5a4e }));
        lg1.position.set(-3.5, 2.9, -3.6); R.add(lg1);
        var lg2 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffc14d }));
        lg2.position.set(3.5, 2.9, -3.6); R.add(lg2);
        var lp2 = new THREE.PointLight(0xff9a4e, 1.1, 9, 2); lp2.position.set(-3.5, 2.6, -3.6); R.add(lp2);
        var lp3 = new THREE.PointLight(0xffb84e, 1.1, 9, 2); lp3.position.set(3.5, 2.6, -3.6); R.add(lp3);
        break;
      }
      case 'foodstreet': case 'nightmarket': case 'market': case 'wholesale': case 'ghostmarket': {   // 集市 / 露天市场
        roomShell(CONC, CONC, 0xffd8a0);
        var stallC = [0xc96f4a, 0x5a7d4a, 0x4a6a8a, 0x8a5a3a, 0x6a4a8a];
        for (var s2 = 0; s2 < 5; s2++) {
          var stx = -3.6 + (s2 % 5) * 1.85, stz = -2.6;
          rb(1.5, 0.06, 0.8, matT(WOOD, 0.6), stx, 0.73, stz);                                // 摊位桌
          rb(0.4, 0.16, 0.4, matS(stallC[s2 % 5], 0.7), stx, 0.87, stz);                       // 货
          rc(0.05, 0.05, 1.5, 6, matS(0x33363f, 0.6), stx, 0.75, stz + 1.6);                  // 帐篷杆
          rc(0.05, 0.05, 1.5, 6, matS(0x33363f, 0.6), stx - 0.7, 0.75, stz + 1.6);
          rc(0.05, 0.05, 1.5, 6, matS(0x33363f, 0.6), stx + 0.7, 0.75, stz + 1.6);
          rb(1.8, 0.06, 1.8, matT(CLOTH, 0.9), stx, 1.55, stz + 1.6);                          // 篷顶
          for (var s3 = 0; s3 < 4; s3++) {
            rs(0.06, new THREE.MeshBasicMaterial({ color: 0xffd54f }), stx - 0.5 + (s3 % 2) * 1.0, 1.75, stz + 1.2 + Math.floor(s3 / 2) * 0.8);
          }
        }
        rb(1.6, 0.1, 0.5, matT(WOOD, 0.6), -3.6, 0.5, 2.6);                                    // 长椅
        rb(1.6, 0.02, 0.5, matT(CLOTH, 0.9), -3.6, 0.55, 2.6);
        rc(0.12, 0.16, 2.6, 8, matT(AI_LAMP || new THREE.MeshStandardMaterial(), 0.7), 3.8, 1.3, 2.4);  // 灯柱
        rs(0.18, new THREE.MeshBasicMaterial({ color: 0xfff0c0 }), 3.8, 2.7, 2.4);
        var lmp = new THREE.PointLight(0xffd88e, 1.0, 8, 2); lmp.position.set(3.8, 2.5, 2.4); R.add(lmp);
        break;
      }
      case 'park': case 'street': {   // 公园 / 大街（露天）
        roomShell(CONC, CONC, 0xbfe8d8);
        rb(8.4, 0.05, 5.2, matT(TILE, 0.85), 0, 0.03, 0);                                      // 石板地
        rb(1.6, 0.1, 0.5, matT(WOOD, 0.6), -3.2, 0.32, -1.8);                                  // 长椅×2
        rb(1.6, 0.02, 0.5, matT(CLOTH, 0.9), -3.2, 0.37, -1.8);
        rb(1.6, 0.1, 0.5, matT(WOOD, 0.6), 3.2, 0.32, 1.8);
        rb(1.6, 0.02, 0.5, matT(CLOTH, 0.9), 3.2, 0.37, 1.8);
        for (var k1 = -2; k1 <= 2; k1 += 2) {                                                 // 树
          var tx2 = k1 * 2.4, tz2 = k1 === -2 ? 2.6 : -2.2;
          rc(0.14, 0.18, 1.6, 8, matT(AI_BARK || new THREE.MeshStandardMaterial({ color: 0x5a3a22 }), 0.9), tx2, 0.8, tz2);
          rs(1.0, matT(AI_LEAF || new THREE.MeshStandardMaterial({ color: 0x4caf6e }), 0.95), tx2, 2.15, tz2);
        }
        rc(0.1, 0.14, 2.4, 8, matT(AI_LAMP || new THREE.MeshStandardMaterial({ color: 0x3a4250 }), 0.6), -4.6, 1.2, 0);   // 路灯
        rs(0.2, new THREE.MeshBasicMaterial({ color: 0xfff0c0 }), -4.6, 2.5, 0);
        var pl = new THREE.PointLight(0xffd88e, 0.9, 7, 2); pl.position.set(-4.6, 2.3, 0); R.add(pl);
        rc(1.1, 1.3, 0.3, 20, matS(0x9aa4b8, 0.6), 0.4, 0.15, -0.4);                          // 喷泉台
        rb(0.02, 1.0, 0.02, new THREE.MeshBasicMaterial({ color: 0x88ddff }), 0.1, 0.9, -0.5);  // 水柱
        rb(0.02, 1.0, 0.02, new THREE.MeshBasicMaterial({ color: 0x88ddff }), 0.7, 0.9, -0.3);
        rc(0.5, 0.7, 0.5, 12, matS(0x5a8a5a, 0.85), -0.4, 0.35, 1.6);                        // 花坛
        for (var f3 = 0; f3 < 5; f3++) { rs(0.1, matS([0xff8fab, 0xffc14d, 0xff5a8e][f3 % 3], 0.7), -0.4 + (f3 - 2) * 0.22, 0.62, 1.6); }
        break;
      }
      default: {   // 兜底：通用房间
        roomShell(TILE, WALL, 0xffe2b8);
        rb(1.4, 0.1, 0.8, matT(WOOD, 0.6), 0, 0.74, -0.8);
        rb(0.45, 0.05, 0.45, matT(CLOTH, 0.9), 0, 0.42, -0.8);
        rc(0.06, 0.06, 0.42, 8, matS(0x33363f, 0.6), 0, 0.2, -0.8);
        break;
      }
    }
    R = null;
  }

  function enterInterior(loc) {
    if (inRoom) exitInterior();
    if (!interiorRoot) return;
    if (!interiorRoot.userData.rooms) interiorRoot.userData.rooms = {};
    var rooms = interiorRoot.userData.rooms;
    if (!rooms[loc.id]) {
      var room = new THREE.Group();
      buildRoom(loc.id, room);
      rooms[loc.id] = room;
      interiorRoot.add(room);
    }
    interiorRoot.visible = true;
    citySnap = [];
    scene.traverse(function (o) {
      if (o === interiorRoot || o === scene || o === camera) return;
      if (o.isMesh || o.isLight || o.isPoints || o.isSprite) {
        if (o.visible) { citySnap.push(o); o.visible = false; }
      }
    });
    // 注意：traverse 的 return 不跳过子树 → 室内 mesh 也被隐藏 → 恢复当前室内组
    rooms[loc.id].traverse(function (o) { if (o.isMesh || o.isLight) o.visible = true; });
    // 显示当前室内组，隐藏其他室内组
    interiorRoot.children.forEach(function (ch) { ch.visible = (ch === rooms[loc.id]); });
    inRoom = loc.id;
    roomView = { x: 0, y: 1.62, z: 2.4 };
    camYaw = Math.PI;
    camPitch = 0;
    document.getElementById('fr-icon').textContent = loc.icon;
    document.getElementById('fr-name').textContent = loc.name;
    document.getElementById('ft-room').style.display = 'flex';
    var hint = document.querySelector('.ft-hint'); if (hint) hint.style.display = 'none';
    var radarW = document.querySelector('.ft-radar-wrap'); if (radarW) radarW.style.display = 'none';
    var entry = document.getElementById('ft-entry'); if (entry) entry.style.display = 'none';
    var modal = document.getElementById('ft-modal'); if (modal) modal.style.display = 'none';
    modalOpen = false;
  }
  function exitInterior() {
    if (!inRoom) return;
    inRoom = null;
    roomView = null;
    if (interiorRoot) interiorRoot.visible = false;
    for (var i = 0; i < citySnap.length; i++) if (citySnap[i]) citySnap[i].visible = true;
    citySnap = [];
    document.getElementById('ft-room').style.display = 'none';
    var hint = document.querySelector('.ft-hint'); if (hint) hint.style.display = '';
    var radarW = document.querySelector('.ft-radar-wrap'); if (radarW) radarW.style.display = '';
  }

  /* ---------- 小地图雷达（GTA 式：地图随视角旋转） ---------- */
  var radar = document.getElementById('free-radar');
  var rctx = radar.getContext('2d');
  function drawRadar() {
    var S = 86, cx = S, cy = S;
    rctx.clearRect(0, 0, S * 2, S * 2);
    // 圆形裁剪（GTA 雷达外观）
    rctx.save();
    rctx.beginPath(); rctx.arc(cx, cy, S - 2, 0, Math.PI * 2); rctx.clip();
    rctx.fillStyle = 'rgba(10,13,22,.92)';
    rctx.fillRect(0, 0, S * 2, S * 2);
    var K = 62 / 68;
    rctx.save();
    rctx.translate(cx - player.x * K, cy - player.z * K);
    rctx.rotate(-camYaw);
    // 公路实心条带（GTA 式：亮灰白色路面）
    rctx.fillStyle = 'rgba(184,194,205,.5)';
    ROAD_CENTERS.forEach(function (lv) {
      rctx.fillRect(-66 * K, lv * K - ROAD / 2 * K, 132 * K, ROAD * K);
      rctx.fillRect(lv * K - ROAD / 2 * K, -66 * K, ROAD * K, 132 * K);
    });
    // 街区建筑块（暗色方块，增强城市感）
    rctx.fillStyle = 'rgba(150,162,182,.34)';
    for (var bi = 0; bi < buildings.length; bi++) {
      var b = buildings[bi];
      rctx.fillRect(b.x1 * K, b.z1 * K, (b.x2 - b.x1) * K, (b.z2 - b.z1) * K);
    }
    // 地点图标
    locGroups.forEach(function (lg) {
      var px = lg.wx * K, py = lg.wz * K;
      if (lg === nearLoc) {
        rctx.strokeStyle = '#8bffd2'; rctx.lineWidth = 1.5;
        rctx.beginPath(); rctx.arc(px, py, 7, 0, Math.PI * 2); rctx.stroke();
        rctx.fillStyle = 'rgba(139,255,210,.22)';
        rctx.beginPath(); rctx.arc(px, py, 7, 0, Math.PI * 2); rctx.fill();
        rctx.fillStyle = '#8bffd2'; rctx.font = '10px "PingFang SC","Microsoft YaHei",sans-serif';
        rctx.textAlign = 'center'; rctx.textBaseline = 'middle';
        rctx.fillText(lg.icon, px, py + 0.5);
      } else {
        rctx.fillStyle = 'rgba(10,14,24,.55)';
        rctx.beginPath(); rctx.arc(px, py, 4.6, 0, Math.PI * 2); rctx.fill();
        rctx.fillStyle = 'rgba(255,255,255,.95)'; rctx.font = '8px "PingFang SC","Microsoft YaHei",sans-serif';
        rctx.textAlign = 'center'; rctx.textBaseline = 'middle';
        rctx.fillText(lg.icon, px, py + 0.5);
      }
    });
    rctx.restore();
    // 玩家指示：三角 + 前方视野扇区（固定指向屏幕上方 = 视角前方）
    rctx.fillStyle = 'rgba(120,220,255,.22)';
    rctx.beginPath(); rctx.moveTo(cx, cy); rctx.arc(cx, cy, 19, -0.6, 0.6); rctx.closePath(); rctx.fill();
    rctx.fillStyle = '#7ee0ff';
    rctx.beginPath(); rctx.moveTo(cx, cy - 8.5); rctx.lineTo(cx + 6, cy + 6); rctx.lineTo(cx - 6, cy + 6); rctx.closePath(); rctx.fill();
    rctx.restore();
    rctx.strokeStyle = 'rgba(255,255,255,.3)';
    rctx.lineWidth = 2.5;
    rctx.beginPath(); rctx.arc(cx, cy, S - 1.5, 0, Math.PI * 2); rctx.stroke();
  }

  /* ---------- 主循环 ---------- */
  var fpsVal = 0, fpsN = 0, fpsT = performance.now(), fpsHist = [], sceneReadyFlag = false;
  function markSceneReady() {
    sceneReadyFlag = true;
    fpsN = 0; fpsT = performance.now(); fpsHist = [];
  }
  var bloomPass = null, gradePass = null, outPass = null;
  var qSettings = { q: 2, bloom: true, shadow: true, grade: true, res: 4, aa: 4, fps: true };
  var _lastAA = 4, _maxSamples = 0;
  var lastTlPhase = -1;   // 红绿灯相位缓存（v140）
  function loadQSettings() {
    try {
      var raw = localStorage.getItem('free_quality_settings');
      if (raw) {
        var o = JSON.parse(raw);
        for (var k in qSettings) if (o[k] !== undefined) qSettings[k] = o[k];
        // 旧版 3 档迁移：旧 res 2/1/0 → 新 4/3/2（仅旧数据无 resVer 时执行一次）
        if (!o.resVer && o.res !== undefined && o.res <= 2) qSettings.res = [2, 3, 4][o.res];
      }
    } catch (e) {}
    qSettings.q = Math.max(0, Math.min(2, qSettings.q | 0));
    qSettings.res = qSettings.res === undefined ? 4 : Math.max(0, Math.min(4, qSettings.res | 0));
  }
  function buildComposer() {
    if (!(window.THREE && THREE.EffectComposer)) return;
    if (composer) { try { composer.dispose(); } catch (e) {} composer = null; }
    var _dbs = renderer.getDrawingBufferSize(new THREE.Vector2());
    try { _maxSamples = renderer.capabilities.maxSamples || 0; } catch (e) {}
    var _rt = new THREE.WebGLRenderTarget(Math.max(2, _dbs.x), Math.max(2, _dbs.y), { type: THREE.HalfFloatType, samples: Math.min(qSettings.aa === 0 ? 0 : (qSettings.aa || 4), _maxSamples || 0) });
    composer = new THREE.EffectComposer(renderer, _rt);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(Math.max(2, Math.floor(container.clientWidth / 2)), Math.max(2, Math.floor(container.clientHeight / 2))), 0.55, 0.42, 0.68);
    composer.addPass(bloomPass);
    gradePass = new THREE.ShaderPass({
      uniforms: { tDiffuse: { value: null }, vig: { value: 0.34 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; uniform float vig; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb; float l = dot(col, vec3(0.299,0.587,0.114)); col = mix(col, vec3(l), 0.10); col = mix(col, vec3(0.17,0.16,0.22), 0.07); float d = distance(vUv, vec2(0.5)); float a = smoothstep(0.80, 0.42, d); col *= mix(1.0, a, vig); gl_FragColor = vec4(col, c.a); }'
    });
    gradePass.renderToScreen = false;
    composer.addPass(gradePass);
    // r152+ OutputPass：色彩空间规范化出口（ACES 色调映射 + sRGB 输出）
    // 内部每帧自动同步 renderer.toneMapping / toneMappingExposure，无需手动设置 uniforms
    outPass = new THREE.OutputPass();
    composer.addPass(outPass);
  }
  function applyQuality(immediate) {
    var fpsHud = document.getElementById('ft-fps');
    if (fpsHud) fpsHud.style.display = qSettings.fps ? '' : 'none';
    if (qSettings.aa !== _lastAA) { _lastAA = qSettings.aa; buildComposer(); }
    var prBase = qSettings.q === 2 ? 1.5 : qSettings.q === 1 ? 1.25 : 1;
    var resMul = [0.30, 0.45, 0.60, 0.80, 1.00][qSettings.res]; if (resMul === undefined) resMul = 1;   // 渲染分辨率档 5 档（v169c）：30/45/60/80/100%
    var pr = prBase * resMul;
    var sh = qSettings.q === 2 ? 1536 : qSettings.q === 1 ? 1024 : 512;
    renderer.setPixelRatio(pr);
    renderer.setSize(container.clientWidth, container.clientHeight);
    // 后处理 RT 跟随渲染分辨率：降分辨率档时 bloom/grade 全屏 pass 同步减像素（GTA SA 式）
    if (composer) composer.setSize(Math.max(2, Math.round(container.clientWidth * pr)), Math.max(2, Math.round(container.clientHeight * pr)));
    if (moonL) {
      moonL.castShadow = qSettings.shadow;
      moonL.shadow.mapSize.set(sh, sh);
    }
    if (bloomPass) {
      bloomPass.enabled = qSettings.bloom;
      if (qSettings.bloom) { bloomPass.strength = qSettings.q === 2 ? 0.55 : qSettings.q === 1 ? 0.42 : 0.32; bloomPass.radius = qSettings.q === 2 ? 0.42 : 0.36; }
    }
    if (gradePass) gradePass.enabled = qSettings.grade;
    if (immediate) syncSettingsUI();
  }
  function syncSettingsUI() {
    var seg = document.getElementById('fs-quality');
    if (seg) {
      var bs = seg.querySelectorAll('button');
      for (var i = 0; i < bs.length; i++) bs[i].className = i === qSettings.q ? 'on' : '';
    }
    var rseg = document.getElementById('fs-res');
    if (rseg) {
      var rbs = rseg.querySelectorAll('button');
      for (var j = 0; j < rbs.length; j++) {
        var dv = parseInt(rbs[j].getAttribute('data-res'), 10);
        rbs[j].className = dv === qSettings.res ? 'on' : '';
      }
    }
    var b = document.getElementById('fs-bloom'); if (b) b.checked = qSettings.bloom;
    var s = document.getElementById('fs-shadow'); if (s) s.checked = qSettings.shadow;
    var g = document.getElementById('fs-grade'); if (g) g.checked = qSettings.grade;
    var f = document.getElementById('fs-fps'); if (f) f.checked = qSettings.fps;
    var aseg = document.getElementById('fs-aa');
    if (aseg) {
      var abs = aseg.querySelectorAll('button');
      for (var k = 0; k < abs.length; k++) abs[k].className = parseInt(abs[k].getAttribute('data-aa'), 10) === qSettings.aa ? 'on' : '';
    }
  }
  function saveQSettings() {
    try {
      var o = {}; for (var k in qSettings) o[k] = qSettings[k];
      o.resVer = 1;
      localStorage.setItem('free_quality_settings', JSON.stringify(o));
    } catch (e) {}
  }
  function bindSettingsUI() {
    var panel = document.getElementById('ft-settings');
    var btn = document.getElementById('btn-settings');
    if (btn) btn.addEventListener('click', function () {
      if (panel) { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; syncSettingsUI(); }
    });
    var fpsC = document.getElementById('fs-fps');
    if (fpsC) fpsC.addEventListener('change', function () {
      qSettings.fps = fpsC.checked; saveQSettings();
      var hud = document.getElementById('ft-fps');
      if (hud) hud.style.display = qSettings.fps ? '' : 'none';
    });
    var cls = document.getElementById('fs-close');
    if (cls) cls.addEventListener('click', function () { if (panel) panel.style.display = 'none'; });
    var seg = document.getElementById('fs-quality');
    if (seg) seg.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.tagName === 'BUTTON' && t.hasAttribute('data-q')) {
        qSettings.q = parseInt(t.getAttribute('data-q'), 10);
        saveQSettings(); applyQuality(true);
      }
    });
    var rseg = document.getElementById('fs-res');
    if (rseg) rseg.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.tagName === 'BUTTON' && t.hasAttribute('data-res')) {
        qSettings.res = parseInt(t.getAttribute('data-res'), 10);
        saveQSettings(); applyQuality(true);
      }
    });
    var aseg = document.getElementById('fs-aa');
    if (aseg) aseg.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.tagName === 'BUTTON' && t.hasAttribute('data-aa')) {
        qSettings.aa = parseInt(t.getAttribute('data-aa'), 10);
        saveQSettings(); applyQuality(true);
      }
    });
    [['fs-bloom', 'bloom'], ['fs-shadow', 'shadow'], ['fs-grade', 'grade']].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el) el.addEventListener('change', function () {
        qSettings[pair[1]] = el.checked;
        saveQSettings(); applyQuality(true);
      });
    });
  }
  function updateFpsUI() {
    var num = document.getElementById('ff-num');
    if (!sceneReadyFlag) {
      if (num) { num.textContent = '--'; num.className = 'ff-num mid'; }
      var c0 = document.getElementById('ff-graph');
      if (c0) {
        var x0 = c0.getContext('2d');
        x0.clearRect(0, 0, c0.width, c0.height);
        x0.fillStyle = 'rgba(240,200,90,.85)';
        x0.font = '10px sans-serif';
        x0.textBaseline = 'top';
        x0.fillText('构建中', 2, 2);
      }
      return;
    }
    var num = document.getElementById('ff-num');
    if (num) {
      num.textContent = fpsVal;
      num.className = 'ff-num' + (fpsVal >= 55 ? ' good' : fpsVal >= 35 ? ' mid' : ' low');
    }
    var c = document.getElementById('ff-graph');
    if (!c) return;
    var x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    for (var i = 0; i < fpsHist.length; i++) {
      var v = fpsHist[i];
      var h = Math.max(2, Math.min(30, v / 60 * 30));
      var col = v >= 55 ? 'rgba(88,224,176,.92)' : v >= 35 ? 'rgba(240,200,90,.92)' : 'rgba(255,112,112,.92)';
      x.fillStyle = col;
      x.fillRect(c.width - (fpsHist.length - i) * 3, 30 - h, 2.2, h);
    }
  }
  function animate() {
    requestAnimationFrame(animate);
    fpsN++;
    var nowT = performance.now();
    if (nowT - fpsT >= 500) {
      fpsVal = Math.round(fpsN * 1000 / (nowT - fpsT));
      fpsN = 0; fpsT = nowT;
      fpsHist.push(fpsVal); if (fpsHist.length > 40) fpsHist.shift();
      updateFpsUI();
    }
    var ntm = performance.now() * 0.004;
    for (var mi = 0; mi < neonMats.length; mi++) {
      var nm2 = neonMats[mi];
      if (!nm2.mat) continue;
      nm2.mat.opacity = Math.max(0.16, Math.min(nm2.baseOp, nm2.baseOp + Math.sin(ntm + nm2.ph) * 0.12) * (0.12 + 0.88 * (1 - dayFactor)));
    }
    var dt = Math.min(clock.getDelta(), 0.05);
    updateDayNight(dt);
    updatePlayer(dt);
    var tlPhase = Math.floor(performance.now() / 6000) % 4; // 0绿 1黄 2/3红
    if (tlPhase !== lastTlPhase) {
      lastTlPhase = tlPhase;
      for (var tlI = 0; tlI < trafficLamps.length; tlI++) {
        var tl = trafficLamps[tlI];
        var on = tl.idx === tlPhase || (tlPhase === 3 && tl.idx === 2);
        tl.mat.color.setHex(on ? tl.color : 0x0d0d0d);
      }
    }
    updateRain(dt);
    updateTraffic(dt);
    drawRadar();
    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  /* ---------- 初始化 ---------- */
  function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // r155+ 默认物理光照，会颠覆现有光照强度语义；强制 Legacy 保持 r128 观感（城市样式不变）
    renderer.useLegacyLights = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);
    (function detectGpu() {
      var gpuEl = document.getElementById('ff-gpu'); if (!gpuEl) return;
      try {
        var gl = renderer.getContext();
        var ext = gl.getExtension('WEBGL_debug_renderer_info');
        var info = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : String(gl.getParameter(gl.RENDERER) || '');
        var isSW = /swiftshader|llvmpipe|softpipe|software|angle \(software/i.test(info);
        gpuEl.innerHTML = (isSW ? '⚠ 软件渲染（浏览器硬件加速未开启）' : '✓ GPU 硬件加速') + ' · ' + gpuShortName(info);
      } catch (e) { gpuEl.textContent = 'GPU 信息不可用'; }
    })();
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070b14, 0.0038);
    interiorRoot = new THREE.Group();
    interiorRoot.visible = false;
    scene.add(interiorRoot);
    camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 300);
    camera.position.set(0, 6, 8);
    clock = new THREE.Clock();

    buildCityWhenReady();
    buildPlayer();
    // 恢复进入地点前的位置（从室内离开返回 /free 时；URL 参数优先，localStorage 一次性兜底）
    (function restorePos() {
      var saved = null;
      try {
        var q = new URLSearchParams(window.location.search);
        if (q.get('x') !== null && q.get('z') !== null) {
          saved = { x: parseFloat(q.get('x')), z: parseFloat(q.get('z')), yaw: parseFloat(q.get('yaw') || '0') };
          if (history && history.replaceState) history.replaceState(null, '', '/free');
        } else if (typeof localStorage !== 'undefined') {
          var ls = localStorage.getItem('ws_free_pos');
          if (ls) saved = JSON.parse(ls);
          if (saved) localStorage.removeItem('ws_free_pos');
        }
      } catch (e) { saved = null; }
      if (saved && isFinite(saved.x) && isFinite(saved.z)) {
        player.x = saved.x; player.z = saved.z;
        if (isFinite(saved.yaw)) player.yaw = saved.yaw;
        if (player.g) player.g.position.set(player.x, 0, player.z);
      }
    })();
    initTraffic();
    initEdge();
    flushBatch();
    bindInput();

    buildComposer();
    loadQSettings();
    applyQuality(true);
    bindSettingsUI();

    window.addEventListener('resize', function () {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      if (composer) composer.setSize(container.clientWidth, container.clientHeight);
    });

    document.getElementById('btn-back').addEventListener('click', function () { window.location.href = '/game'; });
    document.getElementById('fr-exit').addEventListener('click', function () { exitInterior(); });
    document.getElementById('fe-go').addEventListener('click', function () { if (nearLoc) enterLoc(nearLoc); });
    document.getElementById('fm-back').addEventListener('click', closeLocModal);
    document.getElementById('fm-enter').addEventListener('click', function () {
      var id = document.getElementById('fm-name').textContent;
      var loc = null;
      MAP_LOCS.forEach(function (l) { if (l.name === id) loc = l; });
      if (loc) enterLoc(loc);
    });
    document.getElementById('ft-modal').addEventListener('click', function (e) {
      if (e.target === this) closeLocModal();
    });

    setTimeout(function () {   // 兜底：无论场景构建是否异常，12s 后强制关闭遮罩
      var ld = document.getElementById('ft-loading');
      if (ld) ld.classList.add('hide');
    }, 12000);

    window.__free = {
      player: player, locGroups: locGroups, buildings: buildings, gStat: gStat,
      setYaw: function (v) { camYaw = v; },
      setPitch: function (v) { camPitch = v; },
      renderer: renderer, camera: camera, scene: scene, composer: composer,
      gameHour: function () { return gameHour; },
      setHour: function (v) { gameHour = v; },
      dayFactor: function () { return dayFactor; },
      renderOnce: function () { if (composer) composer.render(); else renderer.render(scene, camera); },
      frames: function () { return renderer.info.render; },
      interiorRoot: function () { return interiorRoot; },
      inRoom: function () { return inRoom; },
      enterRoom: function (id) { var l = null; MAP_LOCS.forEach(function (x) { if (x.id === id) l = x; }); if (l) enterInterior(l); },
      exitRoom: exitInterior,
      perfDebug: function () { return { q: qSettings.q, bloom: qSettings.bloom, shadow: qSettings.shadow, grade: qSettings.grade, pr: renderer.getPixelRatio(), hist: fpsHist.slice(-10) }; },
      sceneStats: function () {
        var mats = {}, texs = {}, tris = 0, calls = 0;
        scene.traverse(function (o) {
          if (o.isMesh) {
            var g = o.geometry;
            if (g && g.index) tris += g.index.count / 3;
            else if (g && g.attributes && g.attributes.position) tris += g.attributes.position.count / 3;
            calls++;
            var arr = Array.isArray(o.material) ? o.material : [o.material];
            for (var i = 0; i < arr.length; i++) { var mm = arr[i]; if (mm) { mats[mm.uuid] = 1; if (mm.map) texs[mm.map.uuid] = 1; } }
          }
        });
        return { meshes: calls, uniqueMats: Object.keys(mats).length, uniqueTex: Object.keys(texs).length, tris: Math.round(tris) };
      }
    };

    animate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
