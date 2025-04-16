from django.contrib import admin
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from reservas.views import FrontendAppView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('reservas.urls')),
    re_path(r"^(?!admin|api|static|assets).*$", FrontendAppView.as_view(), name="frontend"),
]

# Solo sirve archivos estáticos localmente si DEBUG está activado
if settings.DEBUG and settings.STATICFILES_DIRS:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)