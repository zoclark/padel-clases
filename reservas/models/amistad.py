from django.db import models
from django.conf import settings


class Amistad(models.Model):
    de_usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="amistades_enviadas"
    )
    a_usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="amistades_recibidas"
    )
    estado = models.CharField(
        max_length=10,
        choices=[
            ("pendiente", "Pendiente"),
            ("aceptada", "Aceptada"),
            ("bloqueada", "Bloqueada")
        ],
        default="pendiente"
    )
    fecha_solicitud = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("de_usuario", "a_usuario")
        verbose_name = "Amistad"
        verbose_name_plural = "Amistades"

    def __str__(self):
        return f"{self.de_usuario.username} → {self.a_usuario.username} ({self.estado})"
