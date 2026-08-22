import type { Sandbox } from '@e2b/code-interpreter';
import { z } from 'zod';

import type { FileCollection } from '@/types';

const MAX_FILES = 80;
const MAX_FILE_BYTES = 200_000;
const MAX_TOTAL_BYTES = 1_000_000;
const ALLOWED_ROOT = /^(app|components|lib|public)\//;
const ALLOWED_EXTENSION = /\.(tsx?|jsx?|json|md|txt|svg)$/i;
const BLOCKED_BASENAME = /(^|\/)(package(-lock)?\.json|\.env(?:\..*)?|next\.config\.[^/]+|tsconfig\.json)$/i;

const relativeFilePath = z
  .string()
  .trim()
  .min(1, 'File path cannot be empty.')
  .refine((path) => !path.startsWith('/'), {
    message: 'File paths must be relative to /home/user.',
  })
  .refine((path) => !path.split('/').includes('..'), {
    message: 'File paths cannot traverse outside /home/user.',
  })
  .refine((path) => !path.includes('\\') && !/[\u0000-\u001f]/.test(path), {
    message: 'File paths contain invalid characters.',
  })
  .refine((path) => ALLOWED_ROOT.test(path), {
    message: 'Files must be inside app, components, lib, or public.',
  })
  .refine((path) => ALLOWED_EXTENSION.test(path) && !BLOCKED_BASENAME.test(path), {
    message: 'This file type or configuration file cannot be changed.',
  });

export const generatedFilesInputSchema = z.object({
  files: z
    .array(
      z.object({
        path: relativeFilePath,
        content: z.string().refine((value) => Buffer.byteLength(value) <= MAX_FILE_BYTES, {
          message: `A file cannot exceed ${MAX_FILE_BYTES} bytes.`,
        }),
      }),
    )
    .min(1, 'At least one file is required.')
    .max(MAX_FILES, `At most ${MAX_FILES} files may be written at once.`),
}).superRefine(({ files }, ctx) => {
  const bytes = files.reduce((total, file) => total + Buffer.byteLength(file.content), 0);
  if (bytes > MAX_TOTAL_BYTES) {
    ctx.addIssue({ code: 'custom', path: ['files'], message: `Generated files cannot exceed ${MAX_TOTAL_BYTES} bytes.` });
  }
});

export const validateReadPaths = (paths: string[]) =>
  paths.map((path) => relativeFilePath.parse(path.trim()));

export type GeneratedFile = z.infer<
  typeof generatedFilesInputSchema
>['files'][number];

export interface GeneratedFilesWriteResult {
  files: FileCollection;
  writtenPaths: string[];
  errors: string[];
}

export const ensureClientDirective = (path: string, content: string) => {
  const needsClientDirective =
    /\.(tsx|jsx)$/.test(path) &&
    /\b(useState|useEffect|useCallback|useMemo|useRef|useReducer|useContext|window|document|localStorage|sessionStorage)\b/.test(
      content,
    );

  if (needsClientDirective && !/^\s*['"]use client['"];?/m.test(content)) {
    return `'use client';\n\n${content.trimStart()}`;
  }

  return content;
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const writeGeneratedFiles = async (
  sandbox: Sandbox,
  existingFiles: FileCollection,
  files: GeneratedFile[],
): Promise<GeneratedFilesWriteResult> => {
  const updatedFiles = { ...existingFiles };
  const writtenPaths: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const path = file.path.trim();
    const content = ensureClientDirective(path, file.content);

    try {
      await sandbox.files.write(path, content);
      updatedFiles[path] = content;
      const entries = Object.entries(updatedFiles);
      const totalBytes = entries.reduce((total, [, value]) => total + Buffer.byteLength(value), 0);
      if (entries.length > MAX_FILES || totalBytes > MAX_TOTAL_BYTES) {
        delete updatedFiles[path];
        errors.push(`${path}: artifact size limit exceeded`);
        continue;
      }
      writtenPaths.push(path);
    } catch (error) {
      errors.push(`${path}: ${errorMessage(error)}`);
    }
  }

  return { files: updatedFiles, writtenPaths, errors };
};

export const generatedFilesToolMessage = (
  result: GeneratedFilesWriteResult,
) => {
  if (result.errors.length > 0) {
    const written =
      result.writtenPaths.length > 0
        ? ` Successfully wrote: ${result.writtenPaths.join(', ')}.`
        : '';

    return `WRITE_ERROR: ${result.errors.join(' | ')}.${written} Correct the failed paths and call createOrUpdateFiles again.`;
  }

  return `FILES_WRITTEN: ${result.writtenPaths.join(', ')}`;
};
