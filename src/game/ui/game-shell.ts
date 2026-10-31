export function mountGameShell(): HTMLDivElement {
  const app = document.querySelector<HTMLDivElement>("#app")!;
  app.innerHTML = `<div id="viewport" data-look></div><div class="vignette"></div>
<header class="hud"><button class="gallery-home" id="home" aria-label="Return to the gallery" title="Return to gallery">⌂</button><div class="world-title" id="world-title" hidden><span id="chapter-label">THE CONFERENCE CENTER</span><h1 id="world-name">The Gallery</h1></div><div class="hud-actions"><span id="seal-count" title="Stories completed">Stories 0 / 6</span><button id="pause" aria-label="Pause game">Ⅱ</button></div></header>
<div class="objective"><span class="objective-dot"></span><span id="objective">Find a painting. Take a running jump.</span></div>
<div id="collect-count" class="collect-count" hidden></div><div id="prompt" class="prompt" aria-live="polite"></div><div id="toast" class="toast" role="status"></div>
<div class="touch-controls"><div class="stick" data-stick aria-label="Movement thumbstick"><i></i><span>MOVE</span></div><div class="touch-actions"><button class="crouch" data-crouch aria-pressed="false" aria-label="Toggle crawl">Z<small>CRAWL</small></button><button class="action" data-action aria-label="Talk, search, pick up or throw">B<small>ACTION</small></button><button class="jump" data-jump aria-label="Jump">A<small>JUMP</small></button></div><button class="camera-button" data-recenter aria-label="Center camera">↻</button></div>
<div class="desktop-controls" aria-label="Controls"></div>
<div id="bow-aim" class="bow-aim" aria-hidden="true"><span class="bow-reticle">+</span><span class="bow-draw"><i></i></span></div>
<aside id="practice-lesson" class="practice-lesson" hidden><span class="eyebrow">MOVEMENT STUDIO</span><h3 id="lesson-title"></h3><p id="lesson-body"></p><small id="lesson-progress"></small></aside>
<div class="orientation-hint">↻ Best played with your phone sideways</div><div id="curtain"></div>
<div id="caught-overlay" class="caught-overlay" aria-live="assertive" aria-atomic="true" hidden><div class="caught-wipe"></div><div class="caught-card"><span class="caught-symbol" aria-hidden="true">↺</span><strong id="caught-heading">Caught!</strong><span id="caught-detail">Let’s try again.</span></div></div>
<section id="title-screen" class="screen splash-screen" aria-label="Super Mormon"><div class="splash-logo">SUPER<br><em>MORMON</em></div></section>
<section id="modal" class="screen modal-screen" hidden><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><span class="eyebrow" id="modal-kicker"></span><h2 id="modal-title"></h2><p id="modal-body"></p><div id="modal-hint" class="modal-hint"></div><div id="modal-buttons"></div></div></section>
<section id="load-error" class="screen modal-screen" hidden><div class="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="load-error-title"><h2 id="load-error-title">The gallery could not load.</h2><p>Check your connection and try again. If it still won’t load, refresh the page and try again.</p><div><button class="primary" id="load-retry">Try again</button></div></div></section>`;

  return app;
}

export const el = <E extends HTMLElement>(id: string) =>
  document.getElementById(id) as E;
