/** Stiahne JSON ako súbor (funguje aj v nainštalovanej PWA). */
export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Na mobile: poslať súbor cez systémové zdieľanie (Disk, e-mail…). Vráti false, ak to zariadenie nevie. */
export async function shareJson(name: string, data: unknown): Promise<boolean> {
  const file = new File([JSON.stringify(data)], name, { type: 'application/json' });
  if (!navigator.canShare?.({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], title: name });
  } catch (e) {
    if ((e as DOMException)?.name !== 'AbortError') throw e;
  }
  return true;
}

export const canShareFiles = () => {
  try {
    return !!navigator.canShare?.({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] });
  } catch {
    return false;
  }
};

export async function readJsonFiles(files: Iterable<File>): Promise<{ ok: { name: string; json: unknown }[]; errors: string[] }> {
  const ok: { name: string; json: unknown }[] = [];
  const errors: string[] = [];
  for (const f of files) {
    try {
      ok.push({ name: f.name, json: JSON.parse(await f.text()) });
    } catch {
      errors.push(`${f.name}: nie je platný JSON súbor.`);
    }
  }
  return { ok, errors };
}
