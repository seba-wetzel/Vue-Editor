<template>
  <q-page class="row items-center justify-evenly bg-red">
    <Editor class="full-height" v-model="model" />
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Editor from 'components/Editor.vue';
const model = ref('<p>Escribe aquí tu texto...</p>');
</script>
