/* Draws the app cards and the privacy box from the data embedded in index.html (apps.json).
   Same markup as sitecore.render_card (which is the no-JavaScript fallback in Arabic).
   Called by the page's language switch:  window.renderApps('ar' | 'en')  */
(function () {
  'use strict';
  var el = document.getElementById('apps-data');
  if (!el) return;
  var data;
  try { data = JSON.parse(el.textContent); } catch (e) { return; }

  var STORES = ['google_play', 'microsoft', 'amazon', 'website'];

  function pick(obj, lang) {
    obj = obj || {};
    if (obj[lang]) return obj[lang];
    if (obj.en) return obj.en;
    if (obj.ar) return obj.ar;
    for (var k in obj) { if (obj[k]) return obj[k]; }
    return '';
  }
  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (/^[a-z][a-z0-9+.\-]*:/i.test(u)) return '';
    return u;
  }
  function node(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function field(label, value) {
    var p = node('p');
    p.appendChild(node('strong', null, label));
    p.appendChild(document.createTextNode(': ' + value));
    return p;
  }

  function card(app, lang) {
    var lab = (data.labels && (data.labels[lang] || data.labels.en)) || {};
    var name = pick(app.name, lang), desc = pick(app.desc, lang);
    var links = [];
    STORES.forEach(function (k) { var u = safeUrl((app.links || {})[k]); if (u) links.push([k, u]); });
    var c = node('div', { 'class': 'app-card', 'data-id': app.id });
    var icon = safeUrl(app.icon);
    if (icon) c.appendChild(node('img', { src: icon, alt: name, 'class': 'app-icon' }));
    var h = node('h3');
    if (links.length) {
      h.appendChild(node('a', { href: links[0][1], target: '_blank', rel: 'noopener' }, name));
    } else { h.textContent = name; }
    c.appendChild(h);
    if (desc) c.appendChild(node('p', null, desc));
    c.appendChild(field(lab.developer || 'Developer', data.developer || ''));
    [['updated', 'updated'], ['age', 'age'], ['platform', 'platform']].forEach(function (pair) {
      var v = String(app[pair[1]] || '').trim();
      if (v) c.appendChild(field(lab[pair[0]] || pair[0], v));
    });
    links.forEach(function (l) {
      c.appendChild(node('a', { 'class': 'btn', href: l[1], target: '_blank', rel: 'noopener' }, lab[l[0]] || l[0]));
    });
    return c;
  }

  var filter = 'all';

  function tile(x, lang, lab) {
    var t = node('a', { 'class': 'store-tile', 'data-kind': x.id, href: safeUrl(x.url), target: '_blank', rel: 'noopener' });
    t.appendChild(node('span', { 'class': 'store-icon' }, x.icon || ''));
    t.appendChild(node('span', { 'class': 'store-title' }, pick(x.title, lang)));
    t.appendChild(node('span', { 'class': 'store-text' }, pick(x.text, lang)));
    t.appendChild(node('span', { 'class': 'store-open' }, lab.open_store || ''));
    return t;
  }

  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function render(lang) {
    var lab = (data.labels && (data.labels[lang] || data.labels.en)) || {};
    var about = document.getElementById('about');
    var wrap = about && about.querySelector('.store-tiles');
    if (wrap) {
      clear(wrap);
      (data.stores || []).forEach(function (x) { wrap.appendChild(tile(x, lang, lab)); });
      var st = about.querySelector('.stores-title');
      if (st) st.textContent = lab.stores_title || '';
    }
    var apps = data.apps || [];
    var kinds = ['android', 'windows', 'amazon'].filter(function (k) {
      return apps.some(function (a) { return (a.kinds || []).indexOf(k) >= 0; });
    });
    if (kinds.indexOf(filter) < 0) filter = 'all';
    var bar = document.getElementById('apps-filter');
    if (bar) {
      clear(bar);
      if (kinds.length > 1) {
        [['all', lab.all || 'All']].concat(kinds.map(function (k) { return [k, pick((data.kind_titles || {})[k], lang) || k]; }))
          .forEach(function (c) {
            var b = node('button', { type: 'button', 'class': 'chip' + (c[0] === filter ? ' active' : '') }, c[1]);
            b.addEventListener('click', function () { filter = c[0]; render(document.documentElement.lang === 'en' || document.documentElement.lang === 'de' ? document.documentElement.lang : 'ar'); });
            bar.appendChild(b);
          });
      }
    }
    var grid = document.querySelector('#apps .apps-grid');
    if (grid) {
      clear(grid);
      apps.filter(function (a) { return filter === 'all' || (a.kinds || []).indexOf(filter) >= 0; })
        .forEach(function (a) { grid.appendChild(card(a, lang)); });
    }
    var p = data.policy || {}, box = document.getElementById('privacy-policy');
    if (box) {
      var h2 = box.querySelector('h2'), t = box.querySelector('.policy-text'), b = box.querySelector('.policy-link');
      if (h2) h2.textContent = pick(p.title, lang);
      if (t) t.textContent = pick(p.text, lang);
      if (b) b.textContent = pick(p.button, lang);
    }
  }

  window.renderApps = render;
  var dl = document.documentElement.lang;
  var lang = (dl === 'en' || dl === 'de') ? dl : 'ar';
  render(lang);
})();
