import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './runtime.mjs';
const escape = s => String(s).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
export function inline(text, vault) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  return parts.map(part => {
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const [file, ...label] = part.slice(2, -2).split('|');
      return `<a href="obsidian://open?vault=${encodeURIComponent(vault)}&amp;file=${encodeURIComponent(file)}">${escape(label.join('|') || file)}</a>`;
    }
    return escape(part).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }).join('');
}
export function renderHTML(text, title, vault = 'tkflow') {
  const blocks = []; let paragraph = [], listing = false, fence = null;
  const flush = () => { if (paragraph.length) blocks.push('<p>' + paragraph.map(l => inline(l, vault)).join('<br>') + '</p>'); paragraph = []; };
  for (const line of text.replace(/^---\n[\s\S]*?\n---\n/, '').split(/\r?\n/)) {
    if (line.startsWith('```')) {
      flush(); if (listing) { blocks.push('</ul>'); listing = false; }
      if (fence === null) fence = []; else { blocks.push('<pre><code>' + escape(fence.join('\n')) + '</code></pre>'); fence = null; } continue;
    }
    if (fence !== null) { fence.push(line); continue; }
    if (!line.startsWith('- ') && listing) { blocks.push('</ul>'); listing = false; }
    const heading = /^(#{1,6}) (.*)/.exec(line);
    if (heading) { flush(); const n = heading[1].length; blocks.push(`<h${n}>${inline(heading[2], vault)}</h${n}>`); }
    else if (line.startsWith('- ')) { flush(); if (!listing) { blocks.push('<ul>'); listing = true; } blocks.push('<li>' + inline(line.slice(2), vault) + '</li>'); }
    else if (line.startsWith('> ')) { flush(); blocks.push('<aside>' + inline(line.slice(2).replace(/^\[![^\]]+\]\s*(.*)/, '**$1**'), vault) + '</aside>'); }
    else if (!line.trim()) flush(); else paragraph.push(line);
  }
  flush(); if (listing) blocks.push('</ul>'); if (fence !== null) blocks.push('<pre>' + escape(fence.join('\n')) + '</pre>');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} — tkflow</title><style>${fs.readFileSync(path.join(ROOT, 'templates/preview.css'), 'utf8')}</style><main><header>TKFLOW / BLUEPRINT · GENERATED READING VIEW</header>${blocks.join('\n')}</main></html>`;
}
