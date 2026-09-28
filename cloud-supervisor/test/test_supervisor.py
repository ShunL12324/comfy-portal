import importlib.util
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import MagicMock, patch

spec = importlib.util.spec_from_file_location("supervisor", Path(__file__).resolve().parents[1] / "supervisor.py")
supervisor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(supervisor)


class SupervisorTests(unittest.TestCase):
    def test_provider_managed_ssh_is_left_alone(self):
        with patch.dict(supervisor.os.environ, {}, clear=True), patch.object(supervisor.subprocess, "run") as run:
            supervisor.start_direct_ssh()
            run.assert_not_called()

    def test_invalid_key_is_rejected_before_writing(self):
        with patch.dict(supervisor.os.environ, {"CP_SSH_PUBLIC_KEY": "invalid-key"}), patch("builtins.open") as opened:
            with self.assertRaises(ValueError):
                supervisor.start_direct_ssh()
            opened.assert_not_called()

    def test_extension_failure_cannot_report_ready(self):
        state = MagicMock()
        state.phase = "preparing"
        state.fail.side_effect = lambda *_: setattr(state, "phase", "failed")
        manifest = {"models": [], "extensions": ["https://github.com/example/node"], "ollamaModels": []}
        with ExitStack() as stack:
            stack.enter_context(patch.object(supervisor, "STATE", state))
            stack.enter_context(patch.object(supervisor.os, "makedirs"))
            stack.enter_context(patch.object(supervisor, "log"))
            stack.enter_context(patch.object(supervisor, "load_manifest", return_value=manifest))
            for name in ["link_into_comfy", "start_aria2", "queue_downloads", "download_poller"]:
                stack.enter_context(patch.object(supervisor, name))
            stack.enter_context(patch.object(supervisor, "wait_for_downloads", return_value=[]))
            stack.enter_context(patch.object(supervisor, "install_extensions", side_effect=RuntimeError("Dependency failed")))
            spawn = stack.enter_context(patch.object(supervisor, "spawn"))
            supervisor.run()
            state.fail.assert_called_with("environment_install_failed", "Dependency failed")
            spawn.assert_not_called()
            self.assertNotIn(unittest.mock.call("ready"), state.set_phase.call_args_list)


if __name__ == "__main__":
    unittest.main()
