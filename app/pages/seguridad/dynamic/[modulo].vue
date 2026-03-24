<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import Pagination from "@/components/Pagination.vue";
import Breadcrumbs from "@/components/Breadcrumbs.vue";
import Swal from "sweetalert2";
import { usePermisos } from "~/composables/usePermisos";

definePageMeta({
  middleware: ["auth", "permiso"],
});

/* ================================
   🔥 ROUTE
================================ */
const route = useRoute();
const nombreModulo = ref(route.params.modulo || "");

/* ================================
   🔐 PERMISOS
================================ */
const {
  init,
  validarRuta,
  puedeAgregar,
  puedeEditar,
  puedeEliminar,
  obtenerModuloIdPorRuta,
} = usePermisos();

const moduloId = ref(null);

/* 🔄 CAMBIO DE RUTA */
watch(
  () => route.params.modulo,
  async (nuevo) => {
    nombreModulo.value = nuevo || "";
    await cargarModuloId();
    cargarDatos();
  },
);

/* ================================
   🔑 STORAGE DINÁMICO
================================ */
const getStorageKey = () => `modulo_${nombreModulo.value}`;

/* ================================
   📦 DATA
================================ */
const registros = ref([]);
const filtro = ref("");

const form = ref({
  nombre: "",
  descripcion: "",
  estado: "Activo",
});

const modal = ref(false);
const editando = ref(false);
const indexEditar = ref(null);

/* ================================
   🔎 FILTRO
================================ */
const registrosFiltrados = computed(() => {
  if (!filtro.value) return registros.value;

  return registros.value.filter((r) =>
    r.nombre.toLowerCase().includes(filtro.value.toLowerCase()),
  );
});

/* ================================
   📄 PAGINADO
================================ */
const paginaActual = ref(1);
const porPagina = 5;

const totalPaginas = computed(() =>
  Math.ceil(registrosFiltrados.value.length / porPagina),
);

const registrosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * porPagina;
  return registrosFiltrados.value.slice(inicio, inicio + porPagina);
});

const cambiarPagina = (pagina) => {
  if (pagina >= 1 && pagina <= totalPaginas.value) {
    paginaActual.value = pagina;
  }
};

/* ================================
   🔥 CARGAR MODULO ID
================================ */
const cargarModuloId = async () => {
  moduloId.value = await obtenerModuloIdPorRuta(route.path);
};

/* ================================
   🔥 CARGAR DATOS
================================ */
const cargarDatos = () => {
  const data = localStorage.getItem(getStorageKey());
  registros.value = data ? JSON.parse(data) : [];
};

/* ================================
   🔥 INIT
================================ */
onMounted(async () => {
  await init();

  const permitido = await validarRuta(route.path);

  if (!permitido) {
    window.location.href = "/dashboard";
    return;
  }

  await cargarModuloId();
  cargarDatos();
});

/* ================================
   ✅ VALIDACIONES
================================ */
const validarFormulario = () => {
  if (!form.value.nombre.trim()) {
    Swal.fire("Error", "El nombre es obligatorio", "error");
    return false;
  }

  if (form.value.nombre.length < 3) {
    Swal.fire("Error", "Mínimo 3 caracteres", "error");
    return false;
  }

  return true;
};

/* ================================
   💾 CRUD (CON PERMISOS)
================================ */
const guardar = () => {
  if (!puedeAgregar(moduloId.value)) {
    Swal.fire("Sin permiso", "No puedes agregar", "warning");
    return;
  }

  if (!validarFormulario()) return;

  if (editando.value) {
    registros.value[indexEditar.value] = { ...form.value };
  } else {
    registros.value.push({ ...form.value });
  }

  localStorage.setItem(getStorageKey(), JSON.stringify(registros.value));
  cerrarModal();
};

const editar = (registro, index) => {
  if (!puedeEditar(moduloId.value)) {
    Swal.fire("Sin permiso", "No puedes editar", "warning");
    return;
  }

  form.value = { ...registro };
  editando.value = true;
  indexEditar.value = index;
  modal.value = true;
};

const eliminar = async (index) => {
  if (!puedeEliminar(moduloId.value)) {
    Swal.fire("Sin permiso", "No puedes eliminar", "warning");
    return;
  }

  const result = await Swal.fire({
    title: "¿Eliminar?",
    text: "No podrás revertir esto",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
  });

  if (!result.isConfirmed) return;

  registros.value.splice(index, 1);
  localStorage.setItem(getStorageKey(), JSON.stringify(registros.value));
};

/* ================================
   🪟 MODAL
================================ */
const abrirModal = () => {
  if (!puedeAgregar(moduloId.value)) return;

  limpiarFormulario();
  modal.value = true;
};

const cerrarModal = () => {
  modal.value = false;
  limpiarFormulario();
};

const limpiarFormulario = () => {
  form.value = {
    nombre: "",
    descripcion: "",
    estado: "Activo",
  };
  editando.value = false;
  indexEditar.value = null;
};
</script>

<template>
  <div class="container">
    <!-- 🔥 BREADCRUMBS -->
    <Breadcrumbs :pagina="nombreModulo" />

    <h2>Módulo: {{ nombreModulo }}</h2>

    <!-- 🔎 BUSCADOR -->
    <div class="busqueda">
      <input v-model="filtro" placeholder="Buscar..." />

      <button v-if="puedeAgregar(moduloId)" class="nuevo" @click="abrirModal">
        ➕ Nuevo
      </button>
    </div>

    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Descripción</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(r, index) in registrosPaginados" :key="index">
          <td>{{ r.nombre }}</td>
          <td>{{ r.descripcion }}</td>
          <td>{{ r.estado }}</td>
          <td>
            <button v-if="puedeEditar(moduloId)" @click="editar(r, index)">
              ✏️
            </button>

            <button v-if="puedeEliminar(moduloId)" @click="eliminar(index)">
              🗑️
            </button>
          </td>
        </tr>

        <tr v-if="registros.length === 0">
          <td colspan="4">Sin registros</td>
        </tr>
      </tbody>
    </table>

    <!-- PAGINACION -->
    <Pagination
      :paginaActual="paginaActual"
      :totalPaginas="totalPaginas"
      @cambiar="cambiarPagina"
    />

    <!-- MODAL -->
    <div v-if="modal" class="modal">
      <div class="modal-body">
        <h3>{{ editando ? "Editar" : "Nuevo" }}</h3>

        <input v-model="form.nombre" placeholder="Nombre" />
        <input v-model="form.descripcion" placeholder="Descripción" />

        <select v-model="form.estado">
          <option>Activo</option>
          <option>Inactivo</option>
        </select>

        <div class="acciones">
          <button @click="guardar">Guardar</button>
          <button @click="cerrarModal">Cancelar</button>
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

/* BOTONES */
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

.nuevo {
  background: #4caf50;
  color: white;
  padding: 10px 18px;
  margin-bottom: 15px;
  font-weight: bold;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
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

.modal-body {
  background: white;
  padding: 30px;
  width: 420px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-body input,
.modal-body select {
  padding: 9px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

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
</style>
