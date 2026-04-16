<script setup>
import { ref, onMounted, computed } from "vue";
import { usePermisos } from "~/composables/usePermisos";
import { watch } from "vue";


const cargado = ref(false);

const {
  init,
  puedeConsultar,
  usuario,
  modulos,
  permisos,
  refrescarPermisos,
  modulosPermitidos
} = usePermisos();

/* ADMIN POR PERFIL */
const esAdmin = computed(() => {
  return usuario.value?.idperfil === "21dde214-a4f0-4d75-99d7-a2f569cc13a8";
});

/* PADRES */
const esPadre = (m) => !m.parent_id;

/* PRINCIPALES 
const modulosPrincipales = computed(() => {
  return modulos.value.filter((m) => {
    if (!esPadre(m)) return false;

    if (esAdmin.value) return true;

    return puedeConsultar(m.id);
  });
});
const modulosPrincipales = computed(() => {
  if (!modulos.value.length) return [];

  return modulos.value.filter((m) => {
    if (!esPadre(m)) return false;

    if (esAdmin.value) return true;

    return puedeConsultar(m.id);
  });
});*/
//const { modulosPermitidos } = usePermisos();

const modulosPrincipales = computed(() => {
  if (!modulosPermitidos.value.length) return [];

  return modulosPermitidos.value.filter((m) => !m.parent_id);
});

/* HIJOS 
const hijos = (id) => {
  return modulos.value.filter((m) => {
    if (m.parent_id !== id) return false;

    if (esAdmin.value) return true;

    return puedeConsultar(m.id);
  });
};
const hijos = (id) => {
  if (!modulos.value.length) return [];

  return modulos.value.filter((m) => {
    if (m.parent_id !== id) return false;

    if (esAdmin.value) return true;

    return puedeConsultar(m.id);
  });
};*/
const hijos = (id) => {
  return modulosPermitidos.value.filter(
    (m) => m.parent_id === id
  );
};

/* GENERAR RUTA CORRECTA */
/*const generarRuta = (modulo) => {
  if (!modulo?.ruta) return "#";

  // Normalizamos la ruta en minúsculas y eliminamos espacios
  let ruta = modulo.ruta.trim().toLowerCase();

  // Si la ruta no comienza con "/", lo agregamos
  if (!ruta.startsWith("/")) ruta = `/${ruta}`;

  return ruta;
};*/
const generarRuta = (modulo) => {
  if (!modulo?.ruta) return "#";
  // quitamos espacios extras, la ruta ya viene con /
  return modulo.ruta.trim();
};

/*onMounted(async () => {
  await init();

  console.log("MODULOS:", modulos.value);
  console.log("USUARIO:", usuario.value);

  cargado.value = true;
});*/
onMounted(async () => {
  // 1. Rescatamos al usuario del almacenamiento local
  const usrLocal = process.client
    ? JSON.parse(localStorage.getItem("usuario"))
    : null;

  if (usrLocal) {
    // 2. Le pasamos el usuario al init para que cargue los 14 módulos que vimos en consola
    await init(usrLocal);
  }

  console.log("MODULOS CARGADOS:", modulos.value);
  console.log("PERMISOS CARGADOS:", permisos.value);

  cargado.value = true;
});

watch(modulosPermitidos, (val) => {
  console.log("MODULOS PERMITIDOS ACTUALIZADOS:", val);
});
</script>

<template>
  <nav v-if="cargado" class="navbar">
    <ul class="menu">
      <li>
        <NuxtLink to="/dashboard">Inicio</NuxtLink>
      </li>

      <li v-for="mod in modulosPrincipales" :key="mod.id" class="dropdown">
        <!-- Módulo principal sin submenú -->
        <!-- Si NO tiene hijos → es link -->
        <NuxtLink
          v-if="!hijos(mod.id).length"
          :to="generarRuta(mod)"
          class="menu-title"
        >
          {{ mod.strnombremodulo }}
        </NuxtLink>

        <!-- Si TIENE hijos → NO es link -->
        <span v-else class="menu-title">
          {{ mod.strnombremodulo }}
        </span>

        <!-- Submenús -->
        <ul v-if="hijos(mod.id).length" class="submenu">
          <li v-for="sub in hijos(mod.id)" :key="sub.id">
            <NuxtLink :to="generarRuta(sub)">
              {{ sub.strnombremodulo }}
            </NuxtLink>
          </li>
        </ul>
      </li>
    </ul>

    <div class="logout-container">
      <NuxtLink to="/login" class="logout-btn">Cerrar sesión</NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1a436d;
  padding: 0 20px;
}
.menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 10px;
}
.menu li {
  position: relative;
}
.menu a,
.menu-title {
  display: block;
  padding: 15px 20px;
  color: white;
  text-decoration: none;
  cursor: pointer;
}
.menu a:hover {
  background: #143252;
}
.submenu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background: #1a436d;
  list-style: none;
  padding: 0;
  min-width: 200px;
  border-radius: 6px;
}
.submenu li a {
  padding: 12px;
  display: block;
}
.dropdown:hover .submenu {
  display: block;
}
.logout-container {
  display: flex;
  align-items: center;
}
.logout-btn {
  background: #1a436d;
  color: white;
  padding: 8px 18px;
  border-radius: 25px;
  text-decoration: none;
  font-weight: bold;
  transition: all 0.3s ease;
}
.logout-btn:hover {
  background: #c62828;
  transform: scale(1.05);
}
</style>
