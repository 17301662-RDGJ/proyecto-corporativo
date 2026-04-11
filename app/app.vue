<script setup>
const route = useRoute();

import { onMounted } from "vue";

const usuarioState = useState("usuario", () => null);

onMounted(() => {
  const usuarioGuardado = localStorage.getItem("usuario");

  if (usuarioGuardado) {
    usuarioState.value = JSON.parse(usuarioGuardado);
    console.log("Usuario restaurado:", usuarioState.value);
  }
});
</script>

<template>
  <div>
    <Navbar
      v-if="
        route.path !== '/' &&
        route.path !== '/login' &&
        route.path !== '/principal1/principal1_1' &&
        route.path !== '/principal1/principal1_2' &&
        route.path !== '/principal2/principal2_1' &&
        route.path !== '/principal2/principal2_2' &&
        route.path !== '/seguridad/modulo' &&
        route.path !== '/seguridad/usuario' &&
        route.path !== '/seguridad/perfil' &&
        route.path !== '/seguridad/permisosperfil' &&
        route.path !== '/seguridad/recuperar-password' &&
        route.path !== '/seguridad/cambiar-password'"
    />
    <NuxtPage />
  </div>

</template>
