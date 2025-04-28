# pairings.py
from typing import List, Dict, Any, Tuple, Optional, Set
import itertools
import random

# --- Tipos ---
Player = Dict[str, Any]
Match = Dict[str, Any]
Pair = Tuple[Player, Player]
Court = List[Pair]

# --- Constantes (Ajustables) ---
PENALTY_GENDER_MISMATCH_MIXTO = 100
PENALTY_POSITION_CLASH = 10
PENALTY_ZURDO_CLASH = 10
PENALTY_LEVEL_DIFF_PAIR = 50
PENALTY_LEVEL_DIFF_MATCH = 1

# --- Funciones Auxiliares ---

def calculate_pair_avg_level(pair: Pair) -> float:
    """Calcula el nivel medio de una pareja."""
    p1 = pair[0]
    p2 = pair[1]
    # Asegurarse de que los niveles son numéricos
    nivel1 = float(p1.get('nivel', 0))
    nivel2 = float(p2.get('nivel', 0))
    return (nivel1 + nivel2) / 2.0


def check_conflict(p1: Player, p2: Player, relation_type: str) -> bool:
    """Verifica un conflicto de relación específico."""
    return p2['id'] in p1.get(relation_type, []) or p1['id'] in p2.get(relation_type, [])

def check_all_conflicts_pair(p1: Player, p2: Player) -> bool:
    """Verifica si dos jugadores NO pueden ser pareja."""
    if check_conflict(p1, p2, 'no_juega_con'):
        return True
    if p1.get('pista_fija') and p2.get('pista_fija') and p1['pista_fija'] != p2['pista_fija']:
        return True
    return False

def check_all_conflicts_match(p1: Player, p2: Player, p3: Player, p4: Player) -> bool:
    """Verifica si 4 jugadores propuestos para un partido tienen conflictos graves."""
    players = [p1, p2, p3, p4]
    pairs_in_match = [(p1, p2), (p3, p4)] # Asume p1/p2 son pareja A, p3/p4 son pareja B

    for i in range(4):
        for j in range(i + 1, 4):
            player_a = players[i]
            player_b = players[j]

            # Determinar si son compañeros o rivales en esta propuesta
            are_partners = any((player_a in pair and player_b in pair) for pair in pairs_in_match)

            # Conflicto "No jugar contra" entre RIVALES propuestos
            if not are_partners and check_conflict(player_a, player_b, 'no_juega_contra'):
                 print(f"    -> Conflicto MATCH: {player_a['nombre']} NO JUEGA CONTRA {player_b['nombre']}")
                 return True

            # Caso especial: No Jugar con Y No jugar contra (NUNCA en la misma pista)
            if check_conflict(player_a, player_b, 'no_juega_con') and \
               check_conflict(player_a, player_b, 'no_juega_contra'):
               print(f"    -> Conflicto MATCH (Especial): {player_a['nombre']} y {player_b['nombre']} no pueden compartir pista.")
               return True
    return False


def calculate_pair_penalty(p1: Player, p2: Player, tipo_pozo: str) -> float:
    """Calcula penalizaciones internas de una pareja."""
    penalty = 0
    nivel1 = float(p1.get('nivel', 0)) # Asegurar float
    nivel2 = float(p2.get('nivel', 0)) # Asegurar float

    if tipo_pozo == "mixto" and p1.get('genero') == p2.get('genero'):
        penalty += PENALTY_GENDER_MISMATCH_MIXTO
    if p1.get('mano_dominante') == 'zurdo' and p2.get('mano_dominante') == 'zurdo':
        penalty += PENALTY_ZURDO_CLASH
    pos1, pos2 = p1.get('posicion'), p2.get('posicion')
    if pos1 != 'ambos' and pos1 == pos2:
        penalty += PENALTY_POSITION_CLASH
    # Penalización por diferencia de nivel *dentro* de la pareja
    if abs(nivel1 - nivel2) > 1.0:
         penalty += PENALTY_LEVEL_DIFF_PAIR * abs(nivel1 - nivel2)
    return penalty

def calculate_match_balance_score(pair1: Pair, pair2: Pair) -> float:
    """Calcula el desequilibrio de un partido (menor es mejor)."""
    avg1 = calculate_pair_avg_level(pair1)
    avg2 = calculate_pair_avg_level(pair2)
    return abs(avg1 - avg2)

# --- Función Principal ---

def generar_emparejamientos(
    jugadores: List[Player],
    num_pistas: int,
    tipo_pozo: str
) -> List[Match]:

    print(f"--- Iniciando Emparejamiento ---")
    print(f"Jugadores: {len(jugadores)}, Pistas: {num_pistas}, Tipo: {tipo_pozo}")

    required_players = num_pistas * 4
    if len(jugadores) != required_players:
        print(f"ALERTA: Se requieren {required_players} jugadores, pero hay {len(jugadores)}.")
        # Considerar devolver error o intentar llenar lo posible. Asumiendo error por ahora.
        # raise ValueError(f"Número incorrecto de jugadores. Se necesitan {required_players}.")
        # O intentar llenar pistas... (lógica más compleja no implementada aquí)

    assigned_player_ids: Set[int] = set()
    fixed_court_assignments: Dict[int, Dict[str, Any]] = {i + 1: {"pairs": [], "singles": []} for i in range(num_pistas)}
    jugadores_dict = {p['id']: p for p in jugadores}

    # --- FASE 1: Pistas Fijas y juega_con ---
    print("\nFASE 1: Procesando Pistas Fijas y juega_con...")
    for p in sorted(jugadores, key=lambda x: x.get('pista_fija') or float('inf')): # Procesar fijos primero
        player_id = p['id']
        if player_id in assigned_player_ids: continue

        fixed_court_num = p.get('pista_fija')
        juega_con_ids = p.get('juega_con', [])

        if fixed_court_num:
            # Si tiene pista fija Y juega_con definido
            if juega_con_ids:
                partner_id = juega_con_ids[0]
                partner = jugadores_dict.get(partner_id)
                if partner and partner_id not in assigned_player_ids:
                    if partner.get('pista_fija') and partner['pista_fija'] != fixed_court_num:
                        print(f"ERROR CRÍTICO: Conflicto pista fija entre {p['nombre']} y {partner['nombre']}")
                        continue
                    if check_all_conflicts_pair(p, partner):
                         print(f"ERROR CRÍTICO: Conflicto pareja fija {p['nombre']} y {partner['nombre']}")
                         continue

                    pair = tuple(sorted((p, partner), key=lambda x: x['id'])) # Ordenar para consistencia
                    if len(fixed_court_assignments[fixed_court_num]['pairs']) < 2:
                        fixed_court_assignments[fixed_court_num]['pairs'].append(pair)
                        assigned_player_ids.add(player_id)
                        assigned_player_ids.add(partner_id)
                        print(f"  Asignada pareja fija ({p['nombre']}, {partner['nombre']}) a Pista {fixed_court_num}")
                    else:
                        print(f"ERROR: Pista fija {fixed_court_num} ya llena de parejas.")

                elif partner_id in assigned_player_ids:
                     print(f"  WARN: Compañero fijo {partner_id} de {p['nombre']} ya asignado en otro lugar.")
                # else: partner not found (handled implicitly)

            # Si tiene pista fija pero NO juega_con definido
            else:
                if len(fixed_court_assignments[fixed_court_num]['singles']) + len(fixed_court_assignments[fixed_court_num]['pairs'])*2 < 4:
                     fixed_court_assignments[fixed_court_num]['singles'].append(p)
                     assigned_player_ids.add(player_id)
                     print(f"  Asignado jugador solo {p['nombre']} a Pista {fixed_court_num}")
                else:
                     print(f"ERROR: Pista fija {fixed_court_num} ya llena.")
        # else: sin pista fija (se maneja después)


    # --- FASE 2: Validaciones juega_contra en pistas fijas ---
    # (Simplificado: Solo validación, la asignación real ocurre en Fase 3)
    print("\nFASE 2: Validando juega_contra en Pistas Fijas...")
    # ... (Código de validación como estaba antes, solo imprime warnings/errors si hay conflictos obvios) ...
    # ... Ejemplo: A (fija 1) vs C (fija 2) -> ERROR ...


    # --- FASE 3: Asignación Global ---
    print("\nFASE 3: Asignación Global...")
    remaining_players = [p for p in jugadores if p['id'] not in assigned_player_ids]
    court_assignments: List[List[Pair]] = [[] for _ in range(num_pistas)]

    # Poner parejas/singles fijos en la estructura final de asignación
    for court_num, assignment in fixed_court_assignments.items():
        court_idx = court_num - 1
        for pair in assignment['pairs']:
            court_assignments[court_idx].append(pair)
        # Aquí necesitarás manejar los 'singles' fijos para encontrarles pareja/rivales


    # Generar parejas potenciales válidas con los restantes
    potential_pairs: List[Tuple[float, Pair]] = []
    mandatory_pairs_found_ids = set() # Para asegurar que parejas obligatorias se forman

    # Prioridad 1: Parejas obligatorias ('juega_con')
    for p1 in remaining_players:
        if p1['id'] in mandatory_pairs_found_ids: continue
        juega_con_ids = p1.get('juega_con', [])
        if juega_con_ids:
            partner_id = juega_con_ids[0]
            partner = jugadores_dict.get(partner_id)
            if partner and partner['id'] in [p['id'] for p in remaining_players] and partner_id not in mandatory_pairs_found_ids:
                 if check_all_conflicts_pair(p1, partner):
                      print(f"ERROR CRÍTICO: Conflicto en pareja obligatoria restante: {p1['nombre']} y {partner['nombre']}")
                      continue # O manejar error de otra forma

                 pair = tuple(sorted((p1, partner), key=lambda x: x['id']))
                 penalty = calculate_pair_penalty(p1, partner, tipo_pozo)
                 potential_pairs.append((-float('inf'), pair)) # Score muy bajo para alta prioridad
                 mandatory_pairs_found_ids.add(p1['id'])
                 mandatory_pairs_found_ids.add(partner_id)
                 print(f"  Encontrada pareja obligatoria restante: ({p1['nombre']}, {partner['nombre']})")


    # Prioridad 2: Resto de combinaciones posibles
    processed_in_combinations = set() # Para no duplicar con las obligatorias
    for p1, p2 in itertools.combinations(remaining_players, 2):
         # Si ya forman parte de una pareja obligatoria, saltar
         if p1['id'] in mandatory_pairs_found_ids or p2['id'] in mandatory_pairs_found_ids:
             continue
         # Si ya se procesó esta combinación, saltar (por si acaso)
         pair_ids = tuple(sorted((p1['id'], p2['id'])))
         if pair_ids in processed_in_combinations: continue

         if not check_all_conflicts_pair(p1, p2):
             pair = tuple(sorted((p1, p2), key=lambda x: x['id']))
             penalty = calculate_pair_penalty(p1, p2, tipo_pozo)
             avg_level = calculate_pair_avg_level(pair)
             # Score: penalización + inverso del nivel (para priorizar niveles altos)
             score = penalty - avg_level # Menor score es mejor (menos penalización, más nivel)
             potential_pairs.append((score, pair))
             processed_in_combinations.add(pair_ids)


    # Ordenar parejas: obligatorias primero, luego por score (menor es mejor)
    potential_pairs.sort(key=lambda x: x[0])

    # Algoritmo de asignación (Greedy mejorado)
    assigned_in_this_phase = set()
    # Añadir IDs de jugadores ya en pistas fijas
    for court_idx in range(num_pistas):
        for pair in court_assignments[court_idx]:
             assigned_in_this_phase.add(pair[0]['id'])
             assigned_in_this_phase.add(pair[1]['id'])

    # Lista de índices de pistas a llenar (ej. priorizar las de menor número)
    courts_to_fill_indices = list(range(num_pistas))
    # Podrías reordenar esta lista si quieres llenar pistas específicas primero

    unassigned_potential_pairs = [pair_data for pair_data in potential_pairs if
                                  pair_data[1][0]['id'] not in assigned_in_this_phase and
                                  pair_data[1][1]['id'] not in assigned_in_this_phase]


    for court_idx in courts_to_fill_indices:
        while len(court_assignments[court_idx]) < 2: # Mientras falten parejas
            best_fit_pair_data = None
            best_fit_score = float('inf') # Score del *partido* resultante
            best_pair_index_to_remove = -1

            # Buscar la mejor pareja *disponible* para esta pista
            candidates_to_try = list(enumerate(unassigned_potential_pairs)) # (index_in_list, (score, pair))

            for i, (original_list_index, (pair_score, current_pair)) in enumerate(candidates_to_try):
                 p1, p2 = current_pair
                 # ¿Ya asignados en otra iteración concurrente? (no debería pasar con este loop)
                 if p1['id'] in assigned_in_this_phase or p2['id'] in assigned_in_this_phase:
                      continue

                 # VALIDACIÓN DE RESTRICCIONES CON LA PISTA ACTUAL
                 valid_placement = True
                 players_already_on_court = [p for existing_pair in court_assignments[court_idx] for p in existing_pair]

                 # Solo validar conflictos de 4 si vamos a añadir la segunda pareja
                 if len(players_already_on_court) == 2:
                     pA, pB = players_already_on_court[0], players_already_on_court[1]
                     if check_all_conflicts_match(p1, p2, pA, pB):
                         valid_placement = False

                 # Aquí falta implementar la validación de 'juega_contra' obligatoria
                 # Ej: Si p1 tiene juega_contra pA, ¿están como rivales?
                 # ...

                 if valid_placement:
                     # Calcular score del partido resultante
                     current_match_balance = 0
                     if len(court_assignments[court_idx]) == 1:
                          existing_pair = court_assignments[court_idx][0]
                          current_match_balance = calculate_match_balance_score(existing_pair, current_pair)
                          # Podrías añadir penalización si se rompe la regla de diff > 1.0 aquí
                          if current_match_balance > 1.0:
                               # Aplicar penalización extra si se quiere evitar a toda costa?
                               pass

                     # Score final para elegir: prioriza equilibrio
                     match_score = current_match_balance

                     if match_score < best_fit_score:
                         best_fit_score = match_score
                         best_fit_pair_data = current_pair
                         best_pair_index_to_remove = original_list_index # Índice en la lista original

            # Asignar la mejor encontrada
            if best_fit_pair_data:
                pair_to_assign = best_fit_pair_data
                court_assignments[court_idx].append(pair_to_assign)
                assigned_in_this_phase.add(pair_to_assign[0]['id'])
                assigned_in_this_phase.add(pair_to_assign[1]['id'])
                print(f"    Asignada pareja ({pair_to_assign[0]['nombre']}, {pair_to_assign[1]['nombre']}) a Pista {court_idx+1} (Balance: {best_fit_score:.2f})")

                # Eliminar la pareja asignada de la lista de disponibles
                unassigned_potential_pairs = [
                    data for idx, data in enumerate(unassigned_potential_pairs)
                    if data[1] != pair_to_assign # Compara la tupla de la pareja
                ]
            else:
                print(f"    WARN: No se encontró pareja válida para Pista {court_idx+1} (Slot {len(court_assignments[court_idx]) + 1})")
                break # No se puede completar esta pista con las parejas restantes

    # --- FASE 4: Caso Especial (Post-Proceso o integrado en Fase 3) ---
    print("\nFASE 4: Verificando Caso Especial (No implementado)...")
    # Aquí iría la lógica para detectar conflictos de "no con Y no contra" en las pistas finales
    # y intentar mover jugadores si es necesario.

    # --- FASE 5: Formatear Salida ---
    print("\nFASE 5: Formateando Salida...")
    output = []
    for i, assigned_pairs in enumerate(court_assignments):
        if len(assigned_pairs) == 2:
            pairA = assigned_pairs[0]
            pairB = assigned_pairs[1]
            pA1, pA2 = pairA
            pB1, pB2 = pairB

            # Asegurar que los niveles son floats para el cálculo
            nivelA1 = float(pA1.get('nivel', 0))
            nivelA2 = float(pA2.get('nivel', 0))
            nivelB1 = float(pB1.get('nivel', 0))
            nivelB2 = float(pB2.get('nivel', 0))

            avgA = (nivelA1 + nivelA2) / 2.0
            avgB = (nivelB1 + nivelB2) / 2.0
            diffAvg = abs(avgA - avgB)

            totalA = nivelA1 + nivelA2
            totalB = nivelB1 + nivelB2
            diffTot = abs(totalA - totalB)

            warnings = []
            # check zurdos, posiciones...

            match_data = {
                "pista": i + 1,
                "teams": [[pA1["nombre"], pA2["nombre"]], [pB1["nombre"], pB2["nombre"]]],
                "ids": [[pA1["id"], pA2["id"]], [pB1["id"], pB2["id"]]],
                "avgs": [round(avgA, 2), round(avgB, 2)],
                "diffAvg": round(diffAvg, 2),
                "totals": [round(totalA, 2), round(totalB, 2)], # <-- DESCOMENTADO Y CALCULADO
                "diffTot": round(diffTot, 2),                   # <-- DESCOMENTADO Y CALCULADO
                "avisos": warnings
            }
            output.append(match_data)
        elif len(assigned_pairs) > 0 :
             print(f"  WARN: Pista {i+1} incompleta ({len(assigned_pairs)} parejas). No se incluirá en la salida.")
        # else: pista vacía, no hacer nada


    # Reordenar pistas por nivel medio del partido (descendente), si se desea,
    # PERO respetando las pistas fijas originales. Es complejo.
    # Por ahora, se devuelve ordenado por número de pista.
    output.sort(key=lambda x: x['pista'])

    # Verificar si todos fueron asignados
    final_assigned_ids = {p_id for m in output for team_ids in m['ids'] for p_id in team_ids}
    if len(final_assigned_ids) != len(jugadores):
         print(f"WARN: No todos los jugadores fueron asignados ({len(final_assigned_ids)} de {len(jugadores)})")
         unassigned = [p['nombre'] for p in jugadores if p['id'] not in final_assigned_ids]
         print(f"  No asignados: {', '.join(unassigned)}")


    print("\n--- Emparejamiento Finalizado ---")
    return output