export function parseItems(xml: string): Array<{ title: string; link: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; pubDate: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1]
      ?? block.match(/<title>([\s\S]*?)<\/title>/)?.[1]
      ?? '';
    const link = block.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/)?.[1]
      ?? block.match(/<link>([\s\S]*?)<\/link>/)?.[1]
      ?? '';
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '';

    items.push({ title: title.trim(), link: link.trim(), pubDate: pubDate.trim() });
  }

  return items;
}
