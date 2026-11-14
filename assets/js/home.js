// Warashi home: the story's own moving parts. site.js already handles the header, reveals, the hero Mac and counts.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // How it works: the screen on the right follows the step the reader is on.
  const story = document.querySelector(".story");
  if (story) {
    const steps = [...story.querySelectorAll(".step")], shots = [...story.querySelectorAll(".story-screen .themed")], tag = story.querySelector(".story-screen .tag");
    const show = (i) => {
      steps.forEach((s, k) => s.classList.toggle("on", k === i));
      shots.forEach((s, k) => s.classList.toggle("on", k === i));
      if (tag) tag.textContent = steps[i].dataset.tag || "";
    };
    show(0);
    if (matchMedia("(max-width: 860px)").matches) {
      // Stacked on a phone: the screen sits above the steps, and taps on a step change it.
      steps.forEach((s, i) => s.addEventListener("click", () => show(i)));
    } else {
      const seen = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) show(steps.indexOf(e.target)); });
      }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
      steps.forEach((s) => seen.observe(s));
    }
  }

  // The flight log writes itself, one line after another, the first time it comes into view.
  const log = document.querySelector(".log");
  if (log) {
    if (reduce) log.classList.add("on");
    else new IntersectionObserver((entries, o) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      log.classList.add("on"); o.disconnect();
    }, { threshold: 0.25 }).observe(log);
  }

  // The comparison: a tap on a column heading on a phone brings that column into view.
  const compare = document.querySelector(".compare");
  if (compare) {
    compare.querySelectorAll("thead th").forEach((th, i) => th.addEventListener("click", () => {
      const cell = compare.querySelector(`tbody tr td:nth-child(${i + 1})`);
      cell?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" });
    }));
  }

})();
