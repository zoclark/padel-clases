from typing import List, Dict, Any, Tuple
import itertools

Player = Dict[str, Any]
Match  = Dict[str, Any]

def generar_emparejamientos(
    jugadores: List[Player],
    num_pistas: int,
    tipo_pozo: str
) -> List[Match]:
    # --- 1) Asignar pistas fijas (parejas con pista_fija) ---
    pistas: List[List[Tuple[Player, Player]]] = [[] for _ in range(num_pistas)]
    usados = set()
    for p in jugadores:
        if p["id"] in usados: continue
        if p.get("juega_con"):
            compañero_id = p["juega_con"][0]
            pareja = next((q for q in jugadores if q["id"]==compañero_id), None)
            pista = p.get("pista_fija") or pareja.get("pista_fija")
            if pareja and pista:
                idx = pista - 1
                if 0 <= idx < num_pistas and len(pistas[idx])<1:
                    pistas[idx].append((p, pareja))
                    usados |= {p["id"], pareja["id"]}

    # --- 2) Forzar juega_contra en pistas fijas también ---
    for p in jugadores:
        for rival_id in p.get("juega_contra", []):
            if p["id"] in usados and rival_id in usados:
                continue

    # --- 3) Emparejar libres ---
    libres = [p for p in jugadores if p["id"] not in usados]
    parejas_libres = _emparejar_libres(libres, tipo_pozo)

    # --- 4) Rellenar pistas vacías con parejas_libres, por nivel medio descendente ---
    parejas_libres.sort(key=lambda ab: -((ab[0]["nivel"]+ab[1]["nivel"])/2))
    idx = 0
    for pista in pistas:
        while len(pista) < 2 and idx < len(parejas_libres):
            pista.append(parejas_libres[idx])
            idx += 1

    # --- 5) Formatear resultado ---
    return _formatea_salida(pistas)


def _emparejar_libres(libres: List[Player], tipo_pozo: str) -> List[Tuple[Player,Player]]:
    candidatos = []
    for a, b in itertools.combinations(libres, 2):
        if _conflicto_total(a, b): continue
        penal = _penalizacion(a, b, tipo_pozo)
        avg   = (a["nivel"] + b["nivel"])/2
        candidatos.append((penal, -avg, (a,b)))

    candidatos.sort()
    parejas = []
    usados = set()
    for _, _, (a,b) in candidatos:
        if a["id"] in usados or b["id"] in usados:
            continue
        parejas.append((a,b))
        usados |= {a["id"], b["id"]}
    return parejas


def _conflicto_total(a: Player, b: Player) -> bool:
    if b["id"] in a.get("no_juega_con", []) or a["id"] in b.get("no_juega_con", []):
        return True
    if b["id"] in a.get("no_juega_contra", []) or a["id"] in b.get("no_juega_contra", []):
        return True
    pf_a, pf_b = a.get("pista_fija"), b.get("pista_fija")
    if pf_a and pf_b and pf_a != pf_b:
        return True
    return False


def _penalizacion(a: Player, b: Player, tipo_pozo: str) -> float:
    pen = 0
    if tipo_pozo == "mixto" and a["genero"] == b["genero"]:
        pen += 100
    if a["mano_dominante"]=="zurdo" and b["mano_dominante"]=="zurdo":
        pen += 1
    if a["posicion"] == b["posicion"] and a["posicion"] in ("drive","reves"):
        pen += 1
    if abs(a["nivel"] - b["nivel"]) > 1:
        pen += abs(a["nivel"] - b["nivel"])*10
    return pen


def _formatea_salida(
    pistas: List[List[Tuple[Player,Player]]]
) -> List[Dict[str,Any]]:
    output = []
    for i, parejas in enumerate(pistas):
        if len(parejas) < 2:
            continue
        a1, a2 = parejas[0]
        b1, b2 = parejas[1]
        totA = a1["nivel"]+a2["nivel"]
        totB = b1["nivel"]+b2["nivel"]
        avgA = totA/2
        avgB = totB/2
        output.append({
            "pista": i+1,
            "teams": [[a1["nombre"], a2["nombre"]], [b1["nombre"], b2["nombre"]]],
            "totals": [totA, totB],
            "avgs":   [avgA, avgB],
            "diffAvg": abs(avgA-avgB),
            "diffTot": abs(totA-totB),
            "avisos": []
        })
    return output
