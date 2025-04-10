# reservas/management/commands/cargar_caracts.py
from django.core.management.base import BaseCommand
from reservas.models import Caracteristica

class Command(BaseCommand):
    help = "Carga características iniciales en la base de datos."

    def handle(self, *args, **options):
        caracts = [
            "Vascula con el compañero",
            "Cubre bien el centro",
            "Débil en el paralelo",
            "Remata todo",
            "Tiende a no subir a red",
        ]
        for c in caracts:
            obj, created = Caracteristica.objects.get_or_create(nombre=c)
            if created:
                self.stdout.write(self.style.SUCCESS(f"Creada: {c}"))
            else:
                self.stdout.write(f"Ya existía: {c}")
