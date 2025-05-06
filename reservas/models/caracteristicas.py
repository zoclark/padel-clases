from django.db import models
from django.conf import settings


class Caracteristica(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre




