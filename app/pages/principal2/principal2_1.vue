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
   🔐 PERMISOS
================================ */
const route = useRoute();
const { modulos, puedeConsultar } = usePermisos();

const moduloActual = computed(() => {
  return modulos.value.find((m) => m.ruta === route.path);
});

const tienePermisoConsultar = computed(() => {
  if (!moduloActual.value) return true;
  return puedeConsultar(moduloActual.value.id);
});

/* ================================
   📄 VARIABLES EXISTENTES (SIN CAMBIOS)
================================ */
const paginaActual = ref(1);
const porPagina = 5;
const totalPaginas = ref(1);

const registros = ref([]);

const modal = ref(false);
const editando = ref(false);
const indexEditar = ref(null);

const form = ref({
  nombre: "",
  descripcion: "",
  estado: "Activo",
});

/* FILTRO */
const filtroRegistro = ref("");

const registrosFiltrados = computed(() => {
  if (!filtroRegistro.value) return registros.value;

  return registros.value.filter(
    (r) =>
      r.nombre.toLowerCase().includes(filtroRegistro.value.toLowerCase()) ||
      r.descripcion.toLowerCase().includes(filtroRegistro.value.toLowerCase()),
  );
});

/* PAGINADO */
const registrosPaginados = computed(() => {
  const start = (paginaActual.value - 1) * porPagina;
  const end = start + porPagina;

  totalPaginas.value = Math.ceil(registrosFiltrados.value.length / porPagina);

  return registrosFiltrados.value.slice(start, end);
});

/* NOTIFICACIONES */
const notificacion = ref({
  mostrar: false,
  mensaje: "",
  tipo: "success",
});

const mostrarNotificacion = (mensaje, tipo = "success") => {
  notificacion.value.mensaje = mensaje;
  notificacion.value.tipo = tipo;
  notificacion.value.mostrar = true;

  setTimeout(() => {
    notificacion.value.mostrar = false;
  }, 3000);
};

/* VALIDACIONES */
const validar = () => {
  if (!form.value.nombre) {
    mostrarNotificacion("El nombre es obligatorio", "error");
    return false;
  }

  if (!form.value.descripcion) {
    mostrarNotificacion("La descripción es obligatoria", "error");
    return false;
  }

  return true;
};

/* NUEVO */
const nuevo = () => {
  form.value = {
    nombre: "",
    descripcion: "",
    estado: "Activo",
  };
  editando.value = false;
  modal.value = true;
};

/* GUARDAR */
const guardar = () => {
  if (!validar()) return;

  if (editando.value) {
    registros.value[indexEditar.value] = { ...form.value };
    mostrarNotificacion("Registro actualizado correctamente");
  } else {
    registros.value.push({ ...form.value });
    mostrarNotificacion("Registro agregado correctamente");
  }

  modal.value = false;
  filtroRegistro.value = "";

  localStorage.setItem("principalRegistros", JSON.stringify(registros.value));
};

/* EDITAR */
const editar = (registro, index) => {
  form.value = { ...registro };
  editando.value = true;
  indexEditar.value = index;
  modal.value = true;
};

/* ELIMINAR */
const eliminar = async (index) => {
  const result = await Swal.fire({
    title: "¿Eliminar registro?",
    text: "Esta acción no se puede deshacer",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
  });

  if (!result.isConfirmed) return;

  registros.value.splice(index, 1);
  mostrarNotificacion("Registro eliminado correctamente");

  localStorage.setItem("principalRegistros", JSON.stringify(registros.value));
};

/* CARGAR DATOS */
onMounted(() => {
  const datos = localStorage.getItem("principalRegistros");
  registros.value = datos ? JSON.parse(datos) : [];
});
</script>

<template>
  <div class="container">
    <Breadcrumbs />

    <!-- 🔒 SIN PERMISO -->
    <div v-if="!tienePermisoConsultar">
      <h2>No tienes permiso para consultar este módulo</h2>
    </div>

    <!-- ✅ CON PERMISO -->
    <template v-else>
      <!-- NOTIFICACION -->
      <div
        v-if="notificacion.mostrar"
        class="notificacion"
        :class="notificacion.tipo"
      >
        {{ notificacion.mensaje }}
      </div>

      <h2>Principal 2.1</h2>

      <!-- BOTON Y FILTRO -->
      <div class="busqueda">
        <button class="nuevo" @click="nuevo">➕ Nuevo</button>
        <input v-model="filtroRegistro" placeholder="Buscar registro..." />
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
            <td colspan="5">Sin registros</td>
          </tr>

          <tr v-for="(r, index) in registrosPaginados" :key="index">
            <td>{{ r.nombre }}</td>
            <td>{{ r.descripcion }}</td>
            <td>{{ r.estado }}</td>
            <td>
              <button @click="editar(r, index)">✏️</button>
            </td>
            <td>
              <button @click="eliminar(index)">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- PAGINACIÓN -->
      <Pagination
        :paginaActual="paginaActual"
        :totalPaginas="totalPaginas"
        @cambiar="paginaActual = $event"
      />

      <!-- MODAL -->
      <div v-if="modal" class="modal">
        <div class="modal-body">
          <h3 v-if="!editando">Nuevo Registro</h3>
          <h3 v-if="editando">Editar Registro</h3>

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
.container {
  padding: 30px;
  background: #f5f7fb;
  min-height: 100vh;
}

/* TITULO */
h2 {
  margin-bottom: 20px;
  color: #1e3a5f;
}

/* NOTIFICACION */
.notificacion {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 14px 22px;
  border-radius: 8px;
  color: white;
  font-weight: bold;
  z-index: 1000;
}

.success {
  background: #4caf50;
}

.error {
  background: #e53935;
}

/* BOTONES GENERALES */
button {
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.2s;
}

button:hover {
  transform: scale(1.05);
}

/* BOTON NUEVO */
.nuevo {
  background: #4caf50;
  color: white;
  padding: 10px 18px;
  font-weight: bold;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

/* BUSQUEDA (boton + input) */
.busqueda {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.busqueda input {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

/* TABLA */
table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}

th {
  background: #1e3a5f;
  color: white;
  padding: 12px;
}

td {
  padding: 10px;
  border-bottom: 1px solid #eee;
  text-align: center;
}

tr:hover {
  background: #f2f6ff;
}

/* BOTONES TABLA */
td button {
  font-size: 16px;
}

td button:first-child {
  background: #ffc107;
}

td button:last-child {
  background: #e53935;
  color: white;
}

/* MODAL */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  justify-content: center;
  align-items: center;
}

/* CONTENIDO MODAL */
.modal-body {
  background: white;
  padding: 30px;
  width: 420px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-body h3 {
  text-align: center;
}

.modal-body input,
.modal-body select {
  padding: 9px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

/* BOTONES MODAL */
.acciones {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
}

.acciones button:first-child {
  background: #4caf50;
  color: white;
}

.acciones button:last-child {
  background: #e53935;
  color: white;
}

/* RESPONSIVE */
@media (max-width: 700px) {
  table {
    font-size: 14px;
  }

  .modal-body {
    width: 90%;
  }
}
</style>
