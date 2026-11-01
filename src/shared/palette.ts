/*
 * The same Cmd/Ctrl+K command menu lucasflatwhite.com has, so the shortcut works the same
 * one level down. Games come from the lineup, so a new cartridge shows up here too. The
 * rest comes from the homepage's own /commands.json, the list its menu is built from, so
 * links are kept in one place. Without script the header trigger stays hidden.
 */
import './palette.css';

const SITE = 'https://www.lucasflatwhite.com/';
/** Same origin on www.lucasflatwhite.com; the homepage allows other origins for this one file. */
export const SITE_COMMANDS_URL = `${SITE}commands.json`;
const SITE_COMMANDS_VERSION = 1;
const COPY_CLOSE_MS = 900;

/** Phosphor regular paths for the commands the arcade adds itself. */
const ICONS = {
  'game-controller': ['M176,112H152a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16ZM104,96H96V88a8,8,0,0,0-16,0v8H72a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0v-8h8a8,8,0,0,0,0-16ZM241.48,200.65a36,36,0,0,1-54.94,4.81c-.12-.12-.24-.24-.35-.37L146.48,160h-37L69.81,205.09l-.35.37A36.08,36.08,0,0,1,44,216,36,36,0,0,1,8.56,173.75a.68.68,0,0,1,0-.14L24.93,89.52A59.88,59.88,0,0,1,83.89,40H172a60.08,60.08,0,0,1,59,49.25c0,.06,0,.12,0,.18l16.37,84.17a.68.68,0,0,1,0,.14A35.74,35.74,0,0,1,241.48,200.65ZM172,144a44,44,0,0,0,0-88H83.89A43.9,43.9,0,0,0,40.68,92.37l0,.13L24.3,176.59A20,20,0,0,0,58,194.3l41.92-47.59a8,8,0,0,1,6-2.71Zm59.7,32.59-8.74-45A60,60,0,0,1,172,160h-4.2L198,194.31a20.09,20.09,0,0,0,17.46,5.39,20,20,0,0,0,16.23-23.11Z'],
  house: ['M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z'],
  'arrow-up-right': ['M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z'],
} as const;

export type PaletteCommand = {
  id: string;
  label: string;
  hint: string;
  /** The `d` of each path in a Phosphor regular glyph, on a 256 by 256 box. */
  icon: readonly string[];
  href: string;
  external: boolean;
  /** What choosing the command copies instead of following `href`, or null. */
  copy: string | null;
};

/** The way up, kept here so the menu still has it when the homepage list cannot load. */
export const homeCommand: PaletteCommand = {
  id: 'home',
  label: 'lucas.flatwhite',
  hint: 'Back to the homepage',
  icon: ICONS.house,
  href: SITE,
  external: false,
  copy: null,
};

/** One command per playable cartridge, in lineup order. */
export function gameCommands(rows: readonly HTMLElement[]): PaletteCommand[] {
  return rows
    .filter((row) => row.dataset.href)
    .map((row) => ({
      id: `game-${row.dataset.href!.replace(/\W+/g, '-').replace(/^-|-$/g, '')}`,
      label: row.dataset.title ?? '',
      hint: row.dataset.meta?.split(' · ')[0] ?? 'Play',
      icon: ICONS['game-controller'],
      href: row.dataset.href!,
      external: false,
      copy: null,
    }));
}

const isText = (value: unknown): value is string => typeof value === 'string';

/**
 * Reads the homepage's /commands.json. Anything malformed is dropped rather than drawn,
 * only https and mailto links pass, and the homepage's own Arcade entry is left out
 * because this is that page.
 */
export function readSiteCommands(data: unknown): PaletteCommand[] {
  if (typeof data !== 'object' || data === null) {
    return [];
  }

  const { version, commands } = data as { version?: unknown; commands?: unknown };

  if (version !== SITE_COMMANDS_VERSION || !Array.isArray(commands)) {
    return [];
  }

  return commands.flatMap((entry: Record<string, unknown>): PaletteCommand[] => {
    const { id, label, hint, icon, href, external, copy } = entry ?? {};

    if (
      !isText(id) ||
      id === 'arcade' ||
      !isText(label) ||
      !isText(hint) ||
      !isText(href) ||
      !/^(https:|mailto:)/.test(href) ||
      !Array.isArray(icon) ||
      !icon.every(isText) ||
      (copy !== null && !isText(copy))
    ) {
      return [];
    }

    return [{ id: `site-${id}`, label, hint, icon, href, external: external === true, copy }];
  });
}

/** Fetches the homepage's commands; on any failure the menu keeps what it has. */
export async function loadSiteCommands(url = SITE_COMMANDS_URL): Promise<PaletteCommand[]> {
  try {
    const response = await fetch(url, { credentials: 'omit' });
    return response.ok ? readSiteCommands(await response.json()) : [];
  } catch {
    return [];
  }
}

/** Case-insensitive match on label and hint; an empty query keeps everything. */
export function matches(command: PaletteCommand, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return !needle || `${command.label} ${command.hint}`.toLowerCase().includes(needle);
}

const NS = 'http://www.w3.org/2000/svg';

function icon(paths: readonly string[], className: string): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 256 256');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', className);

  for (const d of paths) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }

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

type Entry = { command: PaletteCommand; option: HTMLLIElement; hint: HTMLElement };

/**
 * Builds the menu, wires any [data-palette-open] button to it, and listens for Cmd/Ctrl+K.
 * `later` adds commands once they arrive, after the ones the page already has.
 */
export function mountPalette(commands: readonly PaletteCommand[], later?: Promise<readonly PaletteCommand[]>): void {
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

  const options: Entry[] = [];
  dialog.append(field, list, empty);
  document.body.append(dialog);

  for (const key of document.querySelectorAll<HTMLElement>('[data-palette-key]')) {
    key.textContent = isMac ? '⌘K' : 'Ctrl K';
  }

  let visible: Entry[] = options;
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

  const run = async (entry: Entry | undefined): Promise<void> => {
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

  const add = (more: readonly PaletteCommand[]): void => {
    const known = new Set(options.map(({ command }) => command.id));

    for (const command of more) {
      if (known.has(command.id)) {
        continue;
      }

      const option = element('li', 'palette-option');
      const hint = element('span', 'palette-hint', command.hint);
      const entry: Entry = { command, option, hint };
      option.id = `palette-${command.id.replace(/[^\w-]/g, '-')}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.append(icon(command.icon, 'palette-icon'), element('span', 'palette-label', command.label), hint);

      if (command.external) {
        option.append(icon(ICONS['arrow-up-right'], 'palette-out'));
      }

      option.addEventListener('pointermove', () => {
        const index = visible.indexOf(entry);

        if (index !== active) {
          select(index);
        }
      });
      option.addEventListener('click', () => void run(entry));
      options.push(entry);
      list.append(option);
    }

    // An open menu takes the new rows in at once, under whatever has been typed.
    if (dialog.open) {
      filter();
    }
  };

  add(commands);
  void later?.then(add);

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
}
