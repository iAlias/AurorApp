import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { useApp, toEnvelope } from '../../app/store';
import { backupFilename, exportJson, parseBackup } from '../../core/storage/exportImport';
import type { StorageEnvelope } from '../../core/catalog/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';

/**
 * Sezione "Dati" delle Impostazioni (FR-8): esporta/importa il backup JSON
 * (§6.2, AC-9) e azzera tutto con doppia conferma (primo tap apre il
 * dialogo, il bottone finale resta disabilitato finché non si scrive il
 * nome esatto del bambino — case-insensitive e con trim, cosi' un "Sofia "
 * digitato con uno spazio o in minuscolo non frustra inutilmente chi conferma).
 */
export function DataSection() {
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);

  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<StorageEnvelope | null>(null);

  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetNameInput, setResetNameInput] = useState('');

  async function handleExport() {
    const env = toEnvelope(useApp.getState());
    const json = exportJson(env);
    if (Capacitor.isNativePlatform()) {
      // App Android: la WebView ignora i download, il file passa dal menu
      // Condividi (Drive, WhatsApp, email...).
      const { uri } = await Filesystem.writeFile({
        path: backupFilename(new Date()),
        data: json,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({ title: 'Backup di Arcobimbi', files: [uri] }).catch(() => {}); // condivisione annullata
      return;
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename(new Date());
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = ''; // permette di reimportare lo stesso file una seconda volta
    if (!file) return;
    const text = await file.text();
    const result = parseBackup(text);
    if (!result.ok) {
      setPendingImport(null);
      setImportError(
        result.reason === 'newer'
          ? 'Questo backup è di una versione più recente dell’app: aggiorna l’app prima di importarlo.'
          : 'Questo file non sembra un backup valido di Arcobimbi.',
      );
      return;
    }
    setImportError(null);
    setPendingImport(result.env);
  }

  function cancelImport() {
    setPendingImport(null);
  }

  function confirmImport() {
    if (!pendingImport) return;
    useApp.getState().importEnvelope(pendingImport);
    setPendingImport(null);
    navigate('/oggi', { replace: true });
  }

  function openResetDialog() {
    setResetNameInput('');
    setConfirmingReset(true);
  }

  const nameMatches =
    profile !== null && resetNameInput.trim().toLowerCase() === profile.name.trim().toLowerCase();

  function confirmReset() {
    if (!nameMatches) return;
    useApp.getState().resetAll();
    setConfirmingReset(false);
    navigate('/wizard', { replace: true });
  }

  const savedLabel = pendingImport
    ? format(parseISO(pendingImport.savedAt), "d MMMM yyyy 'alle' HH:mm", { locale: it })
    : '';
  const importedProfileName = pendingImport?.profile?.name ?? 'nessun profilo';

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-xl text-deep">Dati</h2>

      <div className="flex flex-col gap-2">
        <p className="font-body text-sm text-stone">
          Esporta un backup di tutto (profilo, routine, piani e progressi) in un file da conservare dove vuoi.
        </p>
        <Button type="button" onClick={() => void handleExport()} className="self-start">
          📤 Esporta backup
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-body text-sm text-stone">Importa un backup esportato in precedenza.</p>
        <label className="font-body text-sm font-semibold text-stone">
          Importa backup
          <input
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm"
          />
        </label>
        {importError && <p className="font-body text-sm text-coral">{importError}</p>}
      </div>

      {profile && (
        <div className="flex flex-col gap-2 border-t border-deep/10 pt-4">
          <p className="font-body text-sm text-stone">
            Azzera tutto: profilo, routine, piani e progressi vengono cancellati per sempre.
          </p>
          <Button type="button" variant="danger" onClick={openResetDialog} className="self-start">
            Azzera tutto
          </Button>
        </div>
      )}

      <Modal open={pendingImport !== null} onClose={cancelImport} title="Importare questo backup?">
        <div className="flex flex-col gap-4">
          <p className="font-body text-sm text-deep">
            Backup del {savedLabel} con il profilo di {importedProfileName}. Sostituirà i dati attuali.
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={confirmImport}>
              Conferma
            </Button>
            <Button type="button" variant="ghost" onClick={cancelImport}>
              Annulla
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmingReset} onClose={() => setConfirmingReset(false)} title="Azzerare tutto?">
        <div className="flex flex-col gap-4">
          <p className="font-body text-sm text-deep">
            Verrà cancellato tutto: profilo, routine, piani e progressi. Per confermare, scrivi il nome di{' '}
            {profile?.name ?? 'tuo figlio o tua figlia'} qui sotto.
          </p>
          <label className="flex flex-col gap-1 font-body text-sm text-deep">
            Scrivi il nome per confermare
            <input
              type="text"
              value={resetNameInput}
              onChange={(e) => setResetNameInput(e.target.value)}
              placeholder={profile?.name ?? ''}
              className="rounded-card border border-deep/20 px-3 py-2 font-body text-sm"
            />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="danger" disabled={!nameMatches} onClick={confirmReset}>
              Conferma azzeramento
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmingReset(false)}>
              Annulla
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
