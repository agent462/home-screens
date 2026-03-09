const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&mdash;': '\u2014',
  '&ndash;': '\u2013',
  '&lsquo;': '\u2018',
  '&rsquo;': '\u2019',
  '&ldquo;': '\u201C',
  '&rdquo;': '\u201D',
  '&hellip;': '\u2026',
  '&copy;': '\u00A9',
  '&trade;': '\u2122',
  '&reg;': '\u00AE',
};

const NAMED_ENTITY_RE = new RegExp(
  Object.keys(ENTITY_MAP).map((k) => k.replace(/[&;]/g, '\\$&')).join('|'),
  'g',
);

function decodeEntities(text: string): string {
  return text
    .replace(NAMED_ENTITY_RE, (m) => ENTITY_MAP[m] ?? m)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractField(block: string, tag: string): string {
  const raw = block.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`))?.[1]
    ?? block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]
    ?? '';
  return decodeEntities(raw.trim());
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/** Strip HTML tags first (before entity decoding) so decoded < > don't get eaten as tags */
function extractDescription(block: string): string {
  const raw = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1]
    ?? block.match(/<description>([\s\S]*?)<\/description>/)?.[1]
    ?? '';
  return decodeEntities(stripHtml(raw.trim()));
}

export function parseItems(xml: string): Array<{ title: string; link: string; pubDate: string; description: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; description: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const block = match[1];
    items.push({
      title: extractField(block, 'title'),
      link: extractField(block, 'link'),
      pubDate: extractField(block, 'pubDate'),
      description: extractDescription(block),
    });
  }

  return items;
}
