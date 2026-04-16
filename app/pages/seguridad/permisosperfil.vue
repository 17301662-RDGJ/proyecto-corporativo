<script setup>
import Breadcrumbs from "@/components/Breadcrumbs.vue";
import { ref, onMounted, watch, computed } from "vue";
import { useSupabaseClient } from "#imports";
import { usePermisos } from "~/composables/usePermisos";

definePageMeta({
  middleware: ["auth", "permiso"],
});

const supabase = useSupabaseClient();

/* PERMISOS GLOBAL */
const { init, puedeConsultar, puedeEditar, refrescarPermisos } = usePermisos();

/* DATA */
const perfiles = ref([]);
const modulos = ref([]);
const permisos = ref([]);
const perfilSeleccionado = ref("");
const filtroModulo = ref("");

/* NUEVO */
const seleccionarTodos = ref(false);
const colorCheckbox = ref("#4caf50");

/* NOTIFICACIONES */
const notificacion = ref({ mostrar: false, mensaje: "", tipo: "success" });

const mostrarNotificacion = (mensaje, tipo = "success") => {
  notificacion.value = { mostrar: true, mensaje, tipo };
  setTimeout(() => (notificacion.value.mostrar = false), 3000);
};

/* MODULO ACTUAL */
const moduloActual = computed(() => {
  return modulos.value.find(
    (m) => m.strnombremodulo.toLowerCase().replace(/\s/g, "") === "permisosperfil"
  );
});

/* FILTRAR */
const modulosFiltrados = computed(() => {
  if (!filtroModulo.value) return modulos.value;
  return modulos.value.filter((m) =>
    m.strnombremodulo.toLowerCase().includes(filtroModulo.value.toLowerCase())
  );
});

/* SELECCIONAR TODOS */
const toggleSeleccionarTodos = () => {
  if (!perfilSeleccionado.value) return;

  modulosFiltrados.value.forEach((m) => {
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
  const { data } = await supabase.from("perfil").select("*").order("strnombreperfil");
  perfiles.value = data || [];
};

const cargarModulos = async () => {
  const { data } = await supabase.from("modulo").select("*").order("strnombremodulo");
  modulos.value = data || [];
};

const cargarPermisosPerfil = async (perfilId) => {
  if (!perfilId) {
    permisos.value = [];
    return;
  }
  const { data } = await supabase
    .from("permisos_perfil")
    .select("*")
    .eq("idperfil", perfilId);

  // Mapeamos para que los datos de la DB sean reactivos en los checkboxes
  permisos.value = (data || []).map(p => ({
    ...p,
    agregar: !!p.agregar,
    editar: !!p.editar,
    eliminar: !!p.eliminar,
    consultar: !!p.consultar,
    imprimir: !!p.imprimir,
    bitacora: !!p.bitacora
  }));
};

/* WATCH: Este es el motor que llena la tabla al cambiar el select */
watch(perfilSeleccionado, async (nuevo) => {
  seleccionarTodos.value = false;
  if (nuevo) {
    await cargarPermisosPerfil(nuevo);
  }
});

/* OBTENER PERMISO - CORREGIDO PARA UUID Y PERSISTENCIA */
const obtenerPermiso = (perfilId, moduloId) => {
  // Buscamos en el arreglo lo que ya bajó de Supabase
  let permiso = permisos.value.find(
    (p) => String(p.idperfil) === String(perfilId) && String(p.idmodulo) === String(moduloId)
  );

  // Si no existe, creamos el objeto vacío para ese módulo
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
      eliminados: false,
    };
    permisos.value.push(permiso);
  }
  return permiso;
};

/* GUARDAR */
const guardarPermisos = async () => {
  try {
    if (!perfilSeleccionado.value) {
      mostrarNotificacion("Seleccione un perfil", "error");
      return;
    }

    const permisosAGuardar = permisos.value
      .filter(p => String(p.idperfil) === String(perfilSeleccionado.value))
      .map((p) => ({
        ...(p.id ? { id: p.id } : {}),
        idperfil: p.idperfil,
        idmodulo: p.idmodulo,
        agregar: !!p.agregar,
        editar: !!p.editar,
        eliminar: !!p.eliminar,
        consultar: !!p.consultar,
        imprimir: !!p.imprimir,
        bitacora: !!p.bitacora,
        eliminados: !!p.eliminados,
      }));

    const { error } = await supabase
      .from("permisos_perfil")
      .upsert(permisosAGuardar, { onConflict: "idperfil,idmodulo" });

    if (error) throw error;

    mostrarNotificacion("Permisos guardados correctamente");
    await refrescarPermisos();
    await cargarPermisosPerfil(perfilSeleccionado.value);
  } catch (err) {
    console.error("ERROR:", err);
    mostrarNotificacion("Error al guardar: " + err.message, "error");
  }
};

onMounted(async () => {
  const usr = process.client ? JSON.parse(localStorage.getItem("usuario")) : null;
  if (usr) {
    await init(usr);
    await cargarPerfiles();
    await cargarModulos();
  }
});
</script>

<template>
  <div v-if="notificacion.mostrar" :class="['notificacion', notificacion.tipo]">
    {{ notificacion.mensaje }}
  </div>

  <div class="container">
    <Breadcrumbs pagina="Permisos Perfil" />
    <h2>Permisos Perfil</h2>

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
          <input type="checkbox" v-model="seleccionarTodos" @change="toggleSeleccionarTodos" />
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

      <tbody v-if="perfilSeleccionado && modulos.length > 0">
        <tr v-for="m in modulosFiltrados" :key="m.id">
          <td style="text-align: left; padding-left: 20px;"><strong>{{ m.strnombremodulo }}</strong></td>
          <td v-for="accion in ['agregar','editar','eliminar','consultar','imprimir','bitacora']" :key="accion">
            <input
              type="checkbox"
              v-model="obtenerPermiso(perfilSeleccionado, m.id)[accion]"
              :style="{ accentColor: colorCheckbox }"
            />
          </td>
        </tr>
      </tbody>

      <tbody v-else>
        <tr>
          <td colspan="7">{{ perfilSeleccionado ? 'Cargando módulos...' : 'Seleccione un perfil para ver la tabla' }}</td>
        </tr>
      </tbody>
    </table>

    <div class="acciones" v-if="perfilSeleccionado">
      <button class="guardar" @click="guardarPermisos">
        Guardar Cambios
      </button>
    </div>
  </div>
</template>

<style scoped>
.container { padding: 30px; background: #f5f7fb; min-height: 100vh; }
.panel-control { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
.busqueda { display: flex; gap: 10px; }
.busqueda input, .busqueda select { padding: 8px; border-radius: 6px; border: 1px solid #ccc; }
.acciones-panel { display: flex; align-items: center; gap: 15px; }
.check-todos { display: flex; align-items: center; gap: 5px; font-weight: 500; cursor: pointer; }
table { width: 100%; background: white; border-collapse: collapse; }
th { background: #1e3a5f; color: white; padding: 10px; }
td { padding: 10px; text-align: center; border-bottom: 1px solid #eee; }
.guardar { background: #4caf50; color: white; padding: 10px 25px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin-top: 20px; }
.notificacion { position: fixed; top: 20px; right: 20px; padding: 14px; border-radius: 8px; color: white; z-index: 1000; }
.success { background: #4caf50; }
.error { background: #e53935; }
</style>