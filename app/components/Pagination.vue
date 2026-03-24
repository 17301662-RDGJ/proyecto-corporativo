<template>
  <div class="pagination">
    <button
      @click="cambiarPagina(paginaActual - 1)"
      :disabled="paginaActual === 1"
    >
      ⬅ Anterior
    </button>

    <span> Página {{ paginaActual }} de {{ totalPaginas }} </span>

    <button
      @click="cambiarPagina(paginaActual + 1)"
      :disabled="paginaActual === totalPaginas"
    >
      Siguiente ➡
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  paginaActual: Number,
  totalPaginas: Number,
});

const emit = defineEmits(["cambiar"]);

const cambiarPagina = (pagina) => {
  emit("cambiar", pagina);
};
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
}

button {
  background: #1e3a5f;
  color: white;
  border: none;
  padding: 6px 12px;
  cursor: pointer;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
