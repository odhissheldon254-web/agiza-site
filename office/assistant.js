// Agiza Office: the helper ("Agiza Assistant"), the mood card, celebrations and insurance news.
// Talks to the office through window.AgizaOffice (index.html) and takes its words from cheer.js.
// Understanding is rule-based and runs in the browser: no AI service, nothing extra leaves her office.
(function () {
  'use strict';
  var O = window.AgizaOffice, C = window.AGIZA_CHEER;
  if (!O || !C) return;
  var $ = function (id) { return document.getElementById(id) };
  var esc = O.esc, hm = O.hm, dayStr = O.dayStr;

  /* ---------- small helpers ---------- */
  function slot() { var h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening' }
  function dayOfYear() { var d = new Date(); return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5) }
  function pick(list, offset) { return list[(dayOfYear() + (offset || 0)) % list.length] }
  function any(list) { return list[Math.floor(Math.random() * list.length)] }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x }
  function midnight(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x }
  function clock(d) { var h = d.getHours(), m = d.getMinutes(); return ((h % 12) || 12) + (m ? ':' + (m < 10 ? '0' : '') + m : '') + (h < 12 ? 'am' : 'pm') }
  function niceDay(d) {
    var s = dayStr(d);
    if (s === O.todayStr()) return 'today';
    if (s === dayStr(addDays(new Date(), 1))) return 'tomorrow';
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many) }
  function cap(s) { s = s.trim(); return s.charAt(0).toUpperCase() + s.slice(1) }
  function firstName(s) { return String(s || '').split(/\s+/)[0] }
  function data() { return O.data }

  function meetingsOn(day) {
    var key = dayStr(day);
    return data().meetings.filter(function (m) { return dayStr(new Date(m.starts_at)) === key })
      .sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1 });
  }
  function openTodos() { return data().todos.filter(function (t) { return !t.done }) }
  function todosDue(day, includeOverdue) {
    var key = dayStr(day);
    return openTodos().filter(function (t) { return t.due && (t.due === key || (includeOverdue && t.due < key)) });
  }
  function followUps() {
    return data().quotes.filter(function (q) { return q.status === 'waiting' || q.status === 'follow' })
      .sort(function (a, b) { return a.sent_on < b.sent_on ? -1 : 1 });
  }
  function coveredThisMonth() {
    var month = O.todayStr().slice(0, 7);
    return data().clients.filter(function (c) { return c.status === 'done' && (c.covered_on || '').slice(0, 7) === month }).length;
  }

  /* ---------- mood card ---------- */
  var cheerOffset = 0, factOffset = 0;
  function dayLine() {
    var now = new Date(), s = slot(), today = meetingsOn(now);
    var ahead = today.filter(function (m) { return new Date(m.starts_at) > now });
    var dueToday = todosDue(now, true).length, fu = followUps().length;
    var parts = [];
    if (s === 'evening') {
      var tm = meetingsOn(addDays(now, 1));
      parts.push(tm.length ? 'Tomorrow: ' + plural(tm.length, 'meeting', 'meetings') + ', first with ' + firstName(tm[0].title) + ' at ' + clock(new Date(tm[0].starts_at)) + '.'
        : 'Nothing booked for tomorrow yet.');
    } else if (!today.length) {
      parts.push(s === 'morning' ? 'No meetings today, a good day for follow-ups.' : 'A quiet afternoon. Maybe one or two follow-up calls?');
    } else if (!ahead.length) {
      parts.push("Today's meetings are done. Well done!");
    } else if (s === 'morning' && ahead.length === today.length) {
      parts.push('You have ' + plural(today.length, 'meeting', 'meetings') + ' today, first with ' + firstName(today[0].title) + ' at ' + clock(new Date(today[0].starts_at)) + '.');
    } else {
      parts.push('Next: ' + ahead[0].title + ' at ' + clock(new Date(ahead[0].starts_at)) + '.');
    }
    if (s !== 'evening' && dueToday) parts.push(plural(dueToday, 'to-do', 'to-dos') + ' for today.');
    if (s !== 'evening' && fu) parts.push(plural(fu, 'quote is', 'quotes are') + ' waiting for a follow-up.');
    return parts.join(' ');
  }
  function renderMood() {
    $('mood').hidden = false;
    $('moodLine').textContent = dayLine();
    $('moodCheer').textContent = pick(C.encourage[slot()], cheerOffset);
    $('moodFact').textContent = pick(C.facts, factOffset);
  }
  $('moodNext').addEventListener('click', function () { cheerOffset++; renderMood() });
  $('factNext').addEventListener('click', function () { factOffset++; renderMood() });
  document.addEventListener('agiza:render', renderMood);

  /* ---------- celebrations ---------- */
  var celebrateTimer;
  function celebrate(text) {
    var box = $('celebrate');
    $('celebrateText').textContent = text;
    var burst = $('confetti'); burst.innerHTML = '';
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (var i = 0; i < 18; i++) {
        var p = document.createElement('span');
        p.textContent = ['🎉', '✨', '🌸', '💜', '⭐'][i % 5];
        p.style.left = (5 + Math.random() * 90) + '%';
        p.style.animationDelay = (Math.random() * 0.6) + 's';
        burst.appendChild(p);
      }
    }
    box.hidden = false;
    clearTimeout(celebrateTimer);
    celebrateTimer = setTimeout(function () { box.hidden = true }, 4200);
  }
  $('celebrate').addEventListener('click', function () { this.hidden = true });
  document.addEventListener('agiza:saved', function (e) {
    var d = e.detail || {}, row = d.row || {}, old = d.old || {};
    if (d.table === 'clients' && row.status === 'done' && old.status !== 'done') celebrate(any(C.celebrate.covered).replace('{n}', coveredThisMonth()));
    else if (d.table === 'quotes' && row.status === 'accepted' && old.status !== 'accepted') celebrate(any(C.celebrate.accepted));
    else if (d.table === 'todos' && row.done && !openTodos().length && data().todos.length) celebrate(any(C.celebrate.cleared));
  });

  /* ---------- insurance news (filled every few hours by the "news" Edge Function) ---------- */
  function loadNews() {
    if (O.DEMO) return;
    O.sb.from('news').select('title,link,source,published_at').order('published_at', { ascending: false }).limit(6)
      .then(function (r) {
        if (r.error || !r.data.length) return;
        newsCache = r.data;
        $('newsPanel').hidden = false;
        $('newsList').innerHTML = r.data.map(function (n) {
          var when = n.published_at ? new Date(n.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
          return '<a class="news" href="' + esc(n.link) + '" target="_blank" rel="noopener"><b>' + esc(n.title) + '</b><small>' +
            esc([n.source, when].filter(Boolean).join(' · ')) + '</small></a>';
        }).join('');
      });
  }
  var newsCache = [];
  var newsLoaded = false;
  document.addEventListener('agiza:render', function () { if (!newsLoaded) { newsLoaded = true; loadNews() } });

  /* ---------- understanding dates and times ---------- */
  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  var WEEKDAYS = { sunday: 0, sun: 0, jumapili: 0, monday: 1, mon: 1, jumatatu: 1, tuesday: 2, tue: 2, tues: 2, jumanne: 2,
    wednesday: 3, wed: 3, jumatano: 3, thursday: 4, thu: 4, thur: 4, thurs: 4, alhamisi: 4, friday: 5, fri: 5, ijumaa: 5,
    saturday: 6, sat: 6, jumamosi: 6 };
  var SW_HOURS = { moja: 1, mbili: 2, tatu: 3, nne: 4, tano: 5, sita: 6, saba: 7, nane: 8, tisa: 9, kumi: 10, 'kumi na moja': 11, 'kumi na mbili': 12 };
  var NUMBERS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30 };

  // Reads "tomorrow at 10", "Friday 2pm", "28 Oct", "kesho saa nne", "in 30 minutes" out of a sentence.
  // Returns the day and time found and the sentence with those words removed.
  function parseWhen(input) {
    var s = ' ' + input + ' ', now = new Date(), day = null, time = null, partOfDay = null, explicitDay = false;
    function cut(re, fn) { var m = s.match(re); if (!m) return false; fn(m); s = s.replace(m[0], ' '); return true }

    cut(/\b(?:in|baada ya)\s+(\d+|an?|one|two|three|four|five|ten|fifteen|twenty|thirty|half an?)\s*(minutes?|mins?|hours?|hrs?|dakika|masaa)\b/i, function (m) {
      var n = NUMBERS[m[1].toLowerCase()] || Number(m[1]), hours = /^(h|masaa)/i.test(m[2]);
      var mins = /half/i.test(m[1]) ? 30 : hours ? n * 60 : n;
      var at = new Date(now.getTime() + mins * 60000);
      day = midnight(at); time = { h: at.getHours(), m: at.getMinutes() }; explicitDay = true;
    });
    if (!day) {
      cut(/\b(day after tomorrow|kesho kutwa)\b/i, function () { day = midnight(addDays(now, 2)); explicitDay = true }) ||
      cut(/\b(tomorrow|kesho)\b/i, function () { day = midnight(addDays(now, 1)); explicitDay = true }) ||
      cut(/\b(today|leo)\b/i, function () { day = midnight(now); explicitDay = true }) ||
      cut(/\b(tonight|usiku wa leo)\b/i, function () { day = midnight(now); partOfDay = 'night'; explicitDay = true });
    }
    if (!day) {
      cut(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\b/i, function (m) {
        day = dateFor(Number(m[1]), MONTHS.indexOf(m[2].toLowerCase().slice(0, 3)));
      }) ||
      cut(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i, function (m) {
        day = dateFor(Number(m[2]), MONTHS.indexOf(m[1].toLowerCase().slice(0, 3)));
      }) ||
      cut(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, function (m) {
        day = dateFor(Number(m[1]), Number(m[2]) - 1, m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : null);
      }) ||
      cut(/\bon\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/i, function (m) {
        var d = new Date(now.getFullYear(), now.getMonth(), Number(m[1]));
        if (d < midnight(now)) d = new Date(now.getFullYear(), now.getMonth() + 1, Number(m[1]));
        day = d;
      }) ||
      cut(/\b(?:on\s+|next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|jumatatu|jumanne|jumatano|alhamisi|ijumaa|jumamosi|jumapili|mon|tues?|wed|thur?s?|fri|sat|sun)\b/i, function (m) {
        var target = WEEKDAYS[m[1].toLowerCase()], diff = (target - now.getDay() + 7) % 7;
        if (diff === 0 && !/this/i.test(m[0])) diff = 7;
        day = midnight(addDays(now, diff));
      });
      if (day) explicitDay = true;
    }
    if (!time) {
      cut(/\b(?:at\s+|by\s+|from\s+)?(\d{1,2})[:.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i, function (m) { time = to24(Number(m[1]), Number(m[2]), m[3]) }) ||
      cut(/\b(?:at\s+|by\s+|from\s+)?(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)/i, function (m) { time = to24(Number(m[1]), 0, m[2]) }) ||
      cut(/\bsaa\s+(kumi na mbili|kumi na moja|moja|mbili|tatu|nne|tano|sita|saba|nane|tisa|kumi)(\s+na\s+nusu)?(?:\s+(asubuhi|mchana|jioni|usiku))?\b/i, function (m) {
        var n = SW_HOURS[m[1].toLowerCase()], h = n <= 6 ? n + 6 : n - 6, when = (m[3] || '').toLowerCase();
        if (when === 'jioni' || when === 'usiku' || (when === 'mchana' && h < 12)) { if (h < 12) h += 12 }
        else if (when !== 'asubuhi' && h < 7) h += 12;
        time = { h: h, m: m[2] ? 30 : 0 };
      }) ||
      cut(/\b(?:at|by)\s+(\d{1,2})\b(?!\s*(?:st|nd|rd|th|\/))/i, function (m) { time = to24(Number(m[1]), 0, null) }) ||
      cut(/\b(noon|midday)\b/i, function () { time = { h: 12, m: 0 } });
    }
    cut(/\b(?:in the\s+)?(morning|asubuhi)\b/i, function () { partOfDay = 'morning' }) ||
    cut(/\b(?:in the\s+)?(afternoon|mchana)\b/i, function () { partOfDay = 'afternoon' }) ||
    cut(/\b(?:in the\s+)?(evening|jioni)\b/i, function () { partOfDay = 'evening' });
    if (time && (partOfDay === 'evening' || partOfDay === 'night' || partOfDay === 'afternoon') && time.h < 12) time.h += 12;
    if (!time && partOfDay) time = { h: { morning: 9, afternoon: 14, evening: 18, night: 20 }[partOfDay], m: 0 };

    return { day: day, time: time, explicitDay: explicitDay, rest: s.replace(/\s+/g, ' ').trim() };
  }
  function dateFor(d, month, year) {
    var now = new Date(), x = new Date(year || now.getFullYear(), month, d);
    if (!year && x < midnight(now)) x = new Date(now.getFullYear() + 1, month, d);
    return x;
  }
  // Hours without am/pm follow working hours: 7–11 are morning, 1–6 are afternoon.
  function to24(h, m, ampm) {
    ampm = (ampm || '').toLowerCase().replace(/\./g, '');
    if (ampm === 'pm' && h < 12) h += 12;
    else if (ampm === 'am' && h === 12) h = 0;
    else if (!ampm && h >= 1 && h <= 6) h += 12;
    return { h: h, m: m || 0 };
  }
  function combine(day, time) { var d = new Date(day); d.setHours(time.h, time.m, 0, 0); return d }
  // Fills in a missing day: a time later today means today, otherwise tomorrow.
  function resolve(w) {
    if (w.day && w.time) return combine(w.day, w.time);
    if (w.time) { var t = combine(midnight(new Date()), w.time); return t > new Date() ? t : addDays(t, 1) }
    return null;
  }
  // Cleans connector words left over after dates and times are cut out.
  function tidy(s) {
    return s.replace(/\s+([,.!?])/g, '$1').replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '')
      .replace(/\b(on|at|by|for|from|about)\s*$/i, '').replace(/^(to|that|about|ku)\s+/i, '').trim();
  }

  /* ---------- understanding what she wants ---------- */
  function understand(text) {
    var t = text.toLowerCase().trim().replace(/[?!.]+$/, '');
    if (/^(help|msaada|what can you do)\b/.test(t)) return { intent: 'help' };
    if (/\b(thank|asante)/.test(t)) return { intent: 'thanks' };
    if (/^(hi|hello|hey|habari|mambo|niaje|sasa|good (morning|afternoon|evening))\b/.test(t) && t.split(/\s+/).length <= 4) return { intent: 'greet' };
    if (/^(mark|tick(\s+off)?|done|finished|complete|completed|i(\s+have|'ve)?\s+(done|finished|completed)|nimemaliza)\b/.test(t)) return { intent: 'done' };
    if (/^(add|new|save)\s+(a\s+)?(new\s+)?client\b/.test(t)) return { intent: 'client' };
    if (/\b(news|headlines)\b/.test(t)) return { intent: 'news' };
    if (/\b(fun fact|did you know|a fact|teach me|tip)\b/.test(t)) return { intent: 'fact' };
    if (/\b(encourage|motivat|inspire|cheer me|tired|stressed|exhausted|hard day|nimechoka)\b/.test(t)) return { intent: 'encourage', tired: /tired|exhausted|stressed|nimechoka|hard day/.test(t) };
    if (/^(remind me|nikumbushe|remember to|don'?t forget|usisahau)\b/.test(t)) return { intent: 'todo', remind: true };
    if (/^(add|create|new|put)\s+(a\s+)?(meeting|appointment)\b/.test(t) || /^(meeting|appointment|mkutano)\b/.test(t) ||
        (/\b(meeting|appointment)\s+with\b/.test(t) && !/^(what|when|do i|show|any)\b/.test(t)) || /^(meet|visit)\s+\w/.test(t)) return { intent: 'meeting' };
    if (/^(add|create|new)\s+(a\s+)?(to-?do|task)\b|^(to-?do|task)[:\s]|^(i need to|need to)\b/.test(t)) return { intent: 'todo', remind: false };
    if (/\b(follow.?ups?|pending|waiting|who (should|do) i (call|follow))\b/.test(t)) return { intent: 'followups' };
    if (/\b(how many|this month|covered|my numbers|stats|score)\b/.test(t)) return { intent: 'stats' };
    if (/\b(this week|next 7 days|coming up|week)\b/.test(t)) return { intent: 'week' };
    // A question about a day ("what's on Monday?", "tomorrow?") versus a task with a day ("call Brian tomorrow at 10").
    var w = parseWhen(text), asking = /\b(what|whats|show|any|anything|am i free|do i have|nina nini|ratiba|schedule|agenda|plans?|my day)\b/.test(t);
    var leftover = tidy(w.rest).toLowerCase().replace(/\b(is|on|for|and|the|me|i|my)\b/g, '').trim();
    if (asking || ((w.explicitDay || w.time) && !leftover)) return { intent: 'day', day: w.day || midnight(new Date()) };
    if (w.explicitDay || w.time) return { intent: 'todo', remind: !!w.time };
    return { intent: 'unknown' };
  }

  /* ---------- chat panel ---------- */
  var sheet = $('aiSheet'), log = $('aiLog'), input = $('aiInput');
  var pending = null, viaVoice = false, cards = {}, cardSeq = 0;
  var CHIPS = [['What do I have today?', 'What do I have today?'], ['Tomorrow?', 'What do I have tomorrow?'],
    ['Remind me to…', 'Remind me to '], ['Follow-ups', 'Who needs a follow-up?'], ['Fun fact', 'Tell me a fun fact'],
    ['Encourage me', 'Encourage me'], ['News', 'Show me the news']];
  $('aiChips').innerHTML = CHIPS.map(function (c, i) { return '<button type="button" data-chip="' + i + '">' + esc(c[0]) + '</button>' }).join('');

  function bubble(who, html) {
    var b = document.createElement('div');
    b.className = 'msg ' + who; b.innerHTML = html;
    log.appendChild(b); log.scrollTop = log.scrollHeight;
    return b;
  }
  function say(html, spoken) {
    bubble('bot', html);
    if (spoken && ($('aiSpeak').checked || viaVoice)) speak(spoken);
  }
  function open() {
    if (!sheet.open) sheet.showModal();
    if (!log.children.length) say('<b>' + esc(greeting()) + '</b> I can add to-dos and reminders, book meetings, and tell you what is on your day. Type, or tap 🎤 and speak.');
    setTimeout(function () { input.focus() }, 50);
  }
  function greeting() { return { morning: 'Good morning, Agiza!', afternoon: 'Good afternoon, Agiza!', evening: 'Good evening, Agiza!' }[slot()] }
  $('askBtn').addEventListener('click', open);
  $('aiClose').addEventListener('click', function () { sheet.close(); stopSpeaking() });
  $('aiChips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-chip]'); if (!b) return;
    var c = CHIPS[Number(b.dataset.chip)];
    if (/ $/.test(c[1])) { input.value = c[1]; input.focus(); return }
    handle(c[1], false);
  });
  $('aiForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim(); if (!text) return;
    input.value = '';
    handle(text, false);
  });

  function handle(text, voice) {
    viaVoice = voice;
    bubble('me', esc(text));
    // A follow-up answer ("at 4pm", "no reminder") completes the question asked; anything else starts afresh.
    if (pending && pending.need) {
      var pw = parseWhen(text);
      if (pw.time || pw.day || /^(cancel|no|never ?mind|acha)\b|no reminder|just add|bila/i.test(text)) return answerPending(text);
      pending = null;
    }
    var u = understand(text);
    ({
      help: help, thanks: function () { say('Karibu! 😊', 'Karibu!') }, greet: function () { say(esc(greeting() + ' ' + dayLine()), greeting() + ' ' + dayLine()) },
      done: function () { markDone(text) }, client: function () { addClient(text) }, news: news, fact: fact,
      encourage: function () { encourage(u.tired) }, todo: function () { addTodo(text, u.remind) }, meeting: function () { addMeeting(text) },
      followups: followupsAnswer, stats: stats, week: week, day: function () { dayAnswer(u.day) }, unknown: unknown
    })[u.intent]();
  }

  function help() {
    say('Try saying:<ul class="tips"><li>"Remind me to call Wanjiru tomorrow at 10"</li><li>"Meeting with Brian on Friday at 2pm at Sarit"</li>' +
      '<li>"What do I have today?" or "…on Monday?"</li><li>"Who needs a follow-up?"</li><li>"Mark call Wanjiru done"</li><li>"Add client Mary Achieng 0712 345678"</li>' +
      '<li>"Tell me a fun fact", "Encourage me", "Show me the news"</li></ul>');
  }
  function unknown() {
    say("I didn't quite catch that. Try \"Remind me to…\", \"Meeting with… at…\", or \"What do I have today?\" Say <b>help</b> for more.",
      "Sorry, I didn't catch that. Try: remind me to, or, what do I have today.");
  }
  function fact() { var f = any(C.facts); say('💡 ' + esc(f), f) }
  function encourage(tired) {
    var line = tired ? any(C.encourage.evening) : any(C.encourage[slot()]);
    say((tired ? '🤍 ' : '✨ ') + esc(line), line);
  }
  function news() {
    if (!newsCache.length) return say('No insurance news to show right now. I check for new headlines every few hours.');
    say('📰 Latest insurance news:<ul class="tips">' + newsCache.slice(0, 4).map(function (n) {
      return '<li><a href="' + esc(n.link) + '" target="_blank" rel="noopener">' + esc(n.title) + '</a></li>';
    }).join('') + '</ul>', 'Here are the latest insurance headlines.');
  }

  /* ---------- answers about her day ---------- */
  function meetingLine(m) { var d = new Date(m.starts_at); return clock(d) + ' · ' + m.title + (m.place ? ' · ' + m.place : '') }
  function dayAnswer(day) {
    var label = niceDay(day), ms = meetingsOn(day), isToday = label === 'today';
    if (isToday) ms = ms.filter(function (m) { return new Date(m.starts_at).getTime() + (m.duration_min || 30) * 60000 > Date.now() });
    var td = todosDue(day, isToday);
    var html = '', spoken = '';
    if (ms.length) {
      html += '<b>' + (isToday ? 'Still ahead today' : cap(label)) + ': ' + plural(ms.length, 'meeting', 'meetings') + '</b><ul class="tips">' +
        ms.map(function (m) { return '<li>' + esc(meetingLine(m)) + '</li>' }).join('') + '</ul>';
      spoken += plural(ms.length, 'meeting', 'meetings') + ' ' + label + '. ' + ms.map(function (m) { return firstName(m.title) + ' at ' + clock(new Date(m.starts_at)) }).join(', ') + '. ';
    } else {
      html += '<b>No ' + (isToday ? 'more ' : '') + 'meetings ' + esc(label) + '.</b> ';
      spoken += 'No ' + (isToday ? 'more ' : '') + 'meetings ' + label + '. ';
    }
    if (td.length) {
      html += '<b>To-dos:</b><ul class="tips">' + td.map(function (t) {
        return '<li>' + esc(t.text) + (t.due < O.todayStr() ? ' <small class="late">overdue</small>' : '') + (t.remind_at ? ' · 🔔 ' + esc(clock(new Date(t.remind_at))) : '') + '</li>';
      }).join('') + '</ul>';
      spoken += plural(td.length, 'to-do', 'to-dos') + '. ';
    } else html += isToday ? '<br>No to-dos due. 🌿' : '';
    if (isToday && followUps().length) html += '<br>Also ' + plural(followUps().length, 'quote is', 'quotes are') + ' waiting for a follow-up.';
    say(html, spoken);
  }
  function week() {
    var now = new Date(), end = addDays(midnight(now), 8);
    var ms = data().meetings.filter(function (m) { var d = new Date(m.starts_at); return d > now && d < end })
      .sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1 });
    if (!ms.length) return say('Nothing booked in the next 7 days. A good week to line up new chats!', 'Nothing booked in the next seven days.');
    say('<b>Next 7 days: ' + plural(ms.length, 'meeting', 'meetings') + '</b><ul class="tips">' + ms.map(function (m) {
      return '<li>' + esc(niceDay(new Date(m.starts_at))) + ' · ' + esc(meetingLine(m)) + '</li>';
    }).join('') + '</ul>', plural(ms.length, 'meeting', 'meetings') + ' in the next seven days.');
  }
  function followupsAnswer() {
    var qs = followUps(), news = data().clients.filter(function (c) { return c.status === 'new' });
    if (!qs.length && !news.length) return say('Nobody is waiting on you. Lovely! 🌿', 'Nobody is waiting on you.');
    var html = '';
    if (qs.length) html += '<b>Quotes waiting:</b><ul class="tips">' + qs.map(function (q) {
      var days = Math.max(0, Math.round((midnight(new Date()) - midnight(new Date(q.sent_on + 'T00:00'))) / 864e5));
      return '<li>' + esc(q.client_name) + ' · sent ' + (days === 0 ? 'today' : plural(days, 'day', 'days') + ' ago') + waFor(q.client_name) + '</li>';
    }).join('') + '</ul>';
    if (news.length) html += '<b>New clients to contact:</b><ul class="tips">' + news.map(function (c) { return '<li>' + esc(c.name) + waFor(c.name) + '</li>' }).join('') + '</ul>';
    say(html, (qs.length ? plural(qs.length, 'quote', 'quotes') + ' waiting. ' : '') + (news.length ? plural(news.length, 'new client', 'new clients') + ' to contact.' : ''));
  }
  function waFor(name) {
    var c = data().clients.filter(function (x) { return x.name && x.name.toLowerCase() === String(name).toLowerCase() })[0];
    var url = c && O.waLink(c.phone);
    return url ? ' · <a href="' + esc(url) + '" target="_blank" rel="noopener">WhatsApp</a>' : '';
  }
  function stats() {
    var covered = coveredThisMonth(), all = data().clients.filter(function (c) { return c.status === 'done' }).length;
    var pend = data().clients.filter(function (c) { return c.status !== 'done' }).length;
    var line = covered + ' covered this month, ' + all + ' in total, and ' + pend + ' in progress.';
    say('📊 ' + esc(line) + (covered ? ' Hongera! 🎉' : ' The first one this month is the sweetest. 💪'), line);
  }

  /* ---------- adding things (always confirmed with a card first) ---------- */
  function confirmCard(kind, table, row, lines) {
    var id = 'c' + (++cardSeq);
    cards[id] = { table: table, row: row };
    say('<div class="card" data-card="' + id + '"><b>' + esc(kind) + '</b>' + lines.map(function (l) { return '<p>' + l + '</p>' }).join('') +
      '<div class="card-actions"><button type="button" class="pri-s" data-act="save">Save</button><button type="button" data-act="edit">Change</button>' +
      '<button type="button" data-act="cancel">Cancel</button></div></div>', kind + ': ' + lines.map(function (l) { return l.replace(/<[^>]+>/g, '') }).join(', ') + '. Shall I save it?');
  }
  log.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]'); if (!btn) return;
    var cardEl = btn.closest('[data-card]'), c = cards[cardEl.dataset.card]; if (!c) return;
    var act = btn.dataset.act;
    cardEl.querySelectorAll('button').forEach(function (b) { b.disabled = true });
    if (act === 'cancel') { delete cards[cardEl.dataset.card]; return say('Okay, cancelled.') }
    if (act === 'edit') { sheet.close(); O.openSheet(c.table, null, c.row); return }
    var job = c.update ? O.api.update(c.table, c.update, c.row) : O.api.insert(c.table, c.row);
    job.then(function () { return O.reload(c.table) }).then(function () {
      delete cards[cardEl.dataset.card];
      cardEl.classList.add('saved');
      document.dispatchEvent(new CustomEvent('agiza:saved', { detail: { table: c.table, row: c.row, old: c.old || {} } }));
      var extra = c.row.remind_at ? ' I\'ll remind you ' + niceDay(new Date(c.row.remind_at)) + ' at ' + clock(new Date(c.row.remind_at)) + '.' +
        (remindersOff() ? ' <small>(Turn on reminders at the top of your office to get the alert on this phone.)</small>' : '') : '';
      say(esc(any(C.celebrate.added)) + extra, any(C.celebrate.added).replace(/[^\w\s.!']/g, ''));
    }).catch(function (e2) {
      cardEl.querySelectorAll('button').forEach(function (b) { b.disabled = false });
      say('Sorry, that did not save: ' + esc(O.friendly(e2)));
    });
  });
  function remindersOff() { return !('Notification' in window) || Notification.permission !== 'granted' }

  function addTodo(text, remind) {
    var w = parseWhen(text.replace(/^\s*(remind me|nikumbushe|remember to|don'?t forget( to)?|usisahau|add\s+(a\s+)?(to-?do|task)|to-?do|task|i need to|need to)\b[:\s]*/i, ''));
    var what = cap(tidy(w.rest) || 'To-do');
    var at = resolve(w);
    if (remind && !at) {
      if (w.day) { at = combine(w.day, { h: 9, m: 0 }); if (at < new Date()) at = new Date(Math.ceil(Date.now() / 3600000) * 3600000) }
      else { pending = { need: 'when', what: what }; return say('When should I remind you to <b>' + esc(what.charAt(0).toLowerCase() + what.slice(1)) + '</b>? For example "at 4pm" or "tomorrow morning".', 'When should I remind you?') }
    }
    var row = { text: what, due: at ? dayStr(at) : (w.day ? dayStr(w.day) : null), remind_at: at ? at.toISOString() : null };
    var lines = [esc(what)];
    var meta = [];
    if (row.due) meta.push('📅 ' + esc(cap(niceDay(new Date(row.due + 'T00:00')))));
    if (at) meta.push('🔔 ' + esc(clock(at)));
    if (meta.length) lines.push('<small>' + meta.join(' · ') + '</small>');
    confirmCard(at ? 'New reminder' : 'New to-do', 'todos', row, lines);
  }

  function addMeeting(text) {
    var w = parseWhen(text), rest = w.rest;
    var place = null, title = null;
    var pm = rest.match(/\s(?:at|in|@)\s+(.+)$/i);
    var wm = rest.match(/\bwith\s+(.+?)(?=\s(?:at|in|@)\s|$)/i);
    if (wm) title = wm[1];
    if (pm && (!wm || pm.index > wm.index)) place = tidy(pm[1]);
    if (!title) title = rest.replace(/\s(?:at|in|@)\s+.+$/i, '').replace(/\b(add|create|new|put|a|an|meeting|appointment|mkutano|meet|see|visit)\b/gi, ' ');
    title = cap(tidy(title.replace(/\s+/g, ' ')) || 'Meeting');
    var t = text.toLowerCase();
    var kind = /quote/.test(t) ? 'quote' : /(document|forms?|sign)/.test(t) ? 'docs' : /(office|team|branch)/.test(t) ? 'office' : /(event|church|talk|seminar|fellowship)/.test(t) ? 'event' : 'new';
    var row = { title: title, place: place, kind: kind, duration_min: 30, remind_min: 30 };
    if (!w.time) {
      pending = { need: 'meetingTime', row: row, day: w.day };
      return say('What time is the meeting with <b>' + esc(title) + '</b>' + (w.day ? ' ' + esc(niceDay(w.day)) : '') + '?', 'What time is the meeting?');
    }
    finishMeeting(row, w);
  }
  function finishMeeting(row, w) {
    var at = resolve(w);
    row.starts_at = at.toISOString();
    var lines = [esc(row.title), '<small>📅 ' + esc(cap(niceDay(at))) + ' · 🕑 ' + esc(clock(at)) + (row.place ? ' · 📍 ' + esc(row.place) : '') + '</small>',
      '<small>🔔 Reminder 30 min before</small>'];
    confirmCard('New meeting', 'meetings', row, lines);
  }

  function answerPending(text) {
    var p = pending; pending = null;
    if (/^(cancel|no|never ?mind|acha)\b/i.test(text)) return say('Okay, cancelled.');
    var w = parseWhen(text);
    if (p.need === 'when') {
      if (/no reminder|just add|bila/i.test(text)) return confirmCard('New to-do', 'todos', { text: p.what, due: null, remind_at: null }, [esc(p.what)]);
      var at = resolve(w) || (w.day ? combine(w.day, { h: 9, m: 0 }) : null);
      if (!at) { pending = p; return say('Sorry, what time? For example "at 4pm", "tomorrow at 9" or "in 30 minutes". Or say "no reminder".') }
      return confirmCard('New reminder', 'todos', { text: p.what, due: dayStr(at), remind_at: at.toISOString() },
        [esc(p.what), '<small>📅 ' + esc(cap(niceDay(at))) + ' · 🔔 ' + esc(clock(at)) + '</small>']);
    }
    if (p.need === 'meetingTime') {
      if (!w.time) { pending = p; return say('Sorry, what time? For example "2pm" or "10:30".') }
      if (!w.day && p.day) w.day = p.day;
      return finishMeeting(p.row, w);
    }
  }

  function addClient(text) {
    var rest = text.replace(/^\s*(add|new|save)\s+(a\s+)?(new\s+)?client\s*[:,-]?\s*/i, '');
    var phoneM = rest.match(/(\+?\d[\d\s-]{7,}\d)/);
    var phone = phoneM ? phoneM[1].replace(/[\s-]/g, '') : null;
    if (phoneM) rest = rest.replace(phoneM[0], ' ');
    var plan = /education/i.test(rest) ? 'Education' : /whole\s*life|life cover/i.test(rest) ? 'Whole life cover' : /saving|invest/i.test(rest) ? 'Savings & investment' : /health/i.test(rest) ? 'Health' : null;
    var name = cap(tidy(rest.replace(/\b(for|interested in|wants?)\b.*$/i, '')
      .replace(/\b(phone|number|namba|education|whole\s*life|life cover|savings?|investments?|health|plan|cover)\b/gi, ' ').replace(/\s+/g, ' ')));
    if (!name) return say('What is the client\'s name? Try "Add client Mary Achieng 0712 345678".');
    var row = { name: name, phone: phone, plan: plan, status: 'new' };
    confirmCard('New client', 'clients', row, [esc(name), '<small>' + esc([phone, plan].filter(Boolean).join(' · ') || 'No phone yet') + '</small>']);
  }

  function markDone(text) {
    var phrase = text.toLowerCase().replace(/^\s*(mark|tick(\s+off)?|done( with)?|finished|completed?|i(\s+have|'ve)?\s+(done|finished|completed)|nimemaliza)\s*/i, '')
      .replace(/\s*(as\s+)?(done|complete|completed|finished)\s*$/i, '').trim();
    var words = phrase.split(/\W+/).filter(function (x) { return x.length > 2 });
    var scored = openTodos().map(function (t) {
      var tw = t.text.toLowerCase(), score = 0;
      words.forEach(function (w) { if (tw.indexOf(w) !== -1) score++ });
      return { t: t, score: score };
    }).filter(function (x) { return x.score > 0 }).sort(function (a, b) { return b.score - a.score });
    if (!scored.length) return say('I couldn\'t find an open to-do like "' + esc(phrase) + '". Say "What do I have today?" to see them.');
    var best = scored[0].t, id = 'c' + (++cardSeq);
    cards[id] = { table: 'todos', update: best.id, row: { done: true }, old: { done: false } };
    say('<div class="card" data-card="' + id + '"><b>Mark as done?</b><p>' + esc(best.text) + '</p><div class="card-actions">' +
      '<button type="button" class="pri-s" data-act="save">Yes, done</button><button type="button" data-act="cancel">No</button></div></div>', 'Mark ' + best.text + ' as done?');
  }

  /* ---------- voice: speech to text in, text to speech out ---------- */
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, listening = false;
  if (!Rec) $('aiMic').hidden = true;
  $('aiMic').addEventListener('click', function () {
    if (listening) { rec.stop(); return }
    stopSpeaking();
    rec = new Rec();
    rec.lang = 'en-KE'; rec.interimResults = true; rec.maxAlternatives = 1;
    var finalText = '';
    rec.onresult = function (e) {
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
      }
      input.value = finalText + interim;
    };
    rec.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') say('To use voice, allow the microphone for this office when your phone asks (or in its settings).');
      else if (e.error === 'no-speech') say('I didn\'t hear anything. Tap 🎤 and speak after it turns red.');
      else if (e.error === 'network') say('Voice needs an internet connection. You can type instead.');
    };
    rec.onend = function () {
      listening = false; $('aiMic').classList.remove('on');
      var said = input.value.trim();
      if (finalText.trim() && said) { input.value = ''; handle(said, true) }
    };
    try { rec.start(); listening = true; $('aiMic').classList.add('on') } catch (_) { listening = false }
  });

  var voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    var vs = speechSynthesis.getVoices();
    voice = vs.filter(function (v) { return /en[-_]KE/i.test(v.lang) })[0] || vs.filter(function (v) { return /en[-_]GB/i.test(v.lang) })[0] ||
      vs.filter(function (v) { return /^en/i.test(v.lang) })[0] || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice } else $('aiSpeakRow').hidden = true;
  function speak(text) {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text.replace(/[^\w\s.,:;!?'’-]/g, ' '));
    if (voice) u.voice = voice;
    u.rate = 1; u.pitch = 1.05;
    speechSynthesis.speak(u);
  }
  function stopSpeaking() { if ('speechSynthesis' in window) speechSynthesis.cancel() }
  try { $('aiSpeak').checked = localStorage.getItem('agiza-speak') === '1' } catch (_) {}
  $('aiSpeak').addEventListener('change', function () { try { localStorage.setItem('agiza-speak', this.checked ? '1' : '0') } catch (_) {} });

  // Exposed for testing in the browser console.
  window.AgizaAssistant = { parseWhen: parseWhen, understand: understand, handle: handle };
})();
