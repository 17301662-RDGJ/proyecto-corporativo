<script setup>
import { ref, onMounted, computed } from "vue";
import { usePermisos } from "~/composables/usePermisos";

definePageMeta({
  middleware: ["auth", "permiso"],
});

const fechaHora = ref("");
const usuario = ref(null);

const { cargarPermisos } = usePermisos();

/* SALUDO DINÁMICO */
const saludo = computed(() => {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 18) return "Buenas tardes";
  return "Buenas noches";
});

/* ROL */
const rol = computed(() => {
  if (!usuario.value) return "";
  return usuario.value.bitadministrador ? "Administrador" : "Usuario";
});

onMounted(async () => {
  const usr = process.client
    ? JSON.parse(localStorage.getItem("usuario"))
    : null;

  if (usr) {
    usuario.value = usr;
    await cargarPermisos(usr.idperfil);
  }

  const actualizarHora = () => {
    fechaHora.value = new Date().toLocaleString();
  };

  actualizarHora();
  setInterval(actualizarHora, 1000);
});
</script>

<template>
  <div class="dashboard">
    <div class="content">
      <div class="welcome-card">
        <!-- HEADER USUARIO PRO -->
        <div class="user-header" v-if="usuario">
          <div class="avatar-container">
            <img v-if="usuario.strfoto" :src="usuario.strfoto" class="avatar" />
          </div>

          <div class="user-text">
            <p class="saludo">
              {{ saludo }},
              <span class="nombre">{{ usuario.strnombreusuario }}</span>
            </p>

            <p class="rol">{{ rol }}</p>
          </div>
        </div>

        <!-- ICONO -->
        <div class="icon">🖥️</div>

        <!-- TITULO -->
        <h1>Bienvenido al sistema</h1>

        <p>Inicio de sesión correcto</p>

        <!-- INFO -->
        <div class="info">
          <p>
            Desde este panel podrás acceder a los diferentes módulos del sistema
            mediante el menú superior.
          </p>
        </div>

        <!-- HORA -->
        <div class="time"><strong>Fecha y hora:</strong> {{ fechaHora }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  background: #f4f6fb;
  min-height: 100vh;
}

.content {
  padding: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* TARJETA */
.welcome-card {
  background: white;
  padding: 45px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  max-width: 700px;
  width: 100%;
  text-align: center;
  animation: fadeIn 0.6s ease;
}

/* HEADER USUARIO */
.user-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
  justify-content: flex-start;
  text-align: left;
  width: 100%;
}

/* FOTO */
.avatar-container {
  position: relative;
}

.avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #1976d2;
  transition: all 0.3s ease;
}

/* EFECTO HOVER */
.avatar:hover {
  transform: scale(1.08);
  box-shadow: 0 0 15px rgba(25, 118, 210, 0.4);
}

/* TEXTO USUARIO */
.user-text {
  text-align: left;
}

.saludo {
  margin: 0;
  font-size: 16px;
  color: #555;
}

.nombre {
  font-weight: bold;
  color: #1e3a5f;
}

/* ROL */
.rol {
  margin: 0;
  font-size: 13px;
  color: #888;
  background: #eef3ff;
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  margin-top: 5px;
}

/* ICONO */
.icon {
  font-size: 55px;
  margin-bottom: 15px;
}

/* TITULO */
.welcome-card h1 {
  margin: 0;
  font-size: 30px;
  color: #333;
}

/* TEXTO */
.welcome-card p {
  margin-top: 10px;
  color: #777;
  font-size: 16px;
}

/* INFO */
.info {
  margin-top: 25px;
  padding: 20px;
  background: #f4f7ff;
  border-radius: 8px;
  color: #555;
}

/* HORA */
.time {
  margin-top: 20px;
  font-size: 14px;
  color: #444;
}

/* ANIMACION */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
