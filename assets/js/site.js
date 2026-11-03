// Warashi website: small, dependency-free behaviours. The page works without JavaScript,
// and all motion stops with "Reduce motion".

// Where waitlist sign-ups go: Web3Forms emails each one to adam@warashi.app (the access key is in the form).
const WAITLIST_ENDPOINT = "https://api.web3forms.com/submit";
const CONTACT_EMAIL = "adam@warashi.app";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.classList.remove("no-js");

// Floating navigation: the pill opens into a sheet on phones.
const pill = document.querySelector(".pill");
const toggle = document.querySelector(".menu-toggle");
toggle?.addEventListener("click", () => {
  const open = pill.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll(".sheet a").forEach((a) => a.addEventListener("click", () => {
  pill.classList.remove("open");
  toggle?.setAttribute("aria-expanded", "false");
}));

// Docs menu: open on wide screens, folded on phones.
const side = document.querySelector("details.side");
if (side && matchMedia("(max-width: 860px)").matches) side.open = false;

// Reveal on scroll, and count-ups for numbers marked data-count
const seen = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add("in");
    entry.target.querySelectorAll("[data-count]").forEach(countUp);
    seen.unobserve(entry.target);
  }
}, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
document.querySelectorAll(".reveal").forEach((el) => seen.observe(el));

function countUp(el) {
  if (el.dataset.done) return;
  el.dataset.done = "1";
  const target = parseFloat(el.dataset.count), digits = (el.dataset.count.split(".")[1] || "").length;
  if (reduceMotion || target === 0) { el.firstChild.nodeValue = target.toFixed(digits); return; }
  const start = performance.now(), duration = 1500;
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1), eased = 1 - Math.pow(1 - t, 4);
    el.firstChild.nodeValue = (target * eased).toFixed(digits);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Waitlist forms
document.querySelectorAll("form.waitlist").forEach((form) => {
  const note = form.parentElement.querySelector(".waitlist-note");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.botcheck?.checked) return; // honeypot: bots tick hidden boxes
    const email = form.email.value.trim();
    window.posthog?.capture("waitlist_submitted", { connected: Boolean(WAITLIST_ENDPOINT) }); // never the email
    if (!WAITLIST_ENDPOINT) {
      note.className = "waitlist-note";
      note.innerHTML = `The list opens in a few days. Until then, <a href="mailto:${CONTACT_EMAIL}?subject=Warashi%20waitlist&body=${encodeURIComponent("Please tell me when Warashi is out: " + email)}">email us</a> and we'll write back when it's out.`;
      return;
    }
    note.className = "waitlist-note";
    note.textContent = "Adding you…";
    try {
      const response = await fetch(WAITLIST_ENDPOINT, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) throw new Error(result.message || String(response.status));
      note.className = "waitlist-note ok";
      note.textContent = "You're on the list. One email when Warashi is out.";
      window.posthog?.capture("waitlist_joined", { form: form.id || form.closest("section")?.className || "" }); // never the email
      form.reset();
    } catch {
      note.className = "waitlist-note err";
      note.innerHTML = `That didn't go through. Try again, or <a href="mailto:${CONTACT_EMAIL}">email us</a>.`;
    }
  });
});

// Live-looking numbers shared by the hero desk and the glance stage.
const values = { cpu: 23, mem: 24.8, pwr: 14.2 };
const series = { cpu: Array.from({ length: 24 }, () => 16 + Math.random() * 14), mem: Array(24).fill(77), pwr: Array.from({ length: 24 }, () => 10 + Math.random() * 6) };
function tick() {
  values.cpu = Math.max(4, Math.min(88, values.cpu + (Math.random() - .5) * 9));
  values.mem = Math.max(20, Math.min(29, values.mem + (Math.random() - .5) * .3));
  values.pwr = Math.max(4, Math.min(36, values.pwr + (Math.random() - .5) * 3));
  series.cpu.push(values.cpu); series.cpu.shift();
  series.mem.push(values.mem / 32 * 100); series.mem.shift();
  series.pwr.push(values.pwr); series.pwr.shift();
  countTo(values);
  for (const [key, max] of [["cpu", 100], ["mem", 100], ["pwr", 40]]) {
    document.querySelectorAll(`[data-spark="${key}"]`).forEach((path) =>
      path.setAttribute("points", series[key].map((v, i) => `${(i / 23 * 100).toFixed(1)},${(21 - v / max * 19).toFixed(1)}`).join(" ")));
  }
}

// Numbers count to their new value (like the app) instead of jumping: half a second, ease-out.
const shown = { ...values };
let counting;
function countTo(target) {
  const from = { ...shown }, start = performance.now();
  cancelAnimationFrame(counting);
  const frame = (now) => {
    const t = Math.min(1, (now - start) / 500), e = 1 - (1 - t) ** 3;
    for (const key in target) shown[key] = from[key] + (target[key] - from[key]) * e;
    document.querySelectorAll("[data-live]").forEach((el) => {
      const v = shown[el.dataset.live];
      el.firstChild.nodeValue = el.dataset.live === "cpu" ? Math.round(v) : v.toFixed(1);
    });
    if (t < 1) counting = requestAnimationFrame(frame);
  };
  counting = requestAnimationFrame(frame);
}
tick();

// Only animate what's on screen (battery and smoothness on phones).
function whileVisible(el, start, stop) {
  if (!el) return;
  new IntersectionObserver(([entry]) => entry.isIntersecting ? start() : stop(), { threshold: 0.05 }).observe(el);
}

let ticker;
if (!reduceMotion) {
  whileVisible(document.querySelector(".hero"), () => { ticker ??= setInterval(tick, 1100); }, () => {});
}

// The hero desk, a short story on a loop: the pointer rests on the window, drifts up to the notch, which springs
// open into the mini dashboard and closes when the pointer leaves; then it clicks the menu bar item, the popover
// opens, and a click on the desktop puts it away. Each beat gets its own time, and the story pauses off screen.
const desk = document.querySelector(".desk");
if (desk) {
  const notch = desk.querySelector(".notch"), cursor = desk.querySelector(".cursor"), pop = desk.querySelector(".pop"), item = desk.querySelector(".mb-item");
  const at = (x, y) => { cursor.style.left = x + "%"; cursor.style.top = y + "%"; };
  let onScreen = false, resume = null, playing = false;
  const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
  // Waits, then holds until the desk is back on screen.
  const wait = async (ms) => { await sleep(ms); while (!onScreen) await new Promise((go) => { resume = go; }); };
  const click = async () => { cursor.classList.add("press"); await sleep(130); cursor.classList.remove("press"); };
  const story = async () => {
    await wait(1100);
    at(50, 1.6);                       // up to the notch
    await wait(1050);                  // arrive, and a short hover dwell like the app's
    notch.classList.add("open");
    await wait(3000);                  // the numbers tick in the mini dashboard
    at(64, 42);                        // the pointer leaves...
    await wait(220);
    notch.classList.remove("open");    // ...and the notch closes behind it
    await wait(700);
    at(81, 1.6);                       // over to the menu bar item
    await wait(1000);
    await click();
    item.classList.add("on");
    pop.classList.remove("hidden");
    await wait(3400);
    at(30, 62);                        // a click on the desktop puts the popover away
    await wait(950);
    await click();
    item.classList.remove("on");
    pop.classList.add("hidden");
    await wait(600);
    at(62, 64);                        // and back to rest
  };
  if (reduceMotion) { notch.classList.add("open"); }
  else {
    whileVisible(desk, async () => {
      onScreen = true;
      resume?.(); resume = null;
      if (playing) return;
      playing = true;
      for (;;) await story();
    }, () => { onScreen = false; });
  }
}

// The glance stage: the menu bar number, and the ▲ that takes over when something needs you.
const zoomItem = document.querySelector(".zoom-bar .mb-item");
if (zoomItem && !reduceMotion) {
  const label = zoomItem.querySelector(".label");
  let n = 0, timer;
  const step = () => {
    n = (n + 1) % 8;
    const alert = n === 6 || n === 7;
    zoomItem.classList.toggle("alert", alert);
    label.textContent = alert ? "▲ MEM 29 GB" : `${Math.round(values.cpu)}%`;
    if (!alert) tick();
  };
  whileVisible(zoomItem, () => { timer ??= setInterval(step, 1200); }, () => { clearInterval(timer); timer = undefined; });
}

// The window: segmented control over real screenshots (advances by itself until the visitor picks).
const showcase = document.querySelector(".showcase");
if (showcase) {
  const tabs = [...showcase.querySelectorAll(".segmented button")], shots = [...showcase.querySelectorAll(".screen img")], caption = showcase.querySelector(".caption");
  let index = 0, auto = !reduceMotion, timer;
  const show = (i) => {
    index = i;
    tabs.forEach((t, k) => t.setAttribute("aria-selected", String(k === i)));
    shots.forEach((s, k) => s.classList.toggle("on", k === i));
    caption.textContent = tabs[i].dataset.caption;
    // Keep the chosen tab in view on narrow screens, without moving the page.
    const bar = tabs[i].parentElement;
    bar.scrollTo({ left: tabs[i].offsetLeft - (bar.clientWidth - tabs[i].offsetWidth) / 2, behavior: reduceMotion ? "auto" : "smooth" });
  };
  tabs.forEach((tab, i) => tab.addEventListener("click", () => { auto = false; show(i); }));
  show(0);
  whileVisible(showcase, () => { timer ??= setInterval(() => { if (auto) show((index + 1) % tabs.length); }, 4500); },
                         () => { clearInterval(timer); timer = undefined; });
}

// Download buttons: count clicks by place (never anything about the visitor).
document.querySelectorAll("a[data-download]").forEach((link) => {
  link.addEventListener("click", () => window.posthog?.capture("download_clicked", { place: link.dataset.download }));
});
