<template>
  <div class="breadcrumb">
    <NuxtLink to="/dashboard" class="link"> Inicio </NuxtLink>

    <span> / </span>

    <span class="actual">
      {{ pagina }}
    </span>
  </div>
</template>

<script setup>
import { useRoute } from "vue-router";

const route = useRoute();

const pagina = route.path
  .split("/")
  .pop()
  .replace("-", " ")
  .replace(/\b\w/g, (l) => l.toUpperCase());
</script>

<style scoped>
.breadcrumb {
  font-size: 14px;
  margin-bottom: 15px;
}

.link {
  color: #1e3a5f;
  font-weight: 600;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.actual {
  color: #6c757d;
}
</style>
