import { describe, it, expect } from 'vitest';
import { parseItems } from '../rss';

describe('parseItems', () => {
  it('parses standard RSS items', () => {
    const xml = `
      <rss><channel>
        <item>
          <title>Breaking News</title>
          <link>https://example.com/1</link>
          <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
        </item>
        <item>
          <title>Another Story</title>
          <link>https://example.com/2</link>
          <pubDate>Tue, 02 Jan 2024 08:00:00 GMT</pubDate>
        </item>
      </channel></rss>
    `;
    const items = parseItems(xml);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      title: 'Breaking News',
      link: 'https://example.com/1',
      pubDate: 'Mon, 01 Jan 2024 12:00:00 GMT',
      description: '',
    });
    expect(items[1].title).toBe('Another Story');
  });

  it('parses CDATA-wrapped content', () => {
    const xml = `
      <item>
        <title><![CDATA[<b>Bold</b> Title]]></title>
        <link><![CDATA[https://example.com/cdata]]></link>
        <pubDate>Wed, 03 Jan 2024 00:00:00 GMT</pubDate>
      </item>
    `;
    const items = parseItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('<b>Bold</b> Title');
    expect(items[0].link).toBe('https://example.com/cdata');
  });

  it('handles missing fields gracefully', () => {
    const xml = `<item><title>No Link</title></item>`;
    const items = parseItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ title: 'No Link', link: '', pubDate: '', description: '' });
  });

  it('returns empty array for non-RSS content', () => {
    expect(parseItems('')).toEqual([]);
    expect(parseItems('<html><body>Not RSS</body></html>')).toEqual([]);
  });

  it('limits to 20 items', () => {
    const itemXml = '<item><title>Item</title><link>https://x.com</link><pubDate>now</pubDate></item>';
    const xml = itemXml.repeat(25);
    const items = parseItems(xml);
    expect(items).toHaveLength(20);
  });

  it('decodes HTML entities in titles', () => {
    const xml = `
      <item>
        <title>Biden &amp; Trump: A &quot;Historic&quot; Meeting</title>
        <link>https://example.com/entities</link>
        <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      </item>
    `;
    const items = parseItems(xml);
    expect(items[0].title).toBe('Biden & Trump: A "Historic" Meeting');
  });

  it('decodes numeric HTML entities', () => {
    const xml = `<item><title>Price: &#36;100 &#x2014; Sale</title></item>`;
    const items = parseItems(xml);
    expect(items[0].title).toBe('Price: $100 — Sale');
  });

  it('decodes typographic named entities', () => {
    const xml = `<item><title>Breaking &mdash; World&rsquo;s Leaders Meet&hellip;</title></item>`;
    const items = parseItems(xml);
    expect(items[0].title).toBe('Breaking \u2014 World\u2019s Leaders Meet\u2026');
  });

  it('parses description field', () => {
    const xml = `
      <item>
        <title>Story</title>
        <link>https://example.com</link>
        <description>A brief summary of the story.</description>
        <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      </item>
    `;
    const items = parseItems(xml);
    expect(items[0].description).toBe('A brief summary of the story.');
  });

  it('strips HTML tags from description', () => {
    const xml = `
      <item>
        <title>Story</title>
        <description><![CDATA[<p>A <b>bold</b> summary &amp; more.</p>]]></description>
      </item>
    `;
    const items = parseItems(xml);
    expect(items[0].description).toBe('A bold summary & more.');
  });

  it('trims whitespace from fields', () => {
    const xml = `
      <item>
        <title>  Spaced Title  </title>
        <link>  https://example.com/spaced  </link>
        <pubDate>  Mon, 01 Jan 2024 00:00:00 GMT  </pubDate>
      </item>
    `;
    const items = parseItems(xml);
    expect(items[0].title).toBe('Spaced Title');
    expect(items[0].link).toBe('https://example.com/spaced');
    expect(items[0].pubDate).toBe('Mon, 01 Jan 2024 00:00:00 GMT');
  });
});
