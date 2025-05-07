from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.validators import FileExtensionValidator


class Usuario(AbstractUser):
    ROL_CHOICES = (
        ("alumno", "Alumno"),
        ("profesor", "Profesor"),
        ("organizador", "Organizador"),
    )

    GENERO_CHOICES = (
        ("hombre", "Hombre"),
        ("mujer", "Mujer"),
        ("otro", "Otro"),
    )

    username = models.CharField(
        _('username'),
        max_length=150,
        unique=True,
        help_text=_('Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.'),
        validators=[UnicodeUsernameValidator()],
        error_messages={
            'unique': _('Ya existe una cuenta con este nombre de usuario.'),
        },
    )
    email = models.EmailField(
        _('email address'),
        unique=True,
        error_messages={
            'unique': _('Ya existe una cuenta con este e-mail.'),
        }
    )

    # Nuevos campos para control de emails
    last_verification_sent = models.DateTimeField(null=True, blank=True, help_text="Última vez que se envió un email de verificación.")
    last_password_reset_sent = models.DateTimeField(null=True, blank=True, help_text="Última vez que se envió un email de recuperación de contraseña.")

    perfil_privado = models.BooleanField(default=False, help_text="Si está activado, solo tus amigos pueden ver tu perfil.")
    rol = models.CharField(max_length=20, choices=ROL_CHOICES, default="alumno")
    genero = models.CharField(max_length=10, choices=GENERO_CHOICES, default="hombre")
    
    fecha_nacimiento = models.DateField(null=True, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    localidad = models.CharField(max_length=100, blank=True)
    municipio = models.CharField(max_length=100, blank=True)

    onboarding_completado = models.BooleanField(default=False)

    foto_perfil = models.ImageField(
        upload_to="fotos_perfil/",
        blank=True,
        null=True,
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "webp"])],
        help_text="Foto de perfil del usuario."
    )

    # Activación por email
    is_active = models.BooleanField(default=False, help_text="El usuario debe activar su cuenta vía email.")

    def __str__(self):
        return self.username

    @property
    def is_verified(self):
        return self.is_active
class PushToken(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token = models.CharField(max_length=200)

    def __str__(self):
        return f"{self.user.username} - {self.token}"


class AlumnoPerfil(models.Model):
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    nivel = models.FloatField(default=0.0)
    mano_dominante = models.CharField(max_length=20, default="Derecha")
    posicion = models.CharField(max_length=20, default="Reves")

    fondo_pared = models.IntegerField(default=0)
    pared_fondo = models.IntegerField(default=0)
    pared = models.IntegerField(default=0)
    pared_lateral = models.IntegerField(default=0)

    resistencia = models.IntegerField(default=0)
    agilidad = models.IntegerField(default=0)
    coordinacion = models.IntegerField(default=0)
    tecnica = models.IntegerField(default=0)
    potencia = models.IntegerField(default=0)
    velocidad = models.IntegerField(default=0)

    defensa = models.IntegerField(default=0)
    ataque = models.IntegerField(default=0)

    globo = models.IntegerField(default=0)
    volea_natural = models.IntegerField(default=0)
    volea_reves = models.IntegerField(default=0)
    bandeja = models.IntegerField(default=0)
    vibora = models.IntegerField(default=0)
    remate = models.IntegerField(default=0)
    rulo = models.IntegerField(default=0)
    liftado = models.IntegerField(default=0)
    cortado = models.IntegerField(default=0)
    cambio_agarre = models.IntegerField(default=0)
    bote_pronto = models.IntegerField(default=0)
    x3 = models.IntegerField(default=0)
    x4 = models.IntegerField(default=0)
    dejada = models.IntegerField(default=0)
    chiquita = models.IntegerField(default=0)
    contrapared = models.IntegerField(default=0)
    contralateral = models.IntegerField(default=0)

    tactica = models.IntegerField(default=0, verbose_name="Táctica (General)")
    anticipacion = models.IntegerField(default=0, verbose_name="Anticipación")
    vision_juego = models.IntegerField(default=0, verbose_name="Visión de Juego")
    decisiones = models.IntegerField(default=0, verbose_name="Toma de Decisiones")

    concentracion = models.IntegerField(default=0, verbose_name="Concentración")
    serenidad = models.IntegerField(default=0, verbose_name="Serenidad")
    trabajo_equipo = models.IntegerField(default=0, verbose_name="Trabajo en Equipo")
    esfuerzo = models.IntegerField(default=0, verbose_name="Esfuerzo")
    regularidad = models.IntegerField(default=0, verbose_name="Regularidad")
    competitividad = models.IntegerField(default=0, verbose_name="Competitividad")
    gestion_error = models.IntegerField(default=0, verbose_name="Gestión del Error")
    comunicacion = models.IntegerField(default=0, verbose_name="Comunicación")

    caracteristicas = models.ManyToManyField("reservas.Caracteristica", blank=True, related_name="perfiles")

    def to_stats_dict(self):
        campos = [
            # Añadir los nombres de campos que quieras exportar
        ]
        return {c: getattr(self, c) for c in campos}

    def __str__(self):
        return f"Perfil de {self.usuario.username}"

    @property
    def total_clases(self):
        return self.usuario.reservas_alumno.filter(estado='realizada').count()

    @property
    def historial_fechas(self):
        return self.usuario.reservas_alumno.filter(estado='realizada').values_list('clase__fecha', flat=True)


class AlumnoPerfilEvolucion(models.Model):
    perfil = models.ForeignKey(AlumnoPerfil, on_delete=models.CASCADE, related_name="evoluciones")
    fecha = models.DateTimeField(auto_now_add=True)
    stats = models.JSONField()

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"Evolución {self.perfil.usuario.username} en {self.fecha.strftime('%d/%m/%Y %H:%M')}"
