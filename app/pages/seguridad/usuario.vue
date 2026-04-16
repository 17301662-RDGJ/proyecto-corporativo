<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router"; 
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
const router = useRouter();
const supabase = useSupabaseClient();

/* 🔐 PERMISOS CORREGIDOS */
const { init, obtenerPermisosModulo, modulos } = usePermisos();

/* DATA */
const usuarios = ref([]);
const perfiles = ref([]);
const cargando = ref(true);

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

/* ============================================================
   🔐 LÓGICA DE SEGURIDAD (La llave del éxito)
   ============================================================ */

// 1. Encontramos el módulo comparando la ruta del navegador con la DB
const moduloActual = computed(() => {
  if (!modulos.value.length) return null;
  return modulos.value.find((m) => {
    if (!m.ruta) return false;
    // Normalizamos ambas rutas (minúsculas y sin diagonal final)
    const rutaDb = m.ruta.trim().toLowerCase().replace(/\/$/, "");
    const rutaActual = route.path.trim().toLowerCase().replace(/\/$/, "");
    return rutaDb === rutaActual;
  });
});

// 2. Extraemos los permisos específicos (consultar, editar, etc.)
const misPermisos = computed(() => {
  if (!moduloActual.value) return { consultar: false, agregar: false, editar: false, eliminar: false };
  return obtenerPermisosModulo(moduloActual.value.id);
});

// 3. Helper para el template
const tienePermisoConsultar = computed(() => misPermisos.value.consultar);

/* ============================================================
   📦 CARGA DE DATOS
   ============================================================ */

const cargarPerfiles = async () => {
  const { data } = await supabase.from("perfil").select("*").order("strnombreperfil");
  perfiles.value = data || [];
};

const cargarUsuarios = async () => {
  const { data } = await supabase.from("usuario").select("*").order("id");
  usuarios.value = data || [];
  paginaActual.value = 1;
};

/* ============================================================
   ⚙️ ACCIONES Y FILTROS
   ============================================================ */

const usuariosFiltrados = computed(() => {
  return usuarios.value.filter((u) => {
    const cumpleNombre = u.strnombreusuario.toLowerCase().includes(filtroUsuario.value.toLowerCase());
    const cumplePerfil = !filtroPerfil.value || u.idperfil === filtroPerfil.value;
    const cumpleEstado = filtroEstado.value === "" || u.idestadousuario == filtroEstado.value;
    return cumpleNombre && cumplePerfil && cumpleEstado;
  });
});

const usuariosPaginados = computed(() => {
  const start = (paginaActual.value - 1) * porPagina;
  totalPaginas.value = Math.ceil(usuariosFiltrados.value.length / porPagina);
  return usuariosFiltrados.value.slice(start, start + porPagina);
});

const limpiar = () => {
  filtroUsuario.value = "";
  filtroPerfil.value = "";
  filtroEstado.value = "";
};

const guardar = async () => {
  let urlImagen = usuario.value.strfoto;
  try {
    if (imagen.value) {
      const nombre = Date.now() + "_" + imagen.value.name;
      const { error: uploadError } = await supabase.storage.from("usuario").upload(nombre, imagen.value);
      if (uploadError) throw new Error("Error al subir imagen");
      const { data: publicUrlData } = supabase.storage.from("usuario").getPublicUrl(nombre);
      urlImagen = publicUrlData.publicUrl;
    }

    const datos = { ...usuario.value, strfoto: urlImagen };
    if (!editando.value) delete datos.id;

    const res = editando.value
      ? await supabase.from("usuario").update(datos).eq("id", usuario.value.id)
      : await supabase.from("usuario").insert(datos);

    if (res.error) throw res.error;

    mostrarNotificacion("Guardado correctamente");
    modal.value = false;
    await cargarUsuarios();
  } catch (err) {
    mostrarNotificacion("Error: " + err.message, "error");
  }
};

const eliminar = async (id) => {
  const result = await Swal.fire({ title: "¿Eliminar usuario?", icon: "warning", showCancelButton: true });
  if (!result.isConfirmed) return;
  const { error } = await supabase.from("usuario").delete().eq("id", id);
  if (error) return mostrarNotificacion("No se pudo eliminar", "error");
  mostrarNotificacion("Eliminado");
  await cargarUsuarios();
};

const editar = (u) => {
  usuario.value = { ...u }; 
  preview.value = u.strfoto; 
  editando.value = true; 
  modal.value = true;
};

const nuevo = () => {
  usuario.value = { id: null, strnombreusuario: "", idperfil: "", strpwd: "", idestadousuario: 1, strcorreo: "", strnumerocelular: "", strfoto: "" };
  preview.value = ""; imagen.value = null; editando.value = false; modal.value = true;
};

const seleccionarImagen = (e) => {
  const file = e.target.files[0];
  if (file) {
    imagen.value = file;
    preview.value = URL.createObjectURL(file);
  }
};

/* ============================================================
   🚀 CICLO DE VIDA
   ============================================================ */

onMounted(async () => {
  const usr = process.client ? JSON.parse(localStorage.getItem("usuario")) : null;
  
  if (usr) {
    // Inicializamos permisos con el usuario del localStorage
    await init(usr); 
    
    // Cargamos catálogos
    await cargarPerfiles();
    await cargarUsuarios();
    
    cargando.value = false;

    if (!tienePermisoConsultar.value) {
      console.warn("Ruta denegada:", route.path);
    }
  } else {
    router.push("/login");
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