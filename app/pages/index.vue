<script setup>
definePageMeta({
  middleware: ["auth", "permiso"],
});
</script>

<template>
  <div class="home">
    <div class="card">
      <h1>Sistema Corporativo</h1>

      <p class="descripcion">
        Plataforma administrativa para la gestión de usuarios, perfiles, módulos
        y permisos del sistema.
      </p>

      <NuxtLink to="/login" class="btn-login"> Iniciar Sesión </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.home {
  height: 80vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1e3a5f, #3a6ea5);
}

.card {
  background: white;
  padding: 50px;
  width: 420px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

h1 {
  color: #1e3a5f;
  margin-bottom: 15px;
}

.descripcion {
  color: #555;
  margin-bottom: 30px;
}

.btn-login {
  background: #4caf50;
  color: white;
  padding: 12px 25px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: bold;
  transition: 0.3s;
}

.btn-login:hover {
  background: #43a047;
}
</style>
