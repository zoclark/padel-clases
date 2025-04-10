from django.apps import AppConfig

class ReservasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'reservas'

    def ready(self):
        import reservas.signals  # 👈 esto es clave