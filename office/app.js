// Agiza Office app: data, sign-in, the four pages (Home, Diary, Clients, To-dos), forms, reminders and install.
// assistant.js adds the helper, mood line, celebrations and news through window.AgizaOffice.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id) };
  var cfg = window.AGIZA_OFFICE || {};
  var CHEER = window.AGIZA_CHEER || {};
  var DEMO = !(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  // Read before the client clears the address: did she arrive from a password-reset email?
  var recovering = /type=recovery/.test(location.hash);
  var sb = DEMO ? null : window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TABLES = ['clients', 'meetings', 'quotes', 'todos'];
  var data = { clients: [], meetings: [], quotes: [], todos: [] };
  var userId = null;

  /* ---------- small helpers ---------- */
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function pad(n) { return (n < 10 ? '0' : '') + n }
  function dayStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
  function todayStr() { return dayStr(new Date()) }
  function hm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()) }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x }
  function money(n) { return n == null || n === '' ? '' : Number(n).toLocaleString('en-KE', { maximumFractionDigits: 0 }) }
  function shortDate(s) { if (!s) return ''; var d = new Date(s + (s.length === 10 ? 'T00:00' : '')); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
  function daysAgo(s) { return Math.round((new Date(todayStr() + 'T00:00') - new Date(s + 'T00:00')) / 864e5) }
  function first(name) { return String(name || '').split(/\s+/)[0] }
  function icon(id) { return '<svg class="i" aria-hidden="true"><use href="#i-' + id + '"/></svg>' }
  function waLink(phone, text) {
    var d = String(phone || '').replace(/\D/g, '');
    if (!d) return '';
    if (d[0] === '0') d = '254' + d.slice(1);
    else if (d.length === 9) d = '254' + d;
    return 'https://wa.me/' + d + (text ? '?text=' + encodeURIComponent(text) : '');
  }
  function waText(kind, name) { var t = (CHEER.whatsapp || {})[kind]; return t ? t.replace('{name}', first(name)) : '' }
  function clientNamed(name) {
    var n = String(name || '').toLowerCase().trim();
    return data.clients.filter(function (c) { return c.name && c.name.toLowerCase().trim() === n })[0] ||
      data.clients.filter(function (c) { return c.name && first(c.name).toLowerCase() === first(n) })[0];
  }
  var toastTimer;
  function toast(msg, bad) {
    var t = $('toast'); t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true }, bad ? 6000 : 2500);
  }
  function friendly(err) {
    var m = (err && (err.message || err.error_description)) || String(err);
    if (/signups not allowed|user not found/i.test(m)) return "That email can't sign in to this office.";
    if (/rate limit|too many|security purposes/i.test(m)) return 'Too many tries. Wait a few minutes, then try again.';
    if (/invalid login credentials/i.test(m)) return 'Wrong email or password.';
    if (/expired|invalid/i.test(m) && /token|otp|link/i.test(m)) return 'That reset link has expired. Request a new one.';
    if (/should be different/i.test(m)) return 'Choose a password different from your old one.';
    if (/fetch|network/i.test(m)) return 'No internet connection. Check your data or Wi-Fi.';
    return m;
  }
  function emit(type, detail) { document.dispatchEvent(new CustomEvent('agiza:' + type, { detail: detail || {} })) }

  /* ---------- data layer: Supabase, or in-memory sample data in the preview ---------- */
  var api = DEMO ? demoApi() : {
    list: function (t) {
      return sb.from(t).select('*').order('created_at', { ascending: false }).limit(1000)
        .then(function (r) { if (r.error) throw r.error; return r.data });
    },
    insert: function (t, row) { return sb.from(t).insert(row).then(function (r) { if (r.error) throw r.error }) },
    update: function (t, id, row) { return sb.from(t).update(row).eq('id', id).then(function (r) { if (r.error) throw r.error }) },
    remove: function (t, id) { return sb.from(t).delete().eq('id', id).then(function (r) { if (r.error) throw r.error }) },
    upload: function (file) {
      var path = userId + '/' + Date.now() + '-' + file.name.replace(/[^\w.\-]+/g, '_').slice(-80);
      return sb.storage.from('quotes').upload(path, file, { contentType: 'application/pdf' })
        .then(function (r) { if (r.error) throw r.error; return path });
    },
    removeFile: function (path) { return path ? sb.storage.from('quotes').remove([path]) : Promise.resolve() },
    fileUrl: function (path) {
      return sb.storage.from('quotes').createSignedUrl(path, 300).then(function (r) { if (r.error) throw r.error; return r.data.signedUrl });
    }
  };

  // Sample data arranged around the current time, so the preview always has a "next" meeting.
  function demoApi() {
    var now = new Date(), seq = 0;
    function inMin(m) { var d = new Date(now.getTime() + m * 60000); d.setMinutes(Math.round(d.getMinutes() / 15) * 15, 0, 0); return d.toISOString() }
    function at(dayOffset, h, m) { var d = addDays(now, dayOffset); d.setHours(h, m || 0, 0, 0); return d.toISOString() }
    function day(off) { return dayStr(addDays(now, off)) }
    function id() { return 'demo-' + (++seq) }
    var db = {
      clients: [
        { name: 'Grace Wanjiku', phone: '0700000001', plan: 'Education', status: 'new', note: 'Met at church event' },
        { name: 'Kevin Achieng', phone: '0700000002', plan: 'Whole life cover', status: 'new', note: 'Referred by Brian' },
        { name: 'Brian Otieno', phone: '0700000003', plan: 'Whole life cover', status: 'quote', note: 'Wants to pay over 10 years' },
        { name: 'Lucy Wairimu', phone: '0700000007', plan: 'Savings & investment', status: 'quote' },
        { name: 'Mercy Kamau', phone: '0700000004', plan: 'Education', status: 'docs', note: 'Needs ID copy' },
        { name: 'Peter Mwangi', phone: '0700000005', plan: 'Whole life cover', status: 'done', covered_on: day(-3) },
        { name: 'Faith Njeri', phone: '0700000008', plan: 'Health', status: 'done', covered_on: day(-1) },
        { name: 'Esther Jeptoo', phone: '0700000006', plan: 'Education', status: 'done', covered_on: day(-40) }
      ],
      meetings: [
        { title: 'Faith Njeri', starts_at: inMin(-90), duration_min: 30, place: 'Java, Kimathi Street', kind: 'docs', note: 'Signed forms' },
        { title: 'Grace Wanjiku', starts_at: inMin(40), duration_min: 45, place: 'Sarit Centre café', kind: 'new', note: 'Education plan for 2 children' },
        { title: 'Brian Otieno', starts_at: inMin(180), duration_min: 30, place: 'WhatsApp call', kind: 'quote' },
        { title: 'Branch team meeting', starts_at: inMin(300), duration_min: 60, place: 'Upper Hill office', kind: 'office' },
        { title: 'Mercy Kamau', starts_at: at(1, 11), duration_min: 30, place: 'Westlands', kind: 'docs', note: 'Collect ID copy' },
        { title: 'Church fellowship talk', starts_at: at(2, 15), duration_min: 60, place: 'Parish hall', kind: 'event' },
        { title: 'Kevin Achieng', starts_at: at(4, 10, 30), duration_min: 30, place: 'Yaya Centre', kind: 'new' }
      ],
      quotes: [
        { client_name: 'Brian Otieno', plan: 'PRULife Whole Life', sum_assured: 3000000, premium_monthly: 2925, sent_on: day(-5), status: 'follow', next_step: 'Call after 2pm' },
        { client_name: 'Lucy Wairimu', plan: 'Savings & investment', sum_assured: 1500000, premium_monthly: 4500, sent_on: day(-2), status: 'waiting' },
        { client_name: 'Peter Mwangi', plan: 'PRULife Whole Life', sum_assured: 1000000, premium_monthly: 1240, sent_on: day(-20), status: 'accepted' },
        { client_name: 'Samuel Kiprop', plan: 'Health', sum_assured: 500000, premium_monthly: 1800, sent_on: day(-30), status: 'declined' }
      ],
      todos: [
        { text: 'Collect ID copy from Mercy', due: day(-1), done: false },
        { text: 'Send Brian the revised quote', due: day(0), remind_at: inMin(120), done: false },
        { text: 'Prepare education plan illustration for Grace', due: day(0), done: false },
        { text: 'Post a WhatsApp status about education plans', due: day(2), done: false },
        { text: 'Renew practising licence documents', done: false },
        { text: 'Call Peter about policy documents', due: day(-2), done: true }
      ]
    };
    // ?empty shows the office as it looks on her first day, before anything is added.
    if (/[?&]empty/.test(location.search)) TABLES.forEach(function (t) { db[t] = [] });
    TABLES.forEach(function (t) { db[t].forEach(function (r, i) { r.id = id(); r.created_at = new Date(now - i * 1000).toISOString() }) });
    var copy = function (x) { return JSON.parse(JSON.stringify(x)) };
    return {
      list: function (t) { return Promise.resolve(copy(db[t])) },
      insert: function (t, row) { row = copy(row); row.id = id(); row.created_at = new Date().toISOString(); db[t].unshift(row); return Promise.resolve() },
      update: function (t, rid, row) { db[t].forEach(function (r) { if (r.id === rid) Object.assign(r, copy(row)) }); return Promise.resolve() },
      remove: function (t, rid) { db[t] = db[t].filter(function (r) { return r.id !== rid }); return Promise.resolve() },
      upload: function (file) { return Promise.resolve('demo/' + file.name) },
      removeFile: function () { return Promise.resolve() },
      fileUrl: function () { return Promise.reject(new Error('PDFs are not stored in the preview.')) }
    };
  }

  function loadAll() {
    return Promise.all(TABLES.map(function (t) { return api.list(t).then(function (rows) { data[t] = rows }) }))
      .then(render)
      .catch(function (e) { toast(friendly(e), true) });
  }
  function reload(t) { return api.list(t).then(function (rows) { data[t] = rows; render() }) }

  /* ---------- what needs her: one list ranked by urgency ---------- */
  function openTodos() { return data.todos.filter(function (t) { return !t.done }) }
  function followUps() {
    return data.quotes.filter(function (q) { return q.status === 'waiting' || q.status === 'follow' })
      .sort(function (a, b) { return a.sent_on < b.sent_on ? -1 : 1 });
  }
  function needs() {
    var today = todayStr(), out = [];
    var open = openTodos();
    open.filter(function (t) { return t.due && t.due < today }).sort(function (a, b) { return a.due < b.due ? -1 : 1 })
      .forEach(function (t) { out.push({ kind: 'late', row: t }) });
    open.filter(function (t) { return t.due === today }).sort(function (a, b) { return (a.remind_at || '9') < (b.remind_at || '9') ? -1 : 1 })
      .forEach(function (t) { out.push({ kind: 'todo', row: t }) });
    followUps().filter(function (q) { return q.status === 'follow' || daysAgo(q.sent_on) >= 3 })
      .forEach(function (q) { out.push({ kind: 'quote', row: q }) });
    data.clients.filter(function (c) { return c.status === 'docs' }).forEach(function (c) { out.push({ kind: 'docs', row: c }) });
    data.clients.filter(function (c) { return c.status === 'new' }).forEach(function (c) { out.push({ kind: 'newc', row: c }) });
    return out;
  }
  function needRow(n) {
    var r = n.row, ic, main, sub, act, cls = '';
    if (n.kind === 'late' || n.kind === 'todo') {
      ic = n.kind === 'late' ? icon('alert') : icon('check');
      main = r.text;
      sub = n.kind === 'late' ? '<small class="red">Overdue · ' + esc(shortDate(r.due)) + '</small>'
        : '<small>Today' + (r.remind_at ? ' · 🔔 ' + esc(hm(new Date(r.remind_at))) : '') + '</small>';
      act = '<button type="button" class="act tick" data-tick="' + esc(r.id) + '" aria-label="Mark done">' + icon('tick') + '</button>';
      if (n.kind === 'late') cls = ' urgent';
      return '<div class="need rv' + cls + '"><span class="ic ic-' + n.kind + '">' + ic + '</span><div data-edit="todos" data-id="' + esc(r.id) + '"><b>' + esc(main) + '</b>' + sub + '</div>' + act + '</div>';
    }
    var person = n.kind === 'quote' ? r.client_name : r.name;
    var c = n.kind === 'quote' ? clientNamed(person) : r;
    var table = n.kind === 'quote' ? 'quotes' : 'clients';
    if (n.kind === 'quote') {
      ic = icon('doc'); main = 'Follow up with ' + first(person);
      var d = daysAgo(r.sent_on);
      sub = '<small>Quote sent ' + (d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago') + (r.premium_monthly ? ' · KES ' + money(r.premium_monthly) + '/mo' : '') + '</small>';
    } else if (n.kind === 'docs') {
      ic = icon('folder'); main = 'Documents from ' + first(person); sub = '<small>Waiting for documents</small>';
    } else {
      ic = icon('user'); main = 'Say hello to ' + first(person); sub = '<small>New client' + (r.plan ? ' · ' + esc(r.plan) : '') + '</small>';
    }
    var wa = c && waLink(c.phone, waText(n.kind === 'quote' ? 'followup' : n.kind === 'docs' ? 'docs' : 'hello', person));
    act = wa ? '<a class="act wa" href="' + esc(wa) + '" target="_blank" rel="noopener" aria-label="WhatsApp ' + esc(first(person)) + '">' + icon('wa') + '<span>WhatsApp</span></a>'
      : '<button type="button" class="act" data-edit="' + table + '" data-id="' + esc(r.id) + '">Open</button>';
    return '<div class="need rv"><span class="ic ic-' + n.kind + '">' + ic + '</span><div data-edit="' + table + '" data-id="' + esc(r.id) + '"><b>' + esc(main) + '</b>' + sub + '</div>' + act + '</div>';
  }

  /* ---------- rendering ---------- */
  var showAllNeeds = false, diaryMode = 'today', clientSeg = 'people', clientFilter = 'pending', clientQuery = '', showDone = false;
  var KIND = { new: 'First chat', quote: 'Quote', docs: 'Documents', office: 'Office', event: 'Event' };
  var STATUS = { new: 'New', quote: 'Quote sent', docs: 'Documents', done: 'Covered' };

  function render() {
    renderHome(); renderDiary(); renderClients(); renderTodos();
    emit('render');
  }

  function renderHome() {
    var now = new Date(), h = now.getHours();
    $('hGreet').textContent = (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ', Agiza';
    $('hDate').textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    renderNext();
    renderStart();
    updateNudge();

    var list = needs(), shown = showAllNeeds ? list : list.slice(0, 5);
    $('needN').textContent = list.length;
    $('needN').hidden = !list.length;
    $('needList').innerHTML = shown.map(needRow).join('') +
      (list.length > 5 ? '<button type="button" class="showall" id="needMore">' + (showAllNeeds ? 'Show less' : 'Show all ' + list.length) + '</button>' : '') ||
      (isEmpty() ? '<div class="calm"><b>Your office is ready ✨</b>Add your first clients and plans, and what needs you will show up here.' +
        '<span class="calm-acts"><button type="button" class="act" data-new="clients">Add a client</button>' + (CONTACTS ? '<button type="button" class="act" data-import>From contacts</button>' : '') + '</span></div>'
        : '<div class="calm"><b>All caught up 🌿</b>Nothing is waiting on you. Enjoy the calm.</div>');
    var hb = $('homeBadge'); hb.textContent = list.length; hb.hidden = !list.length || current === 'home';

    var month = todayStr().slice(0, 7);
    var todays = meetingsOn(now).length;
    var fu = followUps().length;
    var covered = data.clients.filter(function (c) { return c.status === 'done' && (c.covered_on || '').slice(0, 7) === month }).length;
    var monthName = now.toLocaleDateString('en-GB', { month: 'long' });
    $('pulse').hidden = isEmpty();
    $('pulse').innerHTML =
      '<a class="tile t-meet" href="#diary"><b data-count="' + todays + '">' + todays + '</b><span>' + (todays === 1 ? 'meeting' : 'meetings') + ' today</span></a>' +
      '<a class="tile t-quote" href="#clients/quotes"><b data-count="' + fu + '">' + fu + '</b><span>' + (fu === 1 ? 'quote' : 'quotes') + ' waiting</span></a>' +
      '<a class="tile t-todo" href="#clients/done"><b data-count="' + covered + '">' + covered + '</b><span>covered in ' + esc(monthName) + '</span></a>';
  }

  function meetingsOn(day) {
    var key = dayStr(day);
    return data.meetings.filter(function (m) { return dayStr(new Date(m.starts_at)) === key })
      .sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1 });
  }
  function until(ms) {
    var m = Math.round(ms / 60000);
    if (m < 1) return 'now';
    if (m < 60) return 'in ' + m + ' min';
    var h = Math.floor(m / 60), r = m % 60;
    return 'in ' + h + ' h' + (r ? ' ' + r + ' min' : '');
  }
  // The dark card: the meeting happening now or next, with WhatsApp and directions.
  function renderNext() {
    var now = Date.now(), today = meetingsOn(new Date());
    var end = function (m) { return new Date(m.starts_at).getTime() + (m.duration_min || 30) * 60000 };
    var live = today.filter(function (m) { return new Date(m.starts_at).getTime() <= now && end(m) > now })[0];
    var next = live || today.filter(function (m) { return new Date(m.starts_at).getTime() > now })[0];
    var line = today.length ? '<div class="dayline" aria-hidden="true">' + today.map(function (m) {
      var s = new Date(m.starts_at).getTime();
      return '<i class="' + (end(m) <= now ? 'done' : s <= now ? 'now' : '') + '"></i>';
    }).join('') + '</div>' : '';
    if (!next) {
      var tm = meetingsOn(addDays(new Date(), 1))[0];
      $('nextCard').innerHTML = '<p class="lbl">Today</p><p class="empty-next">' +
        (today.length ? 'That was your last meeting today. Well done.' : isEmpty() ? 'Your diary is wide open. Plan your first meeting.' : 'No meetings today. A good day for follow-ups.') + '</p>' +
        (tm ? '<p class="after">Tomorrow ' + esc(hm(new Date(tm.starts_at))) + ' · ' + esc(tm.title) + '</p>' : '') +
        '<div class="acts"><button type="button" data-new="meetings">' + icon('plus') + 'Plan a meeting</button></div>' + line;
      return;
    }
    var start = new Date(next.starts_at), c = clientNamed(next.title);
    var callish = /whatsapp|call|zoom|phone|online|meet\.google/i.test(next.place || '');
    var acts = '';
    if (c && c.phone) acts += '<a href="' + esc(waLink(c.phone)) + '" target="_blank" rel="noopener">' + icon('wa') + 'WhatsApp</a>';
    if (next.place && !callish) acts += '<a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(next.place) + '" target="_blank" rel="noopener">' + icon('pin') + 'Directions</a>';
    $('nextCard').innerHTML =
      '<p class="lbl"><span class="live"></span>' + (live ? 'Now · ends ' + esc(hm(new Date(end(next)))) : 'Next up · ' + esc(until(start - now))) +
      '<button type="button" class="det" data-edit="meetings" data-id="' + esc(next.id) + '">Details ›</button></p>' +
      '<div class="row" data-edit="meetings" data-id="' + esc(next.id) + '"><span class="big">' + esc(hm(start)) + '</span><div><p class="who">' + esc(next.title) + '</p>' +
      (next.place ? '<p class="where">' + esc(next.place) + '</p>' : '') + '</div></div>' +
      '<div class="acts">' + acts + '</div>' + line;
  }
  setInterval(function () { if (current === 'home' && !$('office').hidden) renderNext() }, 30000);

  function renderDiary() {
    var now = new Date(), html = '';
    var days = diaryMode === 'today' ? [now] : Array.apply(null, Array(14)).map(function (_, i) { return addDays(now, i) });
    days.forEach(function (d, i) {
      var ms = meetingsOn(d);
      if (!ms.length) return;
      var label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'long' });
      html += '<p class="day-h rv">' + label + ' <small>' + esc(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) + '</small></p>';
      html += ms.map(function (m) {
        var s = new Date(m.starts_at), e = s.getTime() + (m.duration_min || 30) * 60000;
        var state = e < Date.now() ? ' past' : s.getTime() <= Date.now() ? ' live' : '';
        var dur = m.duration_min >= 60 ? (m.duration_min / 60) + ' hr' : (m.duration_min || 30) + ' min';
        return '<div class="slot rv"><p class="t">' + esc(hm(s)) + '<small>' + dur + '</small></p>' +
          '<div class="mcard k-' + esc(m.kind) + state + '" data-edit="meetings" data-id="' + esc(m.id) + '"><b>' + esc(m.title) + '</b>' +
          '<div class="row"><span class="pill ' + (state === ' past' ? 'past' : esc(m.kind)) + '">' + (state === ' past' ? 'Done' : esc(KIND[m.kind] || m.kind)) + '</span>' +
          (m.place ? '<p>' + esc(m.place) + '</p>' : '') + '</div>' + (m.note ? '<p>' + esc(m.note) + '</p>' : '') + '</div></div>';
      }).join('');
    });
    $('diaryList').innerHTML = html || '<div class="stack rv"><div class="calm"><b>' + (diaryMode === 'today' ? 'A clear day' : 'Nothing booked yet') +
      '</b>Tap + to add a meeting, or ask the assistant.</div></div>';
  }

  function renderClients() {
    $('clientSeg').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cs === clientSeg)) });
    $('peopleBox').hidden = clientSeg !== 'people';
    $('cImport').hidden = !CONTACTS;
    $('quotesBox').hidden = clientSeg !== 'quotes';
    $('cAdd').dataset.new = clientSeg === 'people' ? 'clients' : 'quotes';
    $('cAdd').setAttribute('aria-label', clientSeg === 'people' ? 'Add a client' : 'Add a quote');

    var counts = { pending: 0, new: 0, quote: 0, docs: 0, done: 0 };
    data.clients.forEach(function (c) { counts[c.status]++; if (c.status !== 'done') counts.pending++ });
    var chips = [['pending', 'In progress', 'var(--soft)'], ['new', 'New', 'var(--c-new)'], ['quote', 'Quote sent', 'var(--c-quote)'], ['docs', 'Documents', 'var(--c-docs)'], ['done', 'Covered', 'var(--c-todo)']];
    $('cChips').innerHTML = chips.map(function (c) {
      return '<button type="button" data-f="' + c[0] + '" aria-pressed="' + (clientFilter === c[0]) + '"><span class="dot" style="--d:' + c[2] + '"></span>' + c[1] + ' · ' + counts[c[0]] + '</button>';
    }).join('');
    var q = clientQuery.toLowerCase();
    var rows = data.clients.filter(function (c) { return clientFilter === 'pending' ? c.status !== 'done' : c.status === clientFilter })
      .filter(function (c) { return !q || [c.name, c.plan, c.note, c.phone].join(' ').toLowerCase().indexOf(q) !== -1 })
      .sort(function (a, b) { return a.name < b.name ? -1 : 1 });
    $('peopleList').innerHTML = rows.map(function (c) {
      var wa = waLink(c.phone);
      var sub = [c.plan, c.status === 'done' && c.covered_on ? 'covered ' + shortDate(c.covered_on) : c.note].filter(Boolean).map(esc).join(' · ');
      return '<div class="person rv" data-edit="clients" data-id="' + esc(c.id) + '"><span class="av ' + esc(c.status) + '">' + esc((c.name || '?').charAt(0).toUpperCase()) + '</span>' +
        '<div><b>' + esc(c.name) + '</b><small><span class="st st-' + esc(c.status) + '">' + esc(STATUS[c.status]) + '</span>' + (sub ? ' · ' + sub : '') + '</small></div>' +
        (wa ? '<a class="wa-ic" href="' + esc(wa) + '" target="_blank" rel="noopener" aria-label="WhatsApp ' + esc(c.name) + '">' + icon('wa') + '</a>' : '<span></span>') + '</div>';
    }).join('') || '<div class="calm"><b>' + (q ? 'No match' : 'No one here yet') + '</b>' + (q ? 'Try another name or plan.' : 'Tap + to add a client.') + '</div>';

    var month = todayStr().slice(0, 7);
    var waiting = followUps(), accepted = data.quotes.filter(function (x) { return x.status === 'accepted' });
    var acceptedMonth = accepted.filter(function (x) { return (x.sent_on || '').slice(0, 7) === month || (x.created_at || '').slice(0, 7) === month });
    var waitTotal = waiting.reduce(function (s, x) { return s + (Number(x.premium_monthly) || 0) }, 0);
    var groups = [['follow', 'Follow up', true], ['waiting', 'Waiting for reply', true], ['accepted', 'Accepted', false], ['declined', 'Declined', false]];
    $('quotesBox').innerHTML = '<div class="pulse qsum rv" style="grid-template-columns:1fr 1fr">' +
      '<div class="tile t-quote"><b>' + waiting.length + '</b><span>waiting · KES ' + money(waitTotal) + '/mo</span></div>' +
      '<div class="tile t-todo"><b>' + acceptedMonth.length + '</b><span>accepted this month</span></div></div>' +
      groups.map(function (g) {
        var qs = data.quotes.filter(function (x) { return x.status === g[0] }).sort(function (a, b) { return a.sent_on < b.sent_on ? 1 : -1 });
        if (!qs.length) return '';
        return '<details class="qgroup rv"' + (g[2] ? ' open' : '') + '><summary>' + g[1] + ' <small>' + qs.length + '</small></summary><div class="stack">' + qs.map(function (x) {
          var d = daysAgo(x.sent_on);
          var sub = [x.plan, x.sum_assured ? 'KES ' + money(x.sum_assured) + ' cover' : '', d <= 0 ? 'sent today' : 'sent ' + (d === 1 ? 'yesterday' : d + ' days ago')].filter(Boolean).map(esc).join(' · ');
          return '<div class="quote" data-edit="quotes" data-id="' + esc(x.id) + '"><b>' + esc(x.client_name) + '</b><div class="amt">' +
            (x.premium_monthly != null ? money(x.premium_monthly) + '<small>KES / month</small>' : '') + '</div><small>' + sub +
            (x.pdf_path ? ' · <button type="button" class="pdf" data-pdf="' + esc(x.pdf_path) + '">PDF</button>' : '') + '</small></div>';
        }).join('') + '</div></details>';
      }).join('') + (data.quotes.length ? '' : '<div class="stack"><div class="calm"><b>No quotes yet</b>Tap + when you send a Prudential quote.</div></div>');
  }

  function todoRow(t) {
    var today = todayStr(), meta = [];
    if (t.due) meta.push(t.due < today && !t.done ? '<span style="color:var(--c-urgent)">Overdue · ' + esc(shortDate(t.due)) + '</span>' : t.due === today ? 'Today' : esc(shortDate(t.due)));
    if (t.remind_at && !t.done) meta.push('🔔 ' + esc(hm(new Date(t.remind_at))));
    return '<div class="todo rv' + (t.done ? ' done' : '') + '"><button type="button" class="act tick" data-' + (t.done ? 'untick' : 'tick') + '="' + esc(t.id) + '" aria-label="' + (t.done ? 'Mark not done' : 'Mark done') + '">' + icon('tick') + '</button>' +
      '<div data-edit="todos" data-id="' + esc(t.id) + '"><b>' + esc(t.text) + '</b>' + (meta.length ? '<small>' + meta.join(' · ') + '</small>' : '') + '</div></div>';
  }
  function renderTodos() {
    var today = todayStr(), open = openTodos(), done = data.todos.filter(function (t) { return t.done });
    var byDue = function (a, b) { return (a.due || '9') + (a.remind_at || '') < (b.due || '9') + (b.remind_at || '') ? -1 : 1 };
    var groups = [
      ['Overdue', open.filter(function (t) { return t.due && t.due < today }), true],
      ['Today', open.filter(function (t) { return t.due === today })],
      ['Coming up', open.filter(function (t) { return t.due && t.due > today })],
      ['Someday', open.filter(function (t) { return !t.due })]
    ];
    $('tCount').textContent = open.length ? ' · ' + open.length + ' open' : '';
    var html = groups.map(function (g) {
      if (!g[1].length) return '';
      return '<p class="grp-h rv' + (g[2] ? ' red' : '') + '">' + g[0] + '</p><div class="stack">' + g[1].sort(byDue).map(todoRow).join('') + '</div>';
    }).join('');
    if (!open.length) html = '<div class="stack rv"><div class="calm"><b>Nothing to do 🌿</b>Add one above, or say "Remind me to…" to the assistant.</div></div>';
    if (done.length) html += '<button type="button" class="donebtn" id="doneToggle">' + (showDone ? 'Hide finished' : 'Show ' + done.length + ' finished') + '</button>' +
      (showDone ? '<div class="stack">' + done.map(todoRow).join('') + '</div>' : '');
    $('todoGroups').innerHTML = html;
  }

  /* ---------- first day: welcome, "Get started" steps, import from phone contacts ---------- */
  function isEmpty() { return !TABLES.some(function (t) { return data[t].length }) }
  // Small per-phone memory (which steps she has seen); the office works the same without it.
  function remember(k, v) { try { if (v === undefined) return localStorage.getItem('agiza-' + k); localStorage.setItem('agiza-' + k, v) } catch (_) { return null } }
  var CONTACTS = 'contacts' in navigator && 'ContactsManager' in window;
  var STEPS = [
    { k: 'client', t: 'Add your first clients', d: 'Type them in, or pick them from your phone contacts.', done: function () { return data.clients.length > 0 },
      acts: function () { return '<button type="button" class="act" data-new="clients">Add</button>' + (CONTACTS ? '<button type="button" class="act" data-import>From contacts</button>' : '') } },
    { k: 'plan', t: 'Plan a meeting or a to-do', d: 'Your next meeting will appear in the dark card above.', done: function () { return data.meetings.length + data.todos.length > 0 },
      acts: function () { return '<button type="button" class="act" data-new="meetings">Meeting</button><button type="button" class="act" data-new="todos">To-do</button>' } },
    { k: 'remind', t: 'Turn on phone reminders', d: 'A buzz before meetings and at to-do times.', done: function () { return remindersOn || (!DEMO && !PUSH) },
      acts: function () { return '<button type="button" class="act" data-more>Turn on</button>' } },
    { k: 'ask', t: 'Say hi to Ask Agiza', d: 'Try: "Remind me to call Grace tomorrow at 10".', done: function () { return remember('asked') === '1' },
      acts: function () { return '<button type="button" class="act" data-ask>Try it</button>' } }
  ];
  // The reminders nudge shows only once the Get started card (which has the same step) is gone.
  function updateNudge() { $('nudge').hidden = DEMO || remindersOn || !PUSH || Notification.permission === 'denied' || !$('start').hidden }
  function renderStart() {
    var box = $('start');
    if (remember('start-done') === '1') { box.hidden = true; return }
    var n = STEPS.filter(function (st) { return st.done() }).length;
    if (n === STEPS.length) {
      box.hidden = true;
      remember('start-done', '1');
      if (box.dataset.shown && window.AgizaAssistant && AgizaAssistant.celebrate) AgizaAssistant.celebrate('✨ Your office is all set, Agiza. Enjoy it!');
      return;
    }
    box.hidden = false; box.dataset.shown = '1';
    $('startRing').style.setProperty('--p', n / STEPS.length);
    $('startRing').textContent = n + '/' + STEPS.length;
    $('steps').innerHTML = STEPS.map(function (st) {
      var ok = st.done();
      return '<li class="' + (ok ? 'ok' : '') + '"><span class="bul">' + (ok ? icon('tick') : '') + '</span><div><b>' + st.t + '</b>' +
        (ok ? '' : '<small>' + st.d + '</small><span class="sacts">' + st.acts() + '</span>') + '</div></li>';
    }).join('');
  }
  $('startX').addEventListener('click', function () { remember('start-done', '1'); $('start').hidden = true; updateNudge() });

  // Pick several people from the phone's contacts and add them as new clients in one go.
  function importContacts() {
    navigator.contacts.select(['name', 'tel'], { multiple: true }).then(function (picked) {
      var have = {};
      data.clients.forEach(function (c) { have[(c.name || '').toLowerCase()] = 1; if (c.phone) have[String(c.phone).replace(/\D/g, '').slice(-9)] = 1 });
      var rows = (picked || []).map(function (p) {
        return { name: ((p.name && p.name[0]) || '').trim().slice(0, 120), phone: ((p.tel && p.tel[0]) || '').replace(/[^\d+]/g, '').slice(0, 30) || null, status: 'new' };
      }).filter(function (r) { return r.name && !have[r.name.toLowerCase()] && !(r.phone && have[r.phone.replace(/\D/g, '').slice(-9)]) });
      if (!rows.length) return toast(picked && picked.length ? 'Those contacts are already in your office.' : 'No contacts picked.');
      return rows.reduce(function (chain, r) { return chain.then(function () { return api.insert('clients', r) }) }, Promise.resolve())
        .then(function () { return reload('clients') })
        .then(function () { toast('Added ' + rows.length + (rows.length === 1 ? ' client' : ' clients') + ' ✨') });
    }).catch(function (e) { if (e && e.name !== 'AbortError') toast(friendly(e), true) });
  }

  // The first time she opens her office on a phone: a small welcome moment.
  function welcome() {
    if (remember('welcomed') === '1') return;
    remember('welcomed', '1');
    setTimeout(function () { if (window.AgizaAssistant && AgizaAssistant.celebrate) AgizaAssistant.celebrate('Karibu, Agiza! 🌸 Your office is ready.') }, 700);
  }

  /* ---------- pages: routing, sliding transitions, cards rising in turn ---------- */
  var VIEWS = ['home', 'diary', 'clients', 'todos'];
  var current = null;
  function parseHash() {
    var h = location.hash.replace(/^#/, '').split('/');
    return { view: VIEWS.indexOf(h[0]) !== -1 ? h[0] : 'home', sub: h[1] || '' };
  }
  function route() {
    var r = parseHash();
    if (r.view === 'clients' && r.sub) {
      if (r.sub === 'quotes') clientSeg = 'quotes';
      else { clientSeg = 'people'; clientFilter = r.sub }
      renderClients();
    }
    showView(r.view);
  }
  function navigate(hash) {
    var target = hash.replace(/^#/, '');
    if (('#' + target) === location.hash) return route();
    // Leaving Home adds one step to history, so the phone's back button returns Home; moving between other pages replaces it.
    if (current === 'home') location.hash = target;
    else { history.replaceState(null, '', '#' + target); route() }
  }
  window.addEventListener('hashchange', route);

  function showView(name) {
    if (name === current) return;
    var from = current, dir = from && VIEWS.indexOf(name) < VIEWS.indexOf(from) ? 'back' : 'fwd';
    VIEWS.forEach(function (v) { $('v-' + v).hidden = v !== name });
    document.querySelectorAll('[data-tab]').forEach(function (t) {
      if (t.dataset.tab === name) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    current = name;
    $('addBtn').hidden = name !== 'home';
    window.scrollTo(0, 0);
    var hb = $('homeBadge'); hb.hidden = name === 'home' || !Number(hb.textContent);
    reveal($('v-' + name), dir);
  }
  // The page glides in from the side she is heading to, and its cards rise in turn.
  function reveal(view, dir) {
    if (REDUCED) return;
    view.classList.remove('enter-fwd', 'enter-back'); void view.offsetWidth;
    if (dir) view.classList.add('enter-' + dir);
    view.querySelectorAll('.rv').forEach(function (n, i) {
      n.style.setProperty('--i', Math.min(i, 8));
      n.classList.remove('in'); void n.offsetWidth; n.classList.add('in');
    });
    view.querySelectorAll('[data-count]').forEach(countUp);
  }
  function countUp(el) {
    var to = Number(el.dataset.count) || 0;
    if (REDUCED || to < 2) { el.textContent = to; return }
    var t0 = performance.now(), dur = 700;
    (function step(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  window.addEventListener('scroll', function () { $('appbar').classList.toggle('scrolled', window.scrollY > 4) }, { passive: true });

  /* ---------- add / edit sheet ---------- */
  var PLANS = ['Whole life cover', 'Education', 'Savings & investment', 'Health'];
  var FORMS = {
    clients: { title: 'client', fields: [
      { k: 'name', label: 'Name', req: true, max: 120 },
      { k: 'phone', label: 'Phone (for WhatsApp)', type: 'tel', max: 30, ph: '07…' },
      { k: 'plan', label: 'Plan of interest', list: PLANS, max: 120 },
      { k: 'status', label: 'Stage', type: 'select', opts: [['new', 'New'], ['quote', 'Quote sent'], ['docs', 'Waiting for documents'], ['done', 'Covered']] },
      { k: 'note', label: 'Notes', type: 'textarea', max: 1000 }
    ] },
    meetings: { title: 'meeting', fields: [
      { k: 'title', label: 'Who or what', req: true, max: 120, list: 'clients' },
      [{ k: '_date', label: 'Date', type: 'date', req: true }, { k: '_time', label: 'Time', type: 'time', req: true }],
      [{ k: 'duration_min', label: 'How long', type: 'select', opts: [['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 hour'], ['90', '1½ hours'], ['120', '2 hours'], ['180', '3 hours']] },
       { k: 'kind', label: 'Type', type: 'select', opts: [['new', 'First chat'], ['quote', 'Quote'], ['docs', 'Documents'], ['office', 'Office'], ['event', 'Event']] }],
      { k: 'place', label: 'Where', max: 160, ph: 'Café, office or WhatsApp call' },
      { k: 'remind_min', label: 'Remind me on my phone', type: 'select', opts: [['30', '30 min before'], ['15', '15 min before'], ['60', '1 hour before'], ['120', '2 hours before'], ['0', 'No reminder']] },
      { k: 'note', label: 'Notes', type: 'textarea', max: 1000 }
    ] },
    quotes: { title: 'quote', fields: [
      { k: 'client_name', label: 'Client', req: true, max: 120, list: 'clients' },
      { k: 'plan', label: 'Plan', max: 120, list: ['PRULife Whole Life'].concat(PLANS) },
      [{ k: 'sum_assured', label: 'Cover (KES)', type: 'number' }, { k: 'premium_monthly', label: 'Monthly premium (KES)', type: 'number' }],
      [{ k: 'sent_on', label: 'Date sent', type: 'date', req: true }, { k: 'status', label: 'Status', type: 'select', opts: [['waiting', 'Waiting'], ['follow', 'Follow up'], ['accepted', 'Accepted'], ['declined', 'Declined']] }],
      { k: 'next_step', label: 'Next step', max: 160, ph: 'e.g. Call Monday' },
      { k: '_pdf', label: 'Quote PDF', type: 'file' }
    ] },
    todos: { title: 'to-do', fields: [
      { k: 'text', label: 'To-do', req: true, max: 200 },
      [{ k: 'due', label: 'Due date (optional)', type: 'date' }, { k: '_rtime', label: 'Remind me at (optional)', type: 'time' }]
    ] }
  };

  function fieldHtml(f, val) {
    var id = 'f_' + f.k, attrs = ' id="' + id + '" name="' + f.k + '"' + (f.req ? ' required' : '') + (f.max ? ' maxlength="' + f.max + '"' : '') + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '');
    var input;
    if (f.type === 'select') {
      input = '<select class="field"' + attrs + '>' + f.opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(val) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>' }).join('') + '</select>';
    } else if (f.type === 'textarea') {
      input = '<textarea class="field"' + attrs + '>' + esc(val) + '</textarea>';
    } else if (f.type === 'file') {
      input = '<input class="field" type="file" accept="application/pdf"' + attrs + '>' + (val ? '<p class="note">A PDF is attached. Choose a new file only to replace it.</p>' : '');
    } else {
      var list = f.list === 'clients' ? data.clients.map(function (c) { return c.name }) : f.list;
      input = '<input class="field" type="' + (f.type || 'text') + '"' + attrs + (f.type === 'number' ? ' min="0" step="1" inputmode="numeric"' : '') +
        (list ? ' list="' + id + '_l"' : '') + ' value="' + esc(val) + '">' +
        (list ? '<datalist id="' + id + '_l">' + list.map(function (x) { return '<option value="' + esc(x) + '">' }).join('') + '</datalist>' : '');
    }
    return '<div><label for="' + id + '">' + f.label + '</label>' + input + '</div>';
  }

  var editing = null;
  // prefill: values for a new item (the assistant's "Change" button), without making it an edit.
  function openSheet(table, row, prefill) {
    editing = { table: table, row: row || null };
    var spec = FORMS[table], v = Object.assign({}, row || prefill || {});
    if (table === 'meetings') {
      var d = v.starts_at ? new Date(v.starts_at) : (function () { var x = new Date(); x.setMinutes(0, 0, 0); x.setHours(x.getHours() + 1); return x })();
      v._date = dayStr(d); v._time = hm(d); v.duration_min = String(v.duration_min || 30); v.kind = v.kind || 'new';
      v.remind_min = String(v.remind_min != null ? v.remind_min : 30);
    }
    if (table === 'todos') v._rtime = v.remind_at ? hm(new Date(v.remind_at)) : '';
    if (table === 'quotes') { v.sent_on = v.sent_on || todayStr(); v.status = v.status || 'waiting'; v._pdf = v.pdf_path }
    if (table === 'clients') v.status = v.status || 'new';
    var html = '<h2>' + (row ? 'Edit ' : 'New ') + spec.title + ' <button type="button" class="x" id="sheetClose" aria-label="Close">×</button></h2>';
    spec.fields.forEach(function (f) {
      html += Array.isArray(f) ? '<div class="row2">' + f.map(function (g) { return fieldHtml(g, v[g.k]) }).join('') + '</div>' : fieldHtml(f, v[f.k]);
    });
    html += '<p class="err" id="sheetErr" hidden></p><div class="actions">' + (row ? '<button type="button" class="del" id="sheetDel">Delete</button>' : '') +
      '<button type="submit" class="pri" id="sheetSave">Save</button></div>';
    var form = $('sheetForm'); form.innerHTML = html;
    closeSheets();
    $('sheet').showModal();
    var firstField = form.querySelector('input, select, textarea'); if (firstField && !row) firstField.focus();
  }

  function collect(form) {
    var out = {}, t = editing.table;
    FORMS[t].fields.forEach(function walk(f) {
      if (Array.isArray(f)) return f.forEach(walk);
      if (f.k[0] === '_') return;
      var el = form.elements[f.k], val = el.value.trim();
      out[f.k] = f.type === 'number' ? (val === '' ? null : Number(val)) : f.type === 'select' && (f.k === 'duration_min' || f.k === 'remind_min') ? Number(val) : (val === '' ? null : val);
    });
    if (t === 'meetings') out.starts_at = new Date(form.elements._date.value + 'T' + form.elements._time.value).toISOString();
    if (t === 'todos') {
      // A reminder time with no date means today.
      var rt = form.elements._rtime.value;
      if (rt && !out.due) out.due = todayStr();
      out.remind_at = rt ? new Date(out.due + 'T' + rt).toISOString() : null;
    }
    if (t === 'clients') {
      var was = editing.row || {};
      out.covered_on = out.status === 'done' ? (was.status === 'done' && was.covered_on ? was.covered_on : todayStr()) : null;
    }
    return out;
  }

  $('sheetForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target, err = $('sheetErr');
    var missing = Array.prototype.filter.call(form.querySelectorAll('[required]'), function (el) { return !el.value.trim() });
    if (missing.length) { err.textContent = 'Please fill in: ' + missing.map(function (el) { return form.querySelector('label[for="' + el.id + '"]').textContent }).join(', ') + '.'; err.hidden = false; missing[0].focus(); return }
    var row = collect(form), t = editing.table, old = editing.row;
    var file = form.elements._pdf && form.elements._pdf.files[0];
    if (file && file.size > 5 * 1024 * 1024) { err.textContent = 'That PDF is over 5 MB. Please use a smaller file.'; err.hidden = false; return }
    form.classList.add('busy');
    var chain = Promise.resolve();
    if (file) chain = api.upload(file).then(function (path) { row.pdf_path = path; if (old && old.pdf_path) return api.removeFile(old.pdf_path) });
    chain.then(function () { return old ? api.update(t, old.id, row) : api.insert(t, row) })
      .then(function () { $('sheet').close(); toast('Saved'); return reload(t) })
      .then(function () { emit('saved', { table: t, row: row, old: old }) })
      .catch(function (e2) { err.textContent = friendly(e2); err.hidden = false })
      .then(function () { form.classList.remove('busy') });
  });

  $('sheetForm').addEventListener('click', function (e) {
    if (e.target.id === 'sheetClose') return $('sheet').close();
    if (e.target.id === 'sheetDel') {
      var b = e.target;
      if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = 'Tap again to delete'; return }
      var t = editing.table, old = editing.row;
      $('sheetForm').classList.add('busy');
      api.remove(t, old.id).then(function () { return api.removeFile(old.pdf_path) })
        .then(function () { $('sheet').close(); toast('Deleted'); return reload(t) })
        .catch(function (e2) { toast(friendly(e2), true) })
        .then(function () { $('sheetForm').classList.remove('busy') });
    }
  });

  /* ---------- taps ---------- */
  function find(t, id) { return data[t].filter(function (r) { return String(r.id) === id })[0] }
  function closeSheets() { document.querySelectorAll('dialog[open]').forEach(function (d) { if (d.id !== 'sheet') d.close() }) }
  // Tick: the check draws, the row folds away, then the to-do is saved as done.
  function tick(btn) {
    var id = btn.dataset.tick, row = btn.closest('.need, .todo');
    row.classList.add('ticking');
    var save = function () {
      api.update('todos', id, { done: true }).then(function () { return reload('todos') })
        .then(function () { emit('saved', { table: 'todos', row: { done: true }, old: { done: false } }) })
        .catch(function (e2) { row.classList.remove('ticking', 'folding'); toast(friendly(e2), true) });
    };
    if (REDUCED) return save();
    setTimeout(function () { row.style.height = row.offsetHeight + 'px'; row.classList.add('folding'); setTimeout(save, 380) }, 320);
  }
  document.addEventListener('click', function (e) {
    var el = e.target;
    var dlg = el.closest('dialog');
    if (el.matches('dialog.sheet')) return el.close();
    if (el.closest('[data-close]')) return dlg.close();
    var hashLink = el.closest('a[href^="#"]');
    if (hashLink && $('office').contains(hashLink)) { e.preventDefault(); return navigate(hashLink.getAttribute('href')) }
    if (el.closest('a')) return;
    var pdf = el.closest('[data-pdf]');
    if (pdf) {
      e.stopPropagation();
      var w = window.open('', '_blank');
      api.fileUrl(pdf.dataset.pdf).then(function (u) { if (w) w.location = u; else location.href = u })
        .catch(function (e2) { if (w) w.close(); toast(friendly(e2), true) });
      return;
    }
    if (el.closest('[data-import]')) return importContacts();
    if (el.closest('[data-more]')) { closeSheets(); return $('moreSheet').showModal() }
    if (el.closest('[data-ask]')) return $('askBtn').click();
    var tb = el.closest('[data-tick]'); if (tb) return tick(tb);
    var ub = el.closest('[data-untick]');
    if (ub) return api.update('todos', ub.dataset.untick, { done: false }).then(function () { return reload('todos') }).catch(function (e2) { toast(friendly(e2), true) });
    var nb = el.closest('[data-new]'); if (nb) return openSheet(nb.dataset.new);
    var ed = el.closest('[data-edit]'); if (ed) { var row = find(ed.dataset.edit, ed.dataset.id); if (row) openSheet(ed.dataset.edit, row); return }
    var f = el.closest('[data-f]'); if (f) { clientFilter = f.dataset.f; history.replaceState(null, '', '#clients'); return renderClients() }
    var cs = el.closest('[data-cs]'); if (cs) { clientSeg = cs.dataset.cs; history.replaceState(null, '', '#clients' + (clientSeg === 'quotes' ? '/quotes' : '')); renderClients(); return reveal($('v-clients')) }
    var ds = el.closest('[data-ds]');
    if (ds) {
      diaryMode = ds.dataset.ds;
      $('diarySeg').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === ds)) });
      renderDiary(); return reveal($('diaryList'));
    }
    if (el.id === 'needMore') { showAllNeeds = !showAllNeeds; renderHome(); return }
    if (el.id === 'doneToggle') { showDone = !showDone; return renderTodos() }
  });
  $('cSearch').addEventListener('input', function () { clientQuery = this.value.trim(); renderClients() });
  $('factBtn').addEventListener('click', function () {
    var open = this.getAttribute('aria-expanded') !== 'true';
    this.setAttribute('aria-expanded', String(open));
    $('factBox').hidden = !open;
    if (open) { $('factBox').classList.remove('open'); void $('factBox').offsetWidth; $('factBox').classList.add('open') }
  });
  $('addBtn').addEventListener('click', function () { closeSheets(); $('addSheet').showModal() });
  $('askBtn').addEventListener('click', function () { if (remember('asked') !== '1') { remember('asked', '1'); setTimeout(renderStart, 400) } });
  $('meBtn').addEventListener('click', function () { closeSheets(); $('moreSheet').showModal() });
  $('nudge').addEventListener('click', function () { $('moreSheet').showModal() });
  $('newsTeaser').addEventListener('click', function () { $('moreSheet').showModal() });
  $('todoQuick').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('todoText'), text = input.value.trim(); if (!text) return;
    input.disabled = true;
    api.insert('todos', { text: text }).then(function () { input.value = ''; return reload('todos') })
      .catch(function (e2) { toast(friendly(e2), true) }).then(function () { input.disabled = false; input.focus() });
  });

  /* ---------- bridge for assistant.js (helper, mood line, celebrations, news) ---------- */
  window.AgizaOffice = {
    get data() { return data },
    DEMO: DEMO, sb: sb, api: api, reload: reload, openSheet: openSheet,
    toast: toast, friendly: friendly, esc: esc, hm: hm, dayStr: dayStr, todayStr: todayStr, waLink: waLink
  };

  /* ---------- phone reminders (web push, sent by the "reminders" Edge Function) ---------- */
  var PUSH = !DEMO && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  var IOS_TAB = /iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone;
  var STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var swReady = PUSH ? navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready }) : null;
  var remindersOn = false;

  function keyBytes(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '==='.slice((s.length + 3) % 4);
    var raw = atob(s), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function saveSub(s) {
    var j = s.toJSON();
    return sb.from('push_subscriptions').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' })
      .then(function (r) { if (r.error) throw r.error });
  }
  function remindState(title, sub, btn, on) {
    $('remindText').textContent = title; $('remindSub').textContent = sub || '';
    $('remindBtn').hidden = !btn; $('remindBtn').textContent = btn || '';
    $('remindRow').classList.toggle('on', !!on);
    remindersOn = !!on;
    if (!$('office').hidden) renderStart();
    updateNudge();
    $('chimeRow').hidden = !on || STANDALONE || IOS_TAB;
    updateDot();
  }
  // Shows the right message, and re-saves this phone's subscription in case the browser renewed it.
  function refreshReminders() {
    if (DEMO) return remindState('Phone reminders', 'In her real office, reminders ring on her phone before meetings and at to-do times.');
    if (!PUSH) return remindState('Phone reminders', IOS_TAB ? 'On iPhone: tap Share, then "Add to Home Screen", and open the office from there.' : 'This browser cannot show reminders.');
    if (Notification.permission === 'denied') return remindState('Reminders are blocked', 'Allow notifications for this office in your phone settings.');
    swReady.then(function (reg) { return reg.pushManager.getSubscription() }).then(function (s) {
      if (s && Notification.permission === 'granted') { saveSub(s).catch(function () {}); remindState('Reminders are on', 'Before meetings and at to-do times.', 'Test', true) }
      else remindState('Phone reminders', 'A buzz before meetings and at to-do times.', 'Turn on');
    });
  }
  $('remindBtn').addEventListener('click', function () {
    var btn = this;
    if (remindersOn) {
      return swReady.then(function (reg) { return reg.showNotification('Agiza Office', { body: 'Reminders work on this phone.', icon: '/images/icon-192.png', tag: 'test' }) });
    }
    btn.disabled = true;
    Notification.requestPermission().then(function (p) {
      if (p !== 'granted') throw new Error('not allowed');
      return Promise.all([swReady, sb.from('push_config').select('public_key').single().then(function (r) { if (r.error) throw r.error; return r.data })]);
    }).then(function (a) {
      var reg = a[0];
      return reg.pushManager.getSubscription().then(function (s) {
        return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(a[1].public_key) });
      });
    }).then(saveSub).then(function () { toast('Reminders are on') })
      .catch(function (e) { toast(e.message === 'not allowed' ? 'Reminders need notification permission.' : friendly(e), true) })
      .then(function () { btn.disabled = false; refreshReminders() });
  });
  // On sign-out, stop sending reminders to this phone.
  function forgetPhone() {
    if (!PUSH) return Promise.resolve();
    return swReady.then(function (reg) { return reg.pushManager.getSubscription() }).then(function (s) {
      if (!s) return;
      return sb.from('push_subscriptions').delete().eq('endpoint', s.endpoint).then(function () { return s.unsubscribe() });
    }).catch(function () {});
  }

  /* ---------- the app: Android gets agiza-office.apk (it carries the Agiza chime) ---------- */
  var installPrompt = window.__installPrompt || null;
  var ANDROID = /Android/i.test(navigator.userAgent);
  var PHONE = matchMedia('(pointer: coarse)').matches;
  function showInstall() {
    var row = $('installRow');
    if (DEMO || STANDALONE || IOS_TAB || (!installPrompt && !PHONE)) { row.hidden = true; return updateDot() }
    row.hidden = false;
    $('apkLink').hidden = !ANDROID;
    $('installBtn').hidden = ANDROID || !installPrompt;
    $('installSub').textContent = ANDROID ? 'Opens like an app, with its own reminder chime. Allow installing from this source if asked.'
      : installPrompt ? 'Opens like an app from your home screen.' : 'In Chrome: tap ⋮, then "Install app" or "Add to Home screen".';
    updateDot();
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installPrompt = e; showInstall() });
  window.addEventListener('appinstalled', function () { installPrompt = null; showInstall(); toast('Installed. Open Agiza Office from your home screen.') });
  $('installBtn').addEventListener('click', function () {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(function () { installPrompt = null; showInstall() });
  });
  // A small dot on her initial when something in More wants attention.
  function updateDot() { $('meDot').hidden = DEMO || (remindersOn || !PUSH) && $('installRow').hidden }

  /* ---------- sign in / out ---------- */
  function showOffice() {
    $('login').hidden = true; $('office').hidden = false;
    $('office').classList.add('loading');
    loadAll().then(function () {
      $('office').classList.remove('loading');
      if (!current) route(); else reveal($('v-' + current));
      welcome();
    });
    refreshReminders(); showInstall();
  }
  function showLogin() { $('office').hidden = true; $('login').hidden = false; $('step2').hidden = true; $('step1').hidden = false; $('password').value = ''; closeSheets() }
  function showNewPassword() { $('office').hidden = true; $('login').hidden = false; $('step1').hidden = true; $('step2').hidden = false; $('newPass').focus() }
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  $('emailForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('email').value.trim(), p = $('password').value, errEl = $('emailErr');
    $('emailOk').hidden = true;
    if (!EMAIL_RE.test(v)) { errEl.textContent = 'Enter the email address you use for your office.'; errEl.hidden = false; return }
    if (!p) { errEl.textContent = 'Enter your password.'; errEl.hidden = false; return }
    errEl.hidden = true;
    if (DEMO) return showOffice();
    e.target.classList.add('busy');
    sb.auth.signInWithPassword({ email: v, password: p })
      .then(function (r) { if (r.error) throw r.error })
      .catch(function (e2) { errEl.textContent = friendly(e2); errEl.hidden = false })
      .then(function () { e.target.classList.remove('busy') });
  });
  $('forgot').addEventListener('click', function () {
    var v = $('email').value.trim(), errEl = $('emailErr'), okEl = $('emailOk');
    okEl.hidden = true;
    if (!EMAIL_RE.test(v)) { errEl.textContent = 'Type your email above first, then tap the reset link.'; errEl.hidden = false; return }
    errEl.hidden = true;
    var done = function () { okEl.textContent = 'If that email belongs to this office, a reset link is on its way. Open it on this phone.'; okEl.hidden = false };
    if (DEMO) return done();
    sb.auth.resetPasswordForEmail(v, { redirectTo: location.origin + location.pathname })
      .then(function (r) { if (r.error) throw r.error; done() })
      .catch(function (e2) { errEl.textContent = friendly(e2); errEl.hidden = false });
  });
  $('newPassForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var p = $('newPass').value, errEl = $('newPassErr');
    if (p.length < 8) { errEl.textContent = 'Use at least 8 characters.'; errEl.hidden = false; return }
    errEl.hidden = true;
    if (DEMO) return showOffice();
    e.target.classList.add('busy');
    sb.auth.updateUser({ password: p })
      .then(function (r) { if (r.error) throw r.error; recovering = false; $('newPass').value = ''; showOffice() })
      .catch(function (e2) { errEl.textContent = friendly(e2); errEl.hidden = false })
      .then(function () { e.target.classList.remove('busy') });
  });
  $('signout').addEventListener('click', function () {
    if (DEMO) return showLogin();
    forgetPhone().then(function () { return sb.auth.signOut() }).then(showLogin);
  });

  if (DEMO) {
    // The preview opens straight into the office with sample data.
    $('demoBar').hidden = false;
    setTimeout(showOffice, 0);
  } else {
    sb.auth.onAuthStateChange(function (event, session) {
      var uid = session && session.user ? session.user.id : null;
      if (event === 'PASSWORD_RECOVERY') recovering = true;
      if (uid && recovering) { userId = uid; setTimeout(showNewPassword, 0) }
      else if (uid && uid !== userId) { userId = uid; setTimeout(showOffice, 0) }
      else if (!uid && (userId || event === 'INITIAL_SESSION')) { userId = null; TABLES.forEach(function (t) { data[t] = [] }); showLogin() }
    });
  }
  // Refresh when she comes back to the app later in the day.
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !$('office').hidden) loadAll() });
})();
