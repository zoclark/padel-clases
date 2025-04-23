STATS_LIST = [
    # Todas tus stats aquí, por ejemplo:
    "fondo_pared", "pared_fondo", "pared", "pared_lateral",
    "resistencia", "agilidad", "coordinacion", "tecnica", "potencia", "velocidad",
    "defensa", "ataque",
    "globo", "volea_natural", "volea_reves", "bandeja", "vibora", "remate", "rulo", "liftado", "cortado",
    "cambio_agarre", "bote_pronto", "x3", "x4", "dejada", "chiquita", "contrapared", "contralateral",
    "tactica", "anticipacion", "vision_juego", "decisiones",
    "concentracion", "serenidad", "trabajo_equipo", "esfuerzo", "regularidad", "competitividad", "gestion_error", "comunicacion"
]

# Configuración de pool y rangos por nivel (índice = nivel)
LEVEL_POOLS = [320, 480, 640, 800, 960, 1120]  # 0..5
LEVEL_MIN =   [0,   5,   10,  20,  30,  40 ]
LEVEL_MAX =   [15, 30,   50,  70,  90, 100 ]

def get_stats_list():
    return STATS_LIST.copy()

def get_level_ranges(level):
    """Devuelve (pool, min_stat, max_stat) para un nivel concreto"""
    nivel_entero = max(0, min(5, int(float(level))))
    pool = LEVEL_POOLS[nivel_entero]
    min_stat = LEVEL_MIN[nivel_entero]
    max_stat = LEVEL_MAX[nivel_entero]
    return pool, min_stat, max_stat

def get_pool_for_level(level):
    """Devuelve el pool total de puntos según el nivel (puedes usar en tu view)"""
    pool, _, _ = get_level_ranges(level)
    return pool

def validate_stats(level, stats_dict):
    """Recibe un nivel y un dict con stats, devuelve lista de incoherencias/alertas."""
    pool, min_stat, max_stat = get_level_ranges(level)
    alerts = []

    # Suma total de stats
    total = sum(stats_dict.get(k, 0) for k in STATS_LIST)

    if total > pool:
        alerts.append(f"Superas el máximo de puntos ({total}/{pool}) para el nivel {level:.2f}.")

    # Stats fuera de rango individual
    for stat in STATS_LIST:
        val = stats_dict.get(stat, 0)
        if val < min_stat or val > max_stat:
            alerts.append(f"{stat}: {val} está fuera del rango permitido para nivel {level:.2f} ({min_stat}-{max_stat}).")

    # Chequeo de descompensación excesiva
    num_max = sum(1 for k in STATS_LIST if stats_dict.get(k,0) == max_stat)
    if num_max > len(STATS_LIST) * 0.2:
        alerts.append(
            f"Tienes demasiadas stats al máximo permitido para tu nivel ({num_max} de {len(STATS_LIST)}). " +
            "Revisa la distribución: no es coherente que sobresalgas en tantas áreas a la vez."
        )

    # Chequeo de diferencia máxima entre stats (opcional)
    max_value = max(stats_dict.get(k, 0) for k in STATS_LIST)
    min_value = min(stats_dict.get(k, 0) for k in STATS_LIST)
    if max_value - min_value > max_stat * 0.8:
        alerts.append(
            f"Demasiada diferencia entre tus stats más alta ({max_value}) y más baja ({min_value}) para tu nivel."
        )

    # Puedes añadir más reglas si lo deseas

    return alerts

# Helper para descripciones por rango (puedes usarlo en tu frontend/backend)
def get_level_description(nivel):
    nivel = int(float(nivel))
    descripciones = {
        0: "Paquete absoluto (nivel 0). Nunca ha jugado o no sabe reglas.",
        1: "Nuevo o nivel bajo. Juega ocasionalmente, poca experiencia.",
        2: "Jugador en progreso: ya juega normalmente, empieza a mejorar, pero le queda mucho recorrido.",
        3: "Jugador bueno y consistente. Devuelve casi todas, pero le faltan winners o pelotas imposibles.",
        4: "Jugador avanzado: muy apto, aún con margen de mejora en algunos aspectos.",
        5: "Nivel pro: domina prácticamente todos los aspectos del juego.",
    }
    return descripciones.get(nivel, "Nivel desconocido")

# Ejemplo de uso rápido
if __name__ == "__main__":
    stats = {k: 30 for k in STATS_LIST}
    stats["velocidad"] = 70  # Prueba
    level = 2
    print(validate_stats(level, stats))
    print(get_level_description(level))