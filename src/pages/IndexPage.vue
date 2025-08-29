<template>
  <q-page class="row items-center justify-evenly">
    <Editor class="full-height" v-model="model" />
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Editor from 'components/Editor.vue';
import { supabase } from 'src/db';
const model = ref(
  `<p>Texto sin comentario</p>
<p><span data-comment-id="0">Texto comentado</span></p>`,
);

onMounted(async () => {
  const { data, error } = await supabase
    .from('comentario')
    .select('id, comentario, user(*), respuesta(*, informe(*)), created_at');
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
});
</script>
