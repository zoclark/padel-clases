from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

# Usuario personalizado
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

    rol = models.CharField(max_length=20, choices=ROL_CHOICES, default="alumno")
    genero = models.CharField(max_length=10, choices=GENERO_CHOICES, default="hombre")

    # Nuevos campos personales
    fecha_nacimiento = models.DateField(null=True, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    localidad = models.CharField(max_length=100, blank=True)
    municipio = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.username

# Clase creada por un profesor
class Clase(models.Model):
    fecha = models.DateTimeField()
    profesor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='clases_dadas')
    descripcion = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.fecha} - {self.profesor.username}"

# Modelo de reserva de clases por un alumno
class Reserva(models.Model):
    TIPO_RESERVA_CHOICES = [
        ('individual', 'Individual'),
        ('pareja', 'Pareja'),
        ('grupal', 'Grupal'),
    ]

    alumno = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservas_alumno')
    clase = models.ForeignKey('Clase', on_delete=models.CASCADE)
    estado = models.CharField(max_length=20, choices=[
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('cancelada', 'Cancelada'),
        ('realizada', 'Realizada'),
    ])
    fecha_reserva = models.DateTimeField(auto_now_add=True)
    tipo_reserva = models.CharField(max_length=15, choices=TIPO_RESERVA_CHOICES, default='individual')
    hora_inicio = models.DateTimeField(default=timezone.now)
    hora_final = models.DateTimeField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.hora_final:
            self.hora_final = self.hora_inicio + timedelta(hours=1)
        super(Reserva, self).save(*args, **kwargs)

    def __str__(self):
        return f"Reserva de {self.alumno.username} para {self.clase.descripcion} ({self.estado})"

    @property
    def duracion(self):
        return (self.hora_final - self.hora_inicio).total_seconds() / 3600

# Reserva de caracteristicas del alumno
class Caracteristica(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre

# Perfil con habilidades del alumno
class AlumnoPerfil(models.Model):
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    nivel = models.IntegerField(default=0)
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

    caracteristicas = models.ManyToManyField(
        Caracteristica,
        blank=True,
        related_name="perfiles"
    )

    def __str__(self):
        return f"Perfil de {self.usuario.username}"

    @property
    def total_clases(self):
        return self.usuario.reservas_alumno.filter(estado='realizada').count()

    @property
    def historial_fechas(self):
        return self.usuario.reservas_alumno.filter(estado='realizada').values_list('clase__fecha', flat=True)

class TrainingSession(models.Model):
    alumno = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="training_sessions"
    )
    date = models.DateField(help_text="Fecha de la sesión de entrenamiento")
    details = models.TextField(help_text="Descripción de lo entrenado")
    teacher_comment = models.TextField(blank=True, null=True, help_text="Comentarios del profesor")
    session_type = models.CharField(max_length=50, blank=True, null=True, help_text="Tipo de sesión")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        verbose_name = "Sesión de Entrenamiento"
        verbose_name_plural = "Sesiones de Entrenamiento"

    def __str__(self):
        return f"Sesión de {self.alumno.username} en {self.date.strftime('%d/%m/%Y')}"

class RecursoAlumno(models.Model):
    alumno = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recursos_personalizados"
    )
    titulo = models.CharField(max_length=255)
    comentarios = models.TextField(blank=True, null=True)
    url = models.URLField()
    thumbnail = models.URLField(blank=True, null=True)
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    asignado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="recursos_asignados",
        help_text="Profesor que asignó el recurso"
    )

    class Meta:
        ordering = ['-fecha_asignacion']
        verbose_name = "Recurso asignado"
        verbose_name_plural = "Recursos asignados"

    def __str__(self):
        return f"{self.titulo} → {self.alumno.username}"

Usuario = get_user_model()

class Pozo(models.Model):
    titulo = models.CharField(
        max_length=100,
        verbose_name="Título del Pozo",
        blank=True,
        help_text="Nombre amigable para identificar este pozo"
    )
    TIPO_CHOICES = [
        ("mixto", "Mixto"),
        ("parejas", "Por Parejas"),
        ("hombres", "Solo Hombres"),
        ("mujeres", "Solo Mujeres"),
    ]
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    num_pistas = models.PositiveIntegerField(default=8)
    creado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"Pozo {self.fecha} ({self.tipo})"

class ParticipantePozo(models.Model):
    pozo = models.ForeignKey(Pozo, on_delete=models.CASCADE, related_name="participantes")
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    nombre = models.CharField(max_length=100)
    nivel = models.FloatField()  # de 0 a 5
    genero = models.CharField(max_length=10, choices=[("hombre", "Hombre"), ("mujer", "Mujer")])
    pista_fija = models.PositiveIntegerField(null=True, blank=True)
    mano_dominante = models.CharField(
        max_length=10,
        choices=[("diestro", "Diestro"), ("zurdo", "Zurdo")],
        default="diestro"
    )
    posicion = models.CharField(
        max_length=10,
        choices=[("reves", "Reves"), ("drive", "Drive"), ("ambos", "Ambos")],
        default="ambos"
    )

    # Relaciones nuevas:
    juega_con = models.ManyToManyField(
        "self", blank=True, symmetrical=False, related_name="es_pareja_de"
    )
    juega_contra = models.ManyToManyField(
        "self", blank=True, symmetrical=False, related_name="es_rival_de"
    )
    no_juega_con = models.ManyToManyField(
        "self", blank=True, symmetrical=False, related_name="no_debe_jugar_con"
    )
    no_juega_contra = models.ManyToManyField(
        "self", blank=True, symmetrical=False, related_name="no_debe_jugar_contra"
    )

    def __str__(self):
        return f"{self.nombre} - Nivel {self.nivel}"

class Afinidad(models.Model):
    participante = models.ForeignKey(ParticipantePozo, related_name="afinidades", on_delete=models.CASCADE)
    con_participante = models.ForeignKey(ParticipantePozo, related_name="evitado_por", on_delete=models.CASCADE)
    tipo = models.CharField(
        max_length=20,
        choices=[
            ("evitar", "Evitar totalmente"),
            ("evitar_pareja", "Evitar como pareja"),
            ("evitar_rival", "Evitar como rival"),
        ]
    )

    def __str__(self):
        return f"{self.participante} - NO {self.tipo} con {self.con_participante}"

class JugadorPozo(models.Model):
    pozo = models.ForeignKey(Pozo, on_delete=models.CASCADE, related_name="jugadores")
    nombre = models.CharField(max_length=100)
    nivel = models.PositiveIntegerField()
    registrado = models.BooleanField(default=False)
    afinidades_positivas = models.ManyToManyField("self", blank=True, symmetrical=False, related_name="afinidades_positivas_de")
    afinidades_negativas = models.ManyToManyField("self", blank=True, symmetrical=False, related_name="afinidades_negativas_de")

    def __str__(self):
        return f"{self.nombre} ({'Registrado' if self.registrado else 'Manual'})"
