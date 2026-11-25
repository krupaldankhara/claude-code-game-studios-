import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInlineMarkdown, parseMarkdownBlocks } from './markdownParser';

test('parseInlineMarkdown splits bold and inline code segments safely', () => {
  const segs = parseInlineMarkdown(
    'Catch **Dusk Lanternfish** using `Space` key.',
  );
  assert.deepEqual(segs, [
    { type: 'text', text: 'Catch ' },
    { type: 'strong', text: 'Dusk Lanternfish' },
    { type: 'text', text: ' using ' },
    { type: 'code', text: 'Space' },
    { type: 'text', text: ' key.' },
  ]);
});

test('parseMarkdownBlocks parses headings, lists, code blocks, and paragraphs', () => {
  const md = [
    '# Game Brief',
    '',
    'A relaxing **fishing** game.',
    '',
    '## Core Loop',
    '- Cast line',
    '- Reel in',
    '',
    '1. Step one',
    '2. Step two',
    '',
    '```ts',
    'const x = 1;',
    '```',
  ].join('\n');

  const blocks = parseMarkdownBlocks(md);
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[1].type, 'paragraph');
  assert.equal(blocks[2].type, 'heading');
  assert.equal(blocks[3].type, 'ul');
  assert.equal(blocks[4].type, 'ol');
  assert.equal(blocks[5].type, 'codeblock');
  if (blocks[5].type === 'codeblock') {
    assert.equal(blocks[5].lang, 'ts');
    assert.equal(blocks[5].code, 'const x = 1;');
  }
});
