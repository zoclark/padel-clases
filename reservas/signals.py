import random
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Usuario, AlumnoPerfil, TrainingSession
from datetime import timedelta, date


@receiver(post_save, sender=Usuario)
def crear_perfil_alumno(sender, instance, created, **kwargs):
    if created and instance.rol == 'alumno':
        AlumnoPerfil.objects.create(
            usuario=instance,
            nivel=random.randint(1, 5),
            mano_dominante=random.choice(["Derecha", "Izquierda"]),
            posicion=random.choice(["Reves", "Drive"]),

            resistencia=random.randint(50, 100),
            agilidad=random.randint(50, 100),
            coordinacion=random.randint(50, 100),
            tecnica=random.randint(50, 100),
            velocidad=random.randint(50, 100),
            potencia=random.randint(50, 100),

            globo=random.randint(50, 100),
            volea_natural=random.randint(50, 100),
            volea_reves=random.randint(50, 100),
            bandeja=random.randint(50, 100),
            vibora=random.randint(50, 100),
            remate=random.randint(50, 100),
            rulo=random.randint(50, 100),
            bote_pronto=random.randint(50, 100),
            dejada=random.randint(50, 100),
            chiquita=random.randint(50, 100),

            ataque=random.randint(50, 100),
            defensa=random.randint(50, 100),
            pared=random.randint(50, 100),
            pared_lateral=random.randint(50, 100),
            pared_fondo=random.randint(50, 100),
            fondo_pared=random.randint(50, 100),

            cambio_agarre=random.randint(50, 100),
            liftado=random.randint(50, 100),
            cortado=random.randint(50, 100),
            x3=random.randint(50, 100),
            x4=random.randint(50, 100),
            contrapared=random.randint(50, 100),
            contralateral=random.randint(50, 100),
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