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

const route = useRoute();
const nombreModulo = ref(route.params.modulo || "");

// 🟢 USAMOS EL SISTEMA DE PERMISOS NUEVO
const { init, modulos, obtenerPermisosModulo } = usePermisos();
const cargando = ref(true);

// 1. Detectamos el módulo leyendo la URL exacta
const moduloDetectado = computed(() => {
  return modulos.value.find((m) => m.ruta === route.path);
});

// 2. Extraemos los permisos de este módulo específico
const permisosDelModulo = computed(() => {
  if (!moduloDetectado.value) {
    return { consultar: false, agregar: false, editar: false, eliminar: false, imprimir: false, bitacora: false };
  }
  return obtenerPermisosModulo(moduloDetectado.value.id);
});

const getStorageKey = () => `modulo_${nombreModulo.value}`;

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

/* FILTRO */
const registrosFiltrados = computed(() => {
  if (!filtro.value) return registros.value;
  return registros.value.filter((r) =>
    (r.nombre || "").toLowerCase().includes(filtro.value.toLowerCase()),
  );
});

/* PAGINADO */
const paginaActual = ref(1);
const porPagina = 5;

const totalPaginas = computed(() =>
  Math.ceil(registrosFiltrados.value.length / porPagina) || 1
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

/* ACCIONES */
const imprimir = () => {
  window.print();
};

const exportarExcel = () => {
  if (registros.value.length === 0) {
    Swal.fire("Sin datos", "No hay registros para exportar", "info");
    return;
  }
  let contenido = "Nombre,Descripción,Estado\n";
  registros.value.forEach((r) => {
    contenido += `${r.nombre || ""},${r.descripcion || ""},${r.estado || ""}\n`;
  });
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `modulo_${nombreModulo.value}.csv`;
  link.click();
};

const cargarDatos = () => {
  const data = localStorage.getItem(getStorageKey());
  registros.value = data ? JSON.parse(data) : [];
};

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

const guardar = () => {
  if (!validarFormulario()) return;

  if (editando.value) {
    registros.value[indexEditar.value] = { ...form.value };
  } else {
    registros.value.push({ ...form.value });
  }

  localStorage.setItem(getStorageKey(), JSON.stringify(registros.value));
  cerrarModal();
  Swal.fire("Éxito", "Registro guardado", "success");
};

const editar = (registro, index) => {
  form.value = { ...registro };
  editando.value = true;
  indexEditar.value = index;
  modal.value = true;
};

const eliminar = async (index) => {
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
  Swal.fire("Eliminado", "El registro ha sido eliminado", "success");
};

const abrirModal = () => {
  limpiarFormulario();
  modal.value = true;
};

const cerrarModal = () => {
  modal.value = false;
  limpiarFormulario();
};

const limpiarFormulario = () => {
  form.value = { nombre: "", descripcion: "", estado: "Activo" };
  editando.value = false;
  indexEditar.value = null;
};

watch(
  () => route.path,
  () => {
    nombreModulo.value = route.params.modulo || "";
    cargarDatos();
  }
);

onMounted(async () => {
  const usr = process.client ? JSON.parse(localStorage.getItem("usuario")) : null;
  if (usr) {
    await init(usr);
  }
  cargarDatos();
  cargando.value = false;
});
</script>

<template>
  <div class="pagina-completa">
    
    <div class="container">
      <Breadcrumbs :pagina="moduloDetectado ? moduloDetectado.strnombremodulo : nombreModulo" />
      
      <div v-if="cargando" class="cargando-box">
        <p>Cargando módulo...</p>
      </div>

      <div v-else-if="!moduloDetectado" class="sin-permiso-box">
        <h2>⚠️ Módulo no encontrado</h2>
        <p>La ruta {{ route.path }} no existe en la base de datos.</p>
      </div>

      <div v-else-if="permisosDelModulo.consultar">
        <h2>Módulo: {{ moduloDetectado.strnombremodulo }}</h2>

        <div class="barra-superior">
          <input v-model="filtro" placeholder="Buscar..." />

          <div class="acciones-derecha">
            <button v-if="permisosDelModulo.agregar" class="nuevo" @click="abrirModal" title="Nuevo">➕</button>
            <button v-if="permisosDelModulo.imprimir" class="imprimir" @click="imprimir" title="Imprimir">🖨️</button>
            <button v-if="permisosDelModulo.bitacora" class="excel" @click="exportarExcel" title="Exportar Excel">📊</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th v-if="permisosDelModulo.editar || permisosDelModulo.eliminar">Acciones</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(r, index) in registrosPaginados" :key="index">
              <td>{{ r.nombre }}</td>
              <td>{{ r.descripcion }}</td>
              <td>{{ r.estado }}</td>
              <td v-if="permisosDelModulo.editar || permisosDelModulo.eliminar">
                <button v-if="permisosDelModulo.editar" class="btn-editar" @click="editar(r, index)">✏️</button>
                <button v-if="permisosDelModulo.eliminar" class="btn-eliminar" @click="eliminar(index)">🗑️</button>
              </td>
            </tr>

            <tr v-if="registros.length === 0">
              <td :colspan="permisosDelModulo.editar || permisosDelModulo.eliminar ? 4 : 3">Sin registros guardados</td>
            </tr>
          </tbody>
        </table>

        <Pagination :paginaActual="paginaActual" :totalPaginas="totalPaginas" @cambiar="cambiarPagina" />

        <div v-if="modal" class="modal">
          <div class="modal-body">
            <h3>{{ editando ? "Editar" : "Nuevo" }} Registro</h3>
            <input v-model="form.nombre" placeholder="Nombre" />
            <input v-model="form.descripcion" placeholder="Descripción" />
            <select v-model="form.estado">
              <option>Activo</option>
              <option>Inactivo</option>
            </select>
            <div class="acciones">
              <button @click="guardar">Guardar</button>
              <button class="btn-cancelar" @click="cerrarModal">Cancelar</button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="sin-permiso-box">
        <h2>🚫 Acceso Denegado</h2>
        <p>No tienes permiso para consultar este módulo.</p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.pagina-completa { width: 100%; min-height: 100vh; background: #f5f7fb; }
.container { padding: 30px; }
h2 { margin-bottom: 20px; color: #1e3a5f; }
.cargando-box, .sin-permiso-box { text-align: center; padding: 40px; background: white; border-radius: 10px; margin-top: 20px; }
.sin-permiso-box h2 { color: #d32f2f; }
.barra-superior { display: flex; justify-content: space-between; align-items: center; background: #e9edf5; padding: 15px; border-radius: 10px; margin-bottom: 20px; }
.barra-superior input { padding: 8px 12px; border-radius: 6px; border: 1px solid #ccc; width: 250px; }
.acciones-derecha { display: flex; gap: 10px; }
.acciones-derecha button { width: 45px; height: 45px; border-radius: 8px; font-size: 18px; cursor: pointer; border: none; }
.nuevo { background: #4caf50; color: white; }
.imprimir { background: #2196f3; color: white; }
.excel { background: #2e7d32; color: white; }
table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1); }
th { background: #1e3a5f; color: white; padding: 12px; }
td { padding: 10px; border-bottom: 1px solid #eee; text-align: center; }
tr:hover { background: #f2f6ff; }
.btn-editar { background: #ffc107; border: none; padding: 8px; border-radius: 4px; cursor: pointer; margin-right: 5px; }
.btn-eliminar { background: #e53935; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; }
.modal { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); display: flex; justify-content: center; align-items: center; }
.modal-body { background: white; padding: 30px; width: 420px; border-radius: 10px; display: flex; flex-direction: column; gap: 12px; }
.modal-body input, .modal-body select { padding: 9px; border-radius: 6px; border: 1px solid #ccc; }
.acciones { display: flex; justify-content: space-between; margin-top: 15px; }
.acciones button { padding: 10px 15px; border: none; border-radius: 6px; cursor: pointer; color: white; font-weight: bold; background: #4caf50;}
.acciones .btn-cancelar { background: #e53935; }
</style>