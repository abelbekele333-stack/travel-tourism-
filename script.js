(() => {
  const world = document.getElementById("world");
  const stage = document.querySelector(".stage");
  const root = stage || world;
  const track = document.getElementById("sightsTrack");
  const prevBtn = document.getElementById("sightPrev");
  const nextBtn = document.getElementById("sightNext");
  const controls = document.getElementById("sightsControls");
  const cards = Array.from(track.querySelectorAll(".sight-card"));
  const originalSightCount = cards.length;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => lerp(a, b, t);

  const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  };

  const segmentInOut = (value, inStart, inEnd, outStart, outEnd) => {
    if (value < inStart) return 0;
    if (value < inEnd) return smoothstep(inStart, inEnd, value);
    if (value < outStart) return 1;
    if (value < outEnd) return 1 - smoothstep(outStart, outEnd, value);
    return 0;
  };

  cards.forEach((card, i) => {
    card.dataset.originalIndex = String(i);
  });

  const originals = cards.map((card) => card.cloneNode(true));
  track.innerHTML = "";

  for (let setIndex = 0; setIndex < 3; setIndex += 1) {
    originals.forEach((node, cardIndex) => {
      const clone = node.cloneNode(true);
      clone.dataset.sightIndex = String(setIndex * originalSightCount + cardIndex);
      track.appendChild(clone);
    });
  }

  let activeSight = originalSightCount;
  let jumping = false;

  const gap = () => {
    const style = getComputedStyle(track);
    return parseFloat(style.columnGap || style.gap) || 22;
  };

  const cardWidth = () => {
    const first = track.querySelector(".sight-card");
    return first ? first.getBoundingClientRect().width : 360;
  };

  const applyShift = () => {
    const shift = -(cardWidth() + gap()) * activeSight;
    root.style.setProperty("--sights-shift", `${shift}px`);
  };

  const normalizeTrack = () => {
    if (activeSight >= originalSightCount * 2) {
      jumping = true;
      track.classList.add("is-jumping");
      activeSight -= originalSightCount;
      applyShift();
      requestAnimationFrame(() => {
        track.classList.remove("is-jumping");
        jumping = false;
      });
    } else if (activeSight < originalSightCount) {
      jumping = true;
      track.classList.add("is-jumping");
      activeSight += originalSightCount;
      applyShift();
      requestAnimationFrame(() => {
        track.classList.remove("is-jumping");
        jumping = false;
      });
    }
  };

  const goTo = (dir) => {
    if (jumping) return;
    activeSight += dir;
    applyShift();
    const onEnd = (e) => {
      if (e.propertyName !== "transform") return;
      track.removeEventListener("transitionend", onEnd);
      normalizeTrack();
    };
    track.addEventListener("transitionend", onEnd);
    if (reduceMotion) normalizeTrack();
  };

  prevBtn.addEventListener("click", () => goTo(-1));
  nextBtn.addEventListener("click", () => goTo(1));

  const activateCard = (card) => {
    const original = Number(card.dataset.originalIndex);
    if (Number.isNaN(original)) return;
    const currentMod = ((activeSight % originalSightCount) + originalSightCount) % originalSightCount;
    const delta = original - currentMod;
    if (delta === 0) return;
    goTo(delta);
  };

  track.addEventListener("click", (e) => {
    const card = e.target.closest(".sight-card");
    if (card) activateCard(card);
  });

  track.addEventListener("keydown", (e) => {
    const card = e.target.closest(".sight-card");
    if (!card) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activateCard(card);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(-1);
    }
  });

  let targetScroll = 0;
  let currentScroll = 0;
  let targetMx = 0;
  let targetMy = 0;
  let currentMx = 0;
  let currentMy = 0;
  let controlsLive = false;
  let ticking = false;

  const setVar = (name, value) => root.style.setProperty(name, value);

  const applyScene = (scroll, mx, my) => {
    const frame2 = segmentInOut(scroll, 560, 900, 1300, 1620);
    const frame3 = segmentInOut(scroll, 1760, 2140, 2540, 2700);
    const progress = clamp(scroll / 2700);
    const introExit = smoothstep(90, 650, scroll);
    const sightsEnter = Math.pow(smoothstep(2760, 3560, scroll), 1.55);
    const controlsT = smoothstep(3360, 3660, scroll);

    setVar("--mx", reduceMotion ? "0" : mx.toFixed(4));
    setVar("--my", reduceMotion ? "0" : my.toFixed(4));

    const titleY = mix(0, -210, introExit);
    const titleScale = mix(1, 0.92, introExit);
    const titleOpacity = 1 - introExit;
    setVar("--title-y", `${titleY}px`);
    setVar("--title-scale", titleScale.toFixed(4));
    setVar("--title-opacity", titleOpacity.toFixed(4));

    setVar("--intro-copy-y", `${mix(0, 90, introExit)}px`);
    setVar("--intro-copy-opacity", (1 - introExit).toFixed(4));

    const backScale = mix(0.76, 1.18, progress);
    setVar("--back-scale", backScale.toFixed(4));

    const blur = mix(0, 14, frame2);
    setVar("--blur-px", `${blur.toFixed(2)}px`);
    setVar("--back-brightness", mix(1, 0.745, frame2).toFixed(4));

    const bridgeWidth = mix(67.2, 105, frame2);
    const bridgeBottom = mix(5, -8, frame2);
    const bridgeY = mix(0, -760, frame2);
    const bridgeScale = mix(1, 1.46, frame2);
    setVar("--bridge-width", `${bridgeWidth}vw`);
    setVar("--bridge-bottom", `${bridgeBottom}vh`);
    setVar("--bridge-y", `${bridgeY}px`);
    setVar("--bridge-scale", bridgeScale.toFixed(4));
    setVar("--bridge-x", `${mx * 10}px`);

    const splitX = mix(0, 46, frame2);
    const splitY = mix(0, -180, frame2);
    const splitScale = mix(1, 0.74, frame2);
    setVar("--split-left-x", `${-splitX}vw`);
    setVar("--split-right-x", `${splitX}vw`);
    setVar("--split-left-y", `${splitY}px`);
    setVar("--split-right-y", `${splitY}px`);
    setVar("--split-left-scale", splitScale.toFixed(4));
    setVar("--split-right-scale", splitScale.toFixed(4));

    setVar("--frame2-opacity", frame2.toFixed(4));
    setVar("--frame2-y", `${mix(40, 0, frame2)}px`);
    setVar("--frame2-scale", mix(1.04, 1, frame2).toFixed(4));

    const shadeIn = Math.max(frame2, frame3 * 0.35);
    setVar("--shade-top-alpha", (shadeIn * 0.22).toFixed(4));
    setVar("--shade-mid-alpha", (shadeIn * 0.38).toFixed(4));
    setVar("--shade-bottom-alpha", (shadeIn * 0.55).toFixed(4));

    const panel2 = frame2;
    setVar("--panel2-opacity", panel2.toFixed(4));
    setVar("--panel2-y", `${mix(48, 0, panel2)}px`);

    const panel3 = frame3;
    setVar("--panel3-opacity", panel3.toFixed(4));
    setVar("--panel3-y", `${mix(48, 0, panel3)}px`);

    setVar("--bazaar-saturation", mix(1, 1.18, frame3).toFixed(4));
    setVar("--bazaar-brightness", mix(1, 0.92, frame3).toFixed(4));
    setVar("--four-y", `${mix(0, 40, progress)}px`);

    const enterX = mix(420, 0, sightsEnter);
    setVar("--sights-enter-x", `${enterX}vw`);
    setVar("--sights-visibility", sightsEnter > 0.02 ? "visible" : "hidden");
    setVar("--sights-scale", (1 / Math.max(backScale, 0.001)).toFixed(4));

    setVar("--sights-controls-opacity", controlsT.toFixed(4));
    const live = controlsT >= 0.98;
    if (live !== controlsLive) {
      controlsLive = live;
      controls.style.pointerEvents = live ? "auto" : "none";
      setVar("--sights-controls-pointer", live ? "auto" : "none");
    }
  };

  const tick = () => {
    ticking = true;
    if (reduceMotion) {
      currentScroll = window.scrollY;
      currentMx = 0;
      currentMy = 0;
    } else {
      currentScroll += (targetScroll - currentScroll) * 0.14;
      currentMx += (targetMx - currentMx) * 0.12;
      currentMy += (targetMy - currentMy) * 0.12;
    }
    applyScene(currentScroll, currentMx, currentMy);

    const stillMoving =
      !reduceMotion &&
      (Math.abs(targetScroll - currentScroll) > 0.15 ||
        Math.abs(targetMx - currentMx) > 0.001 ||
        Math.abs(targetMy - currentMy) > 0.001);

    if (stillMoving) {
      requestAnimationFrame(tick);
    } else {
      ticking = false;
      applyScene(targetScroll, reduceMotion ? 0 : targetMx, reduceMotion ? 0 : targetMy);
    }
  };

  const requestTick = () => {
    if (!ticking) requestAnimationFrame(tick);
  };

  window.addEventListener(
    "scroll",
    () => {
      targetScroll = window.scrollY;
      requestTick();
    },
    { passive: true }
  );

  window.addEventListener(
    "pointermove",
    (e) => {
      if (reduceMotion) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetMx = nx;
      targetMy = ny;
      requestTick();
    },
    { passive: true }
  );

  window.addEventListener("resize", () => {
    applyShift();
    requestTick();
  });

  applyShift();
  targetScroll = window.scrollY;
  currentScroll = targetScroll;
  applyScene(currentScroll, 0, 0);
})();
