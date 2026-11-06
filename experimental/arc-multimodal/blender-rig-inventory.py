# ARC Privus - Inventario de un avatar Blender/GLB, SOLO LECTURA.
# Ejemplos:
# blender -b NATALIA.blend --python blender-rig-inventory.py -- --armature Armature
# blender -b --python blender-rig-inventory.py -- --asset NATALIA.glb --out audit_natalia.json
# No guarda .blend, .glb ni crea archivos salvo --out (solo JSON de informe).
import argparse
import json
import os
import sys


def options():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description="ARC Blender rig inventory (read-only)")
    parser.add_argument("--asset", default=None, help="GLB/GLTF o BLEND opcional")
    parser.add_argument("--armature", default=None, help="Nombre preciso de la armadura")
    parser.add_argument("--out", default=None, help="Ruta de salida JSON; opcional")
    return parser.parse_args(args)


def load_optional_asset(bpy, path):
    if not path:
        return
    source = os.path.abspath(path)
    if not os.path.isfile(source):
        raise FileNotFoundError("No existe: " + source)
    suffix = os.path.splitext(source)[1].lower()
    if suffix in (".glb", ".gltf"):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=source)
    elif suffix == ".blend":
        bpy.ops.wm.open_mainfile(filepath=source)
    else:
        raise ValueError("Solo se admiten .blend, .glb y .gltf")



# Evidencia cuantitativa: solo lectura de vertex groups; no altera Blender.
def vertex_weight_evidence(obj, minimum_weight=0.05):
    if not 0 < minimum_weight <= 1:
        raise ValueError("minimum_weight debe estar entre 0 y 1")
    names = {group.index: group.name for group in obj.vertex_groups}
    counts = {name: 0 for name in names.values()}
    # Se cuenta un vertice solo una vez por grupo, incluso si el dato se repite.
    for vertex in obj.data.vertices:
        found = set()
        for item in vertex.groups:
            if item.group in names and item.weight >= minimum_weight:
                found.add(names[item.group])
        for name in found:
            counts[name] += 1
    return counts


def is_visible_for_render(obj):
    # hide_render es persistente y no depende del area actual de la UI.
    return not bool(getattr(obj, "hide_render", False))

def inventory(bpy, selected_name=None):
    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if selected_name:
        armatures = [obj for obj in armatures if obj.name == selected_name]
        if not armatures:
            raise ValueError("Armadura no encontrada: " + selected_name)
    if len(armatures) > 1:
        raise ValueError("Hay varias armaduras: selecciona --armature. Encontradas: " +
                         ", ".join(obj.name for obj in armatures))
    armature = armatures[0] if armatures else None

    meshes = []
    bones = [b.name for b in armature.data.bones] if armature else []
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        rig = obj.find_armature()
        if armature and rig != armature and obj.parent != armature:
            continue
        keys = obj.data.shape_keys
        morphs = [k.name for k in keys.key_blocks if k.name.lower() != "basis"] if keys else []
        weighted_groups = []
        weighted_counts = {}
        if armature and obj.vertex_groups:
            weighted_counts = vertex_weight_evidence(obj, minimum_weight=0.05)
            weighted_groups = sorted(name for name, count in weighted_counts.items()
                                     if count > 0)
        meshes.append({
            "name": obj.name,
            "vertices": len(obj.data.vertices),
            "polygons": len(obj.data.polygons),
            "morphs": morphs,
            "weightedGroups": weighted_groups,
            "weightedVertexCounts": weighted_counts,
            "weightThreshold": 0.05,
            "visibleInRender": is_visible_for_render(obj),
            "visibleInViewport": not bool(getattr(obj, "hide_viewport", False)),
            "boundToArmature": bool(armature and
                                  (rig == armature or obj.parent == armature))
        })

    # Mallas que no parecen unidas al esqueleto seleccionado:
    # podrian incluir una mano separada, ropa, decorados o referencias.
    unbound_mesh_names = []
    if armature:
        unbound_mesh_names = sorted(
            obj.name for obj in bpy.data.objects
            if obj.type == "MESH" and obj.find_armature() != armature
            and obj.parent != armature
        )
    shape_keys = sorted(set(key for mesh in meshes for key in mesh["morphs"]))
    actions = sorted({a.name for a in bpy.data.actions})
    lookup = {x.lower(): x for x in actions}
    clips = {}
    # Sugerencias: el inspector NO prueba que cada clip sea locomocion valida.
    for code, guesses in {
        "idle": ("idle", "rest"),
        "walk": ("walk", "walking"),
        "run": ("run", "running"),
        "sit": ("sit", "sitting"),
        "stand": ("stand", "standing"),
    }.items():
        for term in guesses:
            candidate = next((actual for lower, actual in lookup.items() if term in lower), None)
            if candidate:
                clips[code] = candidate
                break

    result = {
        "schema": "arc.blender.rig.inventory.v1",
        "armature": armature.name if armature else None,
        "armatureCount": len(armatures),
        "bones": bones,
        "morphs": shape_keys,
        "clips": actions,
        "clipMap": clips,
        "voiceEnabled": False,
        "meshes": meshes,
        "unboundMeshNames": unbound_mesh_names,
        "weightThreshold": 0.05,
        "notes": [
            "Los pesos son cantidades de vertices influenciados y no certifican dedos, visibilidad ni deformacion real.",
            "Los nombres de huesos no prueban que las manos u ojos se vean bien.",
            "Los clips detectados no certifican calidad de marcha ni retargeting.",
            "Los morphs detectados no certifican dientes, lengua ni sincronizacion de labios.",
            "voiceEnabled queda false hasta enlazar y validar un proveedor de voz.",
            "La fuente 3D NO se modifica ni se guarda."
        ]
    }
    return result


def main():
    cfg = options()
    import bpy
    load_optional_asset(bpy, cfg.asset)
    report = inventory(bpy, cfg.armature)
    payload = json.dumps(report, ensure_ascii=False, indent=2)
    print("=== ARC_RIG_INVENTORY_BEGIN ===")
    print(payload)
    print("=== ARC_RIG_INVENTORY_END ===")
    if cfg.out:
        with open(os.path.abspath(cfg.out), "w", encoding="utf-8") as handle:
            handle.write(payload + "\n")


if __name__ == "__main__":
    main()
