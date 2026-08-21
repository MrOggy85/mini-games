// Juice Toolkit — tiny, dependency-free "game feel" helpers.
//
// This file is NOT loaded by any game (games are self-contained single HTML
// files, per CLAUDE.md). It's a copy-paste source: pick the function(s) a
// game needs and paste them directly into that game's <script> block.
// Uses only the Web Animations API (`el.animate(...)`) and rAF — no build
// step, no external assets, works fully offline.
//
// See CLAUDE.md → "Juice Toolkit" for when to reach for each helper.
// Reference implementation prototyped in games/glide/index.html.

// Damped-spring value animation — smoother than a fixed-duration easing
// curve for anything driven by a changing target (drag-to-target, follow).
function juiceSpring(from, to, onUpdate, opts) {
  opts = opts || {};
  var stiffness = opts.stiffness || 170;
  var damping = opts.damping || 18;
  var mass = opts.mass || 1;
  var precision = opts.precision || 0.01;
  var value = from, velocity = 0, raf = null;

  function tick() {
    var force = -stiffness * (value - to);
    var damp = -damping * velocity;
    var accel = (force + damp) / mass;
    velocity += accel / 60;
    value += velocity / 60;
    onUpdate(value);
    if (Math.abs(to - value) > precision || Math.abs(velocity) > precision) {
      raf = requestAnimationFrame(tick);
    } else {
      onUpdate(to);
    }
  }
  raf = requestAnimationFrame(tick);
  return function stop() { if (raf) cancelAnimationFrame(raf); };
}

// Squash & stretch pulse — feedback that something landed, was picked up,
// or was placed correctly. If `el` already has a transform set via inline
// style (e.g. a translate placing it on a grid), pass it as `opts.base` so
// the squash keyframes compose with it instead of clobbering it for the
// duration of the animation.
function juiceSquash(el, opts) {
  opts = opts || {};
  var sx = opts.sx != null ? opts.sx : 1.25;
  var sy = opts.sy != null ? opts.sy : 0.8;
  var duration = opts.duration || 220;
  var base = opts.base ? opts.base + ' ' : '';
  el.animate([
    { transform: base + 'scale(1,1)' },
    { transform: base + 'scale(' + sx + ',' + sy + ')', offset: 0.35 },
    { transform: base + 'scale(' + (2 - sx) + ',' + (2 - sy) + ')', offset: 0.6 },
    { transform: base + 'scale(1,1)' }
  ], { duration: duration, easing: 'ease-out' });
}

// Brief shake — invalid move / collision / "can't do that" feedback.
// Pass an element (a tile) or a container (the whole board).
function juiceShake(el, opts) {
  opts = opts || {};
  var mag = opts.magnitude || 6;
  var duration = opts.duration || 300;
  el.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-' + mag + 'px)' },
    { transform: 'translateX(' + mag + 'px)' },
    { transform: 'translateX(-' + (mag * 0.7) + 'px)' },
    { transform: 'translateX(' + (mag * 0.5) + 'px)' },
    { transform: 'translateX(0)' }
  ], { duration: duration, easing: 'ease-in-out' });
}

// Small particle burst at a viewport position — "cleared" / "collected" /
// "scored" moments. Cheaper and more targeted than a full-screen confetti
// drop. `colors` is an array of CSS color strings.
function juiceBurst(x, y, colors, opts) {
  opts = opts || {};
  var count = opts.count || 14;
  var spread = opts.spread || 70;
  var duration = opts.duration || 500;
  for (var i = 0; i < count; i++) {
    var el = document.createElement('div');
    var angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    var dist = spread * (0.5 + Math.random() * 0.5);
    var dx = Math.cos(angle) * dist;
    var dy = Math.sin(angle) * dist;
    var size = 4 + Math.random() * 4;
    el.style.cssText =
      'position:fixed;left:' + x + 'px;top:' + y + 'px;' +
      'width:' + size + 'px;height:' + size + 'px;border-radius:50%;' +
      'background:' + colors[i % colors.length] + ';' +
      'pointer-events:none;z-index:999;';
    document.body.appendChild(el);
    (function(particle, tx, ty) {
      particle.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(0.3)', opacity: 0 }
      ], { duration: duration, easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = function() {
        if (particle.parentNode) particle.parentNode.removeChild(particle);
      };
    }(el, dx, dy));
  }
}
