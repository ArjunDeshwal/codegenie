import assert from 'node:assert/strict';
import test from 'node:test';

import type { Sandbox } from '@e2b/code-interpreter';

import {
  compactPreviewError,
  validateSandboxPreview,
  validationMessage,
} from './sandbox-health';

const sandboxStub = (options: {
  probeResults: Array<number | Error>;
  body?: string;
  processes?: Array<{ cmd: string; args: string[] }>;
}) => {
  const commands: string[] = [];
  const probes = [...options.probeResults];

  const sandbox = {
    commands: {
      list: async () => options.processes ?? [],
      run: async (command: string) => {
        commands.push(command);
        if (command.startsWith('curl ')) {
          const probe = probes.shift();
          if (probe instanceof Error) throw probe;
          return { stdout: String(probe), stderr: '', exitCode: 0 };
        }

        return { stdout: '', stderr: '', exitCode: 0 };
      },
    },
    files: {
      read: async () => options.body ?? '',
    },
  } as unknown as Sandbox;

  return { sandbox, commands };
};

test('accepts a healthy preview without restarting Next.js', async () => {
  const { sandbox, commands } = sandboxStub({ probeResults: [200] });
  const result = await validateSandboxPreview(sandbox);

  assert.deepEqual(result, {
    ok: true,
    statusCode: 200,
    restarted: false,
  });
  assert.equal(commands.filter((command) => command.includes('next dev')).length, 0);
});

test('restarts a missing server and waits for a healthy preview', async () => {
  const { sandbox, commands } = sandboxStub({
    probeResults: [new Error('connection refused'), 200],
  });
  const result = await validateSandboxPreview(sandbox, {
    startAttempts: 1,
    wait: async () => undefined,
  });

  assert.equal(result.ok, true);
  assert.equal(result.restarted, true);
  const startCommand = commands.find((command) => command.includes('next dev'));
  assert.ok(startCommand);
  assert.match(startCommand, /--hostname 0\.0\.0\.0 --port 3000/);
});

test('returns a compact build error for an unhealthy HTTP response', async () => {
  const { sandbox } = sandboxStub({
    probeResults: [500],
    body: '<html><body>Module not found: &quot;@/lib/utils&quot;</body></html>',
  });
  const result = await validateSandboxPreview(sandbox);

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 500);
  assert.match(validationMessage(result), /Module not found/);
  assert.equal(
    compactPreviewError('<strong>Error</strong>  details'),
    'Error details',
  );
});
