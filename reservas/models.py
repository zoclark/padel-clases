from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser

# Usuario personalizado
class Usuario(AbstractUser):
    ROLES = (
        ('alumno', 'Alumno'),
        ('profesor', 'Profesor'),
    )
    rol = models.CharField(max_length=10, choices=ROLES)

# Clase creada por un profesor
class Clase(models.Model):
    fecha = models.DateTimeField()
    profesor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='clases_dadas')
    descripcion = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.fecha} - {self.profesor.username}"

# Reserva de clase por un alumno
class Reserva(models.Model):
    alumno = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservas_alumno')
    clase = models.ForeignKey(Clase, on_delete=models.CASCADE)
    estado = models.CharField(max_length=20, choices=[
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('cancelada', 'Cancelada'),
        ('realizada', 'Realizada'),
    ])
    fecha_reserva = models.DateTimeField(auto_now_add=True)

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

    # Nuevo campo:
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
    session_type = models.CharField(max_length=50, blank=True, null=True, help_text="Tipo de sesión (por ejemplo, individual, dúo, grupal)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
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
    descripcion = models.CharField(max_length=255)
    url = models.URLField()
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    asignado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recursos_asignados",
        help_text="Profesor que asignó el recurso"
    )

    class Meta:
        ordering = ['-fecha_asignacion']
        verbose_name = "Recurso asignado"
        verbose_name_plural = "Recursos asignados"

    def __str__(self):
        return f"{self.descripcion} → {self.alumno.username}"

