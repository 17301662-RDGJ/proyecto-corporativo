<script setup>
import Breadcrumbs from "@/components/Breadcrumbs.vue";
import { ref, onMounted, watch, computed } from "vue";
import { useSupabaseClient } from "#imports";
import Pagination from "@/components/Pagination.vue";
import { usePermisos } from "~/composables/usePermisos";

definePageMeta({
  middleware: ["auth", "permiso"],
});

const supabase = useSupabaseClient();

/* PERMISOS GLOBAL */
const { init, puedeConsultar, puedeEditar, usuario, cargarPermisos, refrescarPermisos } =
  usePermisos();

/* DATA */
const perfiles = ref([]);
const modulos = ref([]);
const permisos = ref([]);
const perfilSeleccionado = ref("");
const filtroModulo = ref("");

/* NUEVO */
const seleccionarTodos = ref(false);
const colorCheckbox = ref("#4caf50");

/* PAGINADO */
const paginaActual = ref(1);
const porPagina = 5;
const totalPaginas = ref(1);

/* NOTIFICACIONES */
const notificacion = ref({ mostrar: false, mensaje: "", tipo: "success" });

const mostrarNotificacion = (mensaje, tipo = "success") => {
  notificacion.value = { mostrar: true, mensaje, tipo };
  setTimeout(() => (notificacion.value.mostrar = false), 3000);
};

/* MODULO ACTUAL */
const moduloActual = computed(() => {
  return modulos.value.find(
    (m) => m.strnombremodulo.toLowerCase() === "permisosperfil",
  );
});

/* FILTRAR */
const modulosFiltrados = computed(() => {
  if (!filtroModulo.value) return modulos.value;

  return modulos.value.filter((m) =>
    m.strnombremodulo.toLowerCase().includes(filtroModulo.value.toLowerCase()),
  );
});

/* PAGINADO */
const modulosPaginados = computed(() => {
  const start = (paginaActual.value - 1) * porPagina;
  totalPaginas.value = Math.ceil(modulosFiltrados.value.length / porPagina);
  return modulosFiltrados.value.slice(start, start + porPagina);
});

/* SELECCIONAR TODOS */
const toggleSeleccionarTodos = () => {
  if (!perfilSeleccionado.value) return;

  modulosPaginados.value.forEach((m) => {
    const permiso = obtenerPermiso(perfilSeleccionado.value, m.id);

    permiso.agregar = seleccionarTodos.value;
    permiso.editar = seleccionarTodos.value;
    permiso.eliminar = seleccionarTodos.value;
    permiso.consultar = seleccionarTodos.value;
    permiso.imprimir = seleccionarTodos.value;
    permiso.bitacora = seleccionarTodos.value;
  });
};

/* CARGAS */
const cargarPerfiles = async () => {
  const { data } = await supabase
    .from("perfil")
    .select("*")
    .order("strnombreperfil");

  perfiles.value = data || [];
};

const cargarModulos = async () => {
  const { data } = await supabase
    .from("modulo")
    .select("*")
    .order("strnombremodulo");

  modulos.value = data || [];
};

const cargarPermisosPerfil = async (perfilId) => {
  if (!perfilId) return;

  const { data } = await supabase
    .from("permisos_perfil")
    .select("*")
    .eq("idperfil", perfilId);

  permisos.value = data || [];
};

/* WATCH */
watch(perfilSeleccionado, async (nuevo) => {
  paginaActual.value = 1;
  seleccionarTodos.value = false;
  await cargarPermisosPerfil(nuevo);
});

/* OBTENER PERMISO */
const obtenerPermiso = (perfilId, moduloId) => {
  let permiso = permisos.value.find(
    (p) => p.idperfil == perfilId && p.idmodulo == moduloId,
  );

  if (!permiso) {
    permiso = {
      idperfil: perfilId,
      idmodulo: moduloId,
      agregar: false,
      editar: false,
      eliminar: false,
      consultar: false,
      imprimir: false,
      bitacora: false,
    };

    //EVITAR DUPLICADOS EN MEMORIA
    const yaExiste = permisos.value.some(
      (p) => p.idperfil == perfilId && p.idmodulo == moduloId
    );

    if (!yaExiste) {
      permisos.value.push(permiso);
    }
  }

  return permiso;
};

/* GUARDAR */
const guardarPermisos = async () => {
  try {
    const permisosAGuardar = [];

    modulos.value.forEach((modulo) => {
      permisosAGuardar.push({
        idperfil: perfilSeleccionado.value,
        idmodulo: modulo.id,
        ver: modulo.ver || false,
        crear: modulo.crear || false,
        editar: modulo.editar || false,
        eliminar: modulo.eliminar || false,
      });
    });

    console.log("PERMISOS A GUARDAR:", permisosAGuardar);

    const { error } = await client
      .from("permisos_perfil")
      .upsert(permisosAGuardar, {
        onConflict: ["idperfil", "idmodulo"],
      });

    if (error) {
      console.error("ERROR AL GUARDAR:", error);
      mostrarNotificacion("Error al guardar permisos", "error");
      return;
    }

    mostrarNotificacion("Permisos guardados correctamente");
  } catch (err) {
    console.error(err);
  }
  await cargarPermisos();
};

/* INIT */
onMounted(async () => {
  await init();

  await cargarModulos();

  if (!moduloActual.value || !puedeConsultar(moduloActual.value.id)) {
    throw createError({
      statusCode: 403,
      statusMessage: "No tiene permisos",
    });
  }

  await cargarPerfiles();
});
</script>>

<template>
  <div v-if="notificacion.mostrar" :class="['notificacion', notificacion.tipo]">
    {{ notificacion.mensaje }}
  </div>

  <div class="container">
    <Breadcrumbs pagina="Permisos Perfil" />
    <h2>Permisos Perfil</h2>

    <!-- PANEL -->
    <div class="panel-control">
      <div class="busqueda">
        <select v-model="perfilSeleccionado">
          <option value="">Seleccione Perfil</option>
          <option v-for="p in perfiles" :key="p.id" :value="p.id">
            {{ p.strnombreperfil }}
          </option>
        </select>

        <input v-model="filtroModulo" placeholder="Buscar módulo..." />
      </div>

      <div class="acciones-panel">
        <label class="check-todos">
          <input
            type="checkbox"
            v-model="seleccionarTodos"
            @change="toggleSeleccionarTodos"
          />
          Seleccionar todos
        </label>

        <input type="color" v-model="colorCheckbox" />
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Módulo</th>
          <th>Agregar</th>
          <th>Editar</th>
          <th>Eliminar</th>
          <th>Consultar</th>
          <th>Imprimir</th>
          <th>Bitácora</th>
        </tr>
      </thead>

      <tbody v-if="perfilSeleccionado">
        <tr v-for="m in modulosPaginados" :key="m.id">
          <td>{{ m.strnombremodulo }}</td>

          <td>
            <input
              type="checkbox"
              v-model="obtenerPermiso(perfilSeleccionado, m.id).agregar"
              :disabled="!puedeEditar(moduloActual?.id)"
              :style="{ accentColor: colorCheckbox }"
            />
          </td>

          <td>
            <input
              type="checkbox"
              v-model="obtenerPermiso(perfilSeleccionado, m.id).editar"
              :disabled="!puedeEditar(moduloActual?.id)"
              :style="{ accentColor: colorCheckbox }"
            />
          </td>

          <td>
            <input
              type="checkbox"
              v-model="obtenerPermiso(perfilSeleccionado, m.id).eliminar"
              :disabled="!puedeEditar(moduloActual?.id)"
              :style="{ accentColor: colorCheckbox }"
            />
          </td>

          <td>
            <input
              type="checkbox"
              v-model="obtenerPermiso(perfilSeleccionado, m.id).consultar"
              :disabled="!puedeEditar(moduloActual?.id)"
              :style="{ accentColor: colorCheckbox }"
            />
          </td>

          <td>
            <input
              type="checkbox"
              v-model="obtenerPermiso(perfilSeleccionado, m.id).imprimir"
              :disabled="!puedeEditar(moduloActual?.id)"
              :style="{ accentColor: colorCheckbox }"
            />
          </td>

          <td>
            <input
              type="checkbox"
              v-model="obtenerPermiso(perfilSeleccionado, m.id).bitacora"
              :disabled="!puedeEditar(moduloActual?.id)"
              :style="{ accentColor: colorCheckbox }"
            />
          </td>
        </tr>
      </tbody>

      <tbody v-else>
        <tr>
          <td colspan="7">Seleccione un perfil</td>
        </tr>
      </tbody>
    </table>

    <Pagination
      :paginaActual="paginaActual"
      :totalPaginas="totalPaginas"
      @cambiar="paginaActual = $event"
    />

    <div class="acciones">
      <button
        class="guardar"
        @click="guardar"
        v-if="moduloActual && puedeEditar(moduloActual.id)"
      >
        Guardar
      </button>
    </div>
  </div>
</template>

<style scoped>
.container {
  padding: 30px;
  background: #f5f7fb;
}

/* PANEL NUEVO */
.panel-control {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.busqueda {
  display: flex;
  gap: 10px;
}

.busqueda input,
.busqueda select {
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

.acciones-panel {
  display: flex;
  align-items: center;
  gap: 15px;
}

.check-todos {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
}

table {
  width: 100%;
  background: white;
}

th {
  background: #1e3a5f;
  color: white;
}

td,
th {
  padding: 10px;
  text-align: center;
}

.guardar {
  background: #4caf50;
  color: white;
  padding: 10px 20px;
  margin-top: 15px;
}

.notificacion {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 14px;
  border-radius: 8px;
  color: white;
}

.success {
  background: #4caf50;
}

.error {
  background: #e53935;
}
</style>
