<script setup>
import Breadcrumbs from "@/components/Breadcrumbs.vue";
import { ref, onMounted, watch, computed } from "vue";
import { useSupabaseClient } from "#imports";
import { usePermisos } from "~/composables/usePermisos";

definePageMeta({
  middleware: ["auth", "permiso"],
});

const supabase = useSupabaseClient();

/* 🔐 PERMISOS GLOBAL */
const { init, refrescarPermisos, obtenerPermisosModulo } = usePermisos();

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
  if (!modulos.value.length) return null;
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

/* 📦 CARGAS */
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

/* WATCH */
watch(perfilSeleccionado, async (nuevo) => {
  seleccionarTodos.value = false;
  if (nuevo) {
    await cargarPermisosPerfil(nuevo);
  }
});

/* 🔍 OBTENER PERMISO */
const obtenerPermiso = (perfilId, moduloId) => {
  let permiso = permisos.value.find(
    (p) => String(p.idperfil) === String(perfilId) && String(p.idmodulo) === String(moduloId)
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
      eliminados: false,
    };
    permisos.value.push(permiso);
  }
  return permiso;
};



const guardarPermisos = async () => {
  try {
    if (!perfilSeleccionado.value) {
      mostrarNotificacion("Seleccione un perfil primero", "error");
      return;
    }

    const permisosAGuardar = permisos.value
      .filter(p => String(p.idperfil) === String(perfilSeleccionado.value))
      .map((p) => {
        const obj = {
          idperfil: p.idperfil,
          idmodulo: p.idmodulo,
          agregar: !!p.agregar,
          editar: !!p.editar,
          eliminar: !!p.eliminar,
          consultar: !!p.consultar,
          imprimir: !!p.imprimir,
          bitacora: !!p.bitacora,
          eliminados: !!p.eliminados,
        };

        if (p.id && p.id !== null && p.id !== 'null') {
          obj.id = p.id;
        } else {
          obj.id = crypto.randomUUID();
        }

        return obj;
      });

    const { error } = await supabase
      .from("permisos_perfil")
      .upsert(permisosAGuardar, {
        onConflict: "idperfil,idmodulo", 
      });

    if (error) throw error;

    mostrarNotificacion("¡Permisos actualizados con éxito!");
    
    // 🟢 EL FIX ESTÁ AQUÍ 🟢
    // En lugar de refrescarPermisos(), usamos init() para recargar el sistema
    const usr = process.client ? JSON.parse(localStorage.getItem("usuario")) : null;
    if (usr) {
      await init(usr); 
    }
    
    // Recargamos la tablita
    await cargarPermisosPerfil(perfilSeleccionado.value);

  } catch (err) {
    console.error("Error al guardar:", err);
    mostrarNotificacion("Error: No se pudo guardar", "error");
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
      <button class="guardar" @click="guardarPermisos">Guardar Cambios</button>
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
td { padding: 10px; text-align: center; border-bottom: 1px solid #eee; border: 1px solid #f0f0f0; }
.guardar { background: #4caf50; color: white; padding: 10px 25px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin-top: 20px; transition: 0.3s; }
.guardar:hover { background: #43a047; }
.notificacion { position: fixed; top: 20px; right: 20px; padding: 14px; border-radius: 8px; color: white; z-index: 1000; }
.success { background: #4caf50; }
.error { background: #e53935; }
</style>