<script setup>
import { ref, computed, onMounted } from "vue";
import Swal from "sweetalert2";
import Pagination from "@/components/Pagination.vue";
import { usePermisos } from "~/composables/usePermisos";

definePageMeta({
  middleware: ["auth", "permiso"],
});

/* 🔐 PERMISOS */
const { init, puedeConsultarRuta } = usePermisos();

const paginaActual = ref(1);
const porPagina = 5;
const totalPaginas = ref(1);

const registros = ref([]);
const registroSeleccionado = ref(null);

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
  registroSeleccionado.value = null;

  localStorage.setItem("principalRegistros", JSON.stringify(registros.value));
};

/* SELECCIONAR FILA */
const seleccionarRegistro = (registro, index) => {
  registroSeleccionado.value = { ...registro, index };
};

/* EDITAR SUPERIOR */
const editarSeleccionado = () => {
  if (!registroSeleccionado.value) {
    mostrarNotificacion("Selecciona un registro", "error");
    return;
  }

  form.value = {
    nombre: registroSeleccionado.value.nombre,
    descripcion: registroSeleccionado.value.descripcion,
    estado: registroSeleccionado.value.estado,
  };

  editando.value = true;
  indexEditar.value = registroSeleccionado.value.index;
  modal.value = true;
};

/* ELIMINAR SUPERIOR */
const eliminarSeleccionado = async () => {
  if (!registroSeleccionado.value) {
    mostrarNotificacion("Selecciona un registro", "error");
    return;
  }

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

  registros.value.splice(registroSeleccionado.value.index, 1);
  registroSeleccionado.value = null;

  mostrarNotificacion("Registro eliminado correctamente");

  localStorage.setItem("principalRegistros", JSON.stringify(registros.value));
};

/* CARGAR DATOS */
onMounted(async () => {
  await init();
  const datos = localStorage.getItem("principalRegistros");
  registros.value = datos ? JSON.parse(datos) : [];
});
</script>

<template>
  <!-- NOTIFICACION -->
  <div
    v-if="notificacion.mostrar"
    class="notificacion"
    :class="notificacion.tipo"
  >
    {{ notificacion.mensaje }}
  </div>

  <div class="container">
    <Breadcrumbs />

    <div v-if="puedeConsultarRuta">
      <h2>Principal 1.1</h2>

      <!-- BARRA SUPERIOR -->
      <div class="toolbar">
        <div class="acciones-superior">
          <button class="nuevo" @click="nuevo">➕ Nuevo</button>
          <button class="editar-btn" @click="editarSeleccionado">
            ✏️ Editar
          </button>
          <button class="eliminar-btn" @click="eliminarSeleccionado">
            🗑️ Eliminar
          </button>
        </div>

        <input v-model="filtroRegistro" placeholder="Buscar registro..." />
      </div>

      <!-- TABLA -->
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="registrosFiltrados.length === 0">
            <td colspan="3">Sin registros</td>
          </tr>

          <tr
            v-for="(r, index) in registrosPaginados"
            :key="index"
            @click="seleccionarRegistro(r, index)"
            :class="{
              seleccionado:
                registroSeleccionado && registroSeleccionado.index === index,
            }"
          >
            <td>{{ r.nombre }}</td>
            <td>{{ r.descripcion }}</td>
            <td>{{ r.estado }}</td>
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
          <h3>{{ editando ? "Editar Registro" : "Nuevo Registro" }}</h3>

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
    </div>
  </div>
</template>

<style scoped>
.container {
  padding: 30px;
  background: #f5f7fb;
  min-height: 100vh;
}

h2 {
  margin-bottom: 20px;
  color: #1e3a5f;
}

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

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.acciones-superior {
  display: flex;
  gap: 10px;
}

.nuevo {
  background: #4caf50;
  color: white;
}

.editar-btn {
  background: #ffc107;
}

.eliminar-btn {
  background: #e53935;
  color: white;
}

.toolbar input {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
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
  cursor: pointer;
}

.seleccionado {
  background: #dbeafe !important;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-body {
  background: white;
  padding: 30px;
  width: 420px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.acciones {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
}
</style>
