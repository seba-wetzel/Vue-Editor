import { Plugin, ButtonView, type Editor, type ModelElement, type ModelPosition } from 'ckeditor5';
import Comments from './comments.svg?raw';
import mdiCommentOffOutline from './comment-off-outline.svg?raw';
import mdiCommentOutline from './comment-outline.svg?raw';

export class CommentsPlugin extends Plugin {
  public static get pluginName() {
    return 'Comments' as const;
  }

  private showComments = true;

  private selectionHasComment(editor: Editor): boolean {
    const selection = editor.model.document.selection;
    const range = selection.getFirstRange();
    if (!range) return false;

    // Recorremos los items del rango y vemos si alguno ya tiene 'comment-id'
    for (const item of range.getItems()) {
      if (item.hasAttribute?.('comment-id')) return true;
    }
    return false;
  }

  public changeCommentsVisivility(newState: boolean): void {
    const editor = this.editor;
    this.showComments = newState;
    const domRoot = editor.editing.view.getDomRoot();

    if (!domRoot) return;
    //find every element with data-comment-id
    const commentElements = domRoot.querySelectorAll('[data-comment-id]');
    const toggleShow = editor.config.get('comments.toggleShow');

    if (typeof toggleShow === 'function') toggleShow(this.showComments);

    commentElements.forEach((el) => {
      if (this.showComments) {
        el.classList.add('comment-highlight');
      } else {
        el.classList.remove('comment-highlight');
      }
    });
  }
  public removeComment(commentId: string): void {
    const editor = this.editor;
    const model = editor.model;
    const root = model.document.getRoot();
    if (!root) return;

    model.change((writer) => {
      for (const element of root.getChildren()) {
        for (const item of model.createRangeIn(element as ModelElement)) {
          const node = item.item;
          if (node.hasAttribute?.('comment-id') && node.getAttribute('comment-id') == commentId) {
            writer.removeAttribute('comment-id', node);
          }
        }
      }
    });

    // Callback opcional para notificar la eliminación
    const onRemoved = editor.config.get('comments.onRemoved') as ((id: string) => void) | undefined;
    if (typeof onRemoved === 'function') {
      onRemoved(commentId);
    }
  }

  public highlightComment(commentId: string | number): void {
    const editor = this.editor;
    const model = editor.model;
    const root = model.document.getRoot();
    if (!root) return;

    let foundPositionStart: ModelPosition | null = null;
    let foundPositionEnd: ModelPosition | null = null;

    // Recorremos todo el contenido del root
    for (const item of model.createRangeIn(root)) {
      const node = item.item;
      if (node.hasAttribute?.('comment-id') && node.getAttribute('comment-id') == commentId) {
        const start = model.createPositionBefore(node);
        const end = model.createPositionAfter(node);
        foundPositionStart = start;
        foundPositionEnd = end;
        break;
      }
    }

    if (foundPositionStart && foundPositionEnd) {
      model.change((writer) => {
        const range = writer.createRange(foundPositionStart, foundPositionEnd);
        writer.setSelection(range);
      });

      // Hacer scroll al elemento y aplicar efecto visual
      setTimeout(() => {
        const domRoot = editor.editing.view.getDomRoot();
        if (!domRoot) return;
        const highlighted = domRoot.querySelector(`[data-comment-id="${commentId}"]`);
        if (highlighted) {
          highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
          highlighted.classList.add('comment-highlight-active');
          setTimeout(() => highlighted.classList.remove('comment-highlight-active'), 800);
        }
      }, 100);
    } else {
      console.warn(`No se encontró el comentario con ID: ${commentId}`);
    }
  }

  public init(): void {
    const editor = this.editor;

    // Exponer métodos del plugin en la configuración para acceso externo
    const removeCommentMethod = (commentId: string) => this.removeComment(commentId);
    const highlightCommentMethod = (commentId: string | number) => this.highlightComment(commentId);
    const changeCommentsVisivilityMethod = (newState: boolean) =>
      this.changeCommentsVisivility(newState);

    // Guardamos las referencias en el config para acceso externo
    editor.config.set('comments.removeComment', removeCommentMethod);
    editor.config.set('comments.highlightComment', highlightCommentMethod);
    editor.config.set('comments.changeCommentsVisivility', changeCommentsVisivilityMethod);

    // Habilitar atributo en el esquema (texto puede tener "comment-id")
    editor.model.schema.extend('$text', { allowAttributes: ['comment-id'] });

    // UPCAST: HTML -> Modelo (restaurar al cargar)
    editor.conversion.for('upcast').elementToAttribute({
      view: {
        name: 'span',
        attributes: { 'data-comment-id': true },
      },
      model: {
        key: 'comment-id',
        value: (viewElement: HTMLElement) => viewElement.getAttribute('data-comment-id'),
      },
    });

    // DOWNCAST: Modelo -> HTML (aplicar al exportar/mostrar)
    editor.conversion.for('downcast').attributeToElement({
      model: 'comment-id',
      view: (value, { writer }) =>
        writer.createAttributeElement(
          'span',
          { class: 'comment-highlight', 'data-comment-id': String(value) },
          { priority: 5 },
        ),
      converterPriority: 'high',
    });

    // Agregar eventos de click al modelo
    editor.editing.view.document.on('click', (_evt, data) => {
      const target = data.domTarget as HTMLElement;

      // Manejar click en comentarios
      const commentId = target.getAttribute('data-comment-id');
      if (commentId) {
        const onCommentClick = editor.config.get('comments.onClick') as
          | ((id: string, event: Event) => void)
          | undefined;
        if (typeof onCommentClick === 'function') {
          if (this.showComments) onCommentClick(commentId, data.domEvent);
        }
      }
    });

    // Registrar botón en la toolbar
    editor.ui.componentFactory.add('addComment', () => {
      const button = new ButtonView();

      button.set({
        label: 'Comentar',
        withText: true,
        tooltip: 'Agregar comentario al texto seleccionado',
        icon: Comments,
      });

      // Handler sin async (CKEditor espera void); se maneja lógica async internamente
      button.on('execute', () => {
        const selection = editor.model.document.selection;

        if (!selection || selection.isCollapsed) {
          // No hay selección visible: nada que comentar
          // (Podés integrar una notificación acá si querés)
          return;
        }

        // Evitar duplicados: si ya hay comment-id en el rango, salimos
        if (this.selectionHasComment(editor)) return;

        // Obtener hook (se castea porque config.get no conoce el tipo)
        const getTextHook = editor.config.get('comments.getText') as
          | (() => string | null | Promise<string | null>)
          | undefined;

        // Ejecutar lógica asíncrona en IIFE para no retornar Promise al listener
        void (async () => {
          try {
            let commentText: string | null;

            if (typeof getTextHook === 'function') {
              commentText = await Promise.resolve(getTextHook()); // Soporta retorno sync o Promise
            } else {
              commentText = window.prompt('Comentario:');
            }

            if (!commentText || !commentText.trim()) return;

            // Aplicar el atributo en el rango seleccionado
            const commentId = String(crypto.randomUUID());
            editor.model.change((writer) => {
              const range = selection.getFirstRange()!;
              writer.setAttribute('comment-id', commentId, range);
            });

            // Callback opcional para que tu app guarde el comentario aparte
            const onAdded = editor.config.get('comments.onAdded') as
              | ((id: string, text: string) => void)
              | undefined;
            if (typeof onAdded === 'function') {
              onAdded(commentId, commentText.trim());
            }
          } catch (e) {
            console.error('Error adding comment:', e);
          }
        })();
      });

      return button;
    });

    //Boton para ocultar la barra de comentarios
    editor.ui.componentFactory.add('toggleComments', () => {
      const button = new ButtonView();
      const hideConfig = {
        label: 'Ocultar',
        withText: true,
        tooltip: 'Ocultar columna y resaltado de comentarios',
        icon: mdiCommentOffOutline,
      };

      const showConfig = {
        label: 'Mostrar',
        withText: true,
        tooltip: 'Mostrar columna y resaltado de comentarios',
        icon: mdiCommentOutline,
      };

      button.set(this.showComments ? hideConfig : showConfig);

      // Handler sin async (CKEditor espera void); se maneja lógica async internamente
      button.on('execute', () => {
        this.showComments = !this.showComments;
        this.changeCommentsVisivility(this.showComments);
        button.set(!this.showComments ? showConfig : hideConfig);
      });

      return button;
    });
  }
}
