<template>
  <div class="flex justify-center">
    <div class="full-height">
      <header
        v-if="title"
        class="q-mx-lg q-mt-md q-py-xs"
        style="font-size: 1.1rem; font-weight: 500; line-height: 2rem; letter-spacing: 0.0125em"
      >
        {{ title }}
      </header>
      <q-btn label="Agregar comentario" @click="addComment" />
      <q-input
        v-model="inputText"
        label="Buscar comentario"
        class="q-mx-lg q-my-md"
        @keyup.enter="addComment"
      />
      <ckeditor
        v-model="model"
        :disabled="disabled || readonly"
        :editor="ClassicEditor"
        :config="config"
        :class="props.class"
        style="flex-grow: 1"
        @ready="onEditorReady"
      />
      <div
        v-if="hint"
        class="q-pa-sm"
        style="font-size: 12px; min-height: 20px; line-height: 1; color: rgba(0, 0, 0, 0.54)"
      >
        {{ hint }}
      </div>
    </div>
  </div>
</template>

<script setup lang="js">
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
} from 'ckeditor5';
import { api } from 'boot/axios';
import { Ckeditor } from '@ckeditor/ckeditor5-vue';
import 'ckeditor5/ckeditor5.css';
import '@ckeditor/ckeditor5-build-classic/build/translations/es';

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
const commentCounter = ref(0);
const comments = ref([]);
const inputText = ref('');

function addComment() {
  const editor = editorInstance.value;
  const selection = editor.model.document.selection;

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
}

class MyUploadAdapter {
  constructor(loader) {
    // The file loader instance to use during the upload.
    this.loader = loader;
  }

  // Starts the upload process.
  upload() {
    const upload = async (file) => {
      let data = new FormData();

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

function CommentsPlugin(editor) {
  editor.conversion.for('downcast').attributeToElement({
    model: 'comment-id',
    view: (value, { writer }) => {
      return writer.createAttributeElement(
        'span',
        { class: 'comment-highlight', 'data-comment-id': value },
        { priority: 5 },
      );
    },
    converterPriority: 'high',
  });
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
  ];
  return {
    licenseKey: 'GPL',
    plugins: [
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
      CommentsPlugin,
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
</style>
