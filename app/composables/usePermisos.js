import { ref, computed } from 'vue'

export const usePermisos = () => {
  const supabase = useSupabaseClient()
  
  const usuarioData = ref(null)
  const todosLosModulos = ref([])
  const misPermisos = ref([])
  const cargando = ref(false)

  const init = async (usrLocal) => {
    // Validamos que el usuario tenga el idperfil (UUID) que pusiste en el INSERT
    if (!usrLocal || !usrLocal.idperfil || cargando.value) return
    cargando.value = true

    try {
      usuarioData.value = usrLocal

      // 1. Traer todos los módulos base
      const { data: mData, error: errMod } = await supabase
        .from('modulo')
        .select('*')
      
      if (errMod) throw errMod
      todosLosModulos.value = mData || []

      // 2. Traer los permisos específicos usando el UUID del perfil
      const { data: pData, error: errPerm } = await supabase
        .from('permisos_perfil')
        .select('*')
        .eq('idperfil', usrLocal.idperfil)
      
      if (errPerm) throw errPerm
      misPermisos.value = pData || []

      // DEBUG: Para ver en consola si llegaron datos reales
      console.log("Módulos desde DB:", todosLosModulos.value.length)
      console.log("Permisos desde DB:", misPermisos.value.length)
      
    } catch (error) {
      console.error("Error cargando seguridad:", error)
    } finally {
      cargando.value = false
    }
  }

  // AQUÍ ESTABA EL ERROR DE FILTRADO
  const modulosPermitidos = computed(() => {
    if (!misPermisos.value.length || !todosLosModulos.value.length) return []

    return todosLosModulos.value.filter(mod => {
      // Buscamos el permiso usando 'idmodulo' contra el 'id' del módulo
      const permiso = misPermisos.value.find(p => p.idmodulo === mod.id)
      
      if (!permiso) return false

      // Un módulo es visible solo si tiene al menos una acción en TRUE
      // Verificamos que existan las columnas exactas de tu INSERT
      return (
        permiso.agregar === true || 
        permiso.editar === true || 
        permiso.eliminar === true || 
        permiso.consultar === true || 
        permiso.imprimir === true || 
        permiso.bitacora === true
      )
    })
  })

  const obtenerPermisosModulo = (idModulo) => {
    return misPermisos.value.find(p => p.idmodulo === idModulo) || {
      agregar: false, editar: false, eliminar: false, consultar: false, imprimir: false
    }
  }

  return {
    init,
    usuario: usuarioData,
    modulos: todosLosModulos,
    permisos: misPermisos,
    modulosPermitidos,
    obtenerPermisosModulo,
    cargando
  }
}