import assert from 'node:assert/strict';
import test from 'node:test';

import type { Sandbox } from '@e2b/code-interpreter';

import {
  generatedFilesInputSchema,
  generatedFilesToolMessage,
  writeGeneratedFiles,
} from './generated-files';

test('rejects empty, absolute, and traversing generated file paths', () => {
  for (const path of ['', '   ', '/home/user/app/page.tsx', '../page.tsx']) {
    const result = generatedFilesInputSchema.safeParse({
      files: [{ path, content: 'content' }],
    });

    assert.equal(result.success, false, `expected ${JSON.stringify(path)} to fail`);
  }
});

test('rejects an empty generated file batch', () => {
  assert.equal(
    generatedFilesInputSchema.safeParse({ files: [] }).success,
    false,
  );
});

test('preserves successful writes and reports a failed path to the agent', async () => {
  const writes: string[] = [];
  const sandbox = {
    files: {
      write: async (path: string) => {
        if (path === 'app/broken.tsx') {
          throw new Error('Path or files are required');
        }
        writes.push(path);
      },
    },
  } as unknown as Sandbox;

  const input = generatedFilesInputSchema.parse({
    files: [
      { path: 'app/page.tsx', content: 'export default function Page() {}' },
      { path: 'app/broken.tsx', content: 'export const Broken = true;' },
    ],
  });
  const result = await writeGeneratedFiles(sandbox, {}, input.files);

  assert.deepEqual(writes, ['app/page.tsx']);
  assert.deepEqual(Object.keys(result.files), ['app/page.tsx']);
  assert.match(generatedFilesToolMessage(result), /^WRITE_ERROR:/);
  assert.match(generatedFilesToolMessage(result), /app\/broken\.tsx/);
  assert.match(generatedFilesToolMessage(result), /app\/page\.tsx/);
});

test('reports successful writes and inserts the client directive', async () => {
  const contents = new Map<string, string>();
  const sandbox = {
    files: {
      write: async (path: string, content: string) => {
        contents.set(path, content);
      },
    },
  } as unknown as Sandbox;

  const input = generatedFilesInputSchema.parse({
    files: [
      {
        path: 'app/page.tsx',
        content: 'import { useState } from "react";\nexport default function Page() {}',
      },
    ],
  });
  const result = await writeGeneratedFiles(sandbox, {}, input.files);

  assert.match(contents.get('app/page.tsx') ?? '', /^'use client';/);
  assert.equal(
    generatedFilesToolMessage(result),
    'FILES_WRITTEN: app/page.tsx',
  );
});
