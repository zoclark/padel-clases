# reservas/views/frontend.py

from django.views.generic import View
from django.http import HttpResponse, HttpResponseServerError
from django.conf import settings
import os

class FrontendAppView(View):
    def get(self, request, *args, **kwargs):
        debug_value = os.getenv("DEBUG", "False").lower()
        is_debug = debug_value in ("true", "1", "yes")

        if is_debug and settings.STATICFILES_DIRS:
            index_path = os.path.join(settings.STATICFILES_DIRS[0], "index.html")
        else:
            index_path = os.path.join(settings.STATIC_ROOT, "index.html")

        try:
            with open(index_path, encoding="utf-8") as f:
                return HttpResponse(f.read())
        except Exception as e:
            return HttpResponseServerError(f"❌ Error cargando index.html:<br>{e}")
