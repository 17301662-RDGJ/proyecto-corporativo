<script setup>
const { modulosPermitidos } = usePermisos();
const modulos = computed(() => modulosPermitidos.value);
//const modulos = computed(() => modulosPermitidos());
</script>

<template>
  <aside class="sidebar">
    <h2>Sistema</h2>

    <nav>
      <NuxtLink
        v-for="m in modulos"
        :key="m.id"
        :to="`/${m.strnombremodulo.toLowerCase()}`"
      >
        {{ m.strnombremodulo }}
      </NuxtLink>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  background: #1e3a5f;
  color: white;
  height: 100vh;
  padding: 20px;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

a {
  color: white;
  text-decoration: none;
  padding: 8px;
  border-radius: 6px;
}

a:hover {
  background: #2d4d75;
}
</style>
