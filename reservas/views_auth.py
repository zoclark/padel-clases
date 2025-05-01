# reservas/views_auth.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_str, force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from reservas.models import Usuario, PushToken
from reservas.utils_email import send_verification_email
import requests

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

class RegistroConVerificacionView(APIView):
    def post(self, request):
        data = request.data
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        origen = data.get("origen", "web")

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

        return Response({
            "detail": "Se ha enviado un email de activación.",
            "email": usuario.email,
            "uid": urlsafe_base64_encode(force_bytes(usuario.pk)),
            "token": default_token_generator.make_token(usuario)
        }, status=201)


class ActivarCuentaView(APIView):
    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            usuario = Usuario.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            return Response({"detail": "Enlace inválido."}, status=400)

        if usuario.is_active:
            return Response({"detail": "Esta cuenta ya está activada."})

        if default_token_generator.check_token(usuario, token):
            usuario.is_active = True
            usuario.save()

            # Notificación push si hay token registrado
            try:
                push_token = PushToken.objects.get(user=usuario).token
                payload = {
    "to": push_token,
    "sound": "default",
    "title": "✅ Cuenta activada",
    "body": "Tu cuenta ha sido verificada correctamente. ¡Ya puedes usar la app!",
    "data": {
        "verificada": True
    }
}
                headers = {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                }
                requests.post(EXPO_PUSH_URL, json=payload, headers=headers)
            except PushToken.DoesNotExist:
                pass
            except Exception as e:
                print("❌ Error enviando push tras activación:", e)

            return Response({"detail": "Cuenta activada correctamente. Ya puedes iniciar sesión."})

        return Response({"detail": "Token inválido o expirado."}, status=400)
