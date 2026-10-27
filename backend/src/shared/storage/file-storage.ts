import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../../config/env.js';

export type StoredFile = {
  storageKey: string;
  absolutePath: string;
};

export function createFileStorage(config: AppConfig) {
  const root = resolve(config.storageRoot);

  function safeKey(key: string): string {
    // Prevent path traversal: key must be relative, no '..' segments.
    if (key.includes('..') || key.startsWith('/') || key.startsWith('\\')) {
      throw new Error('Invalid storage key');
    }
    return key;
  }

  async function save(
    buffer: Buffer,
    opts: { mimeType: string; originalName: string },
  ): Promise<StoredFile> {
    const ext = (opts.originalName.split('.').pop() || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const key = `media/${randomUUID()}${ext ? '.' + ext : ''}`;
    const absolutePath = join(root, key);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
    return { storageKey: key, absolutePath };
  }

  function absolutePath(key: string): string {
    return join(root, safeKey(key));
  }

  async function read(key: string): Promise<Buffer> {
    return readFile(absolutePath(key));
  }

  async function remove(key: string): Promise<void> {
    try {
      await unlink(absolutePath(key));
    } catch {
      // ignore missing
    }
  }

  return { root, save, read, remove, absolutePath, safeKey };
}

export type FileStorage = ReturnType<typeof createFileStorage>;
