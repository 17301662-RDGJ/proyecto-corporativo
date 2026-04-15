<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useSupabaseClient } from "#imports";
import { usePermisos } from "~/composables/usePermisos";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

definePageMeta({ middleware: ["auth", "permiso"] });

const client = useSupabaseClient();
const route = useRoute();
const { init, obtenerPermisosModulo, modulos: listaModulos } = usePermisos();

/* PERMISOS */
const misPermisos = computed(() => {
  const mod = listaModulos.value.find(m => m.ruta?.toLowerCase().replace(/\/$/, "") === route.path.toLowerCase().replace(/\/$/, ""));
  return mod ? obtenerPermisosModulo(mod.id) : { consultar: false };
});

const modulosData = ref([]);
const filtro = ref("");
const paginaActual = ref(1);
const totalPaginas = ref(1);

const cargar = async () => {
  const { data } = await client.from("modulo").select("*");
  modulosData.value = data || [];
};

/* REPORTES */
const exportarExcel = () => {
  const ws = XLSX.utils.json_to_sheet(modulosData.value);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Modulos");
  XLSX.writeFile(wb, "modulos.xlsx");
};

const imprimir = () => {
  const filas = modulosData.value.map(m => `<tr><td>${m.strnombremodulo}</td><td>${m.ruta}</td></tr>`).join("");
  const win = window.open("");
  win.document.write(`<table><thead><tr><th>Nombre</th><th>Ruta</th></tr></thead><tbody>${filas}</tbody></table>`);
  win.print();
};

const paginados = computed(() => {
  const filtrados = modulosData.value.filter(m => m.strnombremodulo.toLowerCase().includes(filtro.value.toLowerCase()));
  totalPaginas.value = Math.ceil(filtrados.length / 5);
  return filtrados.slice((paginaActual.value - 1) * 5, paginaActual.value * 5);
});

onMounted(async () => {
  await init();
  if (misPermisos.value.consultar) await cargar();
});
</script>

<template>
  <div class="container" v-if="misPermisos.consultar">
    <Breadcrumbs pagina="Módulos" />
    <div class="filtros">
      <input v-model="filtro" placeholder="Filtrar..." />
      <button v-if="misPermisos.agregar" class="btn nuevo">➕ Nuevo</button>
      <button @click="imprimir" class="btn imprimir">🖨️</button>
      <button @click="exportarExcel" class="btn excel">📊</button>
    </div>
    <table>
      <thead><tr><th>Nombre</th><th>Ruta</th><th>Acciones</th></tr></thead>
      <tbody>
        <tr v-for="m in paginados" :key="m.id">
          <td>{{ m.strnombremodulo }}</td>
          <td>{{ m.ruta }}</td>
          <td>
            <button v-if="misPermisos.editar">✏️</button>
            <button v-if="misPermisos.eliminar">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>
    <Pagination :paginaActual="paginaActual" :totalPaginas="totalPaginas" @cambiar="paginaActual = $event" />
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

td button:first-child {
  background: #ffc107;
}

td button:last-child {
  background: #e53935;
  color: white;
}

label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
}

input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

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
  width: 380px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-body h3 {
  text-align: center;
}

.modal-body input {
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

/* NOTIFICACIONES */

.notificacion {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 14px 22px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  z-index: 999;
  animation: fadein 0.3s;
}

.success {
  background: #4caf50;
}

.error {
  background: #e53935;
}

@keyframes fadein {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 700px) {
  table {
    font-size: 14px;
  }

  .modal-body {
    width: 90%;
  }
}
.busqueda {
  display: flex;
  gap: 20px; /* espacio entre botón y input */
  flex-wrap: wrap; /* que se adapte a pantallas pequeñas */
  margin-bottom: 15px;
}

.busqueda input {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
  /* ocupa el resto del espacio disponible */
}
.excel {
  background: #2e7d32;
  color: white;
  padding: 10px 18px;
  border-radius: 6px;
  margin-left: 10px;
}
/* CONTENEDOR GENERAL */
.filtros-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  background: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
}

/* IZQUIERDA */
.filtros-izquierda {
  flex: 1;
}

.filtros-izquierda input {
  width: 100%;
  max-width: 300px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

/* DERECHA */
.acciones-derecha {
  display: flex;
  gap: 10px;
}

/* BOTONES ICONO */
.btn-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  color: white;
  transition: 0.2s;
}

.btn-icon:hover {
  transform: scale(1.1);
}

/* COLORES */
.nuevo {
  background: #4caf50;
}

.excel {
  background: #2e7d32;
}
.imprimir {
  background: #1976d2;
}
</style>
