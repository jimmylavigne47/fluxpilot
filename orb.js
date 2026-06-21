/* FluxPilot — orbe nuage de points 3D + starfield (canvas, zéro dépendance)
   DA de référence : interface Cortana (JARVIS HUD, orange sur noir profond). */
(function () {
  "use strict";
  var canvas = document.getElementById("bg-orb");
  if (!canvas) return;
  var ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, CX = 0, CY = 0, R = 0;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Nuage de points sur une sphère (distribution de Fibonacci) ----
  var N = 2600;
  var pts = new Array(N);
  (function build() {
    var gold = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2;        // -1 .. 1
      var rad = Math.sqrt(1 - y * y);
      var th = gold * i;
      pts[i] = {
        x: Math.cos(th) * rad,
        y: y,
        z: Math.sin(th) * rad,
        s: 0.5 + Math.random() * 0.9,        // jitter taille
        hot: Math.random() < 0.06            // points "étincelle"
      };
    }
  })();

  // ---- Étoiles + quelques "planètes" pâles (comme la réf) ----
  var stars = [];
  function buildStars() {
    stars.length = 0;
    var n = Math.round((W * H) / 9000);
    n = Math.max(90, Math.min(n, 320));
    for (var i = 0; i < n; i++) {
      var big = Math.random() < 0.04;
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: big ? 1.6 + Math.random() * 1.8 : 0.4 + Math.random() * 1.0,
        a: 0.18 + Math.random() * 0.6,
        tw: Math.random() * Math.PI * 2,
        big: big
      });
    }
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = W * 0.5;
    CY = H * (W < 760 ? 0.46 : 0.52);
    R = Math.min(W, H) * (W < 760 ? 0.34 : 0.27);
    buildStars();
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  var ang = 0, tilt = 0, t = 0;

  function frame() {
    t += 1;
    if (!reduce) { ang += 0.0016; tilt = Math.sin(t * 0.0008) * 0.32; }

    // fond noir profond
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, W, H);

    // étoiles
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      var tw = reduce ? st.a : st.a * (0.65 + 0.35 * Math.sin(t * 0.03 + st.tw));
      ctx.beginPath();
      ctx.fillStyle = st.big ? "rgba(210,214,224," + tw + ")" : "rgba(225,230,240," + tw + ")";
      ctx.arc(st.x, st.y, st.r, 0, 6.2832);
      ctx.fill();
    }

    // halo central (réacteur)
    var grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 1.7);
    grd.addColorStop(0, "rgba(255,138,40,0.16)");
    grd.addColorStop(0.45, "rgba(255,110,20,0.06)");
    grd.addColorStop(1, "rgba(255,110,20,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(CX - R * 1.8, CY - R * 1.8, R * 3.6, R * 3.6);

    // points de la sphère (additif pour l'effet incandescent)
    ctx.globalCompositeOperation = "lighter";
    var ca = Math.cos(ang), sa = Math.sin(ang);
    var ct = Math.cos(tilt), stt = Math.sin(tilt);
    for (var i = 0; i < N; i++) {
      var p = pts[i];
      // rotation Y
      var x1 = p.x * ca - p.z * sa;
      var z1 = p.x * sa + p.z * ca;
      // rotation X (tilt)
      var y1 = p.y * ct - z1 * stt;
      var z2 = p.y * stt + z1 * ct;
      // profondeur normalisée 0(arrière)..1(avant)
      var d = (z2 + 1) * 0.5;
      var persp = 0.78 + d * 0.42;
      var sx = CX + x1 * R * persp;
      var sy = CY + y1 * R * persp;
      var size = (p.s * (0.5 + d * 1.7)) * (W < 760 ? 0.85 : 1);
      var alpha = 0.10 + d * d * 0.85;
      // couleur : arrière brun-orange -> avant ambre clair
      var rr = Math.round(lerp(150, 255, d));
      var gg = Math.round(lerp(60, 200, d));
      var bb = Math.round(lerp(20, 110, d * d));
      if (p.hot && d > 0.55) { rr = 255; gg = 226; bb = 170; alpha = Math.min(1, alpha + 0.25); size += 0.6; }
      ctx.fillStyle = "rgba(" + rr + "," + gg + "," + bb + "," + alpha + ")";
      ctx.fillRect(sx, sy, size, size);
    }
    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(running ? frame : noop);
  }
  function noop() {}

  var running = true;
  document.addEventListener("visibilitychange", function () {
    var was = running;
    running = !document.hidden;
    if (running && !was) requestAnimationFrame(frame);
  });

  window.addEventListener("resize", resize, { passive: true });
  resize();
  requestAnimationFrame(frame);
})();
