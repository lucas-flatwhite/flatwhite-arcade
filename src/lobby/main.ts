import '../shared/base.css';
import '../shared/fonts.css';
import './lobby.css';
import { mountAttract } from './attract';

const BEST_KEY = 'lucas-flatwhite:best-length';
/** The cartridge rises out of the slot, the label changes, and it drops back in. */
const SWAP_MS = 150;

function query<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Lobby is missing ${selector}`);
  }

  return element;
}

function bestLength(): string {
  try {
    const stored = Number(window.localStorage.getItem(BEST_KEY));
    return Number.isFinite(stored) && stored > 0 ? String(Math.floor(stored)).padStart(3, '0') : '---';
  } catch {
    return '---';
  }
}

function mountLobby(): void {
  const rows = [...document.querySelectorAll<HTMLButtonElement>('[data-cart]')];
  const pitch = {
    model: query<HTMLElement>('[data-pitch-model]'),
    status: query<HTMLElement>('[data-pitch-status]'),
    title: query<HTMLElement>('[data-pitch-title]'),
    description: query<HTMLElement>('[data-pitch-description]'),
    meta: query<HTMLElement>('[data-pitch-meta]'),
  };
  const start = query<HTMLAnchorElement>('[data-start]');
  const startLabel = query<HTMLElement>('[data-start-label]');
  const device = query<HTMLElement>('[data-device]');
  const deviceModel = query<HTMLElement>('[data-device-model]');
  const cartridge = query<HTMLElement>('[data-cartridge]');
  const cartridgeLabel = query<HTMLElement>('[data-cartridge-label]');
  const screenEmpty = query<HTMLElement>('[data-screen-empty]');
  const attract = mountAttract(query<HTMLCanvasElement>('[data-screen-canvas]'), {
    left: query<HTMLElement>('[data-hud-left]'),
    right: query<HTMLElement>('[data-hud-right]'),
  });
  const best = bestLength();
  let selected = rows.findIndex((row) => row.getAttribute('aria-pressed') === 'true');
  let swap = 0;

  const meta = (row: HTMLButtonElement): string =>
    row.hasAttribute('data-best') ? `${row.dataset.meta} · Best ${best}` : (row.dataset.meta ?? '');

  const select = (index: number): void => {
    const row = rows[index];

    if (!row || index === selected) {
      return;
    }

    selected = index;
    const href = row.dataset.href;
    const playable = Boolean(href);

    rows.forEach((other, otherIndex) => other.setAttribute('aria-pressed', String(otherIndex === index)));
    pitch.model.textContent = row.dataset.model ?? '';
    pitch.status.textContent = row.dataset.status ?? '';
    pitch.status.classList.toggle('is-dev', !playable);
    pitch.title.textContent = row.dataset.title ?? '';
    pitch.description.textContent = row.dataset.description ?? '';
    pitch.meta.textContent = meta(row);

    if (playable) {
      start.href = href!;
      start.removeAttribute('aria-disabled');
      startLabel.textContent = 'Start';
    } else {
      start.removeAttribute('href');
      start.setAttribute('aria-disabled', 'true');
      startLabel.textContent = 'Not yet';
    }

    device.dataset.power = playable ? 'on' : 'off';
    device.setAttribute(
      'aria-label',
      playable ? `A handheld playing a live demo of ${row.dataset.title}` : 'A handheld with an empty cartridge slot',
    );
    deviceModel.textContent = `${row.dataset.model} · Made in paper`;
    screenEmpty.hidden = playable;
    attract.setPower(playable);

    window.clearTimeout(swap);
    cartridge.classList.add('is-out');
    swap = window.setTimeout(() => {
      cartridgeLabel.textContent = row.dataset.label ?? '';
      cartridge.classList.remove('is-out');
    }, SWAP_MS);
  };

  const go = (): void => {
    if (start.hasAttribute('href')) {
      window.location.assign(start.href);
    }
  };

  pitch.meta.textContent = meta(rows[selected]!);
  rows.forEach((row, index) => row.addEventListener('click', () => select(index)));

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const target = event.target;
    const onRowOrPage = target === document.body || (target instanceof HTMLElement && target.hasAttribute('data-cart'));

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = Math.max(0, Math.min(rows.length - 1, selected + (event.key === 'ArrowDown' ? 1 : -1)));
      select(next);
      rows[next]?.scrollIntoView({ block: 'nearest' });

      if (target instanceof HTMLElement && target.hasAttribute('data-cart')) {
        rows[next]?.focus();
      }
    } else if (event.key === 'Enter' && onRowOrPage) {
      // Enter on a lineup row plays that cartridge; elsewhere links and buttons keep their own Enter.
      event.preventDefault();

      if (target instanceof HTMLElement && target.hasAttribute('data-cart')) {
        select(rows.indexOf(target as HTMLButtonElement));
      }

      go();
    }
  });
}

mountLobby();
