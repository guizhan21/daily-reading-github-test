import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {hash, root, safeRelative} from '../scripts/catalog.mjs';
import {renderMarkdown} from '../scripts/render.mjs';

export async function checkReaderOriginal(page, chapter) {
  const download = page.locator('#markdown-download');
  assert.equal(await download.getAttribute('href'), chapter.markdown);
  const source = fs.readFileSync(path.join(root, 'public', safeRelative(chapter.markdown)));
  assert.equal(hash(source), chapter.textSha256);

  const article = page.locator('#reader-content article');
  await article.waitFor({state: 'visible'});
  assert.equal(await article.count(), 1);
  assert.equal(await article.getAttribute('id'), 'text-' + chapter.chapterId);
  const matches = await article.evaluate((element, html) => {
    const expected = document.createElement('template');
    expected.innerHTML = html;
    const nodes = expected.content.childNodes;
    return nodes.length > 0 && element.childNodes.length === nodes.length &&
      Array.from(nodes).every((node, index) => node.isEqualNode(element.childNodes[index]));
  }, renderMarkdown(source.toString('utf8')));
  assert.ok(matches, 'Reader content differs from the full original Markdown for ' + chapter.chapterId);
}
