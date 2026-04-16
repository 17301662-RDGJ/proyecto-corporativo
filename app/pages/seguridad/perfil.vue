<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useSupabaseClient } from "#imports";
import { usePermisos } from "~/composables/usePermisos";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

definePageMeta({ middleware: ["auth", "permiso"] });

const client = useSupabaseClient();
const route = useRoute();
const { init, obtenerPermisosModulo, modulos: listaModulos } = usePermisos();

/* PERMISOS */
const misPermisos = computed(() => {
  const mod = listaModulos.value.find(m => m.ruta?.toLowerCase().replace(/\/$/, "") === route.path.toLowerCase().replace(/\/$/, ""));
  return mod ? obtenerPermisosModulo(mod.id) : { consultar: false, agregar: false, editar: false, eliminar: false, imprimir: false, bitacora: false };
});

const perfilesData = ref([]);
const filtro = ref("");
const paginaActual = ref(1);
const totalPaginas = ref(1);

/* VARIABLES PARA EL MODAL */
const modal = ref(false);
const editando = ref(false);
const form = ref({ id: null, strnombreperfil: "" });

/* CARGAR PERFILES DE LA BASE DE DATOS */
const cargar = async () => {
  const { data, error } = await client.from("perfil").select("*").order("strnombreperfil");
  if (!error) perfilesData.value = data || [];
};

/* ==========================================
   🚀 CRUD: AGREGAR, EDITAR Y ELIMINAR 
   ========================================== */

const abrirModal = () => {
  form.value = { id: null, strnombreperfil: "" };
  editando.value = false;
  modal.value = true;
};

const editar = (perfil) => {
  form.value = { ...perfil };
  editando.value = true;
  modal.value = true;
};

const guardar = async () => {
  if (!form.value.strnombreperfil.trim()) {
    Swal.fire("Error", "El nombre del perfil es obligatorio", "error");
    return;
  }

  try {
    const datosGuardar = { strnombreperfil: form.value.strnombreperfil };

    if (editando.value) {
      const { error } = await client.from("perfil").update(datosGuardar).eq("id", form.value.id);
      if (error) throw error;
      Swal.fire("Éxito", "Perfil actualizado", "success");
    } else {
      const { error } = await client.from("perfil").insert(datosGuardar);
      if (error) throw error;
      Swal.fire("Éxito", "Perfil agregado", "success");
    }

    modal.value = false;
    await cargar();
  } catch (err) {
    Swal.fire("Error", "No se pudo guardar el perfil", "error");
  }
};

const eliminar = async (id) => {
  const result = await Swal.fire({
    title: "¿Eliminar perfil?",
    text: "Esta acción no se puede deshacer. Cuidado si hay usuarios con este perfil.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar"
  });

  if (result.isConfirmed) {
    const { error } = await client.from("perfil").delete().eq("id", id);
    if (error) {
      Swal.fire("Error", "No se puede eliminar. Es posible que existan usuarios usando este perfil.", "error");
    } else {
      Swal.fire("Eliminado", "El perfil fue borrado.", "success");
      await cargar();
    }
  }
};

/* ==========================================
   🖨️ REPORTES
   ========================================== */
const exportarExcel = () => {
  if (!misPermisos.value.bitacora && !misPermisos.value.consultar) return;
  
  // 🟢 Se quitó el ID del reporte de Excel
  const datosLimpios = perfilesData.value.map(p => ({
    "Nombre del Perfil": p.strnombreperfil
  }));

  const ws = XLSX.utils.json_to_sheet(datosLimpios);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Perfiles");
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const dataBlob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
  saveAs(dataBlob, "Lista_Perfiles.xlsx");
};

const imprimir = () => {
  // 🟢 Se quitó el ID del reporte de impresión
  const filas = perfilesData.value.map(p => `<tr><td>${p.strnombreperfil}</td></tr>`).join("");
  const win = window.open("");
  win.document.write(`
    <style>table { width: 100%; border-collapse: collapse; font-family: sans-serif; } th, td { border: 1px solid #ddd; padding: 10px; text-align: left; } th { background-color: #f2f2f2; }</style>
    <h2>Catálogo de Perfiles</h2>
    <table><thead><tr><th>Nombre del Perfil</th></tr></thead><tbody>${filas}</tbody></table>
  `);
  win.print();
  win.close();
};

const paginados = computed(() => {
  const filtrados = perfilesData.value.filter(p => (p.strnombreperfil || "").toLowerCase().includes(filtro.value.toLowerCase()));
  totalPaginas.value = Math.ceil(filtrados.length / 5) || 1;
  return filtrados.slice((paginaActual.value - 1) * 5, paginaActual.value * 5);
});

onMounted(async () => {
  if (process.client) {
    const usr = JSON.parse(localStorage.getItem("usuario"));
    await init(usr); 
    
    if (misPermisos.value.consultar) {
      await cargar();
    }
  }
});
</script>

<template>
  <div class="pagina-completa">
    <div class="container" v-if="misPermisos.consultar">
      <Breadcrumbs pagina="Perfiles" />
      
      <div class="filtros-container">
        <div class="filtros-izquierda">
          <input v-model="filtro" placeholder="Buscar perfil..." />
        </div>
        <div class="acciones-derecha">
          <button v-if="misPermisos.agregar" @click="abrirModal" class="btn nuevo">➕ Nuevo</button>
          <button v-if="misPermisos.imprimir" @click="imprimir" class="btn btn-icon imprimir" title="Imprimir">🖨️</button>
          <button v-if="misPermisos.bitacora" @click="exportarExcel" class="btn btn-icon excel" title="Exportar Excel">📊</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Nombre del Perfil</th>
            <th v-if="misPermisos.editar || misPermisos.eliminar" style="width: 150px;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in paginados" :key="p.id">
            <td><strong>{{ p.strnombreperfil }}</strong></td>
            <td v-if="misPermisos.editar || misPermisos.eliminar">
              <button v-if="misPermisos.editar" @click="editar(p)" class="btn-editar" title="Editar">✏️</button>
              <button v-if="misPermisos.eliminar" @click="eliminar(p.id)" class="btn-eliminar" title="Eliminar">🗑️</button>
            </td>
          </tr>
          <tr v-if="perfilesData.length === 0">
            <td colspan="2">No hay perfiles registrados</td>
          </tr>
        </tbody>
      </table>

      <Pagination :paginaActual="paginaActual" :totalPaginas="totalPaginas" @cambiar="paginaActual = $event" />

      <div v-if="modal" class="modal">
        <div class="modal-body">
          <h3>{{ editando ? 'Editar' : 'Nuevo' }} Perfil</h3>
          
          <label>Nombre del Perfil:</label>
          <input v-model="form.strnombreperfil" placeholder="Ej. Administrador, Ventas..." />
          
          <div class="acciones">
            <button @click="guardar">Guardar</button>
            <button class="btn-cancelar" @click="modal = false">Cancelar</button>
          </div>
        </div>
      </div>
    </div>

    <div class="container sin-permiso" v-else>
      <h2>🚫 Acceso Denegado</h2>
      <p>No tienes permiso para consultar el catálogo de perfiles.</p>
    </div>
  </div>
</template>

<style scoped>
.pagina-completa { width: 100%; min-height: 100vh; background: #f5f7fb; }
.container { padding: 30px; }
h2 { margin-bottom: 20px; color: #1e3a5f; }

.filtros-container { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08); }
.filtros-izquierda input { width: 300px; padding: 8px 10px; border-radius: 6px; border: 1px solid #ccc; }
.acciones-derecha { display: flex; gap: 10px; }

.btn { border: none; border-radius: 6px; cursor: pointer; transition: 0.2s; color: white; }
.btn:hover { transform: scale(1.05); }
.btn-icon { width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; font-size: 18px; }

.nuevo { background: #4caf50; padding: 10px 18px; font-weight: bold; }
.excel { background: #2e7d32; }
.imprimir { background: #1976d2; }

table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1); }
th { background: #1e3a5f; color: white; padding: 12px; text-align: left; }
td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
tr:hover { background: #f2f6ff; }

.btn-editar { background: #ffc107; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; margin-right: 5px; }
.btn-eliminar { background: #e53935; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }

/* MODAL */
.modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.55); display: flex; justify-content: center; align-items: center; z-index: 100;}
.modal-body { background: white; padding: 30px; width: 380px; border-radius: 10px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2); }
.modal-body h3 { text-align: center; margin-bottom: 10px; color: #1e3a5f; }
.modal-body label { font-weight: bold; color: #333; font-size: 14px; }
.modal-body input { padding: 10px; border-radius: 6px; border: 1px solid #ccc; width: 100%; box-sizing: border-box; }

.acciones { display: flex; justify-content: space-between; margin-top: 15px; }
.acciones button { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; color: white; }
.acciones button:first-child { background: #4caf50; }
.acciones .btn-cancelar { background: #e53935; }

.sin-permiso { text-align: center; padding-top: 100px; color: #e53935; }
</style>