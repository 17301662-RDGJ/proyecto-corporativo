<script setup>
import { ref, computed, onMounted } from "vue";
import Swal from "sweetalert2";
import Pagination from "@/components/Pagination.vue";
import { useRoute } from "vue-router";
import { usePermisos } from "~/composables/usePermisos";

definePageMeta({
  middleware: ["auth", "permiso"],
});

/* ================================
   🔐 PERMISOS (CORREGIDO)
================================ */
const route = useRoute();
// AGREGAMOS 'obtenerPermisosModulo' a la lista de abajo 👇
const { init, modulos, obtenerPermisosModulo } = usePermisos();
const cargando = ref(true); 

const moduloActual = computed(() => {
  return modulos.value.find((m) => m.ruta === route.path);
});

const tienePermisoConsultar = computed(() => {
  if (cargando.value) return true;
  if (!moduloActual.value) return false;
  
  // Ahora sí, esta función ya existe porque la desestructuramos arriba
  const p = obtenerPermisosModulo(moduloActual.value.id);
  return p.consultar; 
});

/* ================================
   📄 VARIABLES Y LÓGICA
================================ */
const paginaActual = ref(1);
const porPagina = 5;
const totalPaginas = ref(1);
const registros = ref([]);
const modal = ref(false);
const editando = ref(false);
const indexEditar = ref(null);

const form = ref({ nombre: "", descripcion: "", estado: "Activo" });
const filtroRegistro = ref("");

const registrosFiltrados = computed(() => {
  if (!filtroRegistro.value) return registros.value;
  return registros.value.filter(r =>
    r.nombre.toLowerCase().includes(filtroRegistro.value.toLowerCase()) ||
    r.descripcion.toLowerCase().includes(filtroRegistro.value.toLowerCase())
  );
});

const registrosPaginados = computed(() => {
  const start = (paginaActual.value - 1) * porPagina;
  totalPaginas.value = Math.ceil(registrosFiltrados.value.length / porPagina);
  return registrosFiltrados.value.slice(start, start + porPagina);
});

const notificacion = ref({ mostrar: false, mensaje: "", tipo: "success" });
const mostrarNotificacion = (mensaje, tipo = "success") => {
  notificacion.value = { mensaje, tipo, mostrar: true };
  setTimeout(() => (notificacion.value.mostrar = false), 3000);
};

/* ACCIONES CRUD */
const guardar = () => {
  if (!form.value.nombre || !form.value.descripcion) return mostrarNotificacion("Faltan datos", "error");
  if (editando.value) registros.value[indexEditar.value] = { ...form.value };
  else registros.value.push({ ...form.value });
  modal.value = false;
  localStorage.setItem("principalRegistros", JSON.stringify(registros.value));
  mostrarNotificacion("Operación exitosa");
};

const editar = (registro, index) => {
  form.value = { ...registro };
  editando.value = true;
  indexEditar.value = index;
  modal.value = true;
};

const eliminar = async (index) => {
  const result = await Swal.fire({ title: "¿Eliminar?", icon: "warning", showCancelButton: true });
  if (result.isConfirmed) {
    registros.value.splice(index, 1);
    localStorage.setItem("principalRegistros", JSON.stringify(registros.value));
    mostrarNotificacion("Eliminado");
  }
};

/* 🚀 CARGAR DATOS Y PERMISOS */
onMounted(async () => {
  const usr = process.client ? JSON.parse(localStorage.getItem("usuario")) : null;
  
  if (usr) {
    await init(usr);
    const datos = localStorage.getItem("principalRegistros");
    registros.value = datos ? JSON.parse(datos) : [];
  }
  
  cargando.value = false;
});
</script>

<template>
  <div class="container">
    <Breadcrumbs />

    <div v-if="cargando" class="msg-box">
      <p>Sincronizando con el servidor de seguridad...</p>
    </div>

    <div v-else-if="!tienePermisoConsultar" class="msg-box error-acceso">
      <h2>🚫 Acceso Restringido</h2>
      <p>Tu perfil no tiene asignado el permiso de consulta para la ruta: <b>{{ route.path }}</b></p>
    </div>

    <template v-else>
      <div v-if="notificacion.mostrar" class="notificacion" :class="notificacion.tipo">
        {{ notificacion.mensaje }}
      </div>

      <h2>Principal 2.2</h2>

      <div class="busqueda">
        <button class="nuevo" @click="modal = true; editando = false; form = { nombre: '', descripcion: '', estado: 'Activo' }">➕ Nuevo</button>
        <input v-model="filtroRegistro" placeholder="Filtrar registros..." />
      </div>

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Estado</th>
            <th>Editar</th>
            <th>Eliminar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="registrosFiltrados.length === 0">
            <td colspan="5">No se encontraron registros.</td>
          </tr>
          <tr v-for="(r, index) in registrosPaginados" :key="index">
            <td>{{ r.nombre }}</td>
            <td>{{ r.descripcion }}</td>
            <td>{{ r.estado }}</td>
            <td><button @click="editar(r, index)">✏️</button></td>
            <td><button @click="eliminar(index)">🗑️</button></td>
          </tr>
        </tbody>
      </table>

      <Pagination :paginaActual="paginaActual" :totalPaginas="totalPaginas" @cambiar="paginaActual = $event" />

      <div v-if="modal" class="modal">
        <div class="modal-body">
          <h3>{{ editando ? 'Actualizar' : 'Crear' }} Registro</h3>
          <input v-model="form.nombre" placeholder="Nombre" />
          <input v-model="form.descripcion" placeholder="Descripción" />
          <select v-model="form.estado">
            <option>Activo</option>
            <option>Inactivo</option>
          </select>
          <div class="acciones">
            <button @click="guardar">Guardar</button>
            <button @click="modal = false">Cancelar</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.container { padding: 30px; background: #f5f7fb; min-height: 100vh; }
.msg-box { text-align: center; padding: 40px; background: white; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.error-acceso h2 { color: #d32f2f; }
.notificacion { position: fixed; top: 20px; right: 20px; padding: 14px; border-radius: 8px; color: white; z-index: 1000; }
.success { background: #4caf50; }
.error { background: #e53935; }
.busqueda { display: flex; gap: 20px; margin-bottom: 15px; }
table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
th { background: #1e3a5f; color: white; padding: 12px; }
td { padding: 10px; border-bottom: 1px solid #eee; text-align: center; }
.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1001; }
.modal-body { background: white; padding: 30px; border-radius: 10px; display: flex; flex-direction: column; gap: 10px; width: 400px; }
.acciones { display: flex; justify-content: space-between; margin-top: 10px; }
</style>