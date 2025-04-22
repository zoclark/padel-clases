# reservas/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django import forms
from .models import (
    Usuario,
    AlumnoPerfil,
    Clase,
    Reserva,
    TrainingSession,
    Caracteristica,
    RecursoAlumno,
    Pozo,
    ParticipantePozo
)

# --- Clase y Reserva ---
admin.site.register(Clase)
admin.site.register(Reserva)

# --- Característica ---
@admin.register(Caracteristica)
class CaracteristicaAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre")
    search_fields = ("nombre",)

# --- Usuario ---
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

# --- Perfil de Alumno ---
@admin.register(AlumnoPerfil)
class AlumnoPerfilAdmin(admin.ModelAdmin):
    fieldsets = (
        ("Usuario", {"fields": ("usuario",)}),
        ("Nivel General", {"fields": ("nivel",)}),
        ("Físico", {"fields": ("resistencia", "agilidad", "coordinacion", "tecnica", "velocidad", "potencia")}),
        ("Técnica de Golpeo", {"fields": ("globo", "volea_natural", "volea_reves", "bandeja", "vibora", "remate", "rulo", "bote_pronto", "chiquita", "dejada")}),
        ("Posicionamiento/Áreas", {"fields": ("ataque", "defensa", "pared", "pared_lateral", "pared_fondo", "fondo_pared")}),
        ("Skills", {"fields": ("cambio_agarre", "liftado", "cortado", "x3", "x4", "contrapared", "contralateral")}),
        ("Características", {"fields": ("caracteristicas",)}),
    )
    filter_horizontal = ("caracteristicas",)

# --- Sesiones de Entrenamiento ---
@admin.register(TrainingSession)
class TrainingSessionAdmin(admin.ModelAdmin):
    list_display = ("alumno", "date", "session_type", "teacher_comment")
    list_filter = ("date", "session_type")
    search_fields = ("alumno__username", "details", "teacher_comment")

# --- Recursos de Alumno ---
@admin.register(RecursoAlumno)
class RecursoAlumnoAdmin(admin.ModelAdmin):
    list_display = ("alumno", "titulo", "comentarios", "url", "fecha_asignacion")
    search_fields = ("alumno__username", "titulo", "comentarios")
    list_filter = ("fecha_asignacion",)

# --- Pozos ---
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
        "titulo",
        "fecha",
        ("hora_inicio", "hora_fin"),
        "tipo",
        "num_pistas",
    ]

# --- Participantes de Pozo ---
@admin.register(ParticipantePozo)
class ParticipantePozoAdmin(admin.ModelAdmin):
    list_display = (
        "id", "nombre", "pozo", "nivel", "genero", "pista_fija",
        "juega_con_display", "juega_contra_display",
        "no_juega_con_display", "no_juega_contra_display",
    )
    list_filter = ("pozo", "genero", "posicion", "pista_fija")
    search_fields = ("nombre",)

    fieldsets = (
        (None, {
            "fields": (
                "pozo", "usuario", "nombre", "nivel",
                "genero", "pista_fija", "mano_dominante", "posicion",
            )
        }),
        ("Restricciones de pareja/rival", {
            "fields": (
                "juega_con", "juega_contra",
                "no_juega_con", "no_juega_contra",
            )
        }),
    )

    def juega_con_display(self, obj):
        return ", ".join(str(p) for p in obj.juega_con.all())
    juega_con_display.short_description = "Juega con"

    def juega_contra_display(self, obj):
        return ", ".join(str(p) for p in obj.juega_contra.all())
    juega_contra_display.short_description = "Juega contra"

    def no_juega_con_display(self, obj):
        return ", ".join(str(p) for p in obj.no_juega_con.all())
    no_juega_con_display.short_description = "No juega con"

    def no_juega_contra_display(self, obj):
        return ", ".join(str(p) for p in obj.no_juega_contra.all())
    no_juega_contra_display.short_description = "No juega contra"
