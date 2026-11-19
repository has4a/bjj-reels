import { goBack } from '../state/router';
import { useStore } from '../state/store';
import { useConfirm, useToast } from '../ui/feedback';
import { Sheet } from '../ui/controls';
import { IconEye, IconEyeOff, IconTrash } from '../ui/icons';
import { Classifier } from './Classifier';
import { ReelSummary } from './ReelSummary';

/** Detail reelu ako spodný panel (route #/reel/<id>). */
export function ReelEditor({ id }: { id: string }) {
  const { byId, update, remove, settings } = useStore();
  const confirm = useConfirm();
  const toast = useToast();
  const reel = byId.get(id);
  const close = () => goBack('');

  if (!reel) {
    return (
      <Sheet title="Reel sa nenašiel" onClose={close}>
        <p className="muted">Tento reel v knižnici nie je. Možno bol odstránený alebo prišiel odkaz z iného zariadenia.</p>
      </Sheet>
    );
  }

  const del = async () => {
    const ok = await confirm({
      title: 'Odstrániť reel z appky?',
      body:
        reel.source === 'export'
          ? 'Zmizne aj tvoje triedenie. Pri ďalšom importe exportu z Instagramu sa reel objaví znova (ako nový). Ak ho tam nechceš vidieť, radšej ho označ „Mimo BJJ“.'
          : 'Zmizne aj tvoje triedenie. Na Instagrame sa nič nezmení.',
      confirm: 'Odstrániť',
      danger: true,
    });
    if (!ok) return;
    await remove(reel.id);
    toast('Reel odstránený');
    close();
  };

  return (
    <Sheet
      title="Triedenie"
      onClose={close}
      full
      footer={
        <>
          <button
            type="button"
            className="btn"
            onClick={() => {
              update(reel.id, { hidden: !reel.hidden });
              toast(reel.hidden ? 'Vrátené medzi BJJ' : 'Presunuté do „Mimo BJJ“');
            }}
          >
            {reel.hidden ? <IconEye size={18} /> : <IconEyeOff size={18} />}
            {reel.hidden ? 'Späť do BJJ' : 'Mimo BJJ'}
          </button>
          <button type="button" className="btn danger" onClick={del} aria-label="Odstrániť reel">
            <IconTrash size={18} />
          </button>
          <button type="button" className="btn primary grow" onClick={close}>
            Hotovo
          </button>
        </>
      }
    >
      <ReelSummary reel={reel} video={settings.showVideo} />
      <Classifier reel={reel} />
    </Sheet>
  );
}
