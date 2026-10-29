/** Retry transient downloads, then resolve the current deployment's chunk.
 * An already-open game can otherwise request a chunk removed by a Pages deploy.
 */
export async function importScene<T>(
  source: string,
  load: () => Promise<T>,
  current?: {
    manifest: () => Promise<Record<string, { file: string }>>;
    load: (file: string) => Promise<T>;
  },
): Promise<T> {
  try {
    return await load();
  } catch (first) {
    try {
      return await load();
    } catch {
      if (!current) throw first;
      const entry = (await current.manifest())[source];
      if (
        !entry ||
        !/^assets\/[\w./-]+\.js$/.test(entry.file) ||
        entry.file.includes("..")
      )
        throw first;
      return current.load(entry.file);
    }
  }
}

export function deployedScene<T>(
  source: string,
  load: () => Promise<T>,
): Promise<T> {
  const env = (
    import.meta as ImportMeta & { env?: { PROD?: boolean; BASE_URL?: string } }
  ).env;
  return importScene(
    source,
    load,
    env?.PROD
      ? {
          manifest: async () => {
            const response = await fetch(`${env.BASE_URL}scene-manifest.json`, {
              cache: "no-store",
            });
            if (!response.ok)
              throw new Error(
                `Scene manifest download failed: ${response.status}`,
              );
            return response.json();
          },
          load: (file) =>
            import(/* @vite-ignore */ `${env.BASE_URL}${file}`) as Promise<T>,
        }
      : undefined,
  );
}
