<script setup>
import { ref, onMounted } from "vue";
import { useSupabaseClient } from "#imports";
import { usePermisos } from "~/composables/usePermisos";
import { useRouter } from "vue-router";

const strnombreusuario = ref("");
const strpwd = ref("");
const captchaToken = ref("");

const config = useRuntimeConfig();
const { cargarPermisos } = usePermisos();
const router = useRouter();

console.log("RECAPTCHA KEY:", config.public.recaptchaSiteKey);

// --------------------------
// Cargar script de Google reCAPTCHA
// --------------------------
const loadRecaptcha = () => {
  return new Promise((resolve) => {
    if (window.grecaptcha) return resolve(window.grecaptcha);

    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.grecaptcha);
    document.head.appendChild(script);
  });
};

// --------------------------
// Callback del captcha
// --------------------------
const onCaptchaVerified = (token) => {
  captchaToken.value = token;
  console.log("Captcha verificado:", token);
};

// --------------------------
// Montaje del componente
// --------------------------
onMounted(async () => {
  const grecaptcha = await loadRecaptcha();

  // Render del widget
  grecaptcha.render("recaptcha-container", {
    sitekey: config.public.recaptchaSiteKey,
    callback: onCaptchaVerified,
  });
});

// --------------------------
// Función login
// --------------------------
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
    const supabase = useSupabaseClient();

    // Buscar usuario
    const { data: usuarios, error } = await supabase
      .from("usuario")
      .select("*")
      .eq("strnombreusuario", strnombreusuario.value)
      .maybeSingle();

    if (error || !usuarios) {
      alert("Usuario o contraseña incorrectos");
      return;
    }

    if (usuarios.strpwd !== strpwd.value) {
      alert("Usuario o contraseña incorrectos");
      return;
    }

    // Guardar usuario en state y localStorage
    const usuarioState = useState("usuario", () => null);
    usuarioState.value = usuarios;
    localStorage.setItem("usuario", JSON.stringify(usuarios));

    // Cargar permisos
    if (usuarios.idperfil) {
      await cargarPermisos(usuarios.idperfil);
    }

    // Redirigir a dashboard
    await router.push("/dashboard");
  } catch (err) {
    console.error("Error en login:", err);
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
          <input v-model="strnombreusuario" placeholder="Nombre de usuario" />
        </div>

        <div class="input-group">
          <span class="icon">🔒</span>
          <input type="password" v-model="strpwd" placeholder="Contraseña" />
        </div>

        <div id="recaptcha-container" class="captcha"></div>

        <button type="button" @click="login">Ingresar</button>
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
</style>
