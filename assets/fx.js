/* SitePanel "Nebula" effects - no libraries, no network. Everything degrades: no WebGL -> CSS glow, reduced motion -> static page. */
(function () {
  'use strict';
  var root = document.documentElement;
  var mq = function (q) { return window.matchMedia && matchMedia(q).matches; };
  var calm = mq('(prefers-reduced-motion: reduce)');
  var fine = mq('(hover: hover) and (pointer: fine)');
  var lowPower = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 700;
  var mouse = { x: .5, y: .5, sx: .5, sy: .5, px: -1000, py: -1000 };
  var clickT = { x: 0, y: 0, t: 99 };

  /* ------------------------------------------------------------ boot / ready */
  function setReady() {
    if (root.classList.contains('ready')) return;
    root.classList.add('ready');
    try { sessionStorage.setItem('booted', '1'); } catch (e) {}
    document.dispatchEvent(new Event('fx-ready'));
  }
  function boot() {
    var el = document.getElementById('boot');
    if (root.classList.contains('ready') || !el) { setReady(); return; }
    var pct = el.querySelector('.pct'), bar = el.querySelector('.bar-in'), t0 = performance.now(), D = 1300;
    (function tick(now) {
      var p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 3);
      if (pct) pct.textContent = Math.round(e * 100);
      if (bar) bar.style.transform = 'scaleX(' + e + ')';
      if (p < 1) requestAnimationFrame(tick); else setTimeout(setReady, 180);
    })(t0);
    setTimeout(setReady, 4000);   // failsafe
  }
  function onReady(fn) {
    if (root.classList.contains('ready')) fn(); else document.addEventListener('fx-ready', fn, { once: true });
  }

  /* ------------------------------------------------------------ WebGL nebula */
  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision mediump float;',
    'uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uScroll;uniform float uLight;uniform vec3 uClick;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return v;}',
    'void main(){',
    ' float m=min(uRes.x,uRes.y);vec2 uv=gl_FragCoord.xy/uRes;vec2 p=(gl_FragCoord.xy-.5*uRes)/m;',
    ' vec2 mo=(uMouse*uRes-.5*uRes)/m;float t=uTime*.055;',
    ' vec2 d=p-mo;float r=length(d);p+=d/(r+.18)*.10*exp(-r*2.2);',
    ' vec2 q=vec2(fbm(p*1.5+t),fbm(p*1.5+vec2(5.2,1.3)-t));',
    ' vec2 w=vec2(fbm(p*1.7+q*2.+vec2(1.7,9.2)+t*1.3),fbm(p*1.7+q*2.+vec2(8.3,2.8)-t));',
    ' float f=fbm(p*1.4+w*2.3+vec2(0.,uScroll*.00035));',
    ' vec3 c1=vec3(.04,.78,.95),c2=vec3(.42,.38,1.),c3=vec3(.97,.28,.60),c4=vec3(.95,.2,.25);',
    ' vec3 col=mix(c1,c2,smoothstep(.2,.7,f));col=mix(col,c3,smoothstep(.52,.95,w.x));col=mix(col,c4,smoothstep(.78,1.,w.y)*.55);',
    ' float inten=clamp(pow(f,1.8)*1.95,0.,1.);',
    ' vec3 base=mix(vec3(.012,.016,.04),vec3(.955,.965,1.),uLight);',
    ' vec3 o=mix(base,col,inten*mix(.92,.5,uLight));',
    ' vec2 g=floor(gl_FragCoord.xy/1.6);float st=step(.9972,h(g))*(.5+.5*sin(uTime*2.+h(g+3.)*40.));o+=st*(1.-uLight)*.9*(1.-inten);',
    ' vec2 cp=(vec2(uClick.x,uClick.y)*uRes-.5*uRes)/m;float cr=length(p-cp);',
    ' o+=smoothstep(.04,0.,abs(cr-uClick.z*.85))*exp(-uClick.z*1.7)*mix(vec3(.45,.75,1.),vec3(.3,.3,.8),uLight)*.55;',
    ' o*=1.-.55*dot(uv-.5,uv-.5)*1.6;',
    ' gl_FragColor=vec4(o,1.);',
    '}'
  ].join('\n');

  var gl = null, glc = null, U = {}, light = 0;
  function initGL() {
    glc = document.getElementById('gl');
    if (!glc) return false;
    try { gl = glc.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    if (!gl) return false;
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return false;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uTime', 'uMouse', 'uScroll', 'uLight', 'uClick'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    glc.addEventListener('webglcontextlost', function (e) { e.preventDefault(); root.classList.remove('gl-on'); });
    root.classList.add('gl-on');
    resizeGL();
    return true;
  }
  var qual = lowPower ? .38 : .55, slow = 0, lastNow = 0;
  function adapt(now) {
    /* weak GPU / busy phone: lower the nebula resolution step by step, finally fall back to the plain CSS glow */
    var dt = lastNow ? now - lastNow : 16; lastNow = now;
    if (!gl || dt > 1000) return;
    slow = dt > 42 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 24) {
      slow = 0; qual *= .72;
      if (qual < .17) { gl = null; root.classList.remove('gl-on'); return; }
      resizeGL();
    }
  }
  function resizeGL() {
    if (!gl) return;
    var s = qual;
    var w = Math.max(2, Math.floor(innerWidth * s)), h = Math.max(2, Math.floor(innerHeight * s));
    glc.width = w; glc.height = h; gl.viewport(0, 0, w, h);
  }

  /* ------------------------------------------------------------ constellation (2D) */
  var net = null, nctx = null, pts = [];
  function initNet() {
    net = document.getElementById('net');
    if (!net) return;
    nctx = net.getContext('2d');
    sizeNet();
    var n = lowPower ? 34 : 78;
    for (var i = 0; i < n; i++) pts.push({ x: Math.random() * net.width, y: Math.random() * net.height, vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, r: Math.random() * 1.4 + .5 });
  }
  function sizeNet() { net.width = innerWidth; net.height = innerHeight; }
  function drawNet() {
    var W = net.width, H = net.height, dark = light < .5, c = dark ? '170,205,255' : '70,80,170';
    nctx.clearRect(0, 0, W, H);
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i];
      a.x += a.vx; a.y += a.vy;
      if (a.x < 0 || a.x > W) a.vx *= -1;
      if (a.y < 0 || a.y > H) a.vy *= -1;
      var dm = Math.hypot(a.x - mouse.px, a.y - mouse.py);
      if (dm < 150) { a.x += (a.x - mouse.px) / dm * .6; a.y += (a.y - mouse.py) / dm * .6; }
      nctx.fillStyle = 'rgba(' + c + ',' + (dark ? .75 : .5) + ')';
      nctx.beginPath(); nctx.arc(a.x, a.y, a.r, 0, 6.283); nctx.fill();
      for (var j = i + 1; j < pts.length; j++) {
        var b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) { nctx.strokeStyle = 'rgba(' + c + ',' + (1 - d / 120) * .32 + ')'; nctx.lineWidth = .7; nctx.beginPath(); nctx.moveTo(a.x, a.y); nctx.lineTo(b.x, b.y); nctx.stroke(); }
      }
      if (dm < 200) { nctx.strokeStyle = 'rgba(' + (dark ? '120,220,255' : '40,100,200') + ',' + (1 - dm / 200) * .55 + ')'; nctx.lineWidth = .9; nctx.beginPath(); nctx.moveTo(a.x, a.y); nctx.lineTo(mouse.px, mouse.py); nctx.stroke(); }
    }
  }

  /* ------------------------------------------------------------ main loop */
  var t0 = performance.now(), lastScroll = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { lastNow = 0; return; }
    adapt(now);
    var target = root.getAttribute('data-theme') === 'light' ? 1 : 0;
    light += (target - light) * .06;
    mouse.sx += (mouse.x - mouse.sx) * .07; mouse.sy += (mouse.y - mouse.sy) * .07;
    clickT.t += .016;
    if (gl) {
      gl.uniform2f(U.uRes, glc.width, glc.height);
      gl.uniform1f(U.uTime, (now - t0) / 1000);
      gl.uniform2f(U.uMouse, mouse.sx, 1 - mouse.sy);
      gl.uniform1f(U.uScroll, scrollY);
      gl.uniform1f(U.uLight, light);
      gl.uniform3f(U.uClick, clickT.x, 1 - clickT.y, Math.min(clickT.t, 9));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (nctx) drawNet();
    orbitStep(now);
    if (cursor.on) moveCursor();
    var sy = scrollY; if (sy !== lastScroll) { root.style.setProperty('--sy', sy); lastScroll = sy; }
  }

  /* ------------------------------------------------------------ cursor glow */
  var cursor = { on: false, x: -100, y: -100, rx: -100, ry: -100, dot: null, ring: null, hover: false };
  function initCursor() {
    cursor.dot = document.createElement('div'); cursor.dot.className = 'cur-dot';
    cursor.ring = document.createElement('div'); cursor.ring.className = 'cur-ring';
    document.body.appendChild(cursor.ring); document.body.appendChild(cursor.dot);
    cursor.on = true; root.classList.add('cur-on');
  }
  function moveCursor() {
    cursor.rx += (cursor.x - cursor.rx) * .18; cursor.ry += (cursor.y - cursor.ry) * .18;
    cursor.dot.style.transform = 'translate(' + cursor.x + 'px,' + cursor.y + 'px)';
    cursor.ring.style.transform = 'translate(' + cursor.rx + 'px,' + cursor.ry + 'px) scale(' + (cursor.hover ? 1.9 : 1) + ')';
  }

  /* ------------------------------------------------------------ pointer: tilt/holo cards, magnetic buttons */
  var CARD = '.app-card, .store-tile', MAG = '.cta a, .policy-link, .icon-btn, .chip, .lang-btn';
  function onMove(e) {
    mouse.x = e.clientX / innerWidth; mouse.y = e.clientY / innerHeight; mouse.px = e.clientX; mouse.py = e.clientY;
    cursor.x = e.clientX; cursor.y = e.clientY;
    var t = e.target.closest ? e.target : null;
    cursor.hover = !!(t && t.closest('a, button, .app-card, .store-tile, .chip'));
    var c = t && t.closest(CARD);
    if (c) {
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--mx', (x * 100) + '%'); c.style.setProperty('--my', (y * 100) + '%');
      c.style.setProperty('--rx', ((.5 - y) * 12) + 'deg'); c.style.setProperty('--ry', ((x - .5) * 14) + 'deg');
      c.style.setProperty('--ty', '-8px'); c.style.setProperty('--sc', '1.025');
    }
    var m = t && t.closest(MAG);
    if (m) {
      var q = m.getBoundingClientRect();
      m.style.setProperty('--tx', ((e.clientX - q.left - q.width / 2) * .22) + 'px');
      m.style.setProperty('--ty2', ((e.clientY - q.top - q.height / 2) * .32) + 'px');
    }
  }
  function onOut(e) {
    var c = e.target.closest && e.target.closest(CARD);
    if (c && !c.contains(e.relatedTarget)) { ['--rx', '--ry', '--ty', '--sc'].forEach(function (k) { c.style.removeProperty(k); }); }
    var m = e.target.closest && e.target.closest(MAG);
    if (m && !m.contains(e.relatedTarget)) { m.style.removeProperty('--tx'); m.style.removeProperty('--ty2'); }
  }

  /* ------------------------------------------------------------ headline: word reveal + scramble */
  var SPLIT = ['.hero h1 [data-translate="welcome"]', '.hero h1 [data-translate="name"]', '.hero .role', '.hero .badge span:last-child'];
  function splitWords(el) {
    var txt = (el.textContent || '').trim();
    if (!txt) return;
    el.setAttribute('aria-label', txt);
    el.textContent = '';
    txt.split(/\s+/).forEach(function (w, i, a) {
      var s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i); s.setAttribute('aria-hidden', 'true');
      var b = document.createElement('i'); b.textContent = w; s.appendChild(b);
      el.appendChild(s); if (i < a.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }
  function runSplit() {
    var k = 0;
    SPLIT.forEach(function (sel) {
      var el = document.querySelector(sel); if (!el) return;
      splitWords(el);
      [].forEach.call(el.querySelectorAll('.w'), function (w) { w.style.setProperty('--i', k++); });
    });
    if (calm) { [].forEach.call(document.querySelectorAll('.hero .w'), function (w) { w.classList.add('go'); }); return; }
    onReady(function () {
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        [].forEach.call(document.querySelectorAll('.hero .w'), function (w) { w.classList.add('go'); });
      }); });
    });
  }
  var scrambling = false;
  function scramble(el) {
    var word = el.querySelector('.w > i'); if (!word || scrambling || root.lang === 'ar') return;
    var orig = word.textContent, chars = '01<>/\\{}#$%&*+=', t = 0; scrambling = true;
    (function step() {
      t++;
      word.textContent = orig.split('').map(function (ch, i) { return i < t / 2 ? ch : chars[Math.floor(Math.random() * chars.length)]; }).join('');
      if (t / 2 < orig.length) setTimeout(step, 38); else { word.textContent = orig; scrambling = false; }
    })();
  }



  /* ------------------------------------------------------------ orbiting store icons: hover = stop, drag = spin by hand, release = orbit again */
  var orbit = { el: null, th: 0, vel: 12.9, base: 12.9, hover: 0, drag: null, last: 0 };
  function angleOf(e) {
    var r = orbit.el.parentNode.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
  }
  function norm(d) { while (d > 180) d -= 360; while (d < -180) d += 360; return d; }
  function initOrbit() {
    orbit.el = document.querySelector('.orbit'); if (!orbit.el) return;
    [].forEach.call(orbit.el.querySelectorAll('.o b'), function (chip) {
      chip.addEventListener('pointerenter', function () { orbit.hover++; });
      chip.addEventListener('pointerleave', function () { orbit.hover = Math.max(0, orbit.hover - 1); });
      chip.addEventListener('pointerdown', function (e) {
        e.preventDefault(); chip.setPointerCapture(e.pointerId);
        orbit.drag = { id: e.pointerId, prev: angleOf(e), t: performance.now(), v: 0 };
        orbit.el.classList.add('grabbing');
      });
      chip.addEventListener('pointermove', function (e) {
        var d = orbit.drag; if (!d || d.id !== e.pointerId) return;
        var a = angleOf(e), now = performance.now(), delta = norm(a - d.prev), dt = Math.max(1, now - d.t) / 1000;
        orbit.th += delta; d.v += (delta / dt - d.v) * .35; d.prev = a; d.t = now;
      });
      function end(e) {
        var d = orbit.drag; if (!d || d.id !== e.pointerId) return;
        orbit.vel = Math.max(-720, Math.min(720, d.v)); orbit.drag = null; orbit.el.classList.remove('grabbing');
      }
      chip.addEventListener('pointerup', end); chip.addEventListener('pointercancel', end);
    });
  }
  function orbitStep(now) {
    if (!orbit.el) return;
    var dt = Math.min(.05, (now - (orbit.last || now)) / 1000); orbit.last = now;
    if (!orbit.drag) {
      var target = orbit.hover > 0 ? 0 : orbit.base;
      orbit.vel += (target - orbit.vel) * Math.min(1, dt * (orbit.hover > 0 ? 7 : 1.4));   // stops quickly, speeds up gently
      orbit.th += orbit.vel * dt;
    }
    orbit.el.style.setProperty('--th', (orbit.th % 360).toFixed(2) + 'deg');
  }

  /* ------------------------------------------------------------ icon floats under the pointer (only while over the icon) */
  function initPeek() {
    if (!fine || calm) return;
    var peek = document.createElement('div'); peek.id = 'peek'; peek.setAttribute('aria-hidden', 'true');
    var img = document.createElement('img'); img.alt = ''; peek.appendChild(img); document.body.appendChild(peek);
    var x = 0, y = 0, px = 0, vx = 0, on = false, cur = null, sc = .5;
    (function loop() {
      requestAnimationFrame(loop);
      vx += ((x - px) * .6 - vx) * .2; px = x;
      var rot = Math.max(-18, Math.min(18, vx * .9)); sc += ((on ? 1 : .5) - sc) * .22;
      peek.style.transform = 'translate(' + (x + 22) + 'px,' + (y - 90) + 'px) rotate(' + rot + 'deg) scale(' + sc + ')';
    })();
    addEventListener('scroll', function () { on = false; cur = null; peek.classList.remove('on'); }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { on = false; peek.classList.remove('on'); });
    document.addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY;
      var ic = e.target.closest && e.target.closest('.app-icon');
      if (ic) { if (ic !== cur) { cur = ic; img.src = ic.src; } on = true; peek.classList.add('on'); }
      else { on = false; cur = null; peek.classList.remove('on'); }
    }, { passive: true });
  }

  /* ------------------------------------------------------------ sound: OFF by default, tiny synthesized sounds, no files */
  var sfx = { on: false, ctx: null, master: null, last: {}, scrollAcc: 0, lastY: 0 };
  function sfxCtx() {
    if (sfx.ctx) return sfx.ctx;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    sfx.ctx = new AC(); sfx.master = sfx.ctx.createGain(); sfx.master.gain.value = .55; sfx.master.connect(sfx.ctx.destination);
    return sfx.ctx;
  }
  function tone(f, d, type, v, to, delay) {
    var c = sfx.ctx; if (!c) return;
    var t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(sfx.master); o.start(t); o.stop(t + d + .02);
  }
  function whoosh() {
    var c = sfx.ctx; if (!c) return;
    var n = c.sampleRate * .35, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = c.createBufferSource(); s.buffer = b;
    var fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 1.4; fl.frequency.setValueAtTime(300, c.currentTime); fl.frequency.exponentialRampToValueAtTime(2200, c.currentTime + .32);
    var g = c.createGain(); g.gain.setValueAtTime(.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(.09, c.currentTime + .08); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + .34);
    s.connect(fl); fl.connect(g); g.connect(sfx.master); s.start();
  }
  function play(name) {
    if (!sfx.on || !sfx.ctx) return;
    var now = performance.now(), gap = { hover: 90, tick: 120, enter: 400 }[name] || 40;
    if (sfx.last[name] && now - sfx.last[name] < gap) return; sfx.last[name] = now;
    if (sfx.ctx.state === 'suspended') sfx.ctx.resume();
    if (name === 'click') tone(660, .09, 'triangle', .2, 330);
    else if (name === 'hover') tone(1250, .04, 'sine', .05);
    else if (name === 'tick') tone(880, .03, 'square', .02);
    else if (name === 'switch') { tone(523, .12, 'sine', .16); tone(784, .18, 'sine', .16, 0, .09); }
    else if (name === 'on') { tone(440, .12, 'sine', .15); tone(554, .12, 'sine', .15, 0, .08); tone(659, .2, 'sine', .15, 0, .16); }
    else if (name === 'enter') whoosh();
  }
  function initSound() {
    var btn = document.getElementById('sound-toggle'); if (!btn) return;
    function paint() { btn.classList.toggle('sound-on', sfx.on); btn.setAttribute('aria-pressed', sfx.on ? 'true' : 'false'); }
    var stored = null; try { stored = localStorage.getItem('sound'); } catch (e) {}
    sfx.on = stored !== '0';                 // ON by default; the visitor can mute with the speaker button (remembered)
    paint();
    function unlock() {                      // browsers only allow audio after a first click / tap / key press
      if (sfx.on) { sfxCtx(); if (sfx.ctx && sfx.ctx.state === 'suspended') sfx.ctx.resume(); }
      ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { document.removeEventListener(ev, unlock, true); });
    }
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, unlock, true); });
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      sfx.on = !sfx.on; paint();
      try { localStorage.setItem('sound', sfx.on ? '1' : '0'); } catch (er) {}
      if (sfx.on) { sfxCtx(); if (sfx.ctx && sfx.ctx.state === 'suspended') sfx.ctx.resume(); play('on'); }
    });
    document.addEventListener('click', function (e) {
      if (!sfx.on || e.target.closest('#sound-toggle')) return;
      if (e.target.closest('.lang-btn')) play('switch'); else if (e.target.closest('a, button, .chip')) play('click');
    });
    document.addEventListener('pointerover', function (e) {
      if (!sfx.on) return;
      var t = e.target.closest && e.target.closest('.app-card, .store-tile, .chip, .btn, .cta a, .lang-btn, .links a');
      if (t && !t.contains(e.relatedTarget)) play('hover');
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { play('enter'); io.unobserve(e.target); } }); }, { threshold: .35 });
      [].forEach.call(document.querySelectorAll('.bio, .store-tiles, #apps-filter, #privacy-policy, #contact'), function (n) { io.observe(n); });
    }
  }

  /* ------------------------------------------------------------ public hook, called after every language switch */
  window.fxAfterLang = function () { runSplit(); };

  /* ------------------------------------------------------------ start */
  function start() {
    boot();
    runSplit();
    if (calm) return;                       // reduced motion: static page, no loops
    initGL(); initNet();
    initPeek(); initSound(); initOrbit();
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    document.addEventListener('pointerdown', function (e) { clickT.x = e.clientX / innerWidth; clickT.y = e.clientY / innerHeight; clickT.t = 0; }, { passive: true });   // the ripple under the mouse
    addEventListener('resize', function () { resizeGL(); if (net) sizeNet(); });
    var nm = document.querySelector('.hero h1 .grad-text'); if (nm) nm.addEventListener('pointerenter', function () { scramble(nm); });
    requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
