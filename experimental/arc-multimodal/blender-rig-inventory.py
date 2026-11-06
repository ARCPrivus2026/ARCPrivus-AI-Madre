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
        # Detecta grupos presentes y con vertices realmente asociados.
        if armature and obj.vertex_groups:
            used = set()
            for vertex in obj.data.vertices:
                for group in vertex.groups:
                    if group.weight > 0.001:
                        used.add(group.group)
            weighted_groups = sorted(group.name for group in obj.vertex_groups
                                     if group.index in used)
        meshes.append({
            "name": obj.name,
            "vertices": len(obj.data.vertices),
            "polygons": len(obj.data.polygons),
            "morphs": morphs,
            "weightedGroups": weighted_groups
        })

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
        "notes": [
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
