<script setup>
import { ref } from "vue";
import { useSupabaseClient } from "#imports";
import bcrypt from "bcryptjs";
import { useRouter } from "vue-router";

const supabase = useSupabaseClient();
const router = useRouter();

// Inputs del formulario
const strnombreusuario = ref("");
const strpwd = ref("");

// Captcha
const captchaToken = ref("");

// Mensajes de error
const errorMsg = ref("");
const cargando = ref(false);

// Función que se llama cuando captcha es verificado
const onCaptchaVerified = (token) => {
  captchaToken.value = token;
};

// Función de login personalizada usando nombre de usuario
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

  // Buscamos el usuario en la tabla personalizada
  const { data: user, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("nombreusuario", strnombreusuario.value)
    .single();

  cargando.value = false;

  if (error || !user) {
    errorMsg.value = "Usuario no encontrado";
    return;
  }

  // Comparamos la contraseña usando bcrypt
  const passwordValida = bcrypt.compareSync(strpwd.value, user.password);
  if (!passwordValida) {
    errorMsg.value = "Contraseña incorrecta";
    return;
  }

  // Login exitoso
  // Aquí puedes guardar la sesión, por ejemplo en localStorage
  localStorage.setItem(
    "usuario",
    JSON.stringify({
      id: user.id,
      nombreusuario: user.nombreusuario,
    }),
  );

  // Redirigir a la página principal
  router.push("/dashboard");
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

    <!-- Aquí va tu componente de captcha -->
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

input {
  padding: 0.5rem;
  font-size: 1rem;
}

button {
  padding: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
}

.error {
  color: red;
  font-weight: bold;
}
</style>
