/*
 * The same Cmd/Ctrl+K command menu lucasflatwhite.com has, so the shortcut works the same
 * one level down. Games come from the lineup, so a new cartridge shows up here too; the
 * rest mirrors the homepage's menu. Without script the header trigger stays hidden.
 */
import './palette.css';

const SITE = 'https://www.lucasflatwhite.com/';
const COPY_CLOSE_MS = 900;

/** Phosphor regular, the one icon family lucasflatwhite.com uses. */
const ICONS = {
  'game-controller': 'M176,112H152a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16ZM104,96H96V88a8,8,0,0,0-16,0v8H72a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0v-8h8a8,8,0,0,0,0-16ZM241.48,200.65a36,36,0,0,1-54.94,4.81c-.12-.12-.24-.24-.35-.37L146.48,160h-37L69.81,205.09l-.35.37A36.08,36.08,0,0,1,44,216,36,36,0,0,1,8.56,173.75a.68.68,0,0,1,0-.14L24.93,89.52A59.88,59.88,0,0,1,83.89,40H172a60.08,60.08,0,0,1,59,49.25c0,.06,0,.12,0,.18l16.37,84.17a.68.68,0,0,1,0,.14A35.74,35.74,0,0,1,241.48,200.65ZM172,144a44,44,0,0,0,0-88H83.89A43.9,43.9,0,0,0,40.68,92.37l0,.13L24.3,176.59A20,20,0,0,0,58,194.3l41.92-47.59a8,8,0,0,1,6-2.71Zm59.7,32.59-8.74-45A60,60,0,0,1,172,160h-4.2L198,194.31a20.09,20.09,0,0,0,17.46,5.39,20,20,0,0,0,16.23-23.11Z',
  'house': 'M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z',
  'hammer': 'M251.34,112,183.88,44.08a96.1,96.1,0,0,0-135.77,0l-.09.09L34.25,58.4A8,8,0,0,0,45.74,69.53L59.47,55.35a79.92,79.92,0,0,1,18.71-13.9L124.68,88l-96,96a16,16,0,0,0,0,22.63l20.69,20.69a16,16,0,0,0,22.63,0l96-96,14.34,14.34h0L200,163.3a16,16,0,0,0,22.63,0l28.69-28.69A16,16,0,0,0,251.34,112ZM60.68,216,40,195.31l68-68L128.68,148ZM162.34,114.32,140,136.67,119.31,116l22.35-22.35a8,8,0,0,0,0-11.32L94.32,35a80,80,0,0,1,78.23,20.41l44.22,44.51L188,128.66l-14.34-14.34A8,8,0,0,0,162.34,114.32Zm49,37.66-12-12L228,111.25l12,12Z',
  'github-logo': 'M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.83a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h32.35a8,8,0,0,0,6.74-3.69,43.87,43.87,0,0,1,32.32-20.06A43.81,43.81,0,0,1,192,73.83a8.09,8.09,0,0,0,1,7.65A41.72,41.72,0,0,1,200,104Z',
  'x-logo': 'M214.75,211.71l-62.6-98.38,61.77-67.95a8,8,0,0,0-11.84-10.76L143.24,99.34,102.75,35.71A8,8,0,0,0,96,32H48a8,8,0,0,0-6.75,12.3l62.6,98.37-61.77,68a8,8,0,1,0,11.84,10.76l58.84-64.72,40.49,63.63A8,8,0,0,0,160,224h48a8,8,0,0,0,6.75-12.29ZM164.39,208,62.57,48h29L193.43,208Z',
  'envelope': 'M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z',
  'arrow-up-right': 'M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z',
} as const;

type IconName = keyof typeof ICONS;

export type PaletteCommand = {
  id: string;
  label: string;
  hint: string;
  icon: IconName;
  href: string;
  external: boolean;
  /** What choosing the command copies instead of following `href`, or null. */
  copy: string | null;
};

/** Links back up to the homepage, in the order its own menu lists them. */
export const siteCommands: readonly PaletteCommand[] = [
  { id: 'home', label: 'lucas.flatwhite', hint: 'Back to the homepage', icon: 'house', href: SITE, external: false, copy: null },
  { id: 'work', label: 'Work', hint: 'Things I have built', icon: 'hammer', href: `${SITE}#work`, external: false, copy: null },
  { id: 'github', label: 'GitHub', hint: 'lucas-flatwhite', icon: 'github-logo', href: 'https://github.com/lucas-flatwhite', external: true, copy: null },
  { id: 'x', label: 'Twitter', hint: '@lucas_flatwhite', icon: 'x-logo', href: 'https://x.com/lucas_flatwhite', external: true, copy: null },
  {
    id: 'email',
    label: 'Email',
    hint: 'lucas.flatwhite@gmail.com',
    icon: 'envelope',
    href: 'mailto:lucas.flatwhite@gmail.com',
    external: false,
    copy: 'lucas.flatwhite@gmail.com',
  },
];

/** One command per playable cartridge, in lineup order. */
export function gameCommands(rows: readonly HTMLElement[]): PaletteCommand[] {
  return rows
    .filter((row) => row.dataset.href)
    .map((row) => ({
      id: `game-${row.dataset.href!.replace(/\W+/g, '-').replace(/^-|-$/g, '')}`,
      label: row.dataset.title ?? '',
      hint: row.dataset.meta?.split(' · ')[0] ?? 'Play',
      icon: 'game-controller' as const,
      href: row.dataset.href!,
      external: false,
      copy: null,
    }));
}

/** Case-insensitive match on label and hint; an empty query keeps everything. */
export function matches(command: PaletteCommand, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return !needle || `${command.label} ${command.hint}`.toLowerCase().includes(needle);
}

const NS = 'http://www.w3.org/2000/svg';

function icon(name: IconName, className: string): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  const path = document.createElementNS(NS, 'path');
  svg.setAttribute('viewBox', '0 0 256 256');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', className);
  path.setAttribute('d', ICONS[name]);
  svg.append(path);
  return svg;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Builds the menu, wires any [data-palette-open] button to it, and listens for Cmd/Ctrl+K. */
export function mountPalette(commands: readonly PaletteCommand[]): void {
  const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
  const dialog = element('dialog', 'palette');
  const field = element('div', 'palette-field');
  const label = element('label', '', 'Jump to');
  const input = element('input', '');
  const list = element('ul', 'palette-list');
  const empty = element('p', 'palette-empty', 'Nothing matches that.');

  dialog.setAttribute('aria-label', 'Command menu');
  label.htmlFor = 'palette-input';
  input.id = 'palette-input';
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-controls', 'palette-list');
  input.setAttribute('aria-autocomplete', 'list');
  list.id = 'palette-list';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Commands');
  empty.hidden = true;
  field.append(label, input, element('kbd', 'palette-esc', 'Esc'));

  const options = commands.map((command) => {
    const option = element('li', 'palette-option');
    const hint = element('span', 'palette-hint', command.hint);
    option.id = `palette-${command.id}`;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    option.append(icon(command.icon, 'palette-icon'), element('span', 'palette-label', command.label), hint);

    if (command.external) {
      option.append(icon('arrow-up-right', 'palette-out'));
    }

    return { command, option, hint };
  });

  list.append(...options.map(({ option }) => option));
  dialog.append(field, list, empty);
  document.body.append(dialog);

  for (const key of document.querySelectorAll<HTMLElement>('[data-palette-key]')) {
    key.textContent = isMac ? '⌘K' : 'Ctrl K';
  }

  let visible = options;
  let active = 0;
  let closeTimer = 0;

  const select = (index: number): void => {
    active = visible.length === 0 ? -1 : (index + visible.length) % visible.length;
    options.forEach(({ option }) => option.setAttribute('aria-selected', 'false'));
    const current = visible[active]?.option;

    if (current) {
      current.setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', current.id);
      current.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  };

  const filter = (): void => {
    visible = options.filter(({ command, option }) => {
      const match = matches(command, input.value);
      option.hidden = !match;
      return match;
    });
    empty.hidden = visible.length > 0;
    select(0);
  };

  const run = async (entry: (typeof options)[number] | undefined): Promise<void> => {
    if (!entry) {
      return;
    }

    const { command, hint } = entry;

    if (command.copy !== null) {
      if (await copyText(command.copy)) {
        hint.textContent = `Copied ${command.copy}`;
        window.clearTimeout(closeTimer);
        closeTimer = window.setTimeout(() => dialog.close(), COPY_CLOSE_MS);
        return;
      }

      // The clipboard was refused, so the mailto opens a mail app instead.
      dialog.close();
      window.location.assign(command.href);
      return;
    }

    dialog.close();

    if (command.external) {
      window.open(command.href, '_blank', 'noopener');
    } else {
      window.location.assign(command.href);
    }
  };

  const open = (): void => {
    if (dialog.open) {
      return;
    }

    window.clearTimeout(closeTimer);
    options.forEach(({ command, hint }) => (hint.textContent = command.hint));
    input.value = '';
    filter();
    dialog.showModal();
    input.focus();
  };

  for (const trigger of document.querySelectorAll<HTMLButtonElement>('[data-palette-open]')) {
    trigger.hidden = false;
    trigger.addEventListener('click', open);
  }

  window.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();

      if (dialog.open) {
        dialog.close();
      } else {
        open();
      }
    }
  });

  input.addEventListener('input', filter);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      select(active + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      select(active - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      void run(visible[active]);
    }
  });

  options.forEach((entry) => {
    entry.option.addEventListener('pointermove', () => {
      const index = visible.indexOf(entry);

      if (index !== active) {
        select(index);
      }
    });
    entry.option.addEventListener('click', () => void run(entry));
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
}
