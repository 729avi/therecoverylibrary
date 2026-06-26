/* ============================================================
   THE RECOVERY LIBRARY — AI assistant widget
   Self-contained: injects its own styles, markup and behaviour.
   Drop <script src="chat.js" defer></script> on any page.
   ============================================================ */
(function () {
  "use strict";

  if (window.__rlChatLoaded) return;
  window.__rlChatLoaded = true;

  // --- API endpoint -------------------------------------------------------
  // When served over http(s) the API shares the origin; opening the files
  // directly (file://) falls back to the local backend.
  var API_BASE =
    location.protocol === "http:" || location.protocol === "https:"
      ? location.origin + "/ask"
      : "http://localhost:3000/ask";

  var SUGGESTIONS = [
    "What is the moratorium under section 14 of the IBC?",
    "How does a section 13(2) SARFAESI notice work?",
    "Difference between a charge and a mortgage?",
    "When can a guarantor be discharged under the Contract Act?",
  ];

  // --- Styles -------------------------------------------------------------
  var CSS = `
  .rl-chat{--rl-claret:#7d2733;--rl-claret-deep:#5f1c26;--rl-ground:#211d17;
    --rl-paper:#faf7f0;--rl-paper-2:#f4efe4;--rl-ink:#1f1b15;--rl-ink-soft:#564e42;
    --rl-ink-faint:#8b8173;--rl-line:#e2dac9;--rl-gilt:#9c7530;
    --rl-serif:"Spectral",Georgia,serif;--rl-mono:"IBM Plex Mono",ui-monospace,monospace;
    position:fixed;right:24px;bottom:24px;z-index:1000;}
  @media(max-width:520px){.rl-chat{right:16px;bottom:16px;}}

  /* launcher */
  .rl-launch{position:relative;width:60px;height:60px;border:none;cursor:pointer;border-radius:16px;
    background:var(--rl-claret);color:var(--rl-paper);display:grid;place-items:center;
    box-shadow:0 14px 30px -10px rgba(95,28,38,.55),0 4px 10px -4px rgba(40,30,16,.4);
    transition:transform .28s cubic-bezier(.34,1.56,.64,1),box-shadow .28s,background .2s;}
  .rl-launch:hover{transform:translateY(-3px) scale(1.04);background:var(--rl-claret-deep);
    box-shadow:0 22px 44px -12px rgba(95,28,38,.6),0 6px 14px -6px rgba(40,30,16,.45);}
  .rl-launch:active{transform:translateY(-1px) scale(.98);}
  .rl-launch:focus-visible{outline:2px solid var(--rl-gilt);outline-offset:3px;}
  .rl-launch svg{width:26px;height:26px;transition:opacity .2s,transform .3s;}
  .rl-launch .rl-ic-close{position:absolute;opacity:0;transform:rotate(-90deg) scale(.6);}
  .rl-chat.open .rl-launch .rl-ic-chat{opacity:0;transform:rotate(90deg) scale(.6);}
  .rl-chat.open .rl-launch .rl-ic-close{opacity:1;transform:rotate(0) scale(1);}
  .rl-launch .rl-pulse{position:absolute;inset:0;border-radius:16px;border:1.5px solid var(--rl-claret);
    opacity:0;animation:rlPulse 3.4s ease-out infinite;pointer-events:none;}
  @keyframes rlPulse{0%{opacity:.5;transform:scale(1);}70%,100%{opacity:0;transform:scale(1.5);}}
  .rl-chat.open .rl-pulse{display:none;}

  /* panel */
  .rl-panel{position:absolute;right:0;bottom:78px;width:392px;max-width:calc(100vw - 32px);
    height:600px;max-height:calc(100vh - 120px);background:rgba(250,247,240,.82);
    backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);
    border:1px solid rgba(226,218,201,.9);border-radius:20px;display:flex;flex-direction:column;
    overflow:hidden;transform-origin:bottom right;opacity:0;transform:translateY(18px) scale(.94);
    pointer-events:none;visibility:hidden;
    box-shadow:0 40px 80px -28px rgba(40,30,16,.5),0 12px 28px -16px rgba(40,30,16,.35),
      inset 0 1px 0 rgba(255,255,255,.5);
    transition:opacity .32s cubic-bezier(.22,1,.36,1),transform .38s cubic-bezier(.34,1.4,.5,1),visibility .32s;}
  .rl-chat.open .rl-panel{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;visibility:visible;}
  @media(max-width:520px){
    .rl-panel{position:fixed;right:0;left:0;bottom:0;top:0;width:100vw;max-width:100vw;height:100dvh;
      max-height:100dvh;border-radius:0;transform-origin:center;}
    .rl-chat.open .rl-panel{transform:translateY(0) scale(1);}
    /* full-screen panel has its own close button — hide the floating launcher
       so it never overlaps the composer */
    .rl-chat.open .rl-launch{opacity:0;pointer-events:none;transform:scale(.5);}
  }
  @media(prefers-reduced-motion:reduce){
    .rl-launch,.rl-panel,.rl-launch svg{transition-duration:.01ms!important;}
    .rl-pulse{animation:none;}
  }

  /* header */
  .rl-head{display:flex;align-items:center;gap:12px;padding:16px 18px;
    background:linear-gradient(180deg,rgba(33,29,23,.0),rgba(33,29,23,0)),var(--rl-ground);
    color:var(--rl-paper);flex-shrink:0;}
  .rl-seal{width:38px;height:38px;border-radius:9px;flex-shrink:0;display:grid;place-items:center;
    background:var(--rl-claret);color:#fff;font-family:var(--rl-serif);font-weight:600;font-size:19px;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.18);}
  .rl-htext{display:flex;flex-direction:column;line-height:1.1;flex:1;min-width:0;}
  .rl-htext b{font-family:var(--rl-serif);font-weight:600;font-size:16px;letter-spacing:.005em;}
  .rl-htext span{font-family:var(--rl-mono);font-size:8.5px;letter-spacing:.22em;text-transform:uppercase;
    color:rgba(250,247,240,.55);margin-top:4px;display:flex;align-items:center;gap:6px;}
  .rl-dot{width:6px;height:6px;border-radius:50%;background:#5aa06a;box-shadow:0 0 0 0 rgba(90,160,106,.6);
    animation:rlLive 2.4s infinite;}
  @keyframes rlLive{0%{box-shadow:0 0 0 0 rgba(90,160,106,.5);}70%,100%{box-shadow:0 0 0 5px rgba(90,160,106,0);}}
  .rl-x{background:transparent;border:none;color:rgba(250,247,240,.6);cursor:pointer;width:32px;height:32px;
    border-radius:8px;display:grid;place-items:center;transition:background .18s,color .18s;flex-shrink:0;}
  .rl-x:hover{background:rgba(255,255,255,.1);color:var(--rl-paper);}
  .rl-x:focus-visible{outline:2px solid var(--rl-gilt);outline-offset:2px;}
  .rl-new{background:transparent;border:none;color:rgba(250,247,240,.6);cursor:pointer;width:32px;height:32px;
    border-radius:8px;display:grid;place-items:center;transition:background .18s,color .18s;flex-shrink:0;}
  .rl-new:hover{background:rgba(255,255,255,.1);color:var(--rl-paper);}
  .rl-new:focus-visible{outline:2px solid var(--rl-gilt);outline-offset:2px;}
  .rl-new svg{width:18px;height:18px;}

  /* messages */
  .rl-log{flex:1;overflow-y:auto;padding:20px 18px 8px;display:flex;flex-direction:column;gap:14px;
    scroll-behavior:smooth;}
  .rl-log::-webkit-scrollbar{width:8px;}
  .rl-log::-webkit-scrollbar-thumb{background:var(--rl-line);border-radius:6px;border:2px solid transparent;
    background-clip:padding-box;}
  .rl-intro{text-align:left;padding:6px 2px 0;}
  .rl-intro h3{font-family:var(--rl-serif);font-weight:600;font-size:21px;color:var(--rl-ink);margin:0 0 6px;
    letter-spacing:-.01em;}
  .rl-intro p{font-family:var(--rl-serif);font-size:15px;line-height:1.55;color:var(--rl-ink-soft);margin:0;}
  .rl-sugs{display:flex;flex-direction:column;gap:8px;margin-top:16px;}
  .rl-sug{text-align:left;font-family:var(--rl-serif);font-size:14.5px;color:var(--rl-ink);line-height:1.4;
    background:rgba(244,239,228,.7);border:1px solid var(--rl-line);border-radius:11px;padding:11px 14px;
    cursor:pointer;transition:border-color .18s,background .18s,transform .12s;display:flex;gap:10px;align-items:center;}
  .rl-sug:hover{border-color:var(--rl-claret);background:#fff;}
  .rl-sug:active{transform:scale(.99);}
  .rl-sug::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--rl-claret);flex-shrink:0;}

  .rl-msg{display:flex;flex-direction:column;max-width:88%;animation:rlIn .34s cubic-bezier(.22,1,.36,1);}
  @keyframes rlIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
  .rl-msg.user{align-self:flex-end;align-items:flex-end;}
  .rl-msg.bot{align-self:flex-start;}
  .rl-bubble{padding:12px 15px;border-radius:15px;font-size:15px;line-height:1.6;word-wrap:break-word;}
  .rl-msg.user .rl-bubble{background:var(--rl-claret);color:#fff;border-bottom-right-radius:5px;
    font-family:var(--rl-serif);box-shadow:0 6px 14px -8px rgba(95,28,38,.5);}
  .rl-msg.bot .rl-bubble{background:#fff;color:var(--rl-ink);border:1px solid var(--rl-line);
    border-bottom-left-radius:5px;font-family:var(--rl-serif);
    box-shadow:0 8px 20px -14px rgba(40,30,16,.4);}
  .rl-bubble p{margin:0 0 10px;max-width:none;}
  .rl-bubble p:last-child{margin-bottom:0;}
  .rl-bubble strong{font-weight:600;color:inherit;}
  .rl-bubble ul,.rl-bubble ol{margin:8px 0;padding-left:20px;}
  .rl-bubble li{margin:4px 0;}
  .rl-bubble code{font-family:var(--rl-mono);font-size:12.5px;background:var(--rl-paper-2);
    padding:1px 5px;border-radius:4px;}
  .rl-msg.bot .rl-bubble.err{border-color:#d8b4a0;background:#fbf1ec;color:#8a3c1f;}
  .rl-retry{font-family:var(--rl-mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;
    color:var(--rl-claret);background:none;border:none;cursor:pointer;margin-top:8px;padding:2px 0;
    border-bottom:1px solid transparent;align-self:flex-start;}
  .rl-retry:hover{border-bottom-color:var(--rl-claret);}

  /* typing */
  .rl-typing{display:flex;gap:5px;padding:14px 16px;}
  .rl-typing i{width:7px;height:7px;border-radius:50%;background:var(--rl-ink-faint);
    animation:rlBounce 1.3s infinite ease-in-out;}
  .rl-typing i:nth-child(2){animation-delay:.18s;}
  .rl-typing i:nth-child(3){animation-delay:.36s;}
  @keyframes rlBounce{0%,60%,100%{transform:translateY(0);opacity:.4;}30%{transform:translateY(-5px);opacity:1;}}

  /* composer */
  .rl-foot{flex-shrink:0;padding:12px 14px 14px;border-top:1px solid var(--rl-line);
    background:rgba(250,247,240,.6);}
  .rl-form{display:flex;align-items:flex-end;gap:9px;background:#fff;border:1px solid var(--rl-line);
    border-radius:14px;padding:7px 7px 7px 14px;transition:border-color .18s,box-shadow .18s;}
  .rl-form:focus-within{border-color:var(--rl-claret);box-shadow:0 0 0 3px rgba(125,39,51,.1);}
  .rl-input{flex:1;border:none;outline:none;resize:none;background:transparent;font-family:var(--rl-serif);
    font-size:15px;line-height:1.5;color:var(--rl-ink);max-height:120px;padding:5px 0;}
  .rl-input::placeholder{color:var(--rl-ink-faint);}
  .rl-send{width:38px;height:38px;flex-shrink:0;border:none;border-radius:10px;background:var(--rl-claret);
    color:#fff;cursor:pointer;display:grid;place-items:center;transition:background .18s,transform .12s,opacity .18s;}
  .rl-send:hover{background:var(--rl-claret-deep);}
  .rl-send:active{transform:scale(.94);}
  .rl-send:disabled{opacity:.4;cursor:not-allowed;}
  .rl-send:focus-visible{outline:2px solid var(--rl-gilt);outline-offset:2px;}
  .rl-form.shake{animation:rlShake .4s;}
  @keyframes rlShake{0%,100%{transform:translateX(0);}20%,60%{transform:translateX(-5px);}40%,80%{transform:translateX(5px);}}
  .rl-legal{font-family:var(--rl-mono);font-size:9px;letter-spacing:.04em;color:var(--rl-ink-faint);
    text-align:center;margin:9px 4px 0;line-height:1.5;}
  `;

  // --- Icons --------------------------------------------------------------
  var ICON_CHAT =
    '<svg class="rl-ic-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var ICON_CLOSE =
    '<svg class="rl-ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var ICON_SEND =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

  // --- Safe answer renderer ----------------------------------------------
  // Escapes everything, then re-applies a small, trusted subset of markdown.
  function esc(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function inline(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }
  function render(text) {
    var blocks = text.replace(/\r/g, "").split(/\n{2,}/);
    var html = "";
    blocks.forEach(function (block) {
      var lines = block.split("\n");
      var isUL = lines.every(function (l) {
        return /^\s*[-*•]\s+/.test(l);
      });
      var isOL = lines.every(function (l) {
        return /^\s*\d+[.)]\s+/.test(l);
      });
      if (isUL && lines.length) {
        html +=
          "<ul>" +
          lines
            .map(function (l) {
              return "<li>" + inline(l.replace(/^\s*[-*•]\s+/, "")) + "</li>";
            })
            .join("") +
          "</ul>";
      } else if (isOL && lines.length) {
        html +=
          "<ol>" +
          lines
            .map(function (l) {
              return "<li>" + inline(l.replace(/^\s*\d+[.)]\s+/, "")) + "</li>";
            })
            .join("") +
          "</ol>";
      } else {
        html += "<p>" + lines.map(inline).join("<br>") + "</p>";
      }
    });
    return html;
  }

  // --- Build DOM ----------------------------------------------------------
  var style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.className = "rl-chat";
  root.innerHTML =
    '<div class="rl-panel" role="dialog" aria-modal="false" aria-label="Recovery Library AI assistant">' +
    '<div class="rl-head">' +
    '<div class="rl-seal">R</div>' +
    '<div class="rl-htext"><b>ResolveAI</b></div>' +
    '<button class="rl-new" aria-label="New conversation" title="New conversation">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>' +
    '<button class="rl-x" aria-label="Close assistant">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
    "</div>" +
    '<div class="rl-log" id="rl-log"></div>' +
    '<div class="rl-foot">' +
    '<form class="rl-form" id="rl-form">' +
    '<textarea class="rl-input" id="rl-input" rows="1" placeholder="" ' +
    'aria-label="Your question" autocomplete="off"></textarea>' +
    '<button class="rl-send" id="rl-send" type="submit" aria-label="Send">' +
    ICON_SEND +
    "</button>" +
    "</form>" +
    "</div>" +
    "</div>" +
    '<button class="rl-launch" aria-label="Open AI assistant" aria-expanded="false">' +
    '<span class="rl-pulse"></span>' +
    ICON_CHAT +
    ICON_CLOSE +
    "</button>";
  document.body.appendChild(root);

  // --- Refs ---------------------------------------------------------------
  var launch = root.querySelector(".rl-launch");
  var panel = root.querySelector(".rl-panel");
  var closeBtn = root.querySelector(".rl-x");
  var newBtn = root.querySelector(".rl-new");
  var log = root.querySelector("#rl-log");
  var form = root.querySelector("#rl-form");
  var input = root.querySelector("#rl-input");
  var sendBtn = root.querySelector("#rl-send");

  var greeted = false;
  var busy = false;
  var lastQuestion = "";

  // Conversation memory — completed turns only (the current question is sent
  // separately). Capped to the last 50 messages so context is retained within
  // a session and never silently forgotten.
  var MAX_HISTORY = 50;
  var history = [];

  // --- Helpers ------------------------------------------------------------
  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }

  function greet() {
    if (greeted) return;
    greeted = true;
    var intro = document.createElement("div");
    intro.className = "rl-intro";
    intro.innerHTML = "<h3>How can I help?</h3>";
    log.appendChild(intro);
  }

  function clearIntro() {
    var intro = log.querySelector(".rl-intro");
    var sugs = log.querySelector(".rl-sugs");
    if (intro) intro.remove();
    if (sugs) sugs.remove();
  }

  function addMessage(role, text) {
    var msg = document.createElement("div");
    msg.className = "rl-msg " + role;
    var bubble = document.createElement("div");
    bubble.className = "rl-bubble";
    if (role === "bot") bubble.innerHTML = render(text);
    else bubble.textContent = text;
    msg.appendChild(bubble);
    log.appendChild(msg);
    scrollDown();
    return msg;
  }

  function addTyping() {
    var msg = document.createElement("div");
    msg.className = "rl-msg bot";
    msg.innerHTML =
      '<div class="rl-bubble" style="padding:0"><div class="rl-typing"><i></i><i></i><i></i></div></div>';
    log.appendChild(msg);
    scrollDown();
    return msg;
  }

  function addError(text, retry) {
    var msg = document.createElement("div");
    msg.className = "rl-msg bot";
    var bubble = document.createElement("div");
    bubble.className = "rl-bubble err";
    bubble.textContent = text;
    msg.appendChild(bubble);
    if (retry) {
      var btn = document.createElement("button");
      btn.className = "rl-retry";
      btn.textContent = "↻ Try again";
      btn.addEventListener("click", function () {
        msg.remove();
        ask(lastQuestion);
      });
      msg.appendChild(btn);
    }
    log.appendChild(msg);
    scrollDown();
  }

  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  }

  // Reveal a bot answer letter by letter (time-based rAF — smooth and immune to
  // background-tab timer throttling). Re-enables input once finished.
  function typeBot(text, onDone) {
    var msg = document.createElement("div");
    msg.className = "rl-msg bot";
    var bubble = document.createElement("div");
    bubble.className = "rl-bubble";
    msg.appendChild(bubble);
    log.appendChild(msg);
    scrollDown();

    var total = text.length;
    var cps = Math.max(55, total / 6); // characters per second (~6s total)
    var shown = 0,
      last = null;
    function frame(ts) {
      if (last === null) last = ts;
      shown = Math.min(total, shown + cps * ((ts - last) / 1000));
      last = ts;
      var atBottom =
        log.scrollHeight - log.scrollTop - log.clientHeight < 80;
      bubble.innerHTML = render(text.slice(0, Math.floor(shown)));
      if (atBottom) scrollDown();
      if (Math.floor(shown) < total) requestAnimationFrame(frame);
      else if (onDone) onDone();
    }
    requestAnimationFrame(frame);
  }

  // --- Networking ---------------------------------------------------------
  async function ask(question) {
    busy = true;
    sendBtn.disabled = true;
    var typing = addTyping();

    function done() {
      busy = false;
      sendBtn.disabled = false;
    }

    try {
      var ctrl = new AbortController();
      var timer = setTimeout(function () {
        ctrl.abort();
      }, 45000);

      var res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question,
          history: history.slice(-MAX_HISTORY),
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      var data = {};
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }

      typing.remove();

      if (!res.ok || !data.answer) {
        addError(
          data.error ||
            "Something went wrong while answering. Please try again.",
          true
        );
        done();
      } else {
        // Record the completed exchange so follow-up questions keep context.
        history.push({ role: "user", content: question });
        history.push({ role: "model", content: data.answer });
        if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
        typeBot(data.answer, done);
      }
    } catch (err) {
      typing.remove();
      var emsg =
        err && err.name === "AbortError"
          ? "That took too long to answer. Please try again."
          : "Couldn’t reach the assistant. Check that the server is running and try again.";
      addError(emsg, true);
      done();
    }
  }

  function submit() {
    if (busy) return;
    var question = input.value.trim();
    if (!question) {
      form.classList.remove("shake");
      void form.offsetWidth; // reflow to restart animation
      form.classList.add("shake");
      input.focus();
      return;
    }
    clearIntro();
    lastQuestion = question;
    addMessage("user", question);
    input.value = "";
    autoGrow();
    ask(question);
  }

  // --- Open / close -------------------------------------------------------
  function open() {
    root.classList.add("open");
    launch.setAttribute("aria-expanded", "true");
    greet();
    setTimeout(function () {
      input.focus();
    }, 360);
  }
  function close() {
    root.classList.remove("open");
    launch.setAttribute("aria-expanded", "false");
    launch.focus();
  }
  function toggle() {
    root.classList.contains("open") ? close() : open();
  }

  // Start a fresh conversation: clear the log, the memory and the greeting.
  function newChat() {
    if (busy) return;
    log.innerHTML = "";
    history = [];
    greeted = false;
    lastQuestion = "";
    greet();
    input.value = "";
    autoGrow();
    input.focus();
  }

  // --- Events -------------------------------------------------------------
  launch.addEventListener("click", toggle);
  closeBtn.addEventListener("click", close);
  newBtn.addEventListener("click", newChat);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    submit();
  });

  input.addEventListener("input", autoGrow);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root.classList.contains("open")) close();
  });
})();
