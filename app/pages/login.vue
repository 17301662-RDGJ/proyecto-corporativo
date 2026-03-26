<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const strnombreusuario = ref("");
const strpwd = ref("");
const captchaToken = ref("");
const errorMsg = ref("");
const cargando = ref(false);

const router = useRouter();

const onCaptchaVerified = (token) => {
  captchaToken.value = token;
};

const login = async () => {
  errorMsg.value = "";

  if (!strnombreusuario.value || !strpwd.value) {
    errorMsg.value = "Por favor completa todos los campos";
    return;
  }

  if (!captchaToken.value) {
    errorMsg.value = "Debes completar el captcha";
    return;
  }

  cargando.value = true;

  try {
    const res = await $fetch("/api/login", {
      method: "POST",
      body: {
        nombreusuario: strnombreusuario.value,
        password: strpwd.value,
      },
    });

    cargando.value = false;

    if (!res.success) {
      errorMsg.value = res.message;
      return;
    }

    // Guardar sesión
    localStorage.setItem("usuario", JSON.stringify(res.user));

    // Redirigir
    router.push("/dashboard");
  } catch (err) {
    cargando.value = false;
    errorMsg.value = "Error en la conexión al servidor";
  }
};
</script>

<template>
  <div class="login-container">
    <h2>Iniciar sesión</h2>

    <input
      v-model="strnombreusuario"
      type="text"
      placeholder="Nombre de usuario"
    />
    <input v-model="strpwd" type="password" placeholder="Contraseña" />

    <!-- Tu captcha -->
    <ReCaptcha @verified="onCaptchaVerified" />

    <button :disabled="cargando" @click="login">
      {{ cargando ? "Validando..." : "Entrar" }}
    </button>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
  </div>
</template>

<style scoped>
.login-container {
  max-width: 400px;
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
input,
button {
  padding: 0.5rem;
  font-size: 1rem;
}
button {
  cursor: pointer;
}
.error {
  color: red;
  font-weight: bold;
}
</style>
