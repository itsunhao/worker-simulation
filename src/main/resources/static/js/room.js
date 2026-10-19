/* ============================================================
 * room.js v1 —— 室内独立 3D 场景（第三人称行走 + 终端一致互动）
 * 依赖：three-all-r160.js、room-cmds.js（CMD_GROUPS）
 * ============================================================ */
(function () {
  'use strict';

  /* ================= 1. 工具 ================= */
  function api(url, data) {
    return fetch(url, {
      method: data ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    }).then(function (r) { return r.json(); });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtMoney(n) { return (n || 0).toLocaleString('zh-CN'); }

  var ANSI_FG = {
    '31': '#ff6b6b', '32': '#6bff9e', '33': '#ffd06b', '34': '#6bc0ff',
    '35': '#e08bff', '36': '#6bffe8', '37': '#f0f4ff', '90': '#8a97b8',
    '91': '#ff8f8f', '92': '#9affb8', '93': '#ffe89a', '94': '#a8d4ff',
    '95': '#eeb0ff', '96': '#b4ffe8', '97': '#ffffff'
  };
  function ansiToHtml(t) {
    var out = '', stack = [], re = /\x1b\[([0-9;]*)m/g, last = 0, m;
    while ((m = re.exec(t))) {
      out += esc(t.slice(last, m.index));
      var code = m[1];
      if (!code || code === '0') {
        while (stack.length) { out += '</span>'; stack.pop(); }
      } else if (code === '1') {
        out += '<span style="font-weight:700">'; stack.push(1);
      } else if (ANSI_FG[code]) {
        out += '<span style="color:' + ANSI_FG[code] + '">'; stack.push(code);
      } else if (/^38;5;/.test(code)) {
        var n = parseInt(code.split(';')[2], 10);
        var c;
        if (n < 16) c = ['#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0', '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff'][n];
        else if (n < 232) c = 'hsl(' + Math.round((n - 16) % 36 * 10) + ',65%,' + (25 + Math.floor((n - 16) / 36) * 10) + '%)';
        else c = 'hsl(0,0%,' + (8 + (n - 232) * 4) + '%)';
        out += '<span style="color:' + c + '">'; stack.push(code);
      }
      last = re.lastIndex;
    }
    out += esc(t.slice(last));
    while (stack.length) { out += '</span>'; stack.pop(); }
    return out;
  }

  var feedEl = null;
  function ansiText(t) {
    // 去 ANSI 转义，保留纯文本
    return String(t || '').replace(/\x1b\[[0-9;]*m/g, '');
  }
  function addCard(text, kind, title) {
    var card = document.createElement('div');
    card.className = 'rf-card' + (kind ? ' ' + kind : '');
    if (title) {
      var t = document.createElement('div');
      t.className = 'rf-title';
      t.textContent = title;
      card.appendChild(t);
    }
    var body = document.createElement('div');
    body.className = 'rf-body';
    body.innerHTML = ansiToHtml(text);
    card.appendChild(body);
    feedEl.appendChild(card);
    if (feedEl.childNodes.length > 60) feedEl.removeChild(feedEl.firstChild);
    feedEl.scrollTop = feedEl.scrollHeight;
  }
  function termWrite(lines, title) {
    if (!lines || !lines.length) return;
    var kind = '';
    var text = lines.join('\n');
    if (/错误|失败|不足|无法|无效|不能|不可|缺少|超出|破产|拒绝|已关闭/.test(text)) kind = 'err';
    else if (/注意|警告|提示|提醒/.test(text)) kind = 'warn';
    addCard(text, kind, title);
  }
  function toast(msg, kind) {
    var el = document.getElementById('rt-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rt-toast';
      document.body.appendChild(el);
    }
    el.className = 'rt-toast show ' + (kind || 'ok');
    el.textContent = msg;
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.className = 'rt-toast'; }, 2600);
  }

  /* ================= 2. 地点数据 ================= */
  var LOCS = [
    { id: 'jobmarket',  name: '人才市场', icon: '🏢', type: '招聘' },
    { id: 'bar',        name: '酒吧',     icon: '🍸', type: '夜生活' },
    { id: 'bank',       name: '银行',     icon: '🏦', type: '金融' },
    { id: 'mall',       name: '商场',     icon: '🛍️', type: '购物' },
    { id: 'stock',      name: '交易大厅', icon: '📈', type: '金融' },
    { id: 'carshop',    name: '4S店',     icon: '🚗', type: '汽车' },
    { id: 'foodstreet', name: '美食街',   icon: '🍜', type: '美食' },
    { id: 'nightmarket', name: '夜市',    icon: '🏮', type: '美食' },
    { id: 'wholesale',  name: '小商品批发', icon: '📦', type: '购物' },
    { id: 'market',     name: '菜市场',   icon: '🥬', type: '生活' },
    { id: 'dumpling',   name: '饺子馆',   icon: '🥟', type: '美食' },
    { id: 'hotpot',     name: '火锅店',   icon: '🔥', type: '美食' },
    { id: 'malatang',   name: '地摊麻辣烫', icon: '🍲', type: '美食' },
    { id: 'braised',    name: '百味鸡',   icon: '🍗', type: '美食' },
    { id: 'street',     name: '大街',     icon: '🏙️', type: '地标' },
    { id: 'estate',     name: '房产中介', icon: '🏘️', type: '置业' },
    { id: 'billiards',  name: '台球厅',   icon: '🎱', type: '休闲' },
    { id: 'lottery',    name: '彩票店',   icon: '🎰', type: '娱乐' },
    { id: 'training',   name: '培训中心', icon: '🎓', type: '教育' },
    { id: 'adu',        name: '成人大学', icon: '🏛️', type: '教育' },
    { id: 'park',       name: '城市公园', icon: '🌳', type: '休闲' },
    { id: 'club',       name: '会所',     icon: '🥂', type: '夜生活' },
    { id: 'ktv',        name: 'KTV',      icon: '🎤', type: '夜生活' },
    { id: 'pvclub',     name: '私人会所', icon: '💆', type: '夜生活' },
    { id: 'flower',     name: '花店',     icon: '🌷', type: '生活' },
    { id: 'ghostmarket', name: '鬼市',    icon: '🕯️', type: '神秘' },
    { id: 'home',       name: '住处',     icon: '🏠', type: '居所' },
    { id: 'workplace',  name: '工作地点', icon: '💼', type: '职场' }
  ];
  function locById(id) {
    for (var i = 0; i < LOCS.length; i++) if (LOCS[i].id === id) return LOCS[i];
    return LOCS[2];
  }

  /* ================= 3. 程序化室内贴图 ================= */  function makeTex(w, h, fn) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d');
    fn(x, w, h);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }
  function grain(x, w, h, n, alpha, seed) {
    var v = seed || 7;
    for (var i = 0; i < n; i++) {
      v = (v * 16807) % 2147483647;
      var px = v % w, py = Math.floor(v / w) % h;
      x.fillStyle = 'rgba(255,255,255,' + (alpha * (0.5 + ((v >> 8) % 100) / 200)) + ')';
      x.fillRect(px, py, 1, 1);
    }
  }
  function makeWood(base) {
    return makeTex(512, 512, function (x, w, h) {
      x.fillStyle = base || '#b98a5a';
      x.fillRect(0, 0, w, h);
      // 每块木板（宽 128）
      for (var i = 0; i < 4; i++) {
        var yy = i * 128;
        var shade = (i % 2 ? 8 : -6);
        var c = 'rgb(' + (185 + shade) + ',' + (138 + shade) + ',' + (90 + shade) + ')';
        x.fillStyle = c; x.fillRect(0, yy, w, 128);
        // 板缝
        x.fillStyle = 'rgba(60,38,22,.75)';
        x.fillRect(0, yy, w, 2);
        if (yy > 0) x.fillRect(0, yy - 2, w, 2);
        // 木纹
        x.strokeStyle = 'rgba(90,58,32,.4)';
        for (var k = 0; k < 6; k++) {
          x.beginPath();
          var sx = (k * 83 + i * 37) % w;
          x.moveTo(sx, yy + 6);
          x.bezierCurveTo(sx + 40, yy + 18, sx + 90, yy + 6, sx + 150, yy + 22);
          x.lineWidth = 1;
          x.stroke();
        }
        // 结疤
        x.fillStyle = 'rgba(96,60,30,.55)';
        x.beginPath(); x.ellipse((i * 197) % w, yy + 40 + (i % 3) * 20, 9, 6, 0, 0, Math.PI * 2); x.fill();
      }
      grain(x, w, h, 2600, .05);
    });
  }
  function makeTile(c1, c2, grout) {
    return makeTex(512, 512, function (x, w, h) {
      var g = grout || 'rgba(120,120,120,.6)';
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      var cell = 64;
      for (var i = 0; i < w / cell; i++) {
        for (var j = 0; j < h / cell; j++) {
          var shade = (i + j) % 2 ? 1 : 0.96;
          x.fillStyle = (c2 && (i + j) % 4 === 0) ? c2 : c1;
          x.globalAlpha = shade;
          x.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
          x.globalAlpha = 1;
        }
      }
      grain(x, w, h, 1200, .04);
    });
  }
  function makeMarble() {
    return makeTex(512, 512, function (x, w, h) {
      x.fillStyle = '#e9e7e2'; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 14; i++) {
        x.strokeStyle = 'rgba(140,135,125,' + (0.12 + (i % 3) * 0.05) + ')';
        x.lineWidth = 1 + (i % 3);
        x.beginPath();
        var y0 = (i * 97) % h, x0 = (i * 41) % w;
        x.moveTo(x0, y0);
        x.bezierCurveTo(x0 + 130, y0 + 40, x0 + 260, y0 - 30, x0 + 420, y0 + 20);
        x.stroke();
      }
      for (var k = 0; k < 8; k++) {
        x.fillStyle = 'rgba(170,165,155,.18)';
        x.beginPath();
        x.ellipse((k * 151) % w, (k * 211) % h, 60 + k * 10, 30, (k * 47) % 360 * Math.PI / 180, 0, Math.PI * 2);
        x.fill();
      }
      grain(x, w, h, 900, .03);
    });
  }
  function makeWallpaper(base, accent) {
    return makeTex(512, 512, function (x, w, h) {
      x.fillStyle = base || '#d8cfc2'; x.fillRect(0, 0, w, h);
      // 竖条
      for (var i = 0; i < 8; i++) {
        x.fillStyle = accent || 'rgba(255,255,255,.16)';
        x.fillRect(i * 64 + 8, 0, 28, h);
      }
      // 菱形暗纹
      x.strokeStyle = 'rgba(120,110,95,.22)';
      x.lineWidth = 1.5;
      for (var j = 0; j < 8; j++) {
        for (var k = 0; k < 8; k++) {
          var cx2 = j * 64 + 32, cy2 = k * 64 + 32;
          x.beginPath();
          x.moveTo(cx2, cy2 - 20); x.lineTo(cx2 + 20, cy2); x.lineTo(cx2, cy2 + 20); x.lineTo(cx2 - 20, cy2);
          x.closePath(); x.stroke();
        }
      }
      grain(x, w, h, 800, .02);
    });
  }
  function makePaint(base) {
    return makeTex(256, 256, function (x, w, h) {
      x.fillStyle = base || '#c9cdd4'; x.fillRect(0, 0, w, h);
      grain(x, w, h, 1500, .05);
    });
  }
  function makeCarpet(base) {
    return makeTex(512, 512, function (x, w, h) {
      x.fillStyle = base || '#4a5a6e'; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 4000; i++) {
        var px = (i * 173) % w, py = (i * 97) % h;
        x.fillStyle = 'rgba(255,255,255,' + (0.06 + ((i % 5) * 0.012)) + ')';
        x.fillRect(px, py, 1, 1);
      }
      x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 3;
      x.strokeRect(6, 6, w - 12, h - 12);
      x.strokeRect(18, 18, w - 36, h - 36);
    });
  }
  function makeCeil() {
    return makeTex(256, 256, function (x, w, h) {
      x.fillStyle = '#e6e2d8'; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 4; i++) {
        x.fillStyle = 'rgba(180,175,160,.35)';
        x.fillRect(i * 64 + 2, 0, 2, h);
        x.fillRect(0, i * 64 + 2, w, 2);
      }
      grain(x, w, h, 700, .03);
    });
  }
  function makeScreen(c1, c2) {
    return makeTex(256, 256, function (x, w, h) {
      var g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, c1 || '#0b2e1a');
      g.addColorStop(1, c2 || '#0a1f14');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      // 发光噪点
      for (var i = 0; i < 1200; i++) {
        var px = (i * 113) % w, py = (i * 79) % h;
        x.fillStyle = 'rgba(120,255,180,' + (0.04 + ((i % 4) * 0.03)) + ')';
        x.fillRect(px, py, 1, 1);
      }
    });
  }
  function makeSignText(text, bg, fg) {
    return makeTex(512, 256, function (x, w, h) {
      x.fillStyle = bg || '#1a2030'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(139,255,210,.8)'; x.lineWidth = 6;
      x.strokeRect(8, 8, w - 16, h - 16);
      x.font = 'bold 84px "PingFang SC","Microsoft YaHei",sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = fg || '#8bffd2'; x.shadowBlur = 24;
      x.fillStyle = fg || '#8bffd2';
      x.fillText(text, w / 2, h / 2 + 6);
      x.shadowBlur = 0;
    });
  }
  function makeGrass() {
    return makeTex(512, 512, function (x, w, h) {
      x.fillStyle = '#4f7a3a'; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 2600; i++) {
        var px = (i * 157) % w, py = (i * 91) % h;
        x.fillStyle = ((i % 3) === 0) ? 'rgba(90,140,60,.6)' : 'rgba(40,90,40,.5)';
        x.fillRect(px, py, 2, 2);
      }
    });
  }
  function makeStoneDark() {
    return makeTex(512, 512, function (x, w, h) {
      x.fillStyle = '#4c4a52'; x.fillRect(0, 0, w, h);
      var cell = 128;
      for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
          var shade = 0.85 + ((i * 7 + j * 13) % 5) * 0.07;
          x.fillStyle = 'rgb(' + Math.round(76 * shade) + ',' + Math.round(74 * shade) + ',' + Math.round(82 * shade) + ')';
          x.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
          x.fillStyle = 'rgba(0,0,0,.35)';
          x.fillRect(i * cell + 2, j * cell + cell - 6, cell - 4, 4);
        }
      }
      grain(x, w, h, 900, .05);
    });
  }
  function makeMetal() {
    return makeTex(256, 256, function (x, w, h) {
      var g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#8e99a8'); g.addColorStop(.5, '#c2cad6'); g.addColorStop(1, '#7a8494');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 12; i++) {
        x.fillStyle = 'rgba(255,255,255,' + (0.08 + (i % 2) * 0.04) + ')';
        x.fillRect(0, i * 22, w, 2);
      }
      grain(x, w, h, 500, .04);
    });
  }
  function makeConcreteFloor() {
    return makeTex(512, 512, function (x, w, h) {
      x.fillStyle = '#9a948c'; x.fillRect(0, 0, w, h);
      var cell = 128;
      for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
          x.fillStyle = 'rgba(70,66,60,.5)';
          x.fillRect(i * cell + 1, j * cell + 1, cell - 2, 2);
          x.fillRect(i * cell + 1, j * cell + 1, 2, cell - 2);
        }
      }
      grain(x, w, h, 1600, .05);
    });
  }
  function makeNeonStrip() {
    return makeTex(128, 256, function (x, w, h) {
      x.fillStyle = '#180a1e'; x.fillRect(0, 0, w, h);
      x.shadowColor = '#ff4fd8'; x.shadowBlur = 18;
      x.fillStyle = '#ff4fd8';
      x.fillRect(8, 8, w - 16, h - 16);
      x.shadowBlur = 0;
    });
  }

  /* ================= 4. Three.js 场景 ================= */
  var container = document.getElementById('room3d');
  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(58, container.clientWidth / container.clientHeight, 0.1, 80);
  var clock = new THREE.Clock();

  scene.add(new THREE.AmbientLight(0x8090b0, 0.9));
  // 冷色环境补光，让房间整体明亮通透
  var envLight = new THREE.DirectionalLight(0xcfe0ff, 0.7);
  envLight.position.set(4, 6, 3);
  scene.add(envLight);
  var envLight2 = new THREE.DirectionalLight(0xffe8c8, 0.35);
  envLight2.position.set(-4, 5, -3);
  scene.add(envLight2);

  /* 房间整体放大系数（扩大室内面积，人物尺寸不变） */
  var ROOM_SCALE = 1.3;

  /* 人物 */
  var player = {
    x: 0, z: 0, yaw: 0, moving: false, g: null,
    legL1: null, legR1: null, armL1: null, armR1: null
  };
  function buildPlayer() {
    var g = new THREE.Group();
    var cloth = new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: 0.65 });
    var cloth2 = new THREE.MeshStandardMaterial({ color: 0x8a97a8, roughness: 0.7 });
    var pant = new THREE.MeshStandardMaterial({ color: 0x4a5560, roughness: 0.75 });
    var shoe = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.6 });
    var skin = new THREE.MeshStandardMaterial({ color: 0xe6b98c, roughness: 0.5 });
    var hairM = new THREE.MeshStandardMaterial({ color: 0x1e2026, roughness: 0.55 });
    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.62, 10), cloth);
    torso.position.y = 1.06; g.add(torso);
    var coat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.29, 0.2, 10), cloth2);
    coat.position.y = 0.82; g.add(coat);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 12), skin);
    head.position.y = 1.62; g.add(head);
    var hair = new THREE.Mesh(new THREE.SphereGeometry(0.235, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2.05), hairM);
    hair.position.y = 1.67; g.add(hair);
    [-0.08, 0.08].forEach(function (ex) {
      var eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 4), new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.3 }));
      eye.position.set(ex, 1.645, 0.2); g.add(eye);
    });
    var mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.015, 0.02), new THREE.MeshStandardMaterial({ color: 0xa05548, roughness: 0.5 }));
    mouth.position.set(0, 1.575, 0.218); g.add(mouth);
    function makeLeg(sx) {
      var hip = new THREE.Group(); hip.position.set(sx, 0.82, 0); g.add(hip);
      var t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.42, 8), pant);
      t1.position.y = -0.21; hip.add(t1);
      var knee = new THREE.Group(); knee.position.y = -0.42; hip.add(knee);
      var t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.058, 0.4, 8), pant);
      t2.position.y = -0.2; knee.add(t2);
      var foot = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.3), shoe);
      foot.position.set(0, -0.42, 0.07); knee.add(foot);
      return { hip: hip, knee: knee };
    }
    function makeArm(sx) {
      var sh = new THREE.Group(); sh.position.set(sx, 1.34, 0); g.add(sh);
      var a1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.34, 7), cloth);
      a1.position.y = -0.17; sh.add(a1);
      var el = new THREE.Group(); el.position.y = -0.34; sh.add(el);
      var a2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.042, 0.3, 7), cloth2);
      a2.position.y = -0.15; el.add(a2);
      var hand = new THREE.Mesh(new THREE.SphereGeometry(0.062, 6, 5), skin);
      hand.position.y = -0.32; el.add(hand);
      return { sh: sh, el: el };
    }
    player.legL1 = makeLeg(-0.15); player.legR1 = makeLeg(0.15);
    player.armL1 = makeArm(-0.33); player.armR1 = makeArm(0.33);
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; } });
    g.position.set(player.x, 0, player.z);
    scene.add(g);
    player.g = g;
  }

  /* 房间构建 */
  var R = null;
  var OBS = [];
  function rb(w, h, d, mat, x, y, z, ry) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true;
    R.add(m);
    return m;
  }
  function rc(rt, r2, h, seg, mat, x, y, z, rx) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, r2, h, seg), mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    m.castShadow = true; m.receiveShadow = true;
    R.add(m);
    return m;
  }
  function rs(r, mat, x, y, z) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    R.add(m);
    return m;
  }
  function matS(c, r, m) {
    return new THREE.MeshStandardMaterial({ color: c, roughness: r !== undefined ? r : 0.75, metalness: m !== undefined ? m : 0.05 });
  }
  function matT(t, r, m) {
    return new THREE.MeshStandardMaterial({ map: t, roughness: r !== undefined ? r : 0.8, metalness: m !== undefined ? m : 0.05 });
  }
  function glow(c, i) {
    return new THREE.MeshBasicMaterial({ color: c });
  }
  function addObs(x, z, r) { OBS.push({ x: x, z: z, r: r }); }

  function roomShell(floorTex, wallTex, ceilTex, lampCol, lampY) {
    rb(10, 0.12, 8, matT(floorTex, 0.55), 0, -0.06, 0);
    rb(0.14, 3.4, 8, matT(wallTex, 0.95), -5, 1.7, 0);
    rb(0.14, 3.4, 8, matT(wallTex, 0.95), 5, 1.7, 0);
    rb(10, 3.4, 0.14, matT(wallTex, 0.95), 0, 1.7, -4);
    rb(10, 3.4, 0.14, matT(wallTex, 0.95), 0, 1.7, 4);
    rb(10, 0.14, 8, matT(ceilTex, 0.98), 0, 3.46, 0);
    // 入口地贴（前墙缺口提示）
    var door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2),
      new THREE.MeshBasicMaterial({ color: 0x8bffd2, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
    door.position.set(0, 1.1, 3.94); R.add(door);
    var doorLine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.3, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x8bffd2, transparent: true, opacity: 0.55 }));
    doorLine.position.set(0, 1.15, 3.9); R.add(doorLine);
    var ly = lampY || 3.05;
    var lampGlow = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), glow(0xfff3d6));
    lampGlow.position.set(0, ly, 0); R.add(lampGlow);
    rc(0.45, 0.55, 0.18, 14, matS(0x22242e, 0.5, 0.3), 0, ly + 0.14, 0);
    var lp = new THREE.PointLight(lampCol || 0xffe2b8, 3.4, 26, 2);
    lp.position.set(0, ly - 0.08, 0);
    lp.castShadow = true;
    lp.shadow.mapSize.set(512, 512);
    lp.shadow.radius = 7;
    lp.shadow.bias = -0.002;
    R.add(lp);
    // 两盏墙灯补光，让房间更明亮
    var w1 = new THREE.PointLight(lampCol || 0xffe2b8, 1.5, 14, 2);
    w1.position.set(-4.6, 2.6, -2.8); R.add(w1);
    var w2 = new THREE.PointLight(lampCol || 0xffe2b8, 1.5, 14, 2);
    w2.position.set(4.6, 2.6, 2.8); R.add(w2);
    return lp;
  }
  function wallSign(text, x, y, z, ry, bg, fg) {
    var t = makeSignText(text, bg, fg);
    var m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), matT(t, 0.6, 0.2));
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    R.add(m);
    return m;
  }

  function buildRoom(id) {
    R = new THREE.Group();
    OBS = [];
    var WOOD = makeWood(), TILE = makeTile('#d8d4ca', null, 'rgba(140,140,140,.55)'),
      TILE2 = makeTile('#e8e5dd'), MARBLE = makeMarble(),
      WALL = makeWallpaper('#d9d2c6'), WALL2 = makeWallpaper('#c9ced6', 'rgba(255,255,255,.12)'),
      PAINT = makePaint('#c9cdd4'), CARPET = makeCarpet('#4a5a6e'),
      CEIL = makeCeil(), SCR = makeScreen('#0b2e1a', '#0a1f14'),
      SCR2 = makeScreen('#0a1a2e', '#081420'), SCR3 = makeScreen('#2e0a0a', '#1f0a0a'),
      GRASS = makeGrass(), STONE = makeStoneDark(), METAL = makeMetal(),
      CONC = makeConcreteFloor();
    switch (id) {
      /* ---- 住处：暖色卧室 + 客厅 ---- */
      case 'home': {
        roomShell(WOOD, WALL, CEIL, 0xffe2b8);
        // 床
        rb(1.7, 0.32, 2.2, matS(0x7a5a3a, 0.9), -3.2, 0.16, -2.6);
        rb(1.5, 0.16, 2.0, matS(0xd8c8b0, 0.9), -3.2, 0.36, -2.6);
        rb(1.5, 0.16, 0.5, matS(0xe8d8c0, 0.95), -3.2, 0.5, -2.25);
        rb(1.5, 0.14, 0.4, matS(0x5a6a7a, 0.95), -3.2, 0.44, -3.1);
        rb(0.5, 0.5, 0.5, matS(0x6a4a30, 0.85), -4.5, 0.25, -2.6);
        rb(0.9, 0.06, 0.9, matS(0x4a4a52, 0.5, 0.3), -4.5, 0.56, -2.6);
        // 衣柜
        rb(1.9, 2.3, 0.7, matS(0x8a6a48, 0.8), 4.2, 1.15, -3.0);
        rb(1.9, 0.06, 0.74, matS(0x5a4430, 0.7), 4.2, 2.28, -3.0);
        // 电视墙 + 电视
        rb(2.6, 0.5, 0.45, matS(0x6a4a30, 0.85), 3.6, 0.35, 3.6);
        var tv = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.0), new THREE.MeshBasicMaterial({ map: SCR }));
        tv.position.set(3.6, 1.35, 3.68); R.add(tv);
        // 沙发 + 茶几 + 地毯
        rb(2.2, 0.45, 0.95, matS(0x6a7a6a, 0.9), 1.2, 0.35, 2.4);
        rb(2.2, 0.28, 0.5, matS(0x5a6a5a, 0.9), 1.2, 0.6, 2.15);
        rb(1.0, 0.4, 0.5, matS(0x6a7a6a, 0.9), 0.1, 0.42, 2.3);
        rb(1.1, 0.14, 0.7, matS(0x4a3a2a, 0.8), 1.2, 0.14, 1.9);
        rb(2.2, 0.05, 2.4, matT(CARPET, 1), 1.2, 0.015, 2.0);
        addObs(1.2, 2.4, 0.8); addObs(-3.2, -2.6, 1.0);
        var lamp2 = new THREE.PointLight(0xffe2b8, 0.8, 6, 2); lamp2.position.set(-4.2, 0.9, -2.6); R.add(lamp2);
        break;
      }
      /* ---- 工作地点：办公隔间 ---- */
      case 'workplace': {
        roomShell(CARPET, WALL2, CEIL, 0xdfe6f0);
        // 工位×2
        for (var i = 0; i < 2; i++) {
          var x0 = i === 0 ? -3.0 : 0.4;
          rb(1.8, 0.06, 1.2, matS(0x8a97a8, 0.6), x0, 0.72, -2.2);
          rb(1.8, 1.1, 0.06, matT(WALL2, 0.9), x0, 1.25, -1.6);
          rb(1.8, 0.16, 0.9, matS(0xb0b8c4, 0.5), x0, 0.85, -1.9);
          var mon = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshBasicMaterial({ map: SCR2 }));
          mon.position.set(x0, 1.15, -1.62); R.add(mon);
          rb(0.45, 0.45, 0.45, matS(0x3a4550, 0.8), x0 + 0.6, 0.42, -2.6);
          rb(0.45, 0.45, 0.45, matS(0x3a4550, 0.8), x0 - 0.6, 0.42, -2.6);
          addObs(x0, -2.2, 1.0);
        }
        // 会议桌 + 椅
        rb(3.2, 0.12, 1.3, matS(0x9aa2ac, 0.5, 0.2), 1.0, 0.65, 1.6);
        rc(0.22, 0.22, 0.6, 8, matS(0x3a4550, 0.8), 1.0, 0.3, 1.6);
        for (var k = 0; k < 4; k++) {
          var ax = k < 2 ? 0.1 : 1.9;
          var az = (k % 2 === 0) ? 0.5 : 2.7;
          rb(0.45, 0.45, 0.45, matS(0x3a4550, 0.8), ax, 0.42, az);
        }
        // 文件柜
        rb(2.4, 2.1, 0.55, matS(0x6a7480, 0.7), -4.2, 1.05, 2.8);
        for (var f = 0; f < 4; f++) rb(2.5, 0.05, 0.02, matS(0x2a323c, 0.6), -4.2, 0.4 + f * 0.5, 3.0);
        // 白板
        var board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), matS(0xf4f6f8, 0.6));
        board.position.set(4.4, 1.6, -0.2); board.rotation.y = -Math.PI / 2; R.add(board);
        addObs(1.0, 1.6, 1.3); addObs(-4.2, 2.8, 0.7);
        break;
      }
      /* ---- 人才市场：摊位 + 大屏 ---- */
      case 'jobmarket': {
        roomShell(TILE2, WALL2, CEIL, 0xdff0ff);
        // 大屏
        var big = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.2), new THREE.MeshBasicMaterial({ map: SCR2 }));
        big.position.set(0, 2.0, -3.86); R.add(big);
        rb(5.6, 0.14, 0.2, matS(0x1a2030, 0.6), 0, 0.7, -3.8);
        // 招聘摊位×3
        for (var i = 0; i < 3; i++) {
          var x0 = -3.2 + i * 3.2;
          rb(1.6, 0.16, 1.0, matS(0xb0b8c4, 0.6), x0, 0.78, 1.6);
          rb(1.6, 0.06, 1.0, matS(0x2a323c, 0.6), x0, 0.86, 1.6);
          var sc = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ map: SCR }));
          sc.position.set(x0, 1.25, 1.24); R.add(sc);
          var sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5),
            new THREE.MeshBasicMaterial({ map: makeSignText('摊位 ' + (i + 1), '#1a2030', '#8bffd2') }));
          sign.position.set(x0, 2.0, 1.24); R.add(sign);
          rb(0.45, 0.45, 0.45, matS(0x3a4550, 0.8), x0 + 0.55, 0.42, 2.1);
          addObs(x0, 1.6, 0.9);
        }
        break;
      }
      /* ---- 银行：大理石 + 柜台 + 金库 ---- */
      case 'bank': {
        roomShell(MARBLE, WALL2, CEIL, 0xe8f0ff, 3.05);
        // 柜台
        rb(5.6, 1.15, 1.1, matT(MARBLE, 0.35, 0.15), 0, 0.7, 2.2);
        rb(5.6, 0.06, 1.3, matT(MARBLE, 0.3, 0.2), 0, 1.2, 2.2);
        rb(5.8, 1.15, 0.12, matS(0x2a3240, 0.5, 0.5), 0, 0.7, 1.6);
        // 玻璃挡板
        var glass = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 0.5),
          new THREE.MeshPhysicalMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.25, roughness: 0.1, metalness: 0.6 }));
        glass.position.set(0, 1.55, 2.8); R.add(glass);
        // 取号机
        rb(0.7, 1.5, 0.5, matS(0x6a7a8a, 0.7), -4.3, 0.75, 3.2);
        var num = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshBasicMaterial({ map: SCR3 }));
        num.position.set(-4.3, 1.1, 3.0); num.rotation.y = Math.PI; R.add(num);
        // 金库门
        var vault = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.35, 24), matS(0x4a5560, 0.35, 0.9));
        vault.position.set(4.4, 1.5, -3.8); vault.rotation.x = Math.PI / 2; R.add(vault);
        var dial = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12), matS(0xc9a24a, 0.3, 0.9));
        dial.position.set(4.4, 1.4, -3.3); dial.rotation.z = Math.PI / 2; R.add(dial);
        // 等候椅
        rb(2.4, 0.4, 0.5, matS(0x5a6a7a, 0.85), -2.6, 0.3, -3.0);
        rb(2.4, 0.06, 0.5, matS(0x3a4550, 0.85), -2.6, 0.5, -3.3);
        // 理财屏
        var led = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.3), new THREE.MeshBasicMaterial({ map: SCR }));
        led.position.set(0, 2.5, -3.86); R.add(led);
        addObs(0, 2.2, 0.7); addObs(-4.3, 3.2, 0.6); addObs(-2.6, -3.0, 1.0); addObs(4.4, -3.8, 0.8);
        break;
      }
      /* ---- 商场：货架 + 收银 ---- */
      case 'mall': {
        roomShell(TILE2, PAINT, CEIL, 0xe8f0ff);
        for (var i = 0; i < 3; i++) {
          var x0 = -3.4 + i * 3.0;
          rb(1.2, 1.9, 2.0, matS(0xb0b8c4, 0.7), x0, 0.95, -1.4);
          for (var s = 0; s < 3; s++) {
            rb(1.24, 0.05, 0.1, matS(0xffffff, 0.5), x0, 0.5 + s * 0.55, -0.4 - (s % 2) * 0.3);
            rb(1.24, 0.05, 0.1, matS(0xffffff, 0.5), x0, 0.5 + s * 0.55, -2.4 + (s % 2) * 0.3);
            var col = [0xd05450, 0x4a8ac0, 0x58a060, 0xc9a24a][(i + s) % 4];
            rb(0.16, 0.16, 0.16, matS(col, 0.8), x0 - 0.5 + (s % 3) * 0.5, 0.5 + s * 0.55, -1.4);
          }
          addObs(x0, -1.4, 1.2);
        }
        // 收银台
        rb(1.8, 1.0, 0.9, matS(0xc9cdd4, 0.6, 0.1), 3.8, 0.5, 3.0);
        rb(0.4, 0.5, 0.3, matS(0x1a2030, 0.5), 3.2, 0.75, 3.1);
        // 顶部灯带
        var strip = new THREE.Mesh(new THREE.BoxGeometry(8, 0.06, 0.06), glow(0xbfe8ff));
        strip.position.set(0, 3.3, 0); R.add(strip);
        addObs(3.8, 3.0, 0.8);
        break;
      }
      /* ---- 交易大厅：红绿行情墙 ---- */
      case 'stock': {
        roomShell(CARPET, PAINT, CEIL, 0xdff0ff, 3.05);
        // 行情大屏
        var wall = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 2.6), new THREE.MeshBasicMaterial({ map: SCR2 }));
        wall.position.set(0, 2.2, -3.86); R.add(wall);
        for (var r = 0; r < 6; r++) {
          var ry2 = -3.5 + r * 1.4;
          for (var c = 0; c < 7; c++) {
            var rx2 = -3.6 + c * 1.2;
            var up = (r + c) % 2 === 0;
            var cell = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.05), glow(up ? 0x34c46a : 0xe05a4a));
            cell.position.set(rx2, 2.3 - Math.floor(r / 2) * 0.7 + (r % 2 ? -0.35 : 0.35), ry2);
            R.add(cell);
          }
        }
        // 交易台×2
        for (var t = 0; t < 2; t++) {
          var x0 = t === 0 ? -2.8 : 2.8;
          rb(2.4, 0.14, 1.3, matS(0x2a3240, 0.5, 0.3), x0, 0.72, 2.0);
          var tmon = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.9), new THREE.MeshBasicMaterial({ map: SCR3 }));
          tmon.position.set(x0, 1.2, 1.38); R.add(tmon);
          var tmon2 = tmon.clone(); tmon2.material = new THREE.MeshBasicMaterial({ map: SCR });
          tmon2.position.x = x0; tmon2.position.z = 1.38; R.add(tmon2);
          rb(0.45, 0.45, 0.45, matS(0x3a4550, 0.8), x0 + 0.7, 0.42, 2.5);
          addObs(x0, 2.0, 1.1);
        }
        addObs(0, -3.0, 0.9);
        break;
      }
      /* ---- 4S店：展车 + 灯带 ---- */
      case 'carshop': {
        roomShell(TILE2, PAINT, CEIL, 0xe8f0ff, 3.05);
        // 展车（简化）
        var car = new THREE.Group();
        rb(2.0, 0.45, 4.0, matS(0xc0263a, 0.3, 0.4), 0, 0.45, 0, 0);
        var carTop = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 8), matS(0xc0263a, 0.3, 0.4));
        carTop.position.set(0, 0.95, -0.3); carTop.scale.set(0.85, 0.5, 1.5); R.add(carTop);
        for (var w2 = 0; w2 < 4; w2++) {
          rc(0.34, 0.34, 0.2, 12, matS(0x1a1d22, 0.6), -0.9 + (w2 % 2) * 1.8, 0.2, w2 < 2 ? 1.3 : -1.3);
        }
        var glass2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.2), new THREE.MeshPhysicalMaterial({ color: 0xbcd8e8, transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.7 }));
        glass2.position.set(0, 0.85, -0.2); R.add(glass2);
        // 地台灯带
        var strip = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 5), glow(0x4aa0ff));
        strip.position.set(0, 0.06, 0); R.add(strip);
        // 洽谈桌
        rb(1.2, 0.1, 1.2, matS(0xffffff, 0.35, 0.1), 4.0, 0.45, 3.0);
        rc(0.2, 0.2, 0.42, 10, matS(0x4a5560, 0.7), 4.0, 0.2, 3.0);
        rb(0.45, 0.45, 0.45, matS(0x3a4550, 0.8), 4.7, 0.42, 2.5);
        addObs(0, 0, 1.4); addObs(4.0, 3.0, 0.9);
        var lp = new THREE.PointLight(0x9ad0ff, 1.6, 12, 2); lp.position.set(0, 2.6, 0); R.add(lp);
        break;
      }
      /* ---- 美食街：摊位 + 串灯 ---- */
      case 'foodstreet': {
        roomShell(WOOD, WALL2, CEIL, 0xffc98a);
        for (var i = 0; i < 4; i++) {
          var x0 = -3.6 + i * 2.4;
          rb(1.5, 0.12, 1.2, matS(0x8a6a48, 0.8), x0, 0.8, -2.5);
          rb(1.6, 0.06, 1.3, matS(0x5a4430, 0.8), x0, 0.88, -2.5);
          rc(0.5, 0.5, 0.06, 12, matS(0x8a6a48, 0.8), x0, 1.5, -2.5);
          rc(0.02, 0.02, 0.55, 6, matS(0x3a2c1c, 0.8), x0 - 0.6, 1.25, -2.5);
          rc(0.02, 0.02, 0.55, 6, matS(0x3a2c1c, 0.8), x0 + 0.6, 1.25, -2.5);
          rb(0.28, 0.2, 0.28, matS([0xd05450, 0xe0a040, 0x58a060, 0x4a8ac0][i], 0.7), x0, 0.75, -2.5);
          addObs(x0, -2.5, 0.9);
        }
        // 餐桌×2
        for (var t = 0; t < 2; t++) {
          var tx = -2.0 + t * 4.2;
          rb(1.4, 0.1, 1.4, matS(0x6a4a30, 0.7), tx, 0.45, 2.2);
          rc(0.15, 0.15, 0.42, 8, matS(0x4a3a2a, 0.8), tx, 0.2, 2.2);
          rb(0.4, 0.4, 0.4, matS(0x3a4550, 0.8), tx + 0.8, 0.35, 1.6);
          rb(0.4, 0.4, 0.4, matS(0x3a4550, 0.8), tx - 0.8, 0.35, 2.8);
          addObs(tx, 2.2, 0.9);
        }
        // 串灯
        for (var s2 = 0; s2 < 6; s2++) {
          var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), glow([0xffd06b, 0xff8a6b, 0x8bffd2, 0xff8fd8][s2 % 4]));
          bulb.position.set(-4.8 + s2 * 1.9, 3.2, -1 + (s2 % 3) * 1.0);
          R.add(bulb);
        }
        var warm = new THREE.PointLight(0xffc98a, 1.0, 10, 2); warm.position.set(0, 2.8, -1.5); R.add(warm);
        break;
      }
      /* ---- 夜市：灯笼 + 小吃 ---- */
      case 'nightmarket': {
        roomShell(STONE, PAINT, CEIL, 0xffb090);
        for (var i = 0; i < 4; i++) {
          var x0 = -3.6 + i * 2.4;
          rb(1.5, 0.1, 1.1, matS(0x5a4a3a, 0.85), x0, 0.78, -2.4);
          rb(1.6, 0.05, 1.2, matS(0x3a2c20, 0.9), x0, 0.84, -2.4);
          var lan = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), glow([0xff5a5a, 0xffb03c, 0xff7a5a, 0xffd06b][i]));
          lan.position.set(x0, 1.6, -2.4); R.add(lan);
          rb(0.26, 0.18, 0.26, matS([0x8a5a3a, 0xc98a4a, 0x7a8a3a, 0xb05030][i], 0.7), x0, 0.72, -2.4);
          addObs(x0, -2.4, 0.9);
        }
        // 灯笼串
        for (var s = 0; s < 5; s++) {
          var l2 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), glow(s % 2 ? 0xff5a5a : 0xffd06b));
          l2.position.set(-4.4 + s * 2.2, 3.15, -2.2); R.add(l2);
        }
        var warm = new THREE.PointLight(0xff9a6a, 1.1, 11, 2); warm.position.set(0, 2.7, -1.6); R.add(warm);
        break;
      }
      /* ---- 小商品批发：密货架 ---- */
      case 'wholesale': {
        roomShell(CONC, PAINT, CEIL, 0xffe0b8);
        for (var i = 0; i < 4; i++) {
          var x0 = -3.8 + i * 2.5;
          rb(1.0, 2.0, 1.6, matS(0x8a97a8, 0.75), x0, 1.0, -1.0);
          for (var s = 0; s < 3; s++) {
            rb(1.04, 0.04, 0.1, matS(0xffffff, 0.5), x0, 0.45 + s * 0.6, -1.0);
            var cols = [0xc9a24a, 0x4a8ac0, 0xd05450, 0x58a060, 0x8a6ac0];
            rb(0.2, 0.14, 0.2, matS(cols[(i + s) % 5], 0.8), x0 - 0.3 + (s % 3) * 0.3, 0.45 + s * 0.6, -1.6 + (s % 2) * 0.7);
          }
          addObs(x0, -1.0, 0.8);
        }
        // 打包台
        rb(3.0, 0.9, 0.9, matS(0x8a97a8, 0.7), 3.2, 0.45, 3.0);
        rb(3.1, 0.06, 1.0, matS(0x2a323c, 0.6), 3.2, 0.9, 3.0);
        addObs(3.2, 3.0, 1.0);
        break;
      }
      /* ---- 菜市场：菜摊 ---- */
      case 'market': {
        roomShell(TILE2, PAINT, CEIL, 0xffe8c0);
        for (var i = 0; i < 3; i++) {
          var x0 = -3.0 + i * 3.1;
          rb(1.8, 0.12, 1.0, matS(0x8a97a8, 0.7), x0, 0.76, -2.6);
          var veg = [0x58a060, 0xe0a040, 0xc05040, 0x8a6ac0];
          for (var v = 0; v < 5; v++) {
            rb(0.3, 0.12, 0.22, matS(veg[(i + v) % 4], 0.7), x0 - 0.7 + v * 0.35, 0.9, -2.6);
          }
          rb(1.8, 0.5, 0.2, matS(0x6a7480, 0.7), x0, 0.3, -2.6);
          addObs(x0, -2.6, 1.0);
        }
        // 吊灯
        for (var s = 0; s < 3; s++) {
          var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), glow(0xfff0d0));
          lamp.position.set(-2.4 + s * 2.4, 3.1, 0); R.add(lamp);
        }
        break;
      }
      /* ---- 饺子馆 ---- */
      case 'dumpling': {
        roomShell(WOOD, WALL, CEIL, 0xffd9a0);
        for (var i = 0; i < 2; i++) {
          var x0 = -1.6 + i * 3.4;
          rb(1.3, 0.1, 1.3, matS(0x8a5a3a, 0.7), x0, 0.45, 1.5);
          rc(0.14, 0.14, 0.42, 8, matS(0x5a3a28, 0.8), x0, 0.2, 1.5);
          rb(0.4, 0.4, 0.4, matS(0x3a4550, 0.8), x0 + 0.7, 0.35, 0.9);
          rb(0.4, 0.4, 0.4, matS(0x3a4550, 0.8), x0 - 0.7, 0.35, 2.1);
          addObs(x0, 1.5, 0.9);
        }
        // 柜台 + 蒸笼
        rb(1.8, 1.0, 0.9, matS(0x6a4a30, 0.8), 3.8, 0.5, -2.6);
        for (var s = 0; s < 3; s++) {
          rc(0.28, 0.3, 0.12, 12, matS(0x2a2020, 0.5), 3.8, 1.05, -2.4 + s * 0.4);
        }
        wallSign('饺子馆', -4.5, 2.4, -0.1, Math.PI / 2, '#2a1a12', '#ffd9a0');
        addObs(3.8, -2.6, 0.8);
        break;
      }
      /* ---- 火锅店 ---- */
      case 'hotpot': {
        roomShell(WOOD, WALL2, CEIL, 0xffb090);
        // 火锅桌×2
        for (var i = 0; i < 2; i++) {
          var x0 = -1.6 + i * 3.2;
          rc(0.65, 0.65, 0.12, 16, matS(0x5a3a28, 0.8), x0, 0.5, 1.5);
          rc(0.16, 0.22, 0.1, 10, matS(0x2a2020, 0.5), x0, 0.62, 1.5);
          rb(1.7, 0.08, 1.7, matS(0x6a4a30, 0.7), x0, 0.42, 1.5);
          rb(0.42, 0.42, 0.42, matS(0x3a4550, 0.8), x0 + 0.85, 0.35, 0.85);
          rb(0.42, 0.42, 0.42, matS(0x3a4550, 0.8), x0 - 0.85, 0.35, 2.15);
          // 锅底红光
          var gl = new THREE.PointLight(0xff5a3a, 0.7, 4, 2); gl.position.set(x0, 0.75, 1.5); R.add(gl);
          addObs(x0, 1.5, 1.0);
        }
        // 红灯笼
        for (var s = 0; s < 3; s++) {
          var lan = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), glow(0xff5a3a));
          lan.position.set(-2.6 + s * 2.6, 3.1, 1.0); R.add(lan);
        }
        break;
      }
      /* ---- 地摊麻辣烫 ---- */
      case 'malatang': {
        roomShell(TILE2, PAINT, CEIL, 0xffd9a0);
        // 冰柜
        rb(2.6, 1.0, 0.9, matS(0x5a748a, 0.4, 0.3), -3.4, 0.5, -2.6);
        var freezer = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshBasicMaterial({ map: SCR2 }));
        freezer.position.set(-3.4, 1.0, -2.12); R.add(freezer);
        // 选菜台
        rb(2.8, 0.16, 0.9, matS(0x9aa2ac, 0.6, 0.1), 0.4, 0.78, -2.4);
        for (var v = 0; v < 7; v++) {
          rb(0.24, 0.14, 0.2, matS([0x58a060, 0xd05450, 0xe0a040, 0x8a6ac0][v % 4], 0.7), -0.9 + v * 0.4, 0.92, -2.4);
        }
        // 桌
        rb(1.4, 0.1, 1.4, matS(0x5a4a3a, 0.7), 3.0, 0.45, 2.4);
        rc(0.14, 0.14, 0.42, 8, matS(0x3a2c20, 0.8), 3.0, 0.2, 2.4);
        rb(0.4, 0.4, 0.4, matS(0x3a4550, 0.8), 3.7, 0.35, 1.8);
        addObs(0.4, -2.4, 1.0); addObs(-3.4, -2.6, 1.0); addObs(3.0, 2.4, 0.9);
        break;
      }
      /* ---- 百味鸡 ---- */
      case 'braised': {
        roomShell(WOOD, WALL, CEIL, 0xffc98a);
        rb(2.4, 1.1, 0.9, matS(0x6a4a30, 0.8), -3.6, 0.55, 2.8);
        var showGlass = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.1),
          new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.4 }));
        showGlass.position.set(-3.6, 0.95, 2.36); R.add(showGlass);
        rb(0.9, 0.28, 0.24, matS(0xc98a4a, 0.6), -3.9, 0.62, 2.36);
        rb(0.9, 0.28, 0.24, matS(0xc05040, 0.6), -3.3, 0.62, 2.36);
        for (var i = 0; i < 2; i++) {
          var x0 = 1.4 + i * 2.2;
          rb(1.3, 0.1, 1.3, matS(0x8a5a3a, 0.7), x0, 0.45, -1.5);
          rb(0.4, 0.4, 0.4, matS(0x3a4550, 0.8), x0 + 0.7, 0.35, -2.1);
          rb(0.4, 0.4, 0.4, matS(0x3a4550, 0.8), x0 - 0.7, 0.35, -0.9);
          addObs(x0, -1.5, 0.9);
        }
        wallSign('百味鸡', 4.5, 2.4, 0.2, -Math.PI / 2, '#2a1a12', '#ffd9a0');
        addObs(-3.6, 2.8, 1.0);
        break;
      }
      /* ---- 房产中介：沙盘 + 房源墙 ---- */
      case 'estate': {
        roomShell(WOOD, WALL2, CEIL, 0xdff0ff);
        // 房源墙（灯箱×3）
        for (var i = 0; i < 3; i++) {
          var box = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5), new THREE.MeshBasicMaterial({ map: makeSignText('房源 ' + (i + 1), '#12203a', '#8bd0ff') }));
          box.position.set(-3.2 + i * 3.2, 1.9, -3.86); R.add(box);
        }
        // 沙盘
        rb(3.0, 0.75, 2.0, matS(0x6a7480, 0.6, 0.1), 0, 0.4, 1.8);
        rb(2.9, 0.03, 1.9, matS(0x2a4a3a, 0.8), 0, 0.8, 1.8);
        for (var s = 0; s < 6; s++) {
          rb(0.18, 0.3, 0.18, matS([0x8a97a8, 0xc9a24a, 0x5a7a9a, 0x8a6a48][s % 4], 0.7), -1.0 + (s % 3) * 1.0, 1.0, 1.4 + Math.floor(s / 3) * 0.8);
        }
        // 洽谈桌
        rb(1.2, 0.1, 1.2, matS(0xffffff, 0.4, 0.1), 3.6, 0.45, -2.0);
        rc(0.18, 0.18, 0.42, 10, matS(0x4a5560, 0.7), 3.6, 0.2, -2.0);
        addObs(0, 1.8, 0.8); addObs(3.6, -2.0, 0.9);
        break;
      }
      /* ---- 台球厅 ---- */
      case 'billiards': {
        roomShell(CARPET, WALL2, CEIL, 0xdff0ff);
        // 台球桌
        rb(2.6, 0.72, 1.5, matS(0x3a6a3a, 0.7), 0, 0.42, 0);
        rb(2.8, 0.1, 1.7, matS(0x6a4a30, 0.85), 0, 0.76, 0);
        rb(0.16, 0.9, 0.16, matS(0x5a4430, 0.8), -1.35, 0.45, -0.9);
        rb(0.16, 0.9, 0.16, matS(0x5a4430, 0.8), 1.35, 0.45, -0.9);
        rb(0.16, 0.9, 0.16, matS(0x5a4430, 0.8), -1.35, 0.45, 0.9);
        rb(0.16, 0.9, 0.16, matS(0x5a4430, 0.8), 1.35, 0.45, 0.9);
        for (var b = 0; b < 6; b++) {
          rs(0.07, matS([0xe8e0d0, 0xd05040, 0x4060a0, 0x58a060, 0xe0a040, 0x2a2a30][b], 0.3), b < 3 ? -0.3 + b * 0.3 : -0.3 + (b - 3) * 0.3, 0.86, b < 3 ? -0.45 : 0.45);
        }
        // 球杆架
        rb(1.4, 1.8, 0.3, matS(0x6a4a30, 0.8), -4.4, 0.9, 3.2);
        for (var c2 = 0; c2 < 4; c2++) {
          rc(0.02, 0.02, 1.3, 6, matS(0x3a2c1c, 0.8), -4.2 + c2 * 0.28, 1.1, 3.0);
        }
        // 吧台
        rb(2.2, 1.0, 0.8, matS(0x8a6a48, 0.7), 4.0, 0.5, 2.0);
        addObs(0, 0, 1.8); addObs(-4.4, 3.2, 0.7); addObs(4.0, 2.0, 0.9);
        break;
      }
      /* ---- 彩票店 ---- */
      case 'lottery': {
        roomShell(TILE2, PAINT, CEIL, 0xfff0c0);
        // 走势图墙
        var wall = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.4), new THREE.MeshBasicMaterial({ map: SCR }));
        wall.position.set(0, 2.0, -3.86); R.add(wall);
        for (var r = 0; r < 8; r++) {
          for (var c = 0; c < 12; c++) {
            var up = (r * 3 + c) % 2 === 0;
            var cell = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.04), glow(up ? 0x34c46a : 0xc05040));
            cell.position.set(-3.3 + c * 0.6, 2.3 - Math.floor(r / 4) * 1.1 + (r % 4) * 0.26, -3.55);
            R.add(cell);
          }
        }
        // 彩票机
        rb(0.9, 1.4, 0.6, matS(0x5a6a7a, 0.6, 0.2), -4.2, 0.8, 2.6);
        var tmon = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.5), new THREE.MeshBasicMaterial({ map: SCR3 }));
        tmon.position.set(-4.2, 1.0, 2.3); tmon.rotation.y = Math.PI; R.add(tmon);
        // 柜台
        rb(2.0, 1.0, 0.9, matS(0xc9a24a, 0.6, 0.2), 3.6, 0.5, 3.0);
        wallSign('刮刮乐', 4.2, 2.3, -2.5, 0, '#1a1a2a', '#ffd54f');
        addObs(-4.2, 2.6, 0.7); addObs(3.6, 3.0, 0.9);
        break;
      }
      /* ---- 培训中心 / 成人大学：教室（黑板朝里墙，门口留空） ---- */
      case 'training': case 'adu': {
        var isUni = id === 'adu';
        roomShell(isUni ? WOOD : WOOD, isUni ? WALL : WALL, CEIL, 0xfff0d0);
        // 黑板（发光，前墙 z=-3.9）
        var board = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.9), new THREE.MeshBasicMaterial({ map: isUni ? SCR2 : SCR }));
        board.position.set(0, 2.1, -3.86); R.add(board);
        rb(5.0, 0.12, 0.2, matS(0x3a2c20, 0.7), 0, 0.7, -3.8);
        // 讲台（黑板前）
        rb(1.8, 1.0, 0.8, matS(0x8a6a48, 0.7), 0, 0.5, -2.8);
        addObs(0, -2.8, 0.9);
        // 课桌 3 排×3 列（面向黑板，z 递增到门口）
        for (var row = 0; row < 3; row++) {
          for (var col = 0; col < 3; col++) {
            var x0 = -3.2 + col * 3.2;
            var z0 = -1.0 + row * 1.9;
            rb(1.5, 0.08, 0.8, matS(0x8a6a48, 0.7), x0, 0.44, z0);
            rb(1.6, 0.04, 0.9, matS(0x5a4430, 0.7), x0, 0.5, z0);
            rb(0.4, 0.4, 0.4, matS(0x3a4550, 0.8), x0 + 0.5, 0.35, z0 + 0.6);
            addObs(x0, z0, 0.85);
          }
        }
        // 书架
        rb(2.0, 2.2, 0.5, matS(0x6a4a30, 0.8), -4.5, 1.1, -1.5);
        for (var s = 0; s < 4; s++) {
          rb(2.04, 0.04, 0.06, matS(0x4a3a2a, 0.7), -4.5, 0.5 + s * 0.5, -1.4);
          for (var bk = 0; bk < 5; bk++) {
            rb(0.1, 0.34, 0.04, matS([0xd05450, 0x4a8ac0, 0x58a060, 0xc9a24a][(s + bk) % 4], 0.8), -4.6 + bk * 0.38, 0.5 + s * 0.5, -1.25);
          }
        }
        if (isUni) wallSign('成人大学', 4.5, 2.6, -1.8, -Math.PI / 2, '#12203a', '#ffb74d');
        addObs(-4.5, -1.5, 0.6);
        break;
      }
      /* ---- 公园：草地 + 长椅 + 喷泉 ---- */
      case 'park': {
        roomShell(GRASS, WALL2, CEIL, 0xe8ffd8);
        // 石板路
        rb(1.6, 0.03, 6.0, matS(0x9aa2ac, 0.9), 0, 0.015, 0);
        // 长椅×2
        for (var i = 0; i < 2; i++) {
          var x0 = i === 0 ? -3.2 : 3.2;
          rb(1.6, 0.3, 0.5, matS(0x6a4a30, 0.8), x0, 0.35, 2.6);
          rb(1.6, 0.06, 0.4, matS(0x8a6a48, 0.8), x0, 0.55, 2.6);
          rb(0.14, 0.4, 0.14, matS(0x5a4430, 0.8), x0 - 0.6, 0.2, 2.6);
          rb(0.14, 0.4, 0.14, matS(0x5a4430, 0.8), x0 + 0.6, 0.2, 2.6);
          // 绿植
          rc(0.35, 0.35, 0.4, 8, matS(0x5a3a28, 0.9), x0, 0.3, -2.8);
          rs(0.55, matS(0x4a8a3a, 0.9), x0, 1.0, -2.8);
          addObs(x0, 2.6, 0.9);
        }
        // 喷泉
        rc(0.9, 0.9, 0.3, 16, matS(0x9aa2ac, 0.4, 0.2), 0, 0.25, -1.5);
        rc(0.05, 0.05, 0.9, 8, matS(0x9aa2ac, 0.4, 0.3), 0, 0.9, -1.5);
        rs(0.12, matS(0x8ad0ff, 0.3, 0.2), 0, 1.25, -1.5);
        // 花坛
        for (var f = 0; f < 4; f++) {
          var a = -2.0 + f * 1.35;
          rc(0.4, 0.4, 0.25, 10, matS(0x7a4a3a, 0.8), a, 0.18, 2.0);
          var fl = [0xff8fb0, 0xffd06b, 0xff6b8a, 0xc98af0][f];
          rs(0.16, matS(fl, 0.8), a, 0.42, 2.0);
        }
        addObs(0, -1.5, 1.0); addObs(-3.2, 2.6, 0.9); addObs(3.2, 2.6, 0.9);
        break;
      }
      /* ---- 会所：吧台 + 酒柜 + 卡座 ---- */
      case 'club': {
        roomShell(MARBLE, WALL2, CEIL, 0xffd0a0, 3.05);
        // 吧台
        rb(4.6, 1.1, 1.0, matT(MARBLE, 0.35, 0.15), 0, 0.65, 2.3);
        rb(4.8, 0.08, 1.1, matS(0x2a2030, 0.4, 0.3), 0, 1.2, 2.3);
        // 高脚凳
        for (var s = 0; s < 3; s++) {
          rc(0.3, 0.3, 0.65, 10, matS(0x1a1c24, 0.6, 0.4), -1.4 + s * 1.4, 0.33, 1.7);
        }
        // 酒柜（发光瓶）
        rb(3.6, 2.0, 0.5, matS(0x3a2c20, 0.7), -4.2, 1.0, 0);
        for (var b = 0; b < 8; b++) {
          rc(0.08, 0.08, 0.35, 8, glow([0xffd06b, 0xff8a6b, 0x8bffd2, 0xe08bff][b % 4]), -4.2, 1.0, -1.3 + b * 0.37);
          rc(0.05, 0.05, 0.12, 6, matS(0x1a2030, 0.5), -4.2, 1.25, -1.3 + b * 0.37);
        }
        // 卡座沙发
        rb(2.6, 0.5, 1.0, matS(0x4a3a6a, 0.85), 3.2, 0.4, -2.6);
        rb(2.6, 0.3, 0.5, matS(0x5a4a7a, 0.85), 3.2, 0.68, -2.3);
        rb(1.1, 0.1, 0.7, matS(0x2a2030, 0.6, 0.2), 3.2, 0.15, -2.6);
        // 舞池灯
        var spin = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        spin.position.set(1.5, 3.0, -1.5); R.add(spin);
        var glow2 = new THREE.PointLight(0x8a6aff, 1.2, 9, 2); glow2.position.set(1.5, 2.8, -1.5); R.add(glow2);
        addObs(0, 2.3, 0.8); addObs(-4.2, 0, 0.7); addObs(3.2, -2.6, 1.2); addObs(1.5, -1.5, 0.5);
        break;
      }
      /* ---- KTV：沙发 + 电视 + 迪斯科灯 ---- */
      case 'ktv': {
        roomShell(CARPET, makeWallpaper('#2a1a34', 'rgba(255,79,216,.18)'), CEIL, 0x9a6aff, 3.05);
        // L 形沙发
        rb(2.8, 0.5, 1.0, matS(0x4a2a5a, 0.85), 0, 0.42, 2.2);
        rb(2.8, 0.32, 0.5, matS(0x5a3a6a, 0.85), 0, 0.7, 1.95);
        rb(1.2, 0.5, 1.8, matS(0x4a2a5a, 0.85), 1.9, 0.42, 1.6);
        // 茶几
        rb(1.4, 0.12, 0.8, matS(0x1a1420, 0.5, 0.3), 0, 0.16, 1.2);
        // 电视
        var tv = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshBasicMaterial({ map: SCR3 }));
        tv.position.set(0, 1.6, -3.86); R.add(tv);
        rb(0.16, 1.6, 0.16, matS(0x1a1420, 0.6), 0, 0.8, -3.7);
        // 霓虹灯条
        for (var n = 0; n < 5; n++) {
          var strip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 0.03), glow(0xff4fd8));
          strip.position.set(-3.6 + n * 1.8, 2.6, -3.8); R.add(strip);
        }
        // 迪斯科灯
        var disco = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), matS(0x22242e, 0.4, 0.5));
        disco.position.set(0, 3.1, 0); R.add(disco);
        var dglow = new THREE.PointLight(0xff4fd8, 1.4, 12, 2); dglow.position.set(0, 3.0, 0); R.add(dglow);
        var dglow2 = new THREE.PointLight(0x6bc0ff, 0.8, 10, 2); dglow2.position.set(-3, 2.4, -2); R.add(dglow2);
        addObs(0, 2.2, 0.6); addObs(1.9, 1.6, 1.1); addObs(0, 1.2, 0.7);
        break;
      }
      /* ---- 私人会所：按摩床 + 帷幔 + 香薰 ---- */
      case 'pvclub': {
        roomShell(WOOD, makeWallpaper('#3a2434', 'rgba(192,138,255,.16)'), CEIL, 0x9a6aff, 3.05);
        // 按摩床×2
        for (var i = 0; i < 2; i++) {
          var x0 = -2.0 + i * 4.0;
          rb(2.2, 0.5, 0.9, matS(0x6a4a5a, 0.85), x0, 0.42, 0.5);
          rb(2.0, 0.12, 0.7, matS(0xd8c0c8, 0.95), x0, 0.62, 0.5);
          rb(0.5, 0.14, 0.3, matS(0xe8d8d8, 0.95), x0, 0.75, -0.15);
          // 帷幔柱
          rc(0.06, 0.06, 2.5, 8, matS(0x8a6a7a, 0.7), x0 - 1.0, 1.25, 0.5);
          rc(0.06, 0.06, 2.5, 8, matS(0x8a6a7a, 0.7), x0 + 1.0, 1.25, 0.5);
          var veil = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.3),
            new THREE.MeshPhysicalMaterial({ color: 0xc8a8c0, transparent: true, opacity: 0.22, roughness: 0.8, side: THREE.DoubleSide }));
          veil.position.set(x0, 1.4, 0.9); R.add(veil);
          addObs(x0, 0.5, 1.1);
        }
        // 香薰台
        rb(1.0, 0.1, 0.6, matS(0x4a3a4a, 0.6), 0, 0.15, -2.6);
        for (var c = 0; c < 3; c++) {
          rc(0.05, 0.07, 0.12, 8, matS(0xd8c8d0, 0.5), -0.2 + c * 0.2, 0.25, -2.6);
          var flame = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), glow(0xffd06b));
          flame.position.set(-0.2 + c * 0.2, 0.35, -2.6); R.add(flame);
        }
        var glow3 = new THREE.PointLight(0xc08aff, 1.0, 10, 2); glow3.position.set(0, 2.6, -1); R.add(glow3);
        break;
      }
      /* ---- 花店：花架 + 收银 ---- */
      case 'flower': {
        roomShell(WOOD, makeWallpaper('#f0d8d0', 'rgba(255,143,171,.14)'), CEIL, 0xffd0b8);
        for (var i = 0; i < 3; i++) {
          var x0 = -3.4 + i * 3.0;
          rb(1.2, 1.7, 0.5, matS(0x8a6a48, 0.8), x0, 0.9, -2.4);
          for (var s = 0; s < 3; s++) {
            var y = 0.5 + s * 0.5;
            rb(1.24, 0.04, 0.1, matS(0x6a4a30, 0.7), x0, y, -2.15);
            var cols = [0xff8fb0, 0xffd06b, 0xff6b8a, 0xc98af0, 0xffffff];
            rs(0.14, matS(cols[(i + s) % 5], 0.7), x0 - 0.3 + (s % 3) * 0.3, y + 0.14, -2.4);
          }
          addObs(x0, -2.4, 0.8);
        }
        // 收银台
        rb(1.8, 1.0, 0.9, matS(0x8a6a48, 0.7), 3.8, 0.5, 3.0);
        wallSign('花店', -4.5, 2.4, 0.2, Math.PI / 2, '#2a1218', '#ff8fb0');
        addObs(3.8, 3.0, 0.8);
        break;
      }
      /* ---- 鬼市：石砖 + 烛光 ---- */
      case 'ghostmarket': {
        roomShell(STONE, makePaint('#3a3640'), CEIL, 0xffb03c, 3.05);
        for (var i = 0; i < 3; i++) {
          var x0 = -3.0 + i * 3.0;
          rb(1.6, 0.12, 1.1, matS(0x2a2430, 0.9), x0, 0.8, -2.5);
          var cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.7),
            new THREE.MeshPhysicalMaterial({ color: 0x4a405a, transparent: true, opacity: 0.8, roughness: 0.9, side: THREE.DoubleSide }));
          cloth.position.set(x0, 1.55, -2.5); R.add(cloth);
          rc(0.03, 0.03, 0.9, 6, matS(0x1a1620, 0.9), x0 - 0.7, 1.0, -2.5);
          rc(0.03, 0.03, 0.9, 6, matS(0x1a1620, 0.9), x0 + 0.7, 1.0, -2.5);
          // 烛光
          var cand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.14, 6), matS(0xd8c8b0, 0.5));
          cand.position.set(x0, 0.78, -2.5); R.add(cand);
          var flame = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), glow(0xffb03c));
          flame.position.set(x0, 0.88, -2.5); R.add(flame);
          var cglow = new THREE.PointLight(0xff9a3c, 0.5, 4, 2); cglow.position.set(x0, 0.9, -2.5); R.add(cglow);
          rb(0.3, 0.2, 0.2, matS(0x5a4a3a, 0.8), x0 - 0.3, 0.74, -2.5);
          rb(0.3, 0.2, 0.2, matS(0x6a4a2a, 0.8), x0 + 0.3, 0.74, -2.5);
          addObs(x0, -2.5, 0.9);
        }
        // 暗红灯笼
        for (var s = 0; s < 3; s++) {
          var lan = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), glow(0x8a4a3a));
          lan.position.set(-2.4 + s * 2.4, 3.1, 1.2); R.add(lan);
        }
        break;
      }
      /* ---- 酒吧 ---- */
      case 'bar': {
        roomShell(WOOD, makeWallpaper('#241a26', 'rgba(255,138,107,.16)'), CEIL, 0xff9a6a, 3.05);
        rb(4.6, 1.1, 1.0, matS(0x5a3a28, 0.6), 0, 0.65, 2.3);
        rb(4.8, 0.06, 1.1, matS(0x1a1420, 0.5, 0.2), 0, 1.2, 2.3);
        for (var s = 0; s < 3; s++) rc(0.3, 0.3, 0.65, 10, matS(0x2a2028, 0.6), -1.4 + s * 1.4, 0.33, 1.7);
        for (var b = 0; b < 7; b++) {
          rc(0.09, 0.09, 0.4, 8, glow([0xffd06b, 0xff8a6b, 0x8bffd2, 0xe08bff][b % 4]), -4.3, 1.0, -1.2 + b * 0.36);
        }
        rb(2.8, 0.5, 1.0, matS(0x4a3a3a, 0.85), 3.0, 0.42, -2.6);
        var mic = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 8), matS(0x2a2a32, 0.4, 0.7));
        mic.position.set(1.8, 1.0, -3.5); R.add(mic);
        var glow4 = new THREE.PointLight(0xff6a4a, 1.0, 10, 2); glow4.position.set(1.8, 2.6, -3.0); R.add(glow4);
        addObs(0, 2.3, 0.8); addObs(3.0, -2.6, 1.2);
        break;
      }
      /* ---- 兜底 ---- */
      default: {
        roomShell(TILE2, WALL2, CEIL, 0xfff0d0);
        rb(1.8, 1.0, 0.9, matS(0x8a97a8, 0.7), 0, 0.5, 2.8);
        rb(2.0, 0.08, 1.2, matS(0x6a7480, 0.7), 0, 0.04, 0);
        addObs(0, 2.8, 1.0);
      }
    }
    // 墙脚线
    var base = new THREE.Mesh(new THREE.BoxGeometry(9.9, 0.1, 8.0), matS(0x3a3f4a, 0.7));
    base.position.set(0, 0.06, 0); R.add(base);
    // 整体放大房间（面积扩大，人物与家具比例保持）
    R.scale.set(ROOM_SCALE, ROOM_SCALE, ROOM_SCALE);
    scene.add(R);
  }

  /* ================= 5. 输入 ================= */
  var keys = {}, dragging = false, lastMX = 0, lastMY = 0;
  var camYaw = Math.PI, camPitch = 0.45;
  var BOUND_X = 5.5, BOUND_Z = 4.6;

  function bindInput() {
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { leave(); return; }
      keys[e.code] = true;
      e.preventDefault();
    });
    window.addEventListener('keyup', function (e) { keys[e.code] = false; });
    container.addEventListener('mousedown', function (e) {
      dragging = true; lastMX = e.clientX; lastMY = e.clientY;
    });
    window.addEventListener('mouseup', function () { dragging = false; });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastMX, dy = e.clientY - lastMY;
      lastMX = e.clientX; lastMY = e.clientY;
      camYaw -= dx * 0.006;
      camPitch = Math.max(0.18, Math.min(1.0, camPitch + dy * 0.004));
    });
    window.addEventListener('resize', function () {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
  }

  /* ================= 6. 主循环 ================= */
  var animT = 0;
  function update(dt) {
    var f = 0, r = 0;
    if (keys['KeyW']) f += 1;
    if (keys['KeyS']) f -= 1;
    if (keys['KeyA']) r -= 1;
    if (keys['KeyD']) r += 1;
    var moving = f !== 0 || r !== 0;
    var spd = 2.1;
    var sinY = Math.sin(camYaw), cosY = Math.cos(camYaw);
    var dx = (-sinY * f + cosY * r) * spd * dt;
    var dz = (-cosY * f - sinY * r) * spd * dt;
    var nx = Math.max(-BOUND_X, Math.min(BOUND_X, player.x + dx));
    var nz = Math.max(-BOUND_Z, Math.min(BOUND_Z, player.z + dz));
    var blocked = false;
    for (var i = 0; i < OBS.length; i++) {
      var o = OBS[i];
      var ox = o.x * ROOM_SCALE, oz = o.z * ROOM_SCALE;
      if (Math.sqrt((nx - ox) * (nx - ox) + (nz - oz) * (nz - oz)) < o.r * ROOM_SCALE + 0.42) { blocked = true; break; }
    }
    if (!blocked) { player.x = nx; player.z = nz; }
    player.moving = moving;
    if (moving) player.yaw = Math.atan2(dx, dz);
    animT += dt;
    var swing = moving ? Math.sin(animT * 9) * 0.5 : 0;
    player.legL1.hip.rotation.x = swing;
    player.legR1.hip.rotation.x = -swing;
    player.legL1.knee.rotation.x = Math.max(0, swing) * 0.5;
    player.legR1.knee.rotation.x = Math.max(0, -swing) * 0.5;
    player.armL1.sh.rotation.x = -swing * 0.7;
    player.armR1.sh.rotation.x = swing * 0.7;
    player.g.position.set(player.x, 0, player.z);
    player.g.rotation.y = player.yaw;
    // 第三人称相机
    var dist = 3.3;
    var cx = player.x + Math.sin(camYaw) * dist;
    var cz = player.z + Math.cos(camYaw) * dist;
    cx = Math.max(-5.8, Math.min(5.8, cx));
    cz = Math.max(-4.6, Math.min(4.6, cz));
    camera.position.set(cx, 1.9 + camPitch * 1.2, cz);
    camera.lookAt(player.x, 1.35, player.z);
  }
  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    update(dt);
    renderer.render(scene, camera);
  }

  /* ================= 7. 互动面板（与终端一致） ================= */
  var lastHud = null;
  function cmdVisible(it, locId) {
    if (it.scenes && it.scenes.length && it.scenes.indexOf(locId) < 0) return false;
    var h = lastHud || {};
    if (it.needPc && !h.pc) return false;
    if (it.needTv && !h.tv) return false;
    if (it.needHome && !(h.estates && h.estates.length)) return false;
    if (it.needPartner && !h.partner) return false;
    if (it.needCar && !h.bestCar) return false;
    return true;
  }
  function renderCmds() {
    var locId = CUR.loc.id;
    var locItems = [], sysItems = [], genItems = [];
    CMD_GROUPS.forEach(function (g) {
      g.items.forEach(function (it) {
        if (!cmdVisible(it, locId)) return;
        if (it.scenes && it.scenes.indexOf(locId) >= 0) locItems.push(it);
        else if (g.key === 'sys') sysItems.push(it);
        else if (!it.scenes && !/^move\b/.test(it.c)) genItems.push(it);
      });
    });
    // 常用功能截断避免撑爆面板（保留场景专属 + 系统 + 前 12 个通用）
    genItems = genItems.slice(0, 12);
    var wrap = document.getElementById('rp-groups');
    wrap.innerHTML = '';
    function addGroup(title, list) {
      if (!list.length) return;
      var g = document.createElement('div');
      g.className = 'rp-group';
      var name = document.createElement('div');
      name.className = 'rp-gname';
      name.textContent = title;
      g.appendChild(name);
      var btns = document.createElement('div');
      btns.className = 'rp-btns';
      list.forEach(function (it) {
        var b = document.createElement('button');
        b.className = 'rp-btn';
        b.textContent = it.t;
        b.title = it.d || '';
        b.addEventListener('click', function () { runCmd(it.c); });
        btns.appendChild(b);
      });
      g.appendChild(btns);
      wrap.appendChild(g);
    }
    addGroup('📍 本地点业务', locItems);
    addGroup('🛠 常用功能', sysItems);
    if (genItems.length) addGroup('🧰 更多操作', genItems);
  }

  function runCmd(cmd) {
    cmd = String(cmd || '').trim();
    if (!cmd) return;
    var it = null;
    CMD_GROUPS.forEach(function (g) { g.items.forEach(function (i) { if (i.c === cmd) it = i; }); });
    api('/api/game/command', { input: cmd }).then(function (r) {
      var title = it ? it.t : cmd;
      termWrite(r.lines || [], title);
      if (r.hud) renderHud(r.hud);
      if (r.hud && r.hud.gameOver) toast(r.hud.gameOverReason || '游戏结束', 'err');
    }).catch(function () {
      termWrite(['⚠ 与服务器通信失败，请稍后重试'], 'err');
    });
  }

  /* ================= 8. HUD / 时钟 ================= */
  function renderHud(h) {
    if (!h) return;
    lastHud = h;
    // 按钮无条件渲染（未开始游戏时由服务器提示），条件按钮按属性过滤
    renderCmds();
    if (!h.started) return;
    var tm = document.getElementById('rtc-time');
    var ico = document.getElementById('rtc-ico');
    var ph = document.getElementById('rtc-phase');
    if (h.time) tm.textContent = h.time;
    var hr = parseInt(h.time, 10) || 0;
    if (hr < 6) { ico.textContent = '🌙'; ph.textContent = '深夜'; }
    else if (hr < 9) { ico.textContent = '🌅'; ph.textContent = '清晨'; }
    else if (hr < 12) { ico.textContent = '☀️'; ph.textContent = '上午'; }
    else if (hr < 14) { ico.textContent = '☀️'; ph.textContent = '正午'; }
    else if (hr < 18) { ico.textContent = '🌤️'; ph.textContent = '下午'; }
    else if (hr < 21) { ico.textContent = '🌆'; ph.textContent = '傍晚'; }
    else { ico.textContent = '🌙'; ph.textContent = '夜晚'; }
    var c = h.char || {};
    document.getElementById('rs-edu').textContent = c.education || '——';
    var job = h.job;
    document.getElementById('rs-job').textContent = job ? job.name : '无业';
    var v = h.vitals || {};
    document.getElementById('rs-money').textContent = fmtMoney(h.money);
    document.getElementById('rs-bank').textContent = fmtMoney(h.deposit);
    document.getElementById('rs-stamina').textContent = v.stamina != null ? v.stamina : 0;
    document.getElementById('rs-mood').textContent = v.mood != null ? v.mood : 0;
    document.getElementById('rs-prestige').textContent = h.prestige != null ? h.prestige : 0;
    renderCmds();
  }
  function tickState() {
    api('/api/game/state').then(function (r) {
      if (r) renderHud(r);
    }).catch(function () {});
  }

  /* ================= 9. 离开 / 过渡 ================= */
  var savedPos = null;
  try { savedPos = JSON.parse(localStorage.getItem('ws_free_pos') || 'null'); } catch (e) { savedPos = null; }
  function leave() {
    var q = '';
    if (savedPos && isFinite(savedPos.x) && isFinite(savedPos.z)) {
      q = '?ret=1&x=' + savedPos.x.toFixed(2) + '&z=' + savedPos.z.toFixed(2) + '&yaw=' + (isFinite(savedPos.yaw) ? savedPos.yaw.toFixed(2) : '0');
    }
    window.location.href = '/free' + q;
  }
  var loadingEl = document.getElementById('rt-loading');
  function hideLoading() {
    setTimeout(function () { loadingEl.classList.add('hide'); }, 120);
    setTimeout(function () { loadingEl.style.display = 'none'; }, 1000);
  }

  /* ================= 10. 初始化 ================= */
  var CUR = { loc: locById((new URLSearchParams(window.location.search)).get('loc') || 'bank') };
  var ready = false;
  function boot() {
    document.getElementById('rt-name').textContent = CUR.loc.name;
    document.getElementById('rt-type').textContent = CUR.loc.type;
    document.getElementById('rp-loc').textContent = CUR.loc.name;
    feedEl = document.getElementById('rp-feed');
    addCard('欢迎来到「' + CUR.loc.name + '」室内场景。\n点击下方按钮即可办理业务，或靠近柜台/设施逛逛。', 'ok', '👋 你好');
    bindInput();
    buildRoom(CUR.loc.id);
    buildPlayer();
    // 人物出生点：门口内侧（避开家具）
    player.x = 0; player.z = 4.4;
    player.g.position.set(player.x, 0, player.z);
    animate();
    // 状态
    api('/api/game/state').then(function (r) {
      if (r) renderHud(r);
      ready = true;
      hideLoading();
      tickState();
      setInterval(tickState, 4000);
    }).catch(function () {
      addCard('无法连接服务器，请确认已在终端模式开始游戏。', 'err');
      ready = true;
      hideLoading();
    });
    // 面板收起
    document.getElementById('rp-min').addEventListener('click', function () {
      var p = document.getElementById('rt-panel');
      p.classList.toggle('collapsed');
      this.textContent = p.classList.contains('collapsed') ? '+' : '–';
    });
    document.getElementById('rt-leave').addEventListener('click', leave);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
