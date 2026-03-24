<script setup>
import { ref, onMounted } from "vue";

const strnombreusuario = ref("");
const strpwd = ref("");
const captchaToken = ref("");
const config = useRuntimeConfig();
const { cargarPermisos } = usePermisos();

console.log("RECAPTCHA KEY:", config.public.recaptchaSiteKey);

const onCaptchaVerified = (token) => {
  captchaToken.value = token;
};

onMounted(() => {
  if (window.grecaptcha) {
    window.grecaptcha.render("recaptcha-container", {
      sitekey: config.public.recaptchaSiteKey,
      callback: onCaptchaVerified,
    });
  }
});

const login = async () => {
  if (strnombreusuario.value.trim() === "" || strpwd.value.trim() === "") {
    alert("Todos los campos son obligatorios");
    return;
  }
  if (!captchaToken.value) {
    alert("Verifica el captcha");
    return;
  }

  try {
    const response = await $fetch("/api/login", {
      method: "POST",
      body: {
        username: strnombreusuario.value,
        password: strpwd.value,
      },
    });

    if (response.message) {
      alert(response.message);
      return;
    }

    console.log("Login correcto");

    // guardar token
    localStorage.setItem("token", response.token);

    // guardar usuario
    const usuario = useState("usuario", () => null);
    usuario.value = response.usuario;

    localStorage.setItem("usuario", JSON.stringify(response.usuario));

    // cargar permisos del perfil
    await cargarPermisos(response.usuario.idperfil);

    // redirigir
    await navigateTo("/dashboard");
  } catch (error) {
    console.error("Error:", error);
    alert("Error en el servidor");
  }
};
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <div class="logo">
        <h1>Sistema Corporativo</h1>
        <p>Acceso al sistema</p>
      </div>

      <div class="form">
        <div class="input-group">
          <span class="icon">👤</span>
          <input v-model="strnombreusuario" placeholder="Usuario" />
        </div>

        <div class="input-group">
          <span class="icon">🔒</span>
          <input type="password" v-model="strpwd" placeholder="Contraseña" />
        </div>

        <div id="recaptcha-container"></div>

        <button type="button" @click="login">Ingresar</button>

        <!--p class="recuperar">
          <NuxtLink to="/recuperar-password">
            ¿Olvidaste tu contraseña?
          </NuxtLink>
        </p-->
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #4f6df5, #6a4cf5);
  font-family: Arial, Helvetica, sans-serif;
}

.login-card {
  width: 380px;
  background: white;
  padding: 40px 35px;
  border-radius: 12px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
  animation: fadeIn 0.6s ease;
}

.logo {
  text-align: center;
  margin-bottom: 25px;
}

.logo h1 {
  font-size: 24px;
  margin: 0;
  color: #333;
}

.logo p {
  margin-top: 5px;
  font-size: 14px;
  color: #777;
}

.form {
  width: 100%;
}

.input-group {
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 15px;
  transition: 0.3s;
}

.input-group:focus-within {
  border-color: #4f6df5;
}

.icon {
  margin-right: 10px;
  font-size: 16px;
}

.input-group input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 14px;
}

.captcha {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #4f6df5;
  color: white;
  font-size: 15px;
  cursor: pointer;
  transition: 0.3s;
}

button:hover {
  background: #3955d6;
  transform: translateY(-2px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.forgot {
  margin-top: 15px;
  text-align: center;
}

.forgot a {
  font-size: 13px;
  color: #4f6df5;
  text-decoration: none;
  transition: 0.3s;
}

.forgot a:hover {
  text-decoration: underline;
}
</style>
