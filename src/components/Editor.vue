<template>
  <div class="flex justify-center">
    <div class="full-height flex">
      <!-- Listado lateral de comentarios -->

      <!-- Contenido principal -->
      <div class="col">
        <header
          v-if="title"
          class="q-mx-lg q-mt-md q-py-xs"
          style="font-size: 1.1rem; font-weight: 500"
        >
          {{ title }}
        </header>

        <div class="q-mx-lg q-my-md flex items-center gap-2"></div>

        <!-- poner en dos columnas pegadas el editor y el listado de -->
        <div style="display: flex">
          <ckeditor
            v-model="model"
            :disabled="disabled || readonly"
            :editor="ClassicEditor"
            :config="config"
            :class="props.class"
            style="flex-grow: 1"
            @ready="onEditorReady"
          />
          <div v-if="showComments" style="min-width: 350px; border: 1px solid #ccc">
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
        </div>

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
  type Editor,
} from 'ckeditor5';

import { Ckeditor } from '@ckeditor/ckeditor5-vue';
import 'ckeditor5/ckeditor5.css';
import '@ckeditor/ckeditor5-build-classic/build/translations/es';
import { CommentsPlugin } from 'src/utils/CommentsPlugin';
import { useQuasar } from 'quasar';

import { useCommentDialog } from './useCommentDialog';
import { MyCustomUploadAdapterPluginGenerator } from './UploadearPlugin';
const { getCommentText } = useCommentDialog();
const $q = useQuasar();

const model = defineModel<string>('modelValue');
const comments = defineModel<{ id: string; text: string }[]>('comments');
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
const emits = defineEmits<{
  (e: 'save'): void;
  (
    e: 'create-comment',
    comment: {
      id: string;
      text: string;
    },
  ): Promise<void>;
  (e: 'delete-comment', commentId: string): void;
}>();

const MyCustomUploadAdapterPlugin = MyCustomUploadAdapterPluginGenerator(props.imagesUrl);

const editorInstance = ref<Editor | null>(null);
const commentsApi = ref<{
  removeComment: (id: string) => void;
  highlightComment: (id: string | number) => void;
  changeCommentsVisivility: (state: boolean) => void;
} | null>(null);

const showComments = ref(false);

function removeComment(commentId: string) {
  commentsApi.value?.removeComment(commentId);
  emits('save');
}

function onEditorReady(editor: Editor) {
  editorInstance.value = editor;

  // Obtener los métodos del plugin una vez que el editor esté listo
  const removeCommentMethod = editor.config.get('comments.removeComment') as
    | ((id: string) => void)
    | undefined;
  const highlightCommentMethod = editor.config.get('comments.highlightComment') as
    | ((id: string | number) => void)
    | undefined;
  const changeCommentsVisivility = editor.config.get('comments.changeCommentsVisivility') as
    | (() => void)
    | undefined;
  if (removeCommentMethod && highlightCommentMethod) {
    commentsApi.value = {
      removeComment: removeCommentMethod,
      highlightComment: highlightCommentMethod,
      changeCommentsVisivility: changeCommentsVisivility!,
    };
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
    'toggleComments',
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
      // poweredBy: false,
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
        // Configuración válida: se establece la alineación por defecto usando defaultProperties
        defaultProperties: {
          alignment: 'right',
        },
      },
    },
    image: {
      insert: {
        type: 'auto' as const,
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
    comments: {
      getText: getCommentText, // 👈 acá inyectás el QDialog
      onAdded: (id: string, text: string) => {
        // opcional: actualizá tu lista lateral, guardá en store, etc.
        // comments.value.push({ id, text });
        console.log('Comentario agregado:', id, text);
        // comments.value.push({ id, text });
        void emits('create-comment', { id, text });
      },
      onRemoved: (id: string) => {
        // Quitar de la lista visual
        console.log('Comentario eliminado:', id);
        emits('delete-comment', id);
      },
      onClick: (id: string, _event: Event) => {
        console.log('Comentario clickeado:', id);
        // Manejar click en comentario
        const found = comments.value.find((c) => c.id == id);
        if (found) {
          $q.notify({
            message: `Comentario: ${found.text}`,
            position: 'top',
            timeout: 3000,
          });
        }
      },

      toggleShow: (show: boolean) => {
        console.log('Mostrar comentarios:', show);
        showComments.value = show;
      },
    },
    language: 'es',
  };
});

function highlightComment(commentId: string | number) {
  commentsApi.value?.highlightComment(commentId);
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
  height: calc(100% - 40px);
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
