# ARC Privus - evidencia visual 3D local, aislada, SIN GUARDAR .blend/.glb.
# Blender 4.2+ - render diagnostico Workbench, sin aspiracion fotorealista.
# Inicia en proceso separado y solo escribe PNG en un directorio nuevo autorizado.
import argparse
import json
import os
import sys

BEGIN="=== ARC_VISUAL_PROOF_BEGIN ==="
END="=== ARC_VISUAL_PROOF_END ==="
SHOTS=("front","walk","run","face_jaw","face_blink","left_hand","right_hand")


def args_from_cli():
    argv=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    parser=argparse.ArgumentParser()
    parser.add_argument("--asset",required=True)
    parser.add_argument("--out-dir",required=True)
    parser.add_argument("--actor",required=True,choices=("natalia","copiloto"))
    parser.add_argument("--resolution",type=int,default=512)
    return parser.parse_args(argv)


def open_asset(bpy,filepath):
    source=os.path.realpath(filepath)
    if not os.path.isfile(source):
        raise FileNotFoundError("Original no encontrado")
    suffix=os.path.splitext(source)[1].lower()
    if suffix in (".glb",".gltf"):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=source)
    elif suffix==".blend":
        bpy.ops.wm.open_mainfile(filepath=source,load_ui=False)
    else:
        raise ValueError("Formato de modelo no admitido")


def model_components(bpy):
    arms=[o for o in bpy.data.objects if o.type=="ARMATURE"]
    if len(arms)>1:
        raise ValueError("Varias armaduras: no se puede escoger automaticamente")
    arm=arms[0] if arms else None
    meshes=[o for o in bpy.data.objects if o.type=="MESH"]
    rigged=[m for m in meshes if arm and (m.find_armature()==arm or m.parent==arm)]
    focus=rigged or meshes
    if not focus:
        raise ValueError("Modelo sin mallas")
    return arm,focus


def model_bounds(objects):
    from mathutils import Vector
    points=[]
    for ob in objects:
        for corner in ob.bound_box:
            points.append(ob.matrix_world @ Vector(corner))
    if not points:
        raise ValueError("Sin vertices de caja para encuadrar")
    lower=Vector((min(p.x for p in points),min(p.y for p in points),min(p.z for p in points)))
    upper=Vector((max(p.x for p in points),max(p.y for p in points),max(p.z for p in points)))
    center=(lower+upper)*0.5
    size=upper-lower
    return center,size,lower,upper


def find_bone(arm,side):
    if not arm:return None
    choices=(
        ("lefthand","hand_l","left_hand","mixamoriglefthand")
        if side=="left" else
        ("righthand","hand_r","right_hand","mixamorigrighthand")
    )
    for bone in arm.data.bones:
        if bone.name.lower() in choices:
            return arm.matrix_world @ bone.head_local
    return None


def choose_action(bpy,kind):
    names={"walk":("walk","walking"),"run":("run","running")}
    for action in bpy.data.actions:
        if any(word in action.name.lower() for word in names[kind]):
            return action
    return None


def morph_matches(meshes,keywords):
    found=[]
    for mesh in meshes:
        keys=getattr(mesh.data,"shape_keys",None)
        if keys is None:continue
        for key in keys.key_blocks:
            if key.name.lower() in keywords:
                found.append(key)
    return found


def set_morphs(meshes,kind):
    keywords=(
        ("jawopen","mouthopen","mouth_open") if kind=="jaw"
        else ("eyeblink","eyeblinkleft","eyeblinkright","blink","blinkleft","blinkright")
    )
    keys=morph_matches(meshes,keywords)
    before=[(key,key.value) for key in keys]
    for key in keys:key.value=0.8 if kind=="jaw" else 1
    return before


def restore_morphs(items):
    for key,value in items:
        key.value=value


def setup_camera(bpy):
    from mathutils import Vector
    scene=bpy.context.scene
    camera_data=bpy.data.cameras.new("ARC_AUDIT_CAMERA")
    cam=bpy.data.objects.new("ARC_AUDIT_CAMERA",camera_data)
    scene.collection.objects.link(cam)
    camera_data.type="ORTHO"
    scene.camera=cam
    scene.render.engine="BLENDER_WORKBENCH"
    scene.render.image_settings.file_format="PNG"
    scene.render.film_transparent=False
    scene.render.threads_mode="FIXED"
    scene.render.threads=2
    try:
        scene.display.shading.light="STUDIO"
        scene.display.shading.show_cavity=True
        scene.display.shading.color_type="MATERIAL"
    except (AttributeError,TypeError,ValueError):
        pass
    return cam


def aim_camera(cam,target,unit,ortho):
    from mathutils import Vector
    direction=Vector(unit).normalized()
    # Distancia ortografica no afecta la escala, solo el clipping.
    camera_pos=target+direction*max(ortho*2,0.3)
    cam.location=camera_pos
    cam.rotation_euler=(target-camera_pos).to_track_quat("-Z","Y").to_euler()
    cam.data.ortho_scale=ortho
    cam.data.clip_start=0.001
    cam.data.clip_end=max(500,ortho*20)


def render_diagnostic(bpy,asset,actor,out_dir,resolution):
    if resolution<256 or resolution>1024:
        raise ValueError("Resolucion debe ser 256-1024")
    if not os.path.isdir(out_dir):
        raise FileNotFoundError("Directorio de imagenes inexistente")
    open_asset(bpy,asset)
    scene=bpy.context.scene
    arm,meshes=model_components(bpy)
    center,size,low,high=model_bounds(meshes)
    extent=max(size.x,size.y,size.z,0.1)
    base_scale=max(size.z*1.3,size.x*1.5,size.y*1.5,extent*0.8)
    cam=setup_camera(bpy)
    scene.render.resolution_x=resolution
    scene.render.resolution_y=round(resolution*1.25)
    scene.render.resolution_percentage=100
    records={}
    base_action=arm.animation_data.action if arm and arm.animation_data else None
    neutral_frame=scene.frame_current
    for shot in SHOTS:
        filename=actor+"_"+shot+".png"
        out=os.path.join(out_dir,filename)
        if os.path.exists(out):
            raise FileExistsError("Se protege la evidencia ya existente: "+filename)
        record={"status":"missing","image":None,"note":None}
        reset=[]
        if arm and arm.animation_data:
            arm.animation_data.action=base_action
        scene.frame_set(neutral_frame)
        target=center.copy()
        direction=(0,-1,0.25)
        scale=base_scale
        if shot in ("walk","run"):
            if arm is None:
                record["note"]="No hay armadura para muestrear animacion"
                records[shot]=record
                continue
            action=choose_action(bpy,shot)
            if action is None:
                record["note"]="No hay accion identificada: "+shot
                records[shot]=record
                continue
            arm.animation_data_create()
            arm.animation_data.action=action
            start,end=action.frame_range
            frame=round(float(start)+(float(end)-float(start))*0.5)
            scene.frame_set(frame)
            record["note"]="Accion muestreada: "+action.name+" (sin validar calidad)"
        elif shot.startswith("face_"):
            # Nunca se inventan morphs. La imagen solo existe si hay un control.
            kind="jaw" if shot=="face_jaw" else "blink"
            reset=set_morphs(meshes,kind)
            if not reset:
                record["note"]="No se detecto morph: "+kind
                records[shot]=record
                continue
            target.z=low.z+size.z*0.83
            scale=max(size.z*0.38,extent*0.16)
            record["note"]="Morph artificial para inspeccion; NO prueba sincronizacion labial"
        elif shot in ("left_hand","right_hand"):
            position=find_bone(arm,"left" if shot=="left_hand" else "right")
            if position is None:
                record["note"]="Hueso de mano no encontrado"
                records[shot]=record
                continue
            target=position
            scale=max(size.z*0.28,extent*0.1)
            record["note"]="Recorte de area de la mano, no prueba dedos ni pesos"
        elif shot=="front":
            record["note"]="Pose de referencia capturada sin alterar original"
        aim_camera(cam,target,direction,scale)
        scene.render.filepath=out
        try:
            bpy.ops.render.render(write_still=True)
            if not os.path.isfile(out) or os.path.getsize(out)==0:
                raise RuntimeError("Render sin imagen")
            record["status"]="rendered"
            record["image"]=filename
        except Exception as error:
            record["status"]="error"
            record["note"]=type(error).__name__+": "+str(error)[:120]
        finally:
            restore_morphs(reset)
        records[shot]=record
    if arm and arm.animation_data:
        arm.animation_data.action=base_action
    scene.frame_set(neutral_frame)
    return {
        "schema":"arc.blender.visual.proof.v1",
        "actor":actor,"mode":"Workbench diagnostico, no fotorrealista",
        "noOriginalSaved":True,"images":records
    }


def main():
    cfg=args_from_cli()
    import bpy
    report=render_diagnostic(bpy,cfg.asset,cfg.actor,
                             os.path.realpath(cfg.out_dir),cfg.resolution)
    print(BEGIN)
    print(json.dumps(report,ensure_ascii=False))
    print(END)


if __name__=="__main__":
    main()
