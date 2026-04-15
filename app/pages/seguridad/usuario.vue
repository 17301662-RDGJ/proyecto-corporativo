<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router"; 
import Swal from "sweetalert2";
import { useSupabaseClient } from "#imports";
import { usePermisos } from "~/composables/usePermisos";
import Pagination from "@/components/Pagination.vue";
import Breadcrumbs from "@/components/Breadcrumbs.vue";

// EXCEL
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

definePageMeta({
  middleware: ["auth", "permiso"],
});

const route = useRoute();
const supabase = useSupabaseClient();

/* PERMISOS (INTEGRACIÓN RECOMENDADA) */
const { init, obtenerPermisosModulo, modulos } = usePermisos();

/* DATA */
const usuarios = ref([]);
const perfiles = ref([]);

/* FILTROS */
const filtroUsuario = ref("");
const filtroPerfil = ref("");
const filtroEstado = ref("");

/* PAGINADO */
const paginaActual = ref(1);
const porPagina = 5;
const totalPaginas = ref(1);

/* MODAL */
const modal = ref(false);
const editando = ref(false);
const imagen = ref(null);
const preview = ref("");

/* NOTIFICACIONES */
const notificacion = ref({ mostrar: false, mensaje: "", tipo: "success" });

const mostrarNotificacion = (mensaje, tipo = "success") => {
  notificacion.value = { mostrar: true, mensaje, tipo };
  setTimeout(() => (notificacion.value.mostrar = false), 3000);
};

/* FORM */
const usuario = ref({
  id: null,
  strnombreusuario: "",
  idperfil: "",
  strpwd: "",
  idestadousuario: 1,
  strcorreo: "",
  strnumerocelular: "",
  strfoto: "",
});

// --- LÓGICA DE PERMISOS OPTIMIZADA ---
const moduloActual = computed(() => {
  return modulos.value.find((m) => {
    if (!m.ruta) return false;
    // Comparamos rutas limpias para evitar errores de "/" o mayúsculas
    return m.ruta.trim().toLowerCase().replace(/\/$/, "") === route.path.trim().toLowerCase().replace(/\/$/, "");
  });
});

const misPermisos = computed(() => {
  if (!moduloActual.value) return { consultar: false, agregar: false, editar: false, eliminar: false };
  return obtenerPermisosModulo(moduloActual.value.id);
});

const tienePermisoConsultar = computed(() => misPermisos.value.consultar);

/* LIMPIAR */
const limpiar = () => {
  filtroUsuario.value = "";
  filtroPerfil.value = "";
  filtroEstado.value = "";
};

/* EXPORTAR EXCEL (Tu función original) */
const exportarExcel = () => {
  if (!usuariosFiltrados.value.length) {
    mostrarNotificacion("No hay datos para exportar", "error");
    return;
  }
  const fecha = new Date().toLocaleDateString();
  const data = usuariosFiltrados.value.map((u) => ({
    Usuario: u.strnombreusuario,
    Perfil: perfiles.value.find((p) => p.id === u.idperfil)?.strnombreperfil || "",
    Estado: u.idestadousuario === 1 ? "Activo" : "Inactivo",
    Correo: u.strcorreo,
    Celular: u.strnumerocelular,
  }));
  const worksheet = XLSX.utils.json_to_sheet(data, { origin: "A4" });
  XLSX.utils.sheet_add_aoa(worksheet, [["Reporte de Usuarios"], [`Fecha: ${fecha}`], []], { origin: "A1" });
  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }];
  worksheet["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 30 }, { wch: 18 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const fileData = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(fileData, `usuarios_${new Date().toISOString().split("T")[0]}.xlsx`);
  mostrarNotificacion("Excel generado correctamente");
};

/* IMPRIMIR (Tu función original) */
const imprimir = () => {
  if (!usuariosFiltrados.value.length) {
    mostrarNotificacion("No hay datos para imprimir", "error");
    return;
  }
  const fecha = new Date().toLocaleString();
  const filas = usuariosFiltrados.value.map((u) => {
    const perfil = perfiles.value.find((p) => p.id === u.idperfil)?.strnombreperfil || "";
    const estado = u.idestadousuario === 1 ? "Activo" : "Inactivo";
    return `<tr><td>${u.strnombreusuario}</td><td>${perfil}</td><td>${estado}</td><td>${u.strcorreo}</td><td>${u.strnumerocelular}</td></tr>`;
  }).join("");

  const tabla = `<table><thead><tr><th>Usuario</th><th>Perfil</th><th>Estado</th><th>Correo</th><th>Celular</th></tr></thead><tbody>${filas}</tbody></table>`;
  const ventana = window.open("", "_blank");
  ventana.document.write(`<html><head><title>Reporte</title><style>body{font-family:Arial;padding:20px;} table{width:100%;border-collapse:collapse;} th{background:#1e3a5f;color:white;padding:10px;} td{padding:10px;border:1px solid #ccc;text-align:center;}</style></head><body><h2>Reporte de Usuarios</h2><p>${fecha}</p>${tabla}</body></html>`);
  ventana.document.close();
  setTimeout(() => { ventana.focus(); ventana.print(); }, 800);
};

/* IMAGEN */
const seleccionarImagen = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    mostrarNotificacion("Solo se permiten imágenes", "error");
    return;
  }
  imagen.value = file;
  preview.value = URL.createObjectURL(file);
};

/* GUARDAR (Tu función original) */
const guardar = async () => {
  let urlImagen = usuario.value.strfoto;
  try {
    if (imagen.value) {
      const nombre = Date.now() + "_" + imagen.value.name;
      const { error: uploadError } = await supabase.storage.from("usuario").upload(nombre, imagen.value);
      if (uploadError) return mostrarNotificacion("Error al subir imagen", "error");
      const { data: publicUrlData } = supabase.storage.from("usuario").getPublicUrl(nombre);
      urlImagen = publicUrlData.publicUrl;
    }
    let datos = { ...usuario.value, strfoto: urlImagen };
    if (!editando.value) delete datos.id;
    const res = editando.value
      ? await supabase.from("usuario").update(datos).eq("id", usuario.value.id)
      : await supabase.from("usuario").insert(datos);
    if (res.error) return mostrarNotificacion("Error al guardar", "error");
    mostrarNotificacion("Guardado correctamente");
    modal.value = false;
    cargarUsuarios();
  } catch (err) { mostrarNotificacion("Error inesperado", "error"); }
};

/* CARGAS */
const cargarPerfiles = async () => {
  const { data } = await supabase.from("perfil").select("*");
  perfiles.value = data || [];
};

const cargarUsuarios = async () => {
  const { data } = await supabase.from("usuario").select("*");
  usuarios.value = data || [];
  paginaActual.value = 1;
};

/* FILTROS Y PAGINADO */
const usuariosFiltrados = computed(() => {
  return usuarios.value.filter((u) => {
    return (
      u.strnombreusuario.toLowerCase().includes(filtroUsuario.value.toLowerCase()) &&
      (!filtroPerfil.value || u.idperfil == filtroPerfil.value) &&
      (!filtroEstado.value || u.idestadousuario == filtroEstado.value)
    );
  });
});

const usuariosPaginados = computed(() => {
  const start = (paginaActual.value - 1) * porPagina;
  totalPaginas.value = Math.ceil(usuariosFiltrados.value.length / porPagina);
  return usuariosFiltrados.value.slice(start, start + porPagina);
});

/* ACCIONES CRUD */
const nuevo = () => {
  usuario.value = { id: null, strnombreusuario: "", idperfil: "", strpwd: "", idestadousuario: 1, strcorreo: "", strnumerocelular: "", strfoto: "" };
  preview.value = ""; imagen.value = null; editando.value = false; modal.value = true;
};

const editar = (u) => {
  usuario.value = { ...u }; preview.value = u.strfoto; editando.value = true; modal.value = true;
};

const eliminar = async (id) => {
  const result = await Swal.fire({ title: "¿Eliminar usuario?", icon: "warning", showCancelButton: true });
  if (!result.isConfirmed) return;
  await supabase.from("usuario").delete().eq("id", id);
  mostrarNotificacion("Eliminado");
  cargarUsuarios();
};

onMounted(async () => {
  await init(); // Carga permisos y módulos
  if (tienePermisoConsultar.value) {
    await cargarPerfiles();
    await cargarUsuarios();
  }
});
</script>

<template>
  <div v-if="notificacion.mostrar" class="notificacion" :class="notificacion.tipo">
    {{ notificacion.mensaje }}
  </div>

  <div class="container">
    <Breadcrumbs pagina="Usuario" />

    <div v-if="!tienePermisoConsultar" class="sin-permiso">
      <h3>Acceso denegado: No tienes permiso para consultar este módulo.</h3>
    </div>

    <div v-else>
      <h2>Gestión de Usuarios</h2>

      <div class="filtros">
        <div class="filtros-izq">
          <input v-model="filtroUsuario" placeholder="Buscar Usuario" />
          <select v-model="filtroPerfil">
            <option value="">Todos los Perfiles</option>
            <option v-for="p in perfiles" :key="p.id" :value="p.id">{{ p.strnombreperfil }}</option>
          </select>
          <select v-model="filtroEstado">
            <option value="">Estado</option>
            <option :value="1">Activo</option>
            <option :value="0">Inactivo</option>
          </select>
          <button @click="limpiar">Limpiar</button>
        </div>

        <div class="filtros-der">
          <button v-if="misPermisos.agregar" class="icon-btn nuevo" @click="nuevo" title="Nuevo Usuario">➕</button>
          <button v-if="misPermisos.consultar" class="icon-btn excel" @click="exportarExcel" title="Exportar Excel">📊</button>
          <button v-if="misPermisos.consultar" class="icon-btn imprimir" @click="imprimir" title="Imprimir">🖨️</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Foto</th>
            <th>Usuario</th>
            <th>Perfil</th>
            <th>Estado</th>
            <th>Correo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usuariosPaginados" :key="u.id">
            <td>
              <img v-if="u.strfoto" :src="u.strfoto" width="40" class="foto-perfil" />
              <span v-else>👤</span>
            </td>
            <td>{{ u.strnombreusuario }}</td>
            <td>{{ perfiles.find((p) => p.id === u.idperfil)?.strnombreperfil }}</td>
            <td>{{ u.idestadousuario === 1 ? "Activo" : "Inactivo" }}</td>
            <td>{{ u.strcorreo }}</td>
            <td>
              <button v-if="misPermisos.editar" @click="editar(u)" class="btn-edit">✏️</button>
              <button v-if="misPermisos.eliminar" @click="eliminar(u.id)" class="btn-delete">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>

      <Pagination :paginaActual="paginaActual" :totalPaginas="totalPaginas" @cambiar="paginaActual = $event" />

      <div v-if="modal" class="modal">
        <div class="modal-body">
          <h3>{{ editando ? 'Editar Usuario' : 'Nuevo Usuario' }}</h3>
          <input v-model="usuario.strnombreusuario" placeholder="Nombre Usuario" />
          <select v-model="usuario.idperfil">
            <option value="">Seleccione Perfil</option>
            <option v-for="p in perfiles" :key="p.id" :value="p.id">{{ p.strnombreperfil }}</option>
          </select>
          <input v-if="!editando" v-model="usuario.strpwd" type="password" placeholder="Contraseña" />
          <input v-model="usuario.strcorreo" placeholder="Correo" />
          <input v-model="usuario.strnumerocelular" placeholder="Celular" />
          <input type="file" @change="seleccionarImagen" />
          <img v-if="preview" :src="preview" width="80" class="foto-perfil" />
          <div class="acciones">
            <button @click="guardar" class="btn-save">Guardar</button>
            <button @click="modal = false">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

.container { padding: 30px; 
  background: #f5f7fb; 
  min-height: 100vh; }

.filtros { display: flex; 
  justify-content: space-between; 
  background: white; 
  padding: 15px; 
  border-radius: 8px; 
  margin-bottom: 20px; 
  box-shadow: 0 2px 5px rgba(0,0,0,0.1); }

.filtros-izq, .filtros-der { display: flex; 
  gap: 10px; 
  align-items: center; }

.icon-btn { width: 40px; 
  height: 40px; 
  border-radius: 8px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 18px; 
  color: white; 
  border: none; 
  cursor: pointer; }

.nuevo { background: #4caf50; } 
.excel { background: #2e7d32; } 
.imprimir { background: #1976d2; }

table { width: 100%; 
  border-collapse: collapse; 
  background: white; }
  
th { background: #1e3a5f; 
  color: white; 
  padding: 12px; }

td { padding: 10px; 
  border-bottom: 1px solid #eee; 
  text-align: center; }

.foto-perfil { border-radius: 50%; 
  object-fit: cover; }
.modal { position: fixed; 
  inset: 0; 
  background: rgba(0,0,0,0.5); 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  z-index: 1000; }

.modal-body { background: white; 
  padding: 25px; 
  border-radius: 12px; 
  width: 400px; 
  display: flex; 
  flex-direction: column; 
  gap: 10px; }

.notificacion { position: fixed; 
  top: 20px; 
  right: 20px; 
  padding: 15px; 
  border-radius: 8px; 
  color: white; 
  z-index: 2000; }

.success { background: #4caf50; }
.error { background: #f44336; }
.sin-permiso { text-align: center;
 padding: 50px; 
 color: #f44336; }
</style>