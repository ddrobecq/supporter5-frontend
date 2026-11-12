import jerseySvgSource from '../../../img/jersey.svg?raw';

function replaceSvgStyleColor(svg: string, target: string, replacement: string): string {
  const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return svg
    .replace(new RegExp(`fill:${escapedTarget};`, 'g'), `fill:${replacement};`)
    .replace(new RegExp(`stroke:${escapedTarget};`, 'g'), `stroke:${replacement};`)
    .replace(new RegExp(`fill="${escapedTarget}"`, 'g'), `fill="${replacement}"`)
    .replace(new RegExp(`stroke="${escapedTarget}"`, 'g'), `stroke="${replacement}"`);
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapClubNameLines(rawName: string): string[] {
  const text = rawName.replace(/\s+/g, ' ').trim();
  if (!text) return [];

  const words = text.split(' ');
  const maxLines = 3;
  const maxCharsPerLine = 11;

  // If the label has multiple words, prefer one word per line for clearer jersey rendering.
  if (words.length > 1) {
    const rawLines = words.slice(0, maxLines - 1);
    const remaining = words.slice(maxLines - 1).join(' ');
    if (remaining) {
      rawLines.push(remaining);
    }

    const normalizedLines = rawLines
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, maxLines)
      .map((line, index, array) => {
        if (line.length <= maxCharsPerLine) return line;
        if (index < array.length - 1) return `${line.slice(0, maxCharsPerLine - 1)}…`;
        return `${line.slice(0, maxCharsPerLine - 1)}…`;
      });

    return normalizedLines;
  }

  const lines: string[] = [];
  let current = '';

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index] ?? '';
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = '';
      if (lines.length === maxLines - 1) {
        const remaining = [word, ...words.slice(index + 1)].join(' ');
        lines.push(remaining);
        break;
      }
    }

    if (word.length > maxCharsPerLine) {
      const chunk = word.slice(0, maxCharsPerLine - 1);
      const rest = word.slice(maxCharsPerLine - 1);
      lines.push(chunk);
      if (lines.length === maxLines) break;
      current = rest;
    } else {
      current = word;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  if (lines.length === maxLines && lines[maxLines - 1].length > maxCharsPerLine) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, maxCharsPerLine - 1)}…`;
  }

  return lines;
}

export function createJerseyVisualDataUri(fondColor: string, texteColor: string, clubName: string): string {
  let svg = jerseySvgSource;
  svg = replaceSvgStyleColor(svg, '#32BEA6', 'transparent');
  svg = replaceSvgStyleColor(svg, '#000000', fondColor);
  svg = replaceSvgStyleColor(svg, '#EFCE0F', fondColor);
  svg = replaceSvgStyleColor(svg, '#F2B906', fondColor);
  svg = replaceSvgStyleColor(svg, '#578408', fondColor);
  svg = replaceSvgStyleColor(svg, '#C49F05', texteColor);
  svg = replaceSvgStyleColor(svg, '#487206', texteColor);
  svg = replaceSvgStyleColor(svg, '#8c9183', texteColor);

  const wrappedLines = wrapClubNameLines(clubName);
  if (wrappedLines.length > 0) {
    const lineHeight = 38;
    const startY = 245 - ((wrappedLines.length - 1) * lineHeight) / 2;
    const tspans = wrappedLines
      .map((line, index) => `<tspan x="248" y="${startY + index * lineHeight}">${escapeSvgText(line)}</tspan>`)
      .join('');
    const textLayer = `<text text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="700" letter-spacing="0.5" fill="${texteColor}">${tspans}</text>`;
    svg = svg.replace('</svg>', `${textLayer}</svg>`);
  }

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
