from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model

Usuario = get_user_model()


class Pozo(models.Model):
    titulo = models.CharField(max_length=100, verbose_name="Título del Pozo", blank=True)
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
    nivel = models.FloatField()
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

    juega_con = models.ManyToManyField("self", blank=True, symmetrical=False, related_name="es_pareja_de")
    juega_contra = models.ManyToManyField("self", blank=True, symmetrical=False, related_name="es_rival_de")
    no_juega_con = models.ManyToManyField("self", blank=True, symmetrical=False, related_name="no_debe_jugar_con")
    no_juega_contra = models.ManyToManyField("self", blank=True, symmetrical=False, related_name="no_debe_jugar_contra")
    es_organizador = models.BooleanField(default=False)

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
