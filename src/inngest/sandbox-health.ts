import type { Sandbox } from '@e2b/code-interpreter';

const PREVIEW_URL = 'http://127.0.0.1:3000/';
const PREVIEW_BODY_PATH = '/tmp/codegenie-preview.html';
const SERVER_LOG_PATH = '/tmp/codegenie-next.log';
const DEFAULT_START_ATTEMPTS = 30;

export interface PreviewValidationResult {
  ok: boolean;
  statusCode?: number;
  restarted: boolean;
  error?: string;
}

const wait = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs));

interface PreviewValidationOptions {
  startAttempts?: number;
  wait?: typeof wait;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const compactPreviewError = (value: string) =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6_000);

const readIfPresent = async (sandbox: Sandbox, path: string) => {
  try {
    return String(await sandbox.files.read(path));
  } catch {
    return '';
  }
};

const probePreview = async (
  sandbox: Sandbox,
): Promise<Omit<PreviewValidationResult, 'restarted'>> => {
  try {
    const result = await sandbox.commands.run(
      `curl --silent --show-error --max-time 15 --output ${PREVIEW_BODY_PATH} --write-out "%{http_code}" ${PREVIEW_URL}`,
      { timeoutMs: 20_000 },
    );
    const statusCode = Number.parseInt(result.stdout.trim(), 10);

    if (statusCode >= 200 && statusCode < 400) {
      return { ok: true, statusCode };
    }

    const responseBody = compactPreviewError(
      await readIfPresent(sandbox, PREVIEW_BODY_PATH),
    );
    return {
      ok: false,
      statusCode: Number.isNaN(statusCode) ? undefined : statusCode,
      error: responseBody || `Preview returned HTTP ${statusCode}.`,
    };
  } catch (error) {
    return {
      ok: false,
      error: `Preview connection failed: ${errorMessage(error)}`,
    };
  }
};

const hasRunningNextServer = async (sandbox: Sandbox) => {
  const processes = await sandbox.commands.list();

  return processes.some((process) =>
    [process.cmd, ...process.args].join(' ').includes('next dev'),
  );
};

export const validateSandboxPreview = async (
  sandbox: Sandbox,
  options: PreviewValidationOptions = {},
): Promise<PreviewValidationResult> => {
  const firstProbe = await probePreview(sandbox);
  if (firstProbe.ok || firstProbe.statusCode) {
    return { ...firstProbe, restarted: false };
  }

  if (await hasRunningNextServer(sandbox)) {
    return { ...firstProbe, restarted: false };
  }

  await sandbox.commands.run(
    `npx next dev --turbopack --hostname 0.0.0.0 --port 3000 > ${SERVER_LOG_PATH} 2>&1`,
    {
      background: true,
      cwd: '/home/user',
      envs: { NODE_OPTIONS: '--max-old-space-size=1536' },
    },
  );

  const pause = options.wait ?? wait;
  const attempts = options.startAttempts ?? DEFAULT_START_ATTEMPTS;
  let lastProbe = firstProbe;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await pause(1_000);
    lastProbe = await probePreview(sandbox);
    if (lastProbe.ok || lastProbe.statusCode) {
      return { ...lastProbe, restarted: true };
    }
  }

  const serverLog = compactPreviewError(
    await readIfPresent(sandbox, SERVER_LOG_PATH),
  );

  return {
    ...lastProbe,
    restarted: true,
    error: serverLog || lastProbe.error || 'Preview server did not start.',
  };
};

export const validationMessage = (result: PreviewValidationResult) =>
  result.ok
    ? `VALIDATION_OK: Preview returned HTTP ${result.statusCode}.`
    : `VALIDATION_ERROR: ${result.error || 'The preview failed to render.'}`;
