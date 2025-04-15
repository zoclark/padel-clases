from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    Usuario, 
    AlumnoPerfil, 
    Clase, 
    Reserva, 
    TrainingSession,
    Caracteristica,
)

admin.site.register(Clase)
admin.site.register(Reserva)

@admin.register(Caracteristica)
class CaracteristicaAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre")
    search_fields = ("nombre",)

@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Rol", {"fields": ("rol",)}),
    )

@admin.register(AlumnoPerfil)
class AlumnoPerfilAdmin(admin.ModelAdmin):
    """
    Admin con todos los campos de AlumnoPerfil.
    Se organizan en secciones: Físico, Técnica de Golpeo, Áreas/Posición, Skills, etc.
    También se incluye 'caracteristicas' como ManyToMany con filter_horizontal.
    """
    fieldsets = (
        ("Usuario", {
            "fields": ("usuario",)
        }),
        ("Nivel General", {
            "fields": ("nivel",)
        }),
        ("Físico", {
            "fields": (
                "resistencia", 
                "agilidad", 
                "coordinacion", 
                "tecnica",
                "velocidad", 
                "potencia",
            )
        }),
        ("Técnica de Golpeo", {
            "fields": (
                "globo", 
                "volea_natural", 
                "volea_reves",
                "bandeja", 
                "vibora", 
                "remate", 
                "rulo", 
                "bote_pronto",
                "chiquita",
                "dejada",
            )
        }),
        ("Posicionamiento/Áreas", {
            "fields": (
                "ataque", 
                "defensa", 
                "pared", 
                "pared_lateral",
                "pared_fondo", 
                "fondo_pared",
            )
        }),
        ("Skills", {
            "fields": (
                "cambio_agarre", 
                "liftado", 
                "cortado", 
                "x3", 
                "x4",
                "contrapared",
                "contralateral",
            )
        }),
        ("Características", {
            "fields": ("caracteristicas",)
        }),
    )
    filter_horizontal = ("caracteristicas",)

@admin.register(TrainingSession)
class TrainingSessionAdmin(admin.ModelAdmin):
    list_display = ("alumno", "date", "session_type", "teacher_comment")
    list_filter = ("date", "session_type")
    search_fields = ("alumno__username", "details", "teacher_comment")


from django.contrib import admin
from .models import RecursoAlumno

@admin.register(RecursoAlumno)
class RecursoAlumnoAdmin(admin.ModelAdmin):
    list_display = ("alumno", "descripcion", "url", "fecha_asignacion")
    search_fields = ("alumno__username", "descripcion")
    list_filter = ("fecha_asignacion",)