from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
import random
from datetime import timedelta, date
from .models import (
    Usuario, AlumnoPerfil, TrainingSession, RecursoAlumno,
    Reserva, Pozo, ParticipantePozo, Afinidad, JugadorPozo
)
from .serializers import (
    AlumnoPerfilSerializer, TrainingSessionSerializer, RecursoAlumnoSerializer,
    ReservaSerializer, PozoSerializer, ParticipantePozoSerializer,
    AfinidadSerializer
)
from .serializers import UsuarioPerfilSerializer



# ================= REGISTRO Y PERFIL ===================
@api_view(["POST"])
def registro_usuario(request):
    datos = request.data
    try:
        if Usuario.objects.filter(username=datos.get("username")).exists():
            return Response({"error": "Usuario ya existe"}, status=400)

        usuario = Usuario.objects.create_user(
            username=datos["username"],
            email=datos["email"],
            password=datos["password"],
            rol="alumno"
        )
        print("✅ Usuario creado desde API:", usuario.username)
        return Response({"mensaje": f"Usuario '{usuario.username}' creado correctamente"}, status=201)

    except Exception as e:
        print("❌ Error en el registro:", e)
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def perfil_usuario(request):
    data = {
        "rol": request.user.rol,  # 👈 esto siempre
    }

    if request.user.rol == "alumno":
        try:
            perfil = AlumnoPerfil.objects.get(usuario=request.user)
            data.update(AlumnoPerfilSerializer(perfil).data)
        except AlumnoPerfil.DoesNotExist:
            data["error"] = "Perfil de alumno no encontrado"
    else:
        data.update(UsuarioPerfilSerializer(request.user).data)

    return Response(data)

# ================ ENTRENAMIENTOS =======================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def historial_entrenamientos(request):
    alumno = request.user
    if not TrainingSession.objects.filter(alumno=alumno).exists():
        for i in range(10):
            TrainingSession.objects.create(
                alumno=alumno,
                date=date.today() - timedelta(days=i * 7),
                details=random.choice([
                    "Sesión táctica", "Entrenamiento físico", "Juego con pareja",
                    "Defensa en pista", "Remates y voleas"
                ]),
                teacher_comment=random.choice([
                    "Buena actitud", "Debe mejorar el control",
                    "Excelente avance esta semana", None
                ]),
                session_type=random.choice(["individual", "grupo", "dúo"]),
            )
    sesiones = TrainingSession.objects.filter(alumno=alumno).order_by("-date")
    serializer = TrainingSessionSerializer(sesiones, many=True)
    return Response(serializer.data)

# ================ RECURSOS PERSONALIZADOS =============
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recursos_alumno(request):
    try:
        recursos = RecursoAlumno.objects.filter(alumno=request.user)
        serializer = RecursoAlumnoSerializer(recursos, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# ================ RESERVAS ============================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def obtener_reservas(request):
    reservas = Reserva.objects.filter(alumno=request.user)
    serializer = ReservaSerializer(reservas, many=True)
    return Response(serializer.data)

# ================= FRONTENDAPPVIEW ====================
from django.views.generic import View
from django.http import HttpResponse, HttpResponseServerError
from django.conf import settings
import os, traceback

class FrontendAppView(View):
    def get(self, request, *args, **kwargs):
        debug_value = os.getenv("DEBUG", "False").lower()
        is_debug = debug_value in ("true", "1", "yes")
        if is_debug and settings.STATICFILES_DIRS:
            index_path = os.path.join(settings.STATICFILES_DIRS[0], "index.html")
        else:
            index_path = os.path.join(settings.STATIC_ROOT, "index.html")
        print(f"📄 Sirviendo index desde: {index_path}")
        try:
            with open(index_path, encoding="utf-8") as f:
                return HttpResponse(f.read())
        except FileNotFoundError:
            print(f"❌ index.html no encontrado en {index_path}")
            return HttpResponseServerError(f"❌ index.html no encontrado<br>Esperado en: {index_path}")
        except Exception as e:
            print("❌ Error inesperado al cargar index.html:", e)
            traceback.print_exc()
            return HttpResponseServerError(f"❌ Error cargando index.html:<br>{e}")

# =================== POZOS ============================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listar_pozos(request):
    pozos = Pozo.objects.all()
    serializer = PozoSerializer(pozos, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_pozo(request):
    serializer = PozoSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(creado_por=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def participantes_pozo(request, pozo_id):
    participantes = ParticipantePozo.objects.filter(pozo_id=pozo_id)
    serializer = ParticipantePozoSerializer(participantes, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def agregar_participante(request):
    data = request.data.copy()

    # Si es un usuario registrado, sobreescribimos el género
    if request.user and request.user.is_authenticated:
        print("🧪 Usuario:", request.user.username)
        print("🧪 Género:", request.user.genero)
        data["usuario"] = request.user.id
        if not request.user.genero:
            return Response({"error": "Tu perfil no tiene género definido."}, status=400)
        data["genero"] = request.user.genero

    # Normaliza pista_fija
    if "pista_fija" in data and data["pista_fija"]:
        try:
            if int(data["pista_fija"]) < 1:
                data["pista_fija"] = None
        except ValueError:
            data["pista_fija"] = None

    serializer = ParticipantePozoSerializer(data=data)
    if serializer.is_valid():
        participante = serializer.save()

        JugadorPozo.objects.create(
            pozo=participante.pozo,
            nombre=participante.nombre,
            nivel=int(participante.nivel),
            registrado=bool(data.get("usuario"))
        )

        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def afinidades_usuario(request, usuario_id):
    afinidades = Afinidad.objects.filter(participante__usuario_id=usuario_id)
    serializer = AfinidadSerializer(afinidades, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_afinidad(request):
    serializer = AfinidadSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import ParticipantePozo
from .serializers import ParticipantePozoSerializer

@api_view(["PUT"])
def actualizar_participante(request, participante_id):
    try:
        participante = ParticipantePozo.objects.get(id=participante_id)
    except ParticipantePozo.DoesNotExist:
        return Response({"error": "Participante no encontrado"}, status=404)

    data = request.data.copy()

    # 🔒 También limpiamos pista_fija si es 0 o menor
    if "pista_fija" in data and data["pista_fija"]:
        try:
            if int(data["pista_fija"]) < 1:
                data["pista_fija"] = None
        except ValueError:
            data["pista_fija"] = None

    serializer = ParticipantePozoSerializer(participante, data=data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

@api_view(["DELETE"])
def eliminar_participante(request, participante_id):
    try:
        participante = ParticipantePozo.objects.get(id=participante_id)
    except ParticipantePozo.DoesNotExist:
        return Response({"error": "Participante no encontrado"}, status=404)

    participante.delete()
    return Response({"mensaje": "Participante eliminado"}, status=204)



@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def detalle_pozo(request, pozo_id):
    """
    GET  /api/pozos/<pozo_id>/     → detalle del pozo
    PUT  /api/pozos/<pozo_id>/     → reemplaza todos los campos editables
    PATCH /api/pozos/<pozo_id>/     → actualiza parcialmente
    """
    try:
        pozo = Pozo.objects.get(id=pozo_id)
    except Pozo.DoesNotExist:
        return Response({"error": "Pozo no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = PozoSerializer(pozo)
        return Response(serializer.data)

    # PUT o PATCH
    partial = (request.method == "PATCH")
    serializer = PozoSerializer(pozo, data=request.data, partial=partial)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# reservas/views.py  ⬇️  añádelo debajo de agregar_participante
import pandas as pd
from rest_framework.parsers import MultiPartParser

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def importar_participantes_excel(request, pozo_id):
    import pandas as pd

    try:
        pozo = Pozo.objects.get(id=pozo_id)
    except Pozo.DoesNotExist:
        return Response({"error": "Pozo no encontrado"}, status=404)

    file = request.FILES.get("file")
    print("📁 Nombre del fichero recibido:", file.name if file else "No recibido")
    if not file:
        return Response({"error": "Fichero no recibido"}, status=400)

    try:
        df = pd.read_excel(file)
        df.columns = [c.lower() for c in df.columns]
        print("📊 Columnas recibidas:", df.columns.tolist())
    except Exception as e:
        return Response({"error": f"Error leyendo Excel: {e}"}, status=400)

    expected = {"nombre", "nivel", "genero", "posicion", "mano_dominante", "pista_fija"}
    if not expected.issubset(set(df.columns)):
        return Response(
            {"error": f"Columnas requeridas: {', '.join(expected)}"},
            status=400,
        )

    capacidad = pozo.num_pistas * 4
    existentes = {p.nombre.lower(): p for p in ParticipantePozo.objects.filter(pozo=pozo)}
    nuevos = []

    for _, row in df.iterrows():
        try:
            # Normaliza y limpia strings a minúsculas (excepto nivel y pista_fija)
            nombre           = str(row.get("nombre", "")).strip().lower()
            genero           = str(row.get("genero", "hombre")).strip().lower()
            posicion         = str(row.get("posicion", "ambos")).strip().lower()
            mano_dominante   = str(row.get("mano_dominante", "diestro")).strip().lower()

            if not nombre:
                continue

            pista_fija = row.get("pista_fija")
            pista_fija = int(pista_fija) if pd.notnull(pista_fija) and str(pista_fija).strip() != "" else None

            nivel = int(row.get("nivel", 0) or 0)

            # Validación defensiva (opcional)
            if genero not in ["hombre", "mujer"]:
                genero = "hombre"
            if posicion not in ["reves", "drive", "ambos"]:
                posicion = "ambos"
            if mano_dominante not in ["diestro", "zurdo"]:
                mano_dominante = "diestro"

            datos = dict(
                pozo=pozo,
                nombre=nombre,
                nivel=nivel,
                genero=genero,
                posicion=posicion,
                mano_dominante=mano_dominante,
                pista_fija=pista_fija,
            )

            p_exist = existentes.get(nombre.lower())
            if p_exist:
                for k, v in datos.items():
                    setattr(p_exist, k, v)
                p_exist.save()
            else:
                nuevos.append(datos)

        except Exception as e:
            print(f"❌ Error procesando fila {row.to_dict()}: {e}")
            return Response({"error": f"Error en fila '{row.get('nombre', '')}': {e}"}, status=400)


    if len(existentes) + len(nuevos) > capacidad:
        return Response(
            {"error": f"Excede la capacidad del pozo ({capacidad})."},
            status=400,
        )

    ParticipantePozo.objects.bulk_create(
        [ParticipantePozo(**d) for d in nuevos]
    )

    serializer = ParticipantePozoSerializer(
        ParticipantePozo.objects.filter(pozo=pozo), many=True
    )
    return Response(serializer.data, status=201)
