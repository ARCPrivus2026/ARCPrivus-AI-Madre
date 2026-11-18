"""Auditoria estructural Blender 4.2+; no guardar archivos BLEND/GLB."""
import bpy
import bmesh
import json
import sys
import traceback

def main():
    argv=sys.argv[sys.argv.index('--')+1:]
    if len(argv)!=2:
        raise RuntimeError('Se requieren ruta de fuente y reporte JSON')
    source,out=argv
    if source.lower().endswith('.blend'):
        bpy.ops.wm.open_mainfile(filepath=source,load_ui=False,use_scripts=False)
    elif source.lower().endswith('.glb'):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=source)
    else:
        raise RuntimeError('Formato no autorizado')

    inventory=[]
    for ob in bpy.data.objects:
        item={'name':ob.name,'type':ob.type}
        if ob.type=='MESH':
            m=ob.data
            item.update({
                'vertices':len(m.vertices),'faces':len(m.polygons),
                'edges':len(m.edges),'uv_layers':len(m.uv_layers),
                'shape_keys':[k.name for k in m.shape_keys.key_blocks] if m.shape_keys else [],
                'armature_modifiers':[x.object.name if x.object else None
                    for x in ob.modifiers if x.type=='ARMATURE']
            })
            if len(m.vertices)<=150000:
                bm=bmesh.new()
                try:
                    bm.from_mesh(m)
                    item['boundary_edges']=sum(1 for e in bm.edges if e.is_boundary)
                    item['nonmanifold_edges']=sum(1 for e in bm.edges if not e.is_manifold)
                finally:
                    bm.free()
        elif ob.type=='ARMATURE':
            item['bones']=len(ob.data.bones)
        inventory.append(item)
    report={
        'status':'INSPECCION_COMPLETA','blender_version':bpy.app.version_string,
        'objects':inventory,'actions':sorted(a.name for a in bpy.data.actions),
        'likeness_verified':False,'eyelid_function_verified':False,
        'note':'Inventario estructural. No certifica colisiones, parecido ni calidad artistica.'
    }
    with open(out,'x',encoding='utf-8') as f:
        json.dump(report,f,ensure_ascii=False,indent=2)
    print('ARC_AUDITOR3D_INSPECCION_COMPLETA')

if __name__=='__main__':
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(2)
