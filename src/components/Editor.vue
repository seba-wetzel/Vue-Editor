<template>
  <div class="flex justify-center">
    <div class="full-height flex">
      <!-- Listado lateral de comentarios -->
      <div class="q-pa-md" style="min-width: 250px; border-right: 1px solid #ccc">
        <q-list>
          <q-item-label header>Comentarios</q-item-label>
          <q-item
            v-for="comment in comments"
            :key="comment.id"
            clickable
            @click="highlightComment(comment.id)"
          >
            <q-item-section>{{ comment.text }}</q-item-section>
            <q-item-section side>
              <q-btn
                icon="delete"
                color="negative"
                size="sm"
                flat
                round
                @click.stop="removeComment(comment.id)"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Contenido principal -->
      <div class="col">
        <header
          v-if="title"
          class="q-mx-lg q-mt-md q-py-xs"
          style="font-size: 1.1rem; font-weight: 500"
        >
          {{ title }}
        </header>

        <div class="q-mx-lg q-my-md flex items-center gap-2">
          <q-btn label="Agregar comentario" @click="addComment" color="primary" />
          <q-input
            v-model="inputText"
            label="Nuevo comentario"
            dense
            outlined
            @keyup.enter="addComment"
          />
        </div>

        <ckeditor
          v-model="model"
          :disabled="disabled || readonly"
          :editor="ClassicEditor"
          :config="config"
          :class="props.class"
          style="flex-grow: 1"
          @ready="onEditorReady"
        />

        <div v-if="hint" class="q-pa-sm" style="font-size: 12px">
          {{ hint }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  ClassicEditor,
  Essentials,
  Bold,
  Heading,
  Italic,
  Image,
  ImageCaption,
  ImageToolbar,
  ImageResize,
  ImageUpload,
  ImageStyle,
  FileRepository,
  List,
  Table,
  TableToolbar,
  TableColumnResize,
  TableCellProperties,
  TableProperties,
  Link,
  Alignment,
  PasteFromOffice,
  Plugin,
  ButtonView,
} from 'ckeditor5';
// import { ButtonView } from 'ckeditor5/src/ui.js';
import { api } from 'boot/axios';
import { Ckeditor } from '@ckeditor/ckeditor5-vue';
import 'ckeditor5/ckeditor5.css';
import '@ckeditor/ckeditor5-build-classic/build/translations/es';
import { useQuasar } from 'quasar';
const $q = useQuasar();

const model = defineModel('modelValue', String);
const props = defineProps({
  hint: { type: String, default: '' },
  title: { type: String, default: '' },
  removeEnter: {
    type: Boolean,
    default: false,
  },
  complete: {
    type: Boolean,
    default: false,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  link: {
    type: Boolean,
    default: false,
  },
  minHeight: {
    type: String,
    default: '5rem',
  },
  class: {
    type: String,
    default: '',
  },
  imagesUrl: {
    type: String,
    default: 'mensajes/archivos',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});
const editorInstance = ref(null);
const commentCounter = ref(1);
const comments = ref([{ id: 0, text: 'comentario inicial' }]);
const inputText = ref('');

function addComment() {
  const editor = editorInstance.value;
  const selection = editor.model.document.selection;
  const range = selection.getFirstRange();
  let hasComment = false;

  for (const item of range.getItems()) {
    if (item.hasAttribute('comment-id')) {
      hasComment = true;
      break;
    }
  }

  if (hasComment) {
    $q.notify({
      message: 'Este texto ya tiene un comentario',
      color: 'info',
      position: 'top',
    });
    return;
  }
  if (!selection || selection.isCollapsed) {
    alert('Selecciona un texto para comentar');
    return;
  }

  const commentId = `comment-${commentCounter.value}`;
  const commentText = inputText.value.trim();
  console.log(
    selection.getFirstRange(),
    selection.getSelectedElement(),
    selection.getSelectedBlocks(),
  );
  if (!commentText) return;

  editor.model.change((writer) => {
    const range = editor.model.document.selection.getFirstRange();
    writer.setAttribute('comment-id', commentCounter.value, range);
  });

  // Guardar comentario en lista
  comments.value.push({ id: commentCounter.value, text: commentText });
  commentCounter.value++;
}

function removeComment(commentId) {
  const editor = editorInstance.value;
  const model = editor.model;
  const root = model.document.getRoot();

  model.change((writer) => {
    for (const element of root.getChildren()) {
      for (const item of model.createRangeIn(element)) {
        const node = item.item;
        if (node.hasAttribute?.('comment-id') && node.getAttribute('comment-id') == commentId) {
          writer.removeAttribute('comment-id', node);
        }
      }
    }

    // Quitar de la lista visual también
    const index = comments.value.findIndex((c) => c.id == commentId);
    if (index !== -1) {
      comments.value.splice(index, 1);
    }
  });
}

function onEditorReady(editor) {
  editorInstance.value = editor;
  editorInstance.value.editing.view.document.on('click', (evt, domEvt) => {
    const target = domEvt.domTarget;
    console.log('click', target);
    const commentId = target.getAttribute?.('data-comment-id');
    console.log('commentId', commentId);
    if (commentId) {
      const found = comments.value.find((c) => c.id == commentId);
      if (found) alert(found.text);
    }
  });
  console.log('EDITOR HTML:', editor.getData());

  const root = editor.model.document.getRoot();
  for (const node of root.getChildren()) {
    console.log('NODE:', node.name, [...node.getAttributes()]);
  }
}

class MyUploadAdapter {
  constructor(loader) {
    // The file loader instance to use during the upload.
    this.loader = loader;
  }

  // Starts the upload process.
  upload() {
    const upload = async (file) => {
      const data = new FormData();

      data.append('archivo', file);
      try {
        const { data: res } = await api.post(`${props.imagesUrl}`, data);
        console.log();
        return {
          default: `/images/editor/${res}`,
        };
      } catch (e) {}
    };
    return this.loader.file.then((file) => upload(file));
  }

  // Aborts the upload process.
  abort() {
    // Reject the promise returned from the upload() method.
  }
}

function MyCustomUploadAdapterPlugin(editor) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
    // Configure the URL to the upload script in your back-end here!
    return new MyUploadAdapter(loader);
  };
}

// function CommentsPlugin(editor) {
//   editor.model.schema.extend('$text', {
//     allowAttributes: ['comment-id'],
//   });
//   // ↓↓↓ Restaurar al cargar HTML
//   editor.conversion.for('upcast').elementToAttribute({
//     view: {
//       name: 'span',
//       attributes: {
//         'data-comment-id': true,
//       },
//     },
//     model: {
//       key: 'comment-id',
//       value: (viewElement) => viewElement.getAttribute('data-comment-id'),
//     },
//   });

//   // ↓↓↓ Aplicar al guardar/exportar
//   editor.conversion.for('downcast').attributeToElement({
//     model: 'comment-id',
//     view: (value, { writer }) =>
//       writer.createAttributeElement(
//         'span',
//         {
//           class: 'comment-highlight',
//           'data-comment-id': value,
//         },
//         { priority: 5 },
//       ),
//     converterPriority: 'high',
//   });

//   editor.ui.componentFactory.add('addComment', (locale) => {
//     const view = new ButtonView(locale);

//     view.set({
//       label: 'Agregar comentario',
//       icon: null, // Podés agregar un SVG personalizado
//       tooltip: true,
//       withText: true, // para mostrar texto en lugar de icono
//     });

//     view.on('execute', () => {
//       // Emitimos un evento que capturamos desde Vue
//       editor.fire('custom-add-comment');
//     });

//     return view;
//   });
// }

type GetTextHook = () => Promise<string | null> | string | null;

class CommentsPlugin extends Plugin {
  public static get pluginName() {
    return 'Comments' as const;
  }

  private commentCounter = 1;

  public init(): void {
    const editor = this.editor;

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
        value: (viewElement) => viewElement.getAttribute('data-comment-id'),
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

    // Registrar botón en la toolbar
    editor.ui.componentFactory.add('addComment', () => {
      const button = new ButtonView();

      button.set({
        label: 'Agregar comentario',
        withText: true,
        tooltip: true,
      });

      button.on('execute', () => async () => {
        const selection = editor.model.document.selection;

        if (!selection || selection.isCollapsed) {
          // No hay selección visible: nada que comentar
          // (Podés integrar una notificación acá si querés)
          return;
        }

        // Evitar duplicados: si ya hay comment-id en el rango, salimos
        const hasComment = this.selectionHasComment(editor);
        if (hasComment) return;

        // Hook configurable para obtener el texto del comentario
        // (si no está, usamos prompt)
        const getTextHook = editor.config.get<GetTextHook>('comments.getText');
        let commentText: string | null = null;

        if (typeof getTextHook === 'function') {
          commentText = await Promise.resolve(getTextHook());
        } else {
          // fallback
          commentText = window.prompt('Comentario:');
        }

        if (!commentText || !commentText.trim()) return;

        // Aplicar el atributo en el rango seleccionado
        const commentId = String(this.commentCounter++);
        editor.model.change((writer) => {
          const range = selection.getFirstRange()!;
          writer.setAttribute('comment-id', commentId, range);
        });

        // Callback opcional para que tu app guarde el comentario aparte
        const onAdded = editor.config.get<(id: string, text: string) => void>('comments.onAdded');
        if (typeof onAdded === 'function') {
          onAdded(commentId, commentText.trim());
        }

        // Efecto visual suave si querés (opcional): buscar en DOM y animar
        // (lo usual es hacerlo desde el wrapper Vue; acá lo dejo como nota)
      });

      return button;
    });
  }

  private selectionHasComment(editor: any): boolean {
    const selection = editor.model.document.selection;
    const range = selection.getFirstRange();
    if (!range) return false;

    // Recorremos los items del rango y vemos si alguno ya tiene 'comment-id'
    for (const item of range.getItems()) {
      if (item.hasAttribute?.('comment-id')) return true;
    }
    return false;
  }
}

const config = computed(() => {
  const toolbar = [
    'heading',
    '|',
    'alignment',
    'bold',
    'italic',
    '|',
    'bulletedList',
    'numberedList',
    '|',
    'undo',
    'redo',
    'insertTable',
    '|',
    'imageUpload',
    'link',
    'addComment',
  ];
  return {
    licenseKey: 'GPL',
    plugins: [
      CommentsPlugin,
      Alignment,
      Essentials,
      Bold,
      Heading,
      Italic,
      Link,
      List,
      Image,
      ImageCaption,
      ImageResize,
      ImageToolbar,
      ImageStyle,
      Table,
      TableToolbar,
      TableColumnResize,
      TableCellProperties,
      TableProperties,
      ImageUpload,
      FileRepository,
      PasteFromOffice,
      MyCustomUploadAdapterPlugin,
      // ReplaceTableFigureFloatWithClass,
    ],
    toolbar: props.disabled || props.readonly ? [] : toolbar,
    ui: {
      poweredBy: false,
    },
    table: {
      contentToolbar: [
        'tableColumn',
        'tableRow',
        'mergeTableCells',
        '|',
        'tableProperties',
        'tableCellProperties',
      ],
      tableProperties: {
        // Esto desactiva la opción de alineación

        alignment: 'right',
      },
    },
    image: {
      insert: {
        type: 'auto',
      },
      toolbar: [
        'imageStyle:block',
        'imageStyle:inline',
        'imageStyle:alignLeft',
        'imageStyle:alignRight',
        '|',
        'toggleImageCaption',
        'imageTextAlternative',
      ],
    },
    language: 'es',
  };
});

function highlightComment(commentId) {
  const editor = editorInstance.value;
  const model = editor.model;
  const root = model.document.getRoot();

  let foundPositionStart = null;
  let foundPositionEnd = null;

  // Buscar el rango
  for (const element of root.getChildren()) {
    for (const item of model.createRangeIn(element)) {
      const node = item.item;
      if (node.hasAttribute?.('comment-id') && node.getAttribute('comment-id') == commentId) {
        const start = model.createPositionBefore(node);
        const end = model.createPositionAfter(node);
        foundPositionStart = start;
        foundPositionEnd = end;
        break;
      }
    }
    if (foundPositionStart && foundPositionEnd) break;
  }

  if (foundPositionStart && foundPositionEnd) {
    model.change((writer) => {
      const range = writer.createRange(foundPositionStart, foundPositionEnd);
      writer.setSelection(range);
    });

    // Hacer scroll al elemento y aplicar efecto visual
    setTimeout(() => {
      const domRoot = editor.editing.view.getDomRoot();
      const highlighted = domRoot.querySelector(`[data-comment-id="${commentId}"]`);
      if (highlighted) {
        highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Agregar clase animada temporalmente
        highlighted.classList.add('comment-highlight-active');
        setTimeout(() => highlighted.classList.remove('comment-highlight-active'), 800);
      }
    }, 100);
  } else {
    console.warn(`No se encontró el comentario con ID: ${commentId}`);
  }
}

function findCommentInElement(element, commentId, writer) {
  if (element.is('text') && element.hasAttribute('comment-id')) {
    if (element.getAttribute('comment-id') == commentId) {
      return writer.createRangeOn(element);
    }
  }

  if (element.is('element')) {
    for (const child of element.getChildren()) {
      const result = findCommentInElement(child, commentId, writer);
      if (result) return result;
    }
  }

  return null;
}
</script>
<style>
@reference "tailwindcss";
.ck-powered-by {
  display: none;
}
.full-height {
  /* a4 page */
  width: 210mm;
  height: 100%;
  min-height: 297mm;
  display: flex;
  flex-direction: column;
  justify-self: center;
}

.ck.ck-editor {
  height: 100%;
  height: 297mm;
}

.ck.ck-editor__main {
  height: 100%;
}

.ck.ck-content.ck-editor__editable {
  height: 100%;
  /* min-height: 10rem; */
  min-height: v-bind('props.minHeight');
}

.ck.ck-content ul,
.ck.ck-content ol {
  padding-left: 2.5rem;
}

.ck.ck-content ul li {
  list-style: disc;
}

.ck.ck-content ol li {
  list-style: decimal !important;
}

.ck.ck-content a {
  color: #007aff !important;
  text-decoration: underline !important;
  cursor: pointer !important;
}
.ck.ck-content h2 {
  @apply font-bold text-2xl;
}

.ck.ck-content h3 {
  @apply font-semibold text-xl;
}
.ck.ck-content h4 {
  @apply font-semibold text-lg;
}

.ck.ck-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 16px;
  table-layout: auto;
  border: 1px solid #ccc;
}

.ck.ck-content th,
.ck.ck-content td {
  border: 1px solid #ccc;
  padding: 8px 10px;

  word-break: break-word;
  white-space: normal;
}

.ck.ck-content th {
  background-color: #f7f7f7;
  font-weight: bold;
}

.ck.ck-content img {
  max-width: 100%;
  height: auto;
}
.ck.ck-content p {
  font-size: 16px;
  line-height: 1.5;
}

.ck-content .image.image-style-align-right {
  float: right;
}

.ck-content .image.image-style-align-left {
  float: left;
}

.ck-content .image.image-style-align-center {
  margin-left: auto;
  margin-right: auto;
  float: none;
}
.ck-content .table {
  display: block !important;
  margin-left: auto;
  margin-right: auto;
  float: none !important;
}
.comment-highlight {
  background-color: yellow;
  cursor: pointer;
}

.comment-highlight-active {
  animation: comment-flash 1.8s ease-in-out;
}

@keyframes comment-flash {
  0% {
    background-color: yellow;
  }
  50% {
    background-color: orange;
  }
  100% {
    background-color: yellow;
  }
}
</style>
