from django.core.mail import send_mail
from django.conf import settings
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator, PasswordResetTokenGenerator
from django.template.loader import render_to_string
import requests

from reservas.models import PushToken

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_verification_email(user, origen="web"):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    subject = "Activa tu cuenta en Metrik Padel"
    message = (
        f"Hola {user.username},\n\n"
        "Gracias por registrarte en Metrik Padel.\n\n"
        "Para activar tu cuenta:\n"
        f"- App: metrikpadel://activar-cuenta/{uid}/{token}\n"
        f"- Web: https://www.metrikpadel.com/activar-cuenta/{uid}/{token}\n\n"
        "Si no te registraste, puedes ignorar este correo.\n\n"
        "¡Nos vemos en la pista! 🎾"
    )

    html_message = render_to_string("email/verificacion.html", {
        "user": user,
        "uid": uid,
        "token": token,
    })

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
        html_message=html_message
    )


def send_reset_email(user, origen="web"):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = PasswordResetTokenGenerator().make_token(user)

    subject = "Restablecer tu contraseña en Metrik Padel"
    message = (
        f"Hola {user.username},\n\n"
        "Has solicitado restablecer tu contraseña en Metrik Padel.\n\n"
        "Puedes hacerlo con los siguientes enlaces:\n"
        f"- App: metrikpadel://reset-password/{uid}/{token}\n"
        f"- Web: https://www.metrikpadel.com/reset-password/{uid}/{token}\n\n"
        "Si no lo solicitaste, puedes ignorar este mensaje.\n\n"
        "¡Nos vemos en la pista! 🎾"
    )

    html_message = render_to_string("email/reset_password.html", {
        "user": user,
        "uid": uid,
        "token": token,
        "enlace_app": f"metrikpadel://reset-password/{uid}/{token}",
        "enlace_web": f"https://www.metrikpadel.com/reset-password/{uid}/{token}",
    })

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
        html_message=html_message
    )

    # 🔔 Notificación push (si tiene token)
    try:
        push_token = PushToken.objects.get(user=user).token
        payload = {
            "to": push_token,
            "sound": "default",
            "title": "🔐 Solicitud de recuperación",
            "body": "Has solicitado restablecer tu contraseña en Metrik Padel.",
        }
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        requests.post(EXPO_PUSH_URL, json=payload, headers=headers)
    except PushToken.DoesNotExist:
        pass
    except Exception as e:
        print("❌ Error al enviar push de recuperación:", e)

    return uid, token
