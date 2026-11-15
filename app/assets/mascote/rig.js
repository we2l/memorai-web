// Baigi dolphin mascot: how to draw one frame of mascote.svg. Product data, loaded by the hub's
// HUB.mascote (hub/content/formatos/bonecos/HUB.md). Contract: this file declares
//   const MASCOTE = { desenhar(raiz, q) }
// raiz = the <svg> of one copy of mascote.svg (parts are found by class, never by id).
// q = { t, de, para, p, fala, olhar, semente }:
//   t        video time in seconds (drives the idle: breathing, tail, blink)
//   de, para two state objects of mascote.json (the previous one and the current one)
//   p        0..1, already eased: how far the change from `de` to `para` has gone
//   fala     null (not speaking) or the voice level 0..1 at this instant
//   olhar    { x, y, w }: look direction -1..1 in the art's own space, w = how much it overrides
//   semente  number, varies the blink times
// desenhar is a PURE function of its arguments: no clock, no state kept between calls, every
// managed style is written on every call. The renderer may ask for any frame in any order.
export const MASCOTE = (() => {
  const PIVOT = { far: [66, 155], near: [140, 150] };
  const cache = new WeakMap();
  const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

  // poses come from the reference paths in <defs> (class far-shape / near-shape)
  function poses(root, kind) {
    let c = cache.get(root);
    if (!c) cache.set(root, (c = {}));
    if (!c[kind]) {
      c[kind] = {};
      root.querySelectorAll(`.${kind}-shape`).forEach(e => {
        c[kind][e.dataset.name] = {
          pts: e.getAttribute('d').match(/-?\d+\.?\d*/g).map(Number),
          ang: (+e.dataset.ang * Math.PI) / 180,
          front: e.dataset.front === '1',
        };
      });
    }
    return c[kind];
  }

  // each pose is read in its own frame (x along the flipper); the frames rotate from one direction to
  // the other around the shoulder while the outline blends, so the flipper swings instead of shrinking
  function blend(a, b, p, [px, py]) {
    const ang = a.ang + (b.ang - a.ang) * p, out = [];
    const ca = Math.cos(a.ang), sa = Math.sin(a.ang), cb = Math.cos(b.ang), sb = Math.sin(b.ang);
    const c = Math.cos(ang), s = Math.sin(ang);
    for (let i = 0; i < a.pts.length; i += 2) {
      const ax = a.pts[i] - px, ay = a.pts[i + 1] - py, bx = b.pts[i] - px, by = b.pts[i + 1] - py;
      const lx = (ax * ca + ay * sa) * (1 - p) + (bx * cb + by * sb) * p;
      const ly = (-ax * sa + ay * ca) * (1 - p) + (-bx * sb + by * cb) * p;
      out.push(px + lx * c - ly * s, py + lx * s + ly * c);
    }
    return { pts: out, ang };
  }

  // drop = number of trailing segments left out (open outline, or fill closed by a straight line)
  function d(pts, drop, close) {
    const n = pts.length - 6 * drop, f = v => +v.toFixed(2);
    let s = `M${f(pts[0])},${f(pts[1])}`;
    for (let i = 2; i < n; i += 6) s += ` C${f(pts[i])},${f(pts[i + 1])} ${f(pts[i + 2])},${f(pts[i + 3])} ${f(pts[i + 4])},${f(pts[i + 5])}`;
    return close ? s + ' Z' : s;
  }

  const set = (root, sel, v) => root.querySelectorAll(sel).forEach(e => e.setAttribute('d', v));

  // details (highlights, creases) belong to one pose: they ride along with the swing and fade in at the end
  function details(root, sel, weight, ang, P, kind) {
    root.querySelectorAll(sel).forEach(e => {
      const w = sm((weight(e.dataset.for) - 0.6) / 0.4);
      e.style.display = w > 0 ? 'inline' : 'none';
      e.style.opacity = w;
      e.style.transformOrigin = `${PIVOT[kind][0]}px ${PIVOT[kind][1]}px`;
      e.style.transform = `rotate(${(((ang - P[e.dataset.for].ang) * 180) / Math.PI).toFixed(2)}deg)`;
    });
  }

  function far(root, from, to, p = 1) {
    const P = poses(root, 'far'), a = P[from], b = P[to || from];
    const m = blend(a, b, p, PIVOT.far);
    set(root, '.far-fill, .far-line-closed', d(m.pts, 0, true));
    set(root, '.far-line-open', d(m.pts, 1, false));
    // a front pose (thinking fist): the copy in front of the body fades in over the opaque copy behind,
    // halfway through the swing, when the flipper points away from the body and overlaps it the least
    const fw = (a.front ? 1 - p : 0) + (b.front ? p : 0);
    const fo = sm((fw - 0.3) / 0.35);
    root.querySelectorAll('.far-flipper-front').forEach(e => {
      e.style.display = fo > 0 ? 'inline' : 'none';
      e.style.opacity = fo;
    });
    details(root, '.far-detail', n => (n === from ? 1 - p : 0) + (n === (to || from) ? p : 0), m.ang, P, 'far');
  }

  function near(root, from, to, p = 1) {
    const P = poses(root, 'near'), a = P[from], b = P[to || from];
    const m = blend(a, b, p, PIVOT.near);
    set(root, '.near-fill', d(m.pts, 1, true));
    set(root, '.near-flipper-line-closed', d(m.pts, 0, true));
    const w = n => (n === from ? 1 - p : 0) + (n === (to || from) ? p : 0);
    root.querySelectorAll('.near-detail-rest').forEach(e => { e.style.opacity = sm((w('rest') - 0.6) / 0.4); });
    root.querySelectorAll('.near-detail-thumb').forEach(e => {
      const o = sm((w('thumb') - 0.6) / 0.4);
      e.style.display = o > 0 ? 'inline' : 'none';
      e.style.opacity = o;
    });
  }

  const TAU = Math.PI * 2;
  const mixn = (a, b, p) => a + (b - a) * p;
  const hash = (k, seed) => { const v = Math.sin(k * 127.1 + seed * 311.7) * 43758.5453; return v - Math.floor(v); };
  // every field a state of mascote.json may set, with the neutral value
  const NEUTRO = { corpo: [0, 0, 0], rosto: 0, braco: 0, nadadeira: 0, sobrancelha: [0, 0, 0], olhar: [0, 0], iris: 1,
    olho: "eye", olho_escala: 1, bochecha: 1, boca: "mouth-smile", brilho: false, sobrancelha_far: false,
    acessorios: [], pose_nadadeira: "rest", pose_braco: "rest", braco_erguido: false, acena: 0, balanca: 0 };
  const EYES = ["eye", "eye-happy", "eye-closed", "eye-wink"];
  const LOOK = 3;         // px of iris travel for a look of 1
  const BLINK_EVERY = 3.7;

  const partCache = new WeakMap();
  function parts(root) {
    let c = partCache.get(root);
    if (!c) {
      const all = sel => Array.from(root.querySelectorAll(sel));
      c = { all, memo: {}, mouths: all(".mouth > *"), props: all('[class^="prop-"]'), zz: all(".prop-zz use") };
      partCache.set(root, c);
    }
    return c;
  }

  // eyelid 0 (open) .. 1 (shut): one blink per BLINK_EVERY window, at a time that depends on the seed
  function blink(t, seed) {
    const k0 = Math.floor(t / BLINK_EVERY);
    let v = 0;
    for (let k = k0 - 1; k <= k0 + 1; k++) {
      const d = t - (k * BLINK_EVERY + 0.6 + hash(k, seed) * 2.2);
      if (d > -0.07 && d < 0.11) v = Math.max(v, d < 0 ? sm((d + 0.07) / 0.07) : d < 0.03 ? 1 : 1 - sm((d - 0.03) / 0.08));
    }
    return v;
  }

  function desenhar(root, q) {
    const P = parts(root), a = Object.assign({}, NEUTRO, q.de), b = Object.assign({}, NEUTRO, q.para);
    const p = Math.max(0, Math.min(1, q.p)), t = q.t, now = p < 0.5 ? a : b;
    const n = k => mixn(+a[k], +b[k], p);
    const v = (k, i) => mixn(a[k][i], b[k][i], p);
    const get = sel => P.memo[sel] || (P.memo[sel] = P.all(sel));
    const tf = (sel, val) => get(sel).forEach(e => { e.style.transform = val; });
    const show = (sel, on) => get(sel).forEach(e => { e.style.display = on ? "inline" : "none"; });
    const f = x => x.toFixed(3);

    // idle: slow breathing, tail and dorsal sway. Sines of t only, so there is never a jump
    const br = Math.sin((TAU * t) / 3.4);
    tf(".golfinho", `scale(${(1.006 + 0.006 * br).toFixed(4)}, ${(1.011 + 0.011 * br).toFixed(4)})`);
    tf(".tail-wag", `rotate(${f(0.5 + 5.5 * Math.sin((TAU * t) / 2.6))}deg)`);
    tf(".dorsal", `rotate(${f(1.5 * Math.sin((TAU * t) / 3.4 + 1))}deg)`);

    // body lean (the tail counter-rotates so it stays on the ground) and head tilt
    const lean = v("corpo", 0);
    tf(".pose", `translate(${f(v("corpo", 1))}px, ${f(v("corpo", 2))}px) rotate(${f(lean)}deg)`);
    tf(".tail", `rotate(${f(-lean)}deg)`);
    tf(".face", `rotate(${f(n("rosto") + 2 * n("balanca") * Math.sin((TAU * t) / 2.4))}deg)`);

    // flippers: rotation + one path per flipper blended between two poses (a swing, never a swap)
    tf(".near-flipper", `rotate(${f(n("braco") + 14 * n("acena") * Math.sin((TAU * t) / 1.1))}deg)`);
    near(root, a.pose_braco, b.pose_braco, p);
    const raised = mixn(a.braco_erguido ? 1 : 0, b.braco_erguido ? 1 : 0, p), closed = raised > 0.15;
    show(".near-flipper-line-closed", closed);
    show(".near-flipper-line-open", !closed);
    get(".near-flipper-shadow").forEach(e => { e.style.opacity = closed ? 0 : 1 - sm(raised / 0.15); });
    tf(".far-flipper", `rotate(${f(n("nadadeira"))}deg)`);
    far(root, a.pose_nadadeira, b.pose_nadadeira, p);

    // face
    tf(".brow", `translate(${f(v("sobrancelha", 0))}px, ${f(v("sobrancelha", 1))}px) rotate(${f(v("sobrancelha", 2))}deg)`);
    const bf = mixn(a.sobrancelha_far ? 1 : 0, b.sobrancelha_far ? 1 : 0, p);
    get(".brow-far").forEach(e => { e.style.display = bf > 0 ? "inline" : "none"; e.style.opacity = bf; });
    const o = q.olhar || { x: 0, y: 0, w: 0 };
    tf(".iris", `translate(${f(mixn(v("olhar", 0), o.x * LOOK, o.w))}px, ${f(mixn(v("olhar", 1), o.y * LOOK, o.w))}px) scale(${f(n("iris"))})`);
    tf(".eye", `scale(${f(n("olho_escala"))})`);
    tf(".blush", `scale(${f(n("bochecha"))})`);
    // a change of eye shape happens behind the shut eyelid, halfway through
    const swap = a.olho !== b.olho ? sm(1 - Math.abs(2 * p - 1)) : 0;
    tf(".lid", `scaleY(${Math.max(0.001, blink(t, q.semente || 1), swap).toFixed(3)})`);
    EYES.forEach(c => show("." + c, c === now.olho));
    show(".iris-sparkle", !!now.brilho);
    show(".iris-dots", !now.brilho);

    // mouth: the state's own, or the speech shapes by voice level (15 steps per second, like the kit)
    let mouth = now.boca;
    if (q.fala != null && q.fala >= 0.12) {
      const round = hash(Math.floor(t * 15), 7) < 0.3;
      mouth = q.fala < 0.45 ? (round ? "mouth-o" : "mouth-small") : round ? "mouth-o" : "mouth-open";
    }
    P.mouths.forEach(e => { e.style.display = e.classList.contains(mouth) ? "inline" : "none"; });

    // accessories fade with the state that owns them
    P.props.forEach(e => {
      const c = e.classList[0], w = (a.acessorios.includes(c) ? 1 - p : 0) + (b.acessorios.includes(c) ? p : 0);
      e.style.display = w > 0 ? "inline" : "none";
      e.style.opacity = Math.min(1, w).toFixed(3);
    });
    P.zz.forEach((e, i) => { e.style.opacity = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(TAU * (t / 3 - i / 3)))).toFixed(3); });
  }

  return { desenhar };
})();
