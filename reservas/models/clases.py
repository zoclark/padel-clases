from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class Clase(models.Model):
    fecha = models.DateTimeField()
    profesor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='clases_dadas'
    )
    descripcion = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.fecha} - {self.profesor.username}"


class Reserva(models.Model):
    TIPO_RESERVA_CHOICES = [
        ('individual', 'Individual'),
        ('pareja', 'Pareja'),
        ('grupal', 'Grupal'),
    ]

    alumno = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reservas_alumno'
    )
    clase = models.ForeignKey('Clase', on_delete=models.CASCADE)
    estado = models.CharField(
        max_length=20,
        choices=[
            ('pendiente', 'Pendiente'),
            ('confirmada', 'Confirmada'),
            ('cancelada', 'Cancelada'),
            ('realizada', 'Realizada'),
        ]
    )
    fecha_reserva = models.DateTimeField(auto_now_add=True)
    tipo_reserva = models.CharField(max_length=15, choices=TIPO_RESERVA_CHOICES, default='individual')
    hora_inicio = models.DateTimeField(default=timezone.now)
    hora_final = models.DateTimeField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.hora_final:
            self.hora_final = self.hora_inicio + timedelta(hours=1)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Reserva de {self.alumno.username} para {self.clase.descripcion or self.clase.fecha} ({self.estado})"

    @property
    def duracion(self):
        return (self.hora_final - self.hora_inicio).total_seconds() / 3600


class TrainingSession(models.Model):
    alumno = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="training_sessions"
    )
    date = models.DateField()
    details = models.TextField()
    teacher_comment = models.TextField(blank=True, null=True)
    session_type = models.CharField(max_length=50, blank=True, null=True)
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
        related_name="recursos_asignados"
    )

    class Meta:
        ordering = ['-fecha_asignacion']
        verbose_name = "Recurso asignado"
        verbose_name_plural = "Recursos asignados"

    def __str__(self):
        return f"{self.titulo} → {self.alumno.username}"
