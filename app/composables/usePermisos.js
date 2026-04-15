import { ref, computed } from 'vue'

export const usePermisos = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  
  const usuarioData = ref(null)
  const todosLosModulos = ref([])
  const misPermisos = ref([])
  const cargando = ref(false)

  const init = async () => {
    if (!user.value || cargando.value) return
    cargando.value = true

    try {
      // 1. Obtener datos del usuario logueado y su perfil [cite: 20, 28]
      const { data: uData } = await supabase
        .from('usuario')
        .select('*')
        .eq('strCorreo', user.value.email)
        .single()
      
      if (uData) {
        usuarioData.value = uData

        // 2. Traer todos los módulos base [cite: 31, 35]
        const { data: mData } = await supabase
          .from('modulo')
          .select('*')
        todosLosModulos.value = mData || []

        // 3. Traer los permisos específicos para el perfil del usuario 
        const { data: pData } = await supabase
          .from('permisos_perfil')
          .select('*')
          .eq('idperfil', uData.idperfil)
        misPermisos.value = pData || []
      }
    } catch (error) {
      console.error("Error cargando seguridad:", error)
    } finally {
      cargando.value = false
    }
  }

  // REGLA DE EVALUACIÓN: Solo mostrar módulos con al menos una acción habilitada 
  const modulosPermitidos = computed(() => {
    if (!misPermisos.value.length) return []

    return todosLosModulos.value.filter(mod => {
      // Buscamos si existe un registro de permiso para este módulo
      const permiso = misPermisos.value.find(p => p.idmodulo === mod.id)
      if (!permiso) return false

      // Un módulo es visible solo si tiene al menos una acción en TRUE 
      return (
        permiso.agregar || 
        permiso.editar || 
        permiso.eliminar || 
        permiso.consultar || 
        permiso.imprimir || 
        permiso.bitacora
      )
    })
  })

  // Función para obtener los permisos de un módulo específico (útil para botones CRUD) [cite: 44]
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