import random
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Usuario, AlumnoPerfil, TrainingSession
from datetime import timedelta, date


@receiver(post_save, sender=Usuario)
def crear_perfil_alumno(sender, instance, created, **kwargs):
    if created and instance.rol == 'alumno':
        # Generar estadísticas aleatorias entre 30 y 80
        perfil = AlumnoPerfil.objects.create(
            usuario=instance,
            nivel=random.randint(1, 5),
            fisico=random.randint(40, 90),
            pies=random.randint(40, 90),
            defensa=random.randint(40, 90),
            ataque=random.randint(40, 90),
            globo=random.randint(30, 80),
            bandeja=random.randint(30, 80),
            vibora=random.randint(30, 80),
            remate=random.randint(30, 80),
            rulo=random.randint(30, 80),
            liftado=random.randint(30, 80),
            cortado=random.randint(30, 80),
            paredes=random.randint(30, 80),
            fondo_pared=random.randint(30, 80),
            pared_fondo=random.randint(30, 80),
            x3=random.randint(30, 80),
            x4=random.randint(30, 80),
            coordinacion=random.randint(30, 80),
            cambio_de_agarre=random.randint(30, 80)
        )

        # Opcional: generar 8 sesiones de entrenamiento pasadas
        for i in range(8):
            TrainingSession.objects.create(
                alumno=instance,
                date=date.today() - timedelta(days=i * 7),
                details=random.choice([
                    "Trabajo de defensa", "Remates potentes", "Sesión técnica", "Físico y movilidad"
                ]),
                teacher_comment=random.choice([
                    "Buen ritmo", "Excelente ejecución", "Revisar el posicionamiento", ""
                ]),
                session_type=random.choice(["individual", "grupo", "duo"])
            )