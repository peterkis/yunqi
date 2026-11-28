"""Regression coverage for Windows process identity in memory/lifecycle measurements."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("tree", Path(__file__).with_name("windows-process-tree.py"))
tree = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tree)


class ProcessIdentityTests(unittest.TestCase):
    def test_old_child_with_recycled_parent_pid_never_enters_owned_tree(self):
        # 100 previously belonged to a different parent. 90's own child 150 was
        # born after our host, but the link through 90 invalidates the full branch.
        rows = {100:(1,"host"), 90:(100,"older"), 150:(90,"other"), 101:(100,"browser"), 103:(101,"renderer")}
        times = {100:1000, 90:100, 150:1150, 101:1002, 103:1050}
        self.assertEqual(dict(tree.owned_nodes(100, rows, times.get, 2000)), {100:1000, 101:1002, 103:1050})

    def test_exited_or_reused_pid_after_snapshot_is_excluded(self):
        rows = {40:(1,"host"), 41:(40,"old"), 42:(40,"exited"), 44:(40,"renderer")}
        times = {40:100, 41:501, 44:499}
        self.assertEqual(dict(tree.owned_nodes(40, rows, times.get, 500)), {40:100, 44:499})


if __name__ == "__main__":
    unittest.main()
