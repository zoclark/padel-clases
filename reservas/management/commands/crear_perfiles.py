from django.core.management.base import BaseCommand
from reservas.models import Usuario, AlumnoPerfil, Caracteristica
import random

class Command(BaseCommand):
    help = "Crea AlumnoPerfil para todos los usuarios y asigna características aleatorias si no tienen"

    def handle(self, *args, **kwargs):
        total_creados = 0
        total_actualizados = 0

        todas = list(Caracteristica.objects.all())
        if not todas:
            self.stdout.write(self.style.WARNING("⚠️ No hay características definidas en la base de datos."))
            return

        for user in Usuario.objects.all():
            perfil, creado = AlumnoPerfil.objects.get_or_create(usuario=user)

            if creado:
                total_creados += 1
                self.stdout.write(f"✅ Perfil creado: {user.username}")
            else:
                total_actualizados += 1

            if perfil.caracteristicas.count() == 0:
                seleccion = random.sample(todas, min(3, len(todas)))
                perfil.caracteristicas.set(seleccion)
                self.stdout.write(f"🎲 Asignadas características temporales a {user.username}: {[c.nombre for c in seleccion]}")

        self.stdout.write(self.style.SUCCESS(f"✅ {total_creados} perfiles creados, {total_actualizados} ya existían."))
