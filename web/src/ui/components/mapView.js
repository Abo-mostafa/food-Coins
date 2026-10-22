import { h, uiRoot, ICONS } from './dom.js';
import { FOOD_IMAGES, UI_IMAGES } from '../../assets.js';
import { LEVELS, LEVEL_COUNT } from '../../game/LevelConfig.js';
import { state, subscribe } from '../../state.js';
import { AudioManager } from '../../game/AudioManager.js';
import { toast } from './toast.js';

const SPACING = 124;
const TOP_PAD = 190;
const BOTTOM_PAD = 150;
const ZONES = [
  { from: 1, to: 10, name: 'مطبخ البروست', color: 'rgba(255,200,87,.20)', foods: ['broast', 'fries'] },
  { from: 11, to: 20, name: 'شارع الشاورما', color: 'rgba(124,203,77,.16)', foods: ['shawarma', 'club'] },
  { from: 21, to: 30, name: 'حي البيتزا والبرجر', color: 'rgba(240,98,77,.14)', foods: ['pizza', 'burger'] },
];

const totalHeight = () => TOP_PAD + BOTTOM_PAD + (LEVEL_COUNT - 1) * SPACING;
const nodeY = (id) => totalHeight() - BOTTOM_PAD - (id - 1) * SPACING;
const nodeX = (id) => 50 + Math.sin(id * 0.95) * 30; // percent

function initials(user) {
  const name = user?.displayName || user?.email || '?';
  return name.trim().slice(0, 2).toUpperCase();
}

function avatarEl(user) {
  const el = h('div', { class: 'avatar' });
  if (user?.photoURL) {
    const img = h('img', { src: user.photoURL, alt: '', referrerpolicy: 'no-referrer' });
    img.onerror = () => {
      img.remove();
      el.textContent = initials(user);
    };
    el.appendChild(img);
  } else el.textContent = initials(user);
  return el;
}

export function mountMap({ onPlay, onSignOut, onRetryPending }) {
  const root = h('div', { class: 'map-view' });
  const scroll = h('div', { class: 'map-scroll' });
  const inner = h('div', { class: 'map-inner', style: { height: `${totalHeight()}px` } });
  scroll.appendChild(inner);

  // ---- top bar ----
  const coinValue = h('span', {}, '—');
  const coinPill = h('div', { class: 'coin-pill', title: 'رصيد الكوينز' }, h('img', { src: UI_IMAGES.coin, alt: '' }), coinValue);
  const menuBtn = h('button', { class: 'icon-btn', 'aria-label': 'الإعدادات', html: ICONS.gear });
  const avatarSlot = h('div', {});
  const topbar = h(
    'div',
    { class: 'topbar' },
    h('div', { class: 'logo' }, h('img', { src: UI_IMAGES.logoCoin, alt: '' }), 'FoodCoins'),
    h('div', { class: 'spacer' }),
    coinPill,
    avatarSlot,
    menuBtn,
  );

  let menu = null;
  const closeMenu = () => {
    menu?.remove();
    menu = null;
  };
  const switchEl = (on) => h('span', { class: `switch ${on ? 'on' : ''}` });
  menuBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    AudioManager.unlock();
    AudioManager.play('click');
    if (menu) return closeMenu();
    const sfxBtn = h('button', {}, 'المؤثرات الصوتية', switchEl(AudioManager.sfxOn));
    const musicBtn = h('button', {}, 'الموسيقى', switchEl(AudioManager.musicOn));
    sfxBtn.onclick = () => {
      AudioManager.setSfx(!AudioManager.sfxOn);
      sfxBtn.lastChild.classList.toggle('on', AudioManager.sfxOn);
      AudioManager.play('click');
    };
    musicBtn.onclick = () => {
      AudioManager.setMusic(!AudioManager.musicOn);
      musicBtn.lastChild.classList.toggle('on', AudioManager.musicOn);
    };
    const who = state.practice
      ? h('div', { class: 'who' }, h('b', {}, 'وضع تجريبي'), 'لا يتم حفظ أي تقدم')
      : h('div', { class: 'who' }, h('b', {}, state.user?.displayName || 'لاعب'), state.user?.email || '');
    const out = h('button', { class: 'danger' }, state.practice ? 'العودة لتسجيل الدخول' : 'تسجيل الخروج');
    out.onclick = () => {
      closeMenu();
      onSignOut();
    };
    menu = h('div', { class: 'menu', onclick: (e) => e.stopPropagation() }, who, sfxBtn, musicBtn, out);
    root.appendChild(menu);
  });
  root.addEventListener('click', closeMenu);

  // ---- static decorations: zones, banners, foods ----
  for (const z of ZONES) {
    const top = nodeY(Math.min(z.to, LEVEL_COUNT)) - SPACING / 2 - 40;
    const bottom = nodeY(z.from) + SPACING / 2;
    inner.appendChild(h('div', { class: 'map-zone', style: { top: `${top}px`, height: `${bottom - top}px`, background: `linear-gradient(180deg, transparent, ${z.color} 20%, ${z.color} 80%, transparent)` } }));
    inner.appendChild(h('div', { class: 'zone-banner', style: { top: `${nodeY(z.from) + 52}px` } }, z.name));
    for (let i = z.from; i <= z.to; i += 2) {
      const left = i % 4 === 1;
      inner.appendChild(
        h('img', {
          class: 'map-deco',
          src: FOOD_IMAGES[z.foods[(i >> 1) % z.foods.length]],
          alt: '',
          style: { top: `${nodeY(i) - 30}px`, [left ? 'left' : 'right']: `${4 + (i % 3) * 3}%`, animationDelay: `${-i * 0.37}s`, transform: `rotate(${(i % 5) * 8 - 16}deg)` },
        }),
      );
    }
  }

  // road
  const svgNS = 'http://www.w3.org/2000/svg';
  const road = document.createElementNS(svgNS, 'svg');
  road.setAttribute('class', 'map-road');
  road.setAttribute('viewBox', `0 0 100 ${totalHeight()}`);
  road.setAttribute('preserveAspectRatio', 'none');
  const mkPath = (from, to) => {
    let d = `M ${nodeX(from)} ${nodeY(from)}`;
    for (let i = from + 1; i <= to; i++) {
      const y0 = nodeY(i - 1);
      const y1 = nodeY(i);
      d += ` C ${nodeX(i - 1)} ${y0 - SPACING / 2}, ${nodeX(i)} ${y1 + SPACING / 2}, ${nodeX(i)} ${y1}`;
    }
    return d;
  };
  const roadPaths = [
    ['#e9c79a', 30, 1],
    ['#fff7ea', 20, 1],
  ].map(([color, width]) => {
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', mkPath(1, LEVEL_COUNT));
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', color);
    p.setAttribute('stroke-width', width);
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('vector-effect', 'non-scaling-stroke');
    road.appendChild(p);
    return p;
  });
  const dashed = document.createElementNS(svgNS, 'path');
  dashed.setAttribute('d', mkPath(1, LEVEL_COUNT));
  dashed.setAttribute('fill', 'none');
  dashed.setAttribute('stroke', '#f2c48a');
  dashed.setAttribute('stroke-width', 5);
  dashed.setAttribute('stroke-dasharray', '2 14');
  dashed.setAttribute('stroke-linecap', 'round');
  dashed.setAttribute('vector-effect', 'non-scaling-stroke');
  road.appendChild(dashed);
  const done = document.createElementNS(svgNS, 'path');
  done.setAttribute('fill', 'none');
  done.setAttribute('stroke', '#ffb300');
  done.setAttribute('stroke-width', 12);
  done.setAttribute('stroke-linecap', 'round');
  done.setAttribute('vector-effect', 'non-scaling-stroke');
  road.appendChild(done);
  inner.appendChild(road);
  void roadPaths;

  const nodesLayer = h('div', {});
  inner.appendChild(nodesLayer);

  const loading = h('div', { class: 'map-loading' }, h('div', { class: 'loader' }, h('div', { class: 'ring' }), h('div', { class: 'loader-text' }, 'جاري تحميل تقدمك...')));
  const banners = h('div', {});
  root.append(scroll, topbar, banners, loading);
  uiRoot().replaceChildren(root);

  let lastHighest = null;
  let lastBalance = null;

  function renderNodes() {
    const progress = state.progress;
    if (!progress) return;
    const highest = progress.highestUnlockedLevel ?? 1;
    const completed = new Set(progress.completedLevels ?? []);
    const current = Math.min(highest, LEVEL_COUNT);
    done.setAttribute('d', current > 1 ? mkPath(1, current) : '');

    nodesLayer.replaceChildren(
      ...LEVELS.map((lvl) => {
        const id = lvl.id;
        const isDone = completed.has(id);
        const isCurrent = id === current && !(isDone && id === LEVEL_COUNT && completed.size === LEVEL_COUNT);
        const locked = id > highest;
        const cls = locked ? 'locked' : isCurrent ? 'current' : isDone ? 'completed' : 'current';
        const btn = h('button', {
          class: `level-node ${cls}`,
          style: { top: `${nodeY(id)}px`, left: `${nodeX(id)}%` },
          'aria-label': `المستوى ${id}${locked ? ' (مقفول)' : ''}`,
          'data-level': id,
        });
        btn.appendChild(h('span', { class: 'num' }, id));
        if (locked) btn.appendChild(h('img', { class: 'lock', src: UI_IMAGES.lock, alt: '' }));
        if (isDone) {
          btn.appendChild(h('img', { class: 'badge', src: UI_IMAGES.check, alt: '' }));
          const stars = progress.levelStars?.[id] ?? 0;
          btn.appendChild(h('div', { class: 'stars' }, ...[0, 1, 2].map((i) => h('img', { src: i < stars ? UI_IMAGES.star : UI_IMAGES.starEmpty, alt: '' }))));
        }
        if (isCurrent && !locked) {
          const marker = h('div', { class: 'you-are-here' }, avatarEl(state.practice ? { displayName: 'أنت' } : state.user));
          btn.appendChild(marker);
        }
        btn.addEventListener('click', () => {
          AudioManager.unlock();
          if (locked) {
            AudioManager.play('locked');
            btn.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 });
            toast(`المستوى ${id} مقفول. أكمل المستوى ${id - 1} أولًا!`, { type: 'warn' });
            return;
          }
          AudioManager.play('select');
          onPlay(id);
        });
        return btn;
      }),
    );

    if (lastHighest === null || highest !== lastHighest) {
      const target = nodeY(current) - scroll.clientHeight * 0.55;
      if (lastHighest === null) scroll.scrollTop = target;
      else scroll.scrollTo({ top: target, behavior: 'smooth' });
    }
    lastHighest = highest;
  }

  function renderTop() {
    avatarSlot.replaceChildren(avatarEl(state.practice ? { displayName: 'تجربة' } : state.user));
    if (state.practice) coinValue.textContent = 'تجريبي';
    else if (state.wallet) {
      const bal = state.wallet.balance ?? 0;
      if (lastBalance !== null && bal > lastBalance) {
        coinPill.classList.remove('bump');
        void coinPill.offsetWidth;
        coinPill.classList.add('bump');
        AudioManager.play('coin');
      }
      coinValue.textContent = bal.toLocaleString('en-US');
      lastBalance = bal;
    } else coinValue.textContent = '—';
  }

  function renderBanners() {
    const list = [];
    if (!state.online) list.push(h('div', { class: 'banner offline' }, 'لا يوجد اتصال بالإنترنت — لن يتم حفظ التقدم حتى يعود الاتصال.'));
    else if (state.practice) list.push(h('div', { class: 'banner practice' }, 'وضع تجريبي: التقدم لا يُحفظ ولا تُمنح كوينز.'));
    else if (state.pending) {
      const retry = h('button', { class: 'btn btn-primary' }, 'حفظ الآن');
      retry.onclick = () => onRetryPending?.();
      list.push(h('div', { class: 'banner pending' }, `نتيجة المستوى ${state.pending.levelId} لم تُحفظ بعد.`, retry));
    }
    banners.replaceChildren(...list);
  }

  function renderLoading() {
    if (state.practice || state.progress) {
      loading.style.display = 'none';
      return;
    }
    loading.style.display = '';
    const text = loading.querySelector('.loader-text');
    if (state.loadError) {
      loading.querySelector('.ring').style.display = 'none';
      text.replaceChildren(
        h('div', { style: { marginBottom: '12px', textAlign: 'center', maxWidth: '280px' } }, state.loadError),
        h('button', { class: 'btn btn-primary', onclick: () => state.retryLoad?.() }, 'إعادة المحاولة'),
      );
    } else {
      loading.querySelector('.ring').style.display = '';
      text.textContent = 'جاري تحميل تقدمك...';
    }
  }

  const renderAll = () => {
    renderTop();
    renderBanners();
    renderLoading();
    renderNodes();
  };
  renderAll();
  const unsub = subscribe((s, patch) => {
    if ('wallet' in patch || 'user' in patch) renderTop();
    if ('online' in patch || 'pending' in patch || 'practice' in patch) renderBanners();
    if ('progress' in patch || 'loadError' in patch) {
      renderLoading();
      renderNodes();
    }
  });

  return {
    unmount() {
      unsub();
      root.remove();
    },
  };
}
