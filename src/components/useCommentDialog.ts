// useCommentDialog.ts
import { useQuasar } from 'quasar';

export function useCommentDialog() {
  const $q = useQuasar();

  function getCommentText(): Promise<string | null> {
    return new Promise((resolve) => {
      $q.dialog({
        title: 'Agregar comentario',
        message: 'Escribí tu comentario:',
        prompt: {
          model: '',
          type: 'textarea',
        },
        cancel: true,
        ok: { label: 'Guardar' },
        persistent: true,
      })
        .onOk((val: string) => resolve(val?.trim() || null))
        .onCancel(() => resolve(null))
        .onDismiss(() => {
          /* noop */
        });
    });
  }

  return { getCommentText };
}
