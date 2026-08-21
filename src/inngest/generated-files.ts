import type { Sandbox } from '@e2b/code-interpreter';
import { z } from 'zod';

import type { FileCollection } from '@/types';

const relativeFilePath = z
  .string()
  .trim()
  .min(1, 'File path cannot be empty.')
  .refine((path) => !path.startsWith('/'), {
    message: 'File paths must be relative to /home/user.',
  })
  .refine((path) => !path.split('/').includes('..'), {
    message: 'File paths cannot traverse outside /home/user.',
  });

export const generatedFilesInputSchema = z.object({
  files: z
    .array(
      z.object({
        path: relativeFilePath,
        content: z.string(),
      }),
    )
    .min(1, 'At least one file is required.'),
});

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
