"""Tests offline de la preparacion del render diagnostico: NO requieren Blender."""
import os
import runpy
import tempfile
import types
import unittest

ROOT=os.path.dirname(__file__)
module=runpy.run_path(os.path.join(ROOT,"blender-visual-proof.py"))
SHOTS=module["SHOTS"]
open_asset=module["open_asset"]
model_components=module["model_components"]
choose_action=module["choose_action"]
set_morphs=module["set_morphs"]
restore_morphs=module["restore_morphs"]
render_diagnostic=module["render_diagnostic"]


def obj(**data):
    return types.SimpleNamespace(**data)


class VisualProofTests(unittest.TestCase):
    def test_seven_views_cover_full_body_motion_face_and_both_hands(self):
        self.assertEqual(list(SHOTS),[
            "front","walk","run","face_jaw","face_blink","left_hand","right_hand"
        ])

    def test_refuses_unknown_source_format_before_attempted_import(self):
        with tempfile.TemporaryDirectory() as folder:
            filename=os.path.join(folder,"archive.exe")
            with open(filename,"w",encoding="utf-8") as f:f.write("not asset")
            self.assertRaises(ValueError,open_asset,None,filename)

    def test_refuses_missing_source(self):
        self.assertRaises(FileNotFoundError,open_asset,None,"/nothing/hidden.glb")

    def test_blender_missing_or_two_armatures_not_assumed(self):
        fixture=obj(data=obj(objects=[]))
        self.assertRaisesRegex(ValueError,"sin mallas",model_components,fixture)
        arms=[obj(name="A",type="ARMATURE"),obj(name="B",type="ARMATURE")]
        fixture=obj(data=obj(objects=arms))
        self.assertRaisesRegex(ValueError,"Varias armaduras",model_components,fixture)

    def test_action_names_are_suggestions_not_generated_clips(self):
        source=obj(data=obj(actions=[obj(name="Idle"),obj(name="WALK_old"),
                                     obj(name="Run_Test")]))
        self.assertEqual(choose_action(source,"walk").name,"WALK_old")
        self.assertEqual(choose_action(source,"run").name,"Run_Test")
        self.assertIsNone(choose_action(obj(data=obj(actions=[])),"run"))

    def test_morphs_modified_only_in_memory_and_restored(self):
        jaw=obj(name="jawOpen",value=0.1)
        blink=obj(name="eyeBlink",value=0.3)
        mesh=obj(data=obj(shape_keys=obj(key_blocks=[jaw,blink])))
        old=set_morphs([mesh],"jaw")
        self.assertEqual(jaw.value,0.8)
        self.assertEqual(blink.value,0.3)
        restore_morphs(old)
        self.assertEqual(jaw.value,0.1)
        old=set_morphs([mesh],"blink")
        self.assertEqual(blink.value,1)
        restore_morphs(old)
        self.assertEqual(blink.value,0.3)

    def test_invalid_resolution_rejected_before_opening_original(self):
        for resolution in (1,255,1025,9999):
            self.assertRaisesRegex(ValueError,"Resolucion",render_diagnostic,
                                   None,"fake.glb","natalia","/",resolution)


if __name__=="__main__":
    unittest.main()
