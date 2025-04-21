from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django import forms
from .models import Usuario

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

class UsuarioAdminForm(forms.ModelForm):
    class Meta:
        model = Usuario
        fields = "__all__"
        widgets = {
            "genero": forms.Select(choices=Usuario.GENERO_CHOICES),
            "rol": forms.Select(choices=Usuario.ROL_CHOICES),
            "fecha_nacimiento": forms.DateInput(attrs={"type": "date"}),
            "telefono": forms.TextInput(attrs={"placeholder": "Ej: 612345678"}),
            "localidad": forms.TextInput(attrs={"placeholder": "Ej: Valdemoro"}),
            "municipio": forms.TextInput(attrs={"placeholder": "Ej: Madrid"}),
        }


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    form = UsuarioAdminForm

    fieldsets = UserAdmin.fieldsets + (
        ("Rol y Género", {"fields": ("rol", "genero")}),
        ("Datos personales", {"fields": ("fecha_nacimiento", "telefono", "localidad", "municipio")}),
    )

    list_display = ("username", "email", "rol", "genero", "telefono", "localidad", "municipio", "is_staff")
    list_filter = ("rol", "genero", "localidad", "municipio", "is_staff")
    search_fields = ("username", "email", "telefono", "localidad", "municipio")
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
    list_display = ("alumno", "titulo", "comentarios","url", "fecha_asignacion")
    search_fields = ("alumno__username", "titulo", "comentarios")
    list_filter = ("fecha_asignacion",)


from .models import Pozo  # Asegúrate de importar el modelo

@admin.register(Pozo)
class PozoAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "titulo",
        "fecha",
        "hora_inicio",
        "hora_fin",
        "tipo",
        "num_pistas",
    ]
    list_filter = ["tipo", "fecha"]
    search_fields = ["titulo"]
    fields = [
        "titulo",        # lo primero en el formulario de edición
        "fecha",
        ("hora_inicio", "hora_fin"),
        "tipo",
        "num_pistas",
    ]