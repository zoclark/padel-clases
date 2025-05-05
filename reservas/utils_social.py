from .models import Amistad

def son_amigos(user1, user2):
    return Amistad.objects.filter(
        de_usuario=user1, a_usuario=user2, estado="aceptada"
    ).exists() or Amistad.objects.filter(
        de_usuario=user2, a_usuario=user1, estado="aceptada"
    ).exists()

def puede_ver_perfil(solicitante, objetivo):
    if not objetivo.perfil_privado:
        return True
    return son_amigos(solicitante, objetivo)