"""Offline validation for Blender geometry inventory; does not require bpy or GLB files."""
import os
import runpy
import types
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
MOD = runpy.run_path(os.path.join(HERE, "blender-rig-inventory.py"))
weights = MOD["vertex_weight_evidence"]
inventory = MOD["inventory"]


def attr(**kwargs):
    return types.SimpleNamespace(**kwargs)


def test_object(*, face_hidden=False, detached=False):
    arm = attr(type="ARMATURE", name="NataliaRig",
               data=attr(bones=[attr(name="RightHand"), attr(name="LeftHand"),
                                attr(name="LeftFoot"), attr(name="RightFoot")]))
    group_names = ["RightHand", "LeftHand", "RightFoot", "LeftFoot"]
    groups = [attr(index=i, name=name) for i, name in enumerate(group_names)]
    vertices = [
        attr(groups=[attr(group=0, weight=0.99), attr(group=1, weight=0.01)]),
        attr(groups=[attr(group=0, weight=0.10)]),
        attr(groups=[attr(group=0, weight=0.06)]),
        attr(groups=[attr(group=1, weight=0.90)]),
        attr(groups=[attr(group=2, weight=0.90)]),
        attr(groups=[attr(group=3, weight=0.90)]),
    ]
    mesh = attr(
        type="MESH", name="RightHandMesh", data=attr(
            vertices=vertices, polygons=[1, 2, 3],
            shape_keys=attr(key_blocks=[attr(name="Basis"),
                                        attr(name="jawOpen"),
                                        attr(name="eyeBlink")])
        ),
        vertex_groups=groups, parent=arm, hide_render=face_hidden,
        hide_viewport=False
    )
    mesh.find_armature = lambda: arm
    decor = attr(
        type="MESH", name="RightHandDetached",data=attr(
            vertices=[],polygons=[],shape_keys=None),
        vertex_groups=[],parent=None
    )
    decor.find_armature = lambda: None
    if detached:
        mesh.parent = None
        mesh.find_armature = lambda: None
    bpy = attr(data=attr(
        objects=[arm, mesh, decor],
        actions=[attr(name=n) for n in ["Idle","Walk","Run","Sit","Stand"]]
    ))
    return mesh, bpy


class BlenderInventoryTests(unittest.TestCase):
    def test_counts_weighted_vertices_not_only_group_name(self):
        mesh,_ = test_object()
        result = weights(mesh, 0.05)
        self.assertEqual(result["RightHand"], 3)
        self.assertEqual(result["LeftHand"], 1)
        self.assertEqual(result["RightFoot"], 1)
        self.assertEqual(result["LeftFoot"], 1)
        self.assertEqual(sum(result.values()), 6)
        # Never change the original object.
        self.assertEqual(mesh.data.vertices[0].groups[0].weight, 0.99)

    def test_strict_threshold_and_no_write(self):
        mesh,_ = test_object()
        result = weights(mesh, 0.11)
        self.assertEqual(result["RightHand"], 1)
        self.assertEqual(result["LeftHand"], 1)
        self.assertRaises(ValueError, weights, mesh, 0)

    def test_full_inventory_reports_hidden_and_unbound_mesh(self):
        _mesh,bpy = test_object(face_hidden=True)
        result = inventory(bpy)
        self.assertEqual(result["schema"], "arc.blender.rig.inventory.v1")
        self.assertEqual(result["armature"], "NataliaRig")
        self.assertEqual(result["meshes"][0]["weightedVertexCounts"]["RightHand"], 3)
        self.assertEqual(result["meshes"][0]["weightThreshold"], 0.05)
        self.assertFalse(result["meshes"][0]["visibleInRender"])
        self.assertIn("RightHandDetached", result["unboundMeshNames"])
        self.assertEqual(result["clipMap"]["run"], "Run")
        self.assertIn("jawOpen", result["morphs"])
        self.assertFalse(result["voiceEnabled"])

    def test_no_armature_does_not_claim_weights(self):
        _mesh,bpy = test_object()
        bpy.data.objects = [x for x in bpy.data.objects if x.type != "ARMATURE"]
        result = inventory(bpy)
        self.assertIsNone(result["armature"])
        self.assertEqual(result["meshes"][0]["weightedVertexCounts"], {})
        self.assertFalse(result["voiceEnabled"])

    def test_detached_mesh_is_not_mistaken_for_rigged_hand(self):
        _mesh,bpy = test_object(detached=True)
        result = inventory(bpy)
        self.assertEqual(result["meshes"], [])
        self.assertIn("RightHandMesh", result["unboundMeshNames"])


if __name__ == "__main__":
    unittest.main()
