# reservas/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django import forms
from .models import (
    Usuario, AlumnoPerfil, Clase, Reserva, TrainingSession, Caracteristica,
    RecursoAlumno, Pozo, ParticipantePozo,
    Club, Pista, PromocionClub, EventoClub, PartnershipClub,
    TipoSuperficie, ServicioClub, Idioma, CategoriaReview, TagClub,
    ClubHorario, ClubServicio, ClubImagen, ClubUsuarioRelacion,
    ReviewClub, ResumenReviewIA, LogroClub, RankingClub,
    HistorialClubUsuario, PrediccionOcupacion, MapaCalorClub, PerfilEstiloJugador,
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
        ("Datos personales", {"fields": ("fecha_nacimiento", "telefono", "localidad", "municipio","onboarding_completado")}),
    )
    list_display = ("username", "email", "rol", "genero", "telefono", "localidad", "municipio", "is_staff")
    list_filter = ("rol", "genero", "localidad", "municipio", "is_staff")
    search_fields = ("username", "email", "telefono", "localidad", "municipio","onboarding_completado")

# --- Perfil de Alumno ---
@admin.register(AlumnoPerfil)
class AlumnoPerfilAdmin(admin.ModelAdmin):
    fieldsets = (
        ("Usuario", {"fields": ("usuario",)}),
        ("Nivel General", {"fields": ("nivel", "mano_dominante", "posicion")}),
        ("Físico", {"fields": ("resistencia", "agilidad", "coordinacion", "tecnica", "velocidad", "potencia")}),
        ("Técnica de Golpeo", {"fields": ("globo", "volea_natural", "volea_reves", "bandeja", "vibora", "remate", "rulo", "liftado", "cortado", "cambio_agarre", "bote_pronto", "dejada", "chiquita")}),
        ("Golpes Avanzados", {"fields": ("x3", "x4", "contrapared", "contralateral")}),
        ("Posicionamiento/Áreas", {"fields": ("ataque", "defensa", "pared", "pared_lateral", "pared_fondo", "fondo_pared")}),
        ("Táctica", {"fields": ("tactica", "anticipacion", "vision_juego", "decisiones")}),
        ("Psicológico / Actitud", {"fields": ("concentracion", "serenidad", "trabajo_equipo", "esfuerzo", "regularidad", "competitividad", "gestion_error", "comunicacion")}),
        ("Características Extra", {"fields": ("caracteristicas",)}),
    )
    filter_horizontal = ("caracteristicas",)
    list_display = ("usuario", "nivel", "mano_dominante", "posicion", "resistencia", "agilidad", "coordinacion", "tecnica", "velocidad", "potencia", "tactica", "concentracion", "trabajo_equipo")
    search_fields = ("usuario__username",)
    list_filter = ("nivel", "mano_dominante", "posicion")

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
    list_display = ("id", "titulo", "fecha", "hora_inicio", "hora_fin", "tipo", "num_pistas")
    list_filter = ("tipo", "fecha")
    search_fields = ("titulo",)
    fields = ("titulo", "fecha", ("hora_inicio", "hora_fin"), "tipo", "num_pistas")

# --- Participantes de Pozo ---
@admin.register(ParticipantePozo)
class ParticipantePozoAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "pozo", "nivel", "genero", "pista_fija", "juega_con_display", "juega_contra_display", "no_juega_con_display", "no_juega_contra_display")
    list_filter = ("pozo", "genero", "posicion", "pista_fija")
    search_fields = ("nombre",)
    fieldsets = (
        (None, {"fields": ("pozo", "usuario", "nombre", "nivel", "genero", "pista_fija", "mano_dominante", "posicion")}),
        ("Restricciones de pareja/rival", {"fields": ("juega_con", "juega_contra", "no_juega_con", "no_juega_contra")}),
    )
    def juega_con_display(self, obj): return ", ".join(str(p) for p in obj.juega_con.all())
    def juega_contra_display(self, obj): return ", ".join(str(p) for p in obj.juega_contra.all())
    def no_juega_con_display(self, obj): return ", ".join(str(p) for p in obj.no_juega_con.all())
    def no_juega_contra_display(self, obj): return ", ".join(str(p) for p in obj.no_juega_contra.all())
    juega_con_display.short_description = "Juega con"
    juega_contra_display.short_description = "Juega contra"
    no_juega_con_display.short_description = "No juega con"
    no_juega_contra_display.short_description = "No juega contra"

# --- Clubes ---
admin.site.register(TipoSuperficie)
admin.site.register(ServicioClub)
admin.site.register(Idioma)
admin.site.register(CategoriaReview)
admin.site.register(TagClub)

class ClubHorarioInline(admin.TabularInline):
    model = ClubHorario
    extra = 0

class ClubServicioInline(admin.TabularInline):
    model = ClubServicio
    extra = 0

class ClubImagenInline(admin.TabularInline):
    model = ClubImagen
    extra = 0

@admin.register(Club)
class ClubAdmin(admin.ModelAdmin):
    inlines = [ClubHorarioInline, ClubServicioInline, ClubImagenInline]
    list_display = ("nombre", "slug", "destacado", "activo", "publicado", "plan", "permite_pozos", "permite_ligas")
    list_filter = ("plan", "activo", "publicado", "permite_pozos", "permite_ligas")
    search_fields = ("nombre", "descripcion", "direccion", "telefono", "email")
    prepopulated_fields = {"slug": ("nombre",)}
    filter_horizontal = ("idiomas", "tags")

@admin.register(Pista)
class PistaAdmin(admin.ModelAdmin):
    list_display = ("nombre", "club", "superficie", "indoor", "abierta", "es_competicion")
    list_filter = ("club", "indoor", "abierta", "es_competicion")
    search_fields = ("nombre", "club__nombre")

@admin.register(PromocionClub)
class PromocionClubAdmin(admin.ModelAdmin):
    list_display = ("titulo", "club", "fecha_inicio", "fecha_fin", "activa")
    list_filter = ("activa", "fecha_inicio", "fecha_fin")
    search_fields = ("titulo", "descripcion", "club__nombre")

@admin.register(EventoClub)
class EventoClubAdmin(admin.ModelAdmin):
    list_display = ("nombre", "club", "fecha_inicio", "fecha_fin", "publico")
    list_filter = ("publico", "fecha_inicio", "fecha_fin")
    search_fields = ("nombre", "descripcion", "club__nombre")

@admin.register(PartnershipClub)
class PartnershipAdmin(admin.ModelAdmin):
    list_display = ("nombre_empresa", "club", "enlace")
    search_fields = ("nombre_empresa", "club__nombre")

@admin.register(ClubUsuarioRelacion)
class ClubUsuarioRelacionAdmin(admin.ModelAdmin):
    list_display = ("usuario", "club", "tipo_relacion", "fecha")
    list_filter = ("tipo_relacion",)
    search_fields = ("usuario__username", "club__nombre")

@admin.register(ReviewClub)
class ReviewClubAdmin(admin.ModelAdmin):
    list_display = ("usuario", "club", "rating", "fecha")
    list_filter = ("rating", "fecha")
    search_fields = ("usuario__username", "club__nombre", "comentario")
    filter_horizontal = ("categorias",)

@admin.register(ResumenReviewIA)
class ResumenReviewIAAdmin(admin.ModelAdmin):
    list_display = ("club", "actualizado")
    search_fields = ("club__nombre",)

admin.site.register(LogroClub)
admin.site.register(RankingClub)
admin.site.register(HistorialClubUsuario)
admin.site.register(PrediccionOcupacion)
admin.site.register(MapaCalorClub)
admin.site.register(PerfilEstiloJugador)