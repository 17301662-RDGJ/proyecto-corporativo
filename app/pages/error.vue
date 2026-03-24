<script setup>
const props = defineProps({
  error: Object,
});

// 🔥 REDIRECCIÓN AUTOMÁTICA
setTimeout(() => {
  navigateTo("/login");
}, 3000);
</script>

<template>
  <div class="error-container">
    <div class="card">
      <!-- 🖼️ IMAGEN -->
      <img src="/error.png" alt="Error" class="error-img" />

      <!-- CÓDIGO -->
      <h1 class="code">{{ error?.statusCode || "Error" }}</h1>

      <!-- MENSAJE -->
      <p class="message">
        {{ error?.statusMessage || "Algo salió mal en el sistema" }}
      </p>

      <!-- TEXTO REDIRECCIÓN -->
      <p class="redirect">Redirigiendo al login en 3 segundos...</p>

      <!-- BOTÓN -->
      <button @click="navigateTo('/login')">Ir al Login</button>
    </div>
  </div>
</template>

<style scoped>
/* FONDO */
.error-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #eef2ff, #f4f6fb);
}

/* TARJETA */
.card {
  background: white;
  padding: 40px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 100%;
  animation: fadeIn 0.6s ease;
}

/* IMAGEN */
.error-img {
  width: 120px;
  margin-bottom: 20px;
  animation: float 2s ease-in-out infinite;
}

/* CÓDIGO */
.code {
  font-size: 42px;
  font-weight: bold;
  color: #e53935;
  margin: 0;
}

/* MENSAJE */
.message {
  margin: 15px 0;
  color: #555;
  font-size: 16px;
}

/* REDIRECCIÓN */
.redirect {
  font-size: 13px;
  color: #888;
}

/* BOTÓN */
button {
  margin-top: 15px;
  background: #1976d2;
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.3s;
}

button:hover {
  transform: scale(1.05);
  background: #125ea7;
}

/* ANIMACIONES */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(25px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>
