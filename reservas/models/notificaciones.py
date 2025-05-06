from django.db import models
from django.conf import settings
from django.db.models import JSONField  # si usas Django < 3.1, usa: from django.contrib.postgres.fields import JSONField

class Notificacion(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notificaciones")
    titulo = models.CharField(max_length=255)
    cuerpo = models.TextField()
    tipo = models.CharField(max_length=50, blank=True, null=True)  # ej: "amistad"
    leida = models.BooleanField(default=False)
    fecha = models.DateTimeField(auto_now_add=True)
    extra = JSONField(null=True, blank=True)  # ✅ NUEVO CAMPO

    def __str__(self):
        return f"[{self.tipo or 'notificación'}] {self.titulo} → {self.usuario.username}"
