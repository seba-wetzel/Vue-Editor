<template>
  <q-page class="row items-center justify-evenly">
    <Editor
      v-if="loaded"
      class="full-height min-width-[A4]"
      v-model="model"
      @save="save"
      v-model:comments="comments"
      @delete-comment="save"
      @create-comment="newComment"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import Editor from 'components/Editor.vue';
import { supabase } from 'src/db';

const model = ref('');
const comments = ref([]);
const loaded = ref(false);
const save = async () => {
  console.log('Guardando cambios en el modelo:', model.value);
  //await supabase.from('respuesta').update({ texto: model.value }).eq('id', 1);
};
onMounted(async () => {
  const { data, error } = await supabase
    .from('respuesta')
    .select('*, comentario(*, user:user_id(name))')
    .eq('id', 1)
    .single();
  if (error) {
    console.error(error);
  } else {
    console.log(data);
    model.value = data.texto || '';
    const comentariosMap = (data.comentario || []).map((c) => ({
      id: c.uuid,
      text: c.comentario,
      user: c.user ? c.user.name : 'Anónimo',
    }));
    comments.value = comentariosMap || [];
    loaded.value = true;
  }
});
const newComment = async (comment: { id: string; text: string }) => {
  console.log('Nuevo comentario recibido:', comment);
  const { data, error } = await supabase.from('comentario').insert([
    {
      uuid: comment.id,
      comentario: comment.text,
      respuesta_id: 1,
      user_id: 1, // Asignar un usuario fijo por ahora
    },
  ]);
  if (error) {
    console.error('Error al guardar el comentario:', error);
  } else {
    await supabase.from('respuesta').update({ texto: model.value }).eq('id', 1);
    console.log('Comentario guardado en la base de datos:', data);
  }
};
watch(comments, (newComments) => {
  console.log('Comentarios actualizados:', newComments);
});
</script>
