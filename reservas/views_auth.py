# reservas/views_auth.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from .models import Usuario
from reservas.utils_email import send_verification_email

class RegistroConVerificacionView(APIView):
    def post(self, request):
        data = request.data
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        origen = data.get("origen", "web")  # "web" por defecto

        if Usuario.objects.filter(username=username).exists():
            return Response({"detail": "El usuario ya existe."}, status=400)
        if Usuario.objects.filter(email=email).exists():
            return Response({"detail": "El email ya está registrado."}, status=400)

        usuario = Usuario.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_active=False
        )

        send_verification_email(usuario, origen)

        return Response({"detail": "Se ha enviado un email de activación."}, status=201)
class ActivarCuentaView(APIView):
    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            usuario = Usuario.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            return Response({"detail": "Enlace inválido."}, status=400)

        if default_token_generator.check_token(usuario, token):
            usuario.is_active = True
            usuario.save()
            return Response({"detail": "Cuenta activada correctamente. Ya puedes iniciar sesión."})
        else:
            return Response({"detail": "Token inválido o expirado."}, status=400)
