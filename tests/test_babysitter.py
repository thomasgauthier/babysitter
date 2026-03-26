import argparse
import contextlib
import io
import importlib.machinery
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock


def load_babysitter_module():
    script_path = Path("/workspace/babysitter/babysitter")
    loader = importlib.machinery.SourceFileLoader("babysitter_cli", str(script_path))
    spec = importlib.util.spec_from_loader("babysitter_cli", loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module


babysitter = load_babysitter_module()


class BabysitterCliTests(unittest.TestCase):
    def test_ensure_poll_state_migrates_legacy_jsonl(self):
        session = {
            "poll_state": {
                "jsonl": {
                    "offset": 7,
                    "pending": "x",
                    "carry_reasoning": "r",
                    "carry_assistant_text": "a",
                }
            }
        }

        state = babysitter.ensure_poll_state(session)

        self.assertEqual(state["json"]["offset"], 7)
        self.assertEqual(state["json"]["pending"], "x")
        self.assertEqual(state["json"]["carry_reasoning"], "r")
        self.assertEqual(state["json"]["carry_assistant_text"], "a")

    def test_apply_semantic_events_tracks_actionable_requests_only(self):
        session = {}
        events = [
            {"type": "turn_start"},
            {"type": "extension_ui_request", "id": "REQ1", "method": "select", "options": ["Approve"]},
            {"type": "extension_ui_request", "id": "REQ2", "method": "notify", "message": "heads up"},
            {"type": "turn_end", "stopReason": "stop"},
        ]

        babysitter.apply_semantic_events_to_runtime(session, events)
        runtime = babysitter.ensure_runtime_state(session)

        self.assertEqual(runtime["last_turn_state"], "stopped")
        self.assertEqual(runtime["last_stop_reason"], "stop")
        self.assertIn("REQ1", runtime["pending_requests"])
        self.assertNotIn("REQ2", runtime["pending_requests"])
        self.assertEqual(runtime["pending_request_order"], ["REQ1"])

    def test_send_payload_clears_answered_request(self):
        session = {
            "stdin_fifo": "/tmp/fake-fifo",
            "runtime": {
                "pending_requests": {"REQ1": {"id": "REQ1", "method": "select"}},
                "pending_request_order": ["REQ1"],
                "last_turn_state": "running",
                "resolved_request_ids": [],
            },
        }

        with mock.patch.object(babysitter, "write_fifo_line"), mock.patch.object(babysitter, "save_session"):
            babysitter.send_payload(session, {"type": "extension_ui_response", "id": "REQ1", "value": "Approve"})

        self.assertEqual(session["runtime"]["pending_requests"], {})
        self.assertEqual(session["runtime"]["pending_request_order"], [])
        self.assertEqual(session["runtime"]["resolved_request_ids"], ["REQ1"])

    def test_mark_inactive_clears_pending_requests(self):
        session = {
            "active": True,
            "runtime": {
                "pending_requests": {"REQ1": {"id": "REQ1", "method": "input"}},
                "pending_request_order": ["REQ1"],
                "resolved_request_ids": [],
                "last_turn_state": "running",
            },
        }

        updated = babysitter.mark_inactive(session, "stopped by test")

        self.assertFalse(updated["active"])
        self.assertEqual(updated["runtime"]["pending_requests"], {})
        self.assertEqual(updated["runtime"]["pending_request_order"], [])
        self.assertEqual(updated["runtime"]["last_turn_state"], "stopped")

    def test_apply_semantic_events_does_not_rehydrate_resolved_request(self):
        session = {"runtime": {"resolved_request_ids": ["REQ1"]}}
        events = [{"type": "extension_ui_request", "id": "REQ1", "method": "input", "title": "Host Nudge"}]

        babysitter.apply_semantic_events_to_runtime(session, events)

        runtime = babysitter.ensure_runtime_state(session)
        self.assertEqual(runtime["pending_requests"], {})
        self.assertEqual(runtime["pending_request_order"], [])

    def test_annotate_request_events_marks_resolved_request_not_pending(self):
        session = {"runtime": {"resolved_request_ids": ["REQ1"], "pending_requests": {}, "pending_request_order": []}}
        events = [{"type": "extension_ui_request", "id": "REQ1", "method": "input", "title": "Host Nudge"}]

        babysitter.annotate_request_events(session, events)

        self.assertFalse(events[0]["pending"])
        self.assertTrue(events[0]["resolved"])

    def test_format_pretty_event_marks_non_pending_ui_request(self):
        rendered = babysitter.format_pretty_event(
            {
                "type": "extension_ui_request",
                "id": "REQ1",
                "method": "input",
                "title": "Host Nudge",
                "pending": False,
            }
        )

        self.assertIn("ui request (input, not pending):", rendered)
        self.assertNotIn('"pending"', rendered)

    def test_cmd_poll_json_marks_resolved_request_event_not_pending(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            stdout_log = Path(tmpdir) / "stdout"
            stdout_log.write_text(
                json.dumps(
                    {
                        "type": "extension_ui_request",
                        "id": "REQ1",
                        "method": "input",
                        "title": "Host Nudge",
                        "placeholder": "Tell the agent what to do instead",
                    }
                )
                + "\n",
                encoding="utf-8",
            )
            session = {
                "stdout_log": str(stdout_log),
                "poll_state": {
                    "json": {"offset": 0, "pending": "", "carry_reasoning": "", "carry_assistant_text": ""},
                    "pretty": {"offset": 0, "pending": "", "carry_reasoning": "", "carry_assistant_text": ""},
                    "raw": {"offset": 0},
                },
                "runtime": {
                    "pending_requests": {},
                    "pending_request_order": [],
                    "resolved_request_ids": ["REQ1"],
                    "last_turn_state": "running",
                },
            }
            args = argparse.Namespace(json=True, raw=False)
            output = io.StringIO()

            with (
                mock.patch.object(babysitter, "load_session_or_fail", return_value=session),
                mock.patch.object(babysitter, "save_session"),
                contextlib.redirect_stdout(output),
            ):
                result = babysitter.cmd_poll(args)

        self.assertEqual(result, 0)
        payload = json.loads(output.getvalue())
        self.assertEqual(payload[0]["id"], "REQ1")
        self.assertFalse(payload[0]["pending"])
        self.assertTrue(payload[0]["resolved"])
        self.assertEqual(session["runtime"]["pending_requests"], {})

    def test_cmd_poll_json_reports_buffered_partial_output(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            stdout_log = Path(tmpdir) / "stdout"
            stdout_log.write_text('{"type":"tool_execution_update","toolName":"write","toolCallId":"TOOL1","partialResult":{"content":[{"type":"text","text":"partial"', encoding="utf-8")
            session = {
                "stdout_log": str(stdout_log),
                "poll_state": {
                    "json": {"offset": 0, "pending": "", "carry_reasoning": "", "carry_assistant_text": ""},
                    "pretty": {"offset": 0, "pending": "", "carry_reasoning": "", "carry_assistant_text": ""},
                    "raw": {"offset": 0},
                },
                "runtime": {
                    "pending_requests": {},
                    "pending_request_order": [],
                    "resolved_request_ids": [],
                    "last_turn_state": "running",
                },
            }
            args = argparse.Namespace(json=True, raw=False)
            output = io.StringIO()

            with (
                mock.patch.object(babysitter, "load_session_or_fail", return_value=session),
                mock.patch.object(babysitter, "save_session"),
                contextlib.redirect_stdout(output),
            ):
                result = babysitter.cmd_poll(args)

        self.assertEqual(result, 0)
        payload = json.loads(output.getvalue())
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["type"], "streaming_output")
        self.assertGreater(payload[0]["pending_bytes"], 0)
        self.assertIn("partial", payload[0]["preview"])

    def test_read_text_source_requires_exactly_one_source(self):
        args = argparse.Namespace(text="hello", file=None, stdin=False)
        self.assertEqual(babysitter.read_text_source(args), "hello")

        with self.assertRaises(SystemExit):
            babysitter.read_text_source(argparse.Namespace(text="hello", file="msg.txt", stdin=False))

    def test_cmd_nudge_uses_select_response_shape(self):
        session = {
            "runtime": {
                "pending_requests": {
                    "REQ1": {"id": "REQ1", "method": "select", "options": ["Approve", "Disapprove", "Nudge"]}
                },
                "pending_request_order": ["REQ1"],
                "last_turn_state": "running",
            }
        }
        captured = {}

        def capture_send(session_arg, payload, raw_payload=None):
            captured["payload"] = payload

        with (
            mock.patch.object(babysitter, "load_session_or_fail", return_value=session),
            mock.patch.object(babysitter, "require_live_session", return_value=session),
            mock.patch.object(babysitter, "send_payload", side_effect=capture_send),
            mock.patch.object(babysitter, "emit_command_success", return_value=0),
        ):
            result = babysitter.cmd_nudge(argparse.Namespace(request_id="REQ1", json=False))

        self.assertEqual(result, 0)
        self.assertEqual(
            captured["payload"],
            {"type": "extension_ui_response", "id": "REQ1", "value": "Nudge"},
        )

    def test_cmd_nudge_with_text_auto_answers_follow_up_input(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            stdout_log = Path(tmpdir) / "stdout"
            stdout_log.write_text(
                json.dumps(
                    {
                        "type": "extension_ui_request",
                        "id": "REQ2",
                        "method": "input",
                        "title": "Host Nudge",
                        "placeholder": "Tell the agent what to do instead",
                    }
                )
                + "\n",
                encoding="utf-8",
            )
            session = {
                "stdin_fifo": "/tmp/fake-fifo",
                "stdout_log": str(stdout_log),
                "poll_state": {
                    "json": {"offset": 0, "pending": "", "carry_reasoning": "", "carry_assistant_text": ""},
                    "pretty": {"offset": 0, "pending": "", "carry_reasoning": "", "carry_assistant_text": ""},
                    "raw": {"offset": 0},
                },
                "runtime": {
                    "pending_requests": {
                        "REQ1": {"id": "REQ1", "method": "select", "options": ["Approve", "Disapprove", "Nudge"]}
                    },
                    "pending_request_order": ["REQ1"],
                    "resolved_request_ids": [],
                    "last_turn_state": "running",
                },
            }
            sent_bodies = []

            def capture_fifo(_path, body):
                sent_bodies.append(json.loads(body))

            with (
                mock.patch.object(babysitter, "load_session_or_fail", return_value=session),
                mock.patch.object(babysitter, "require_live_session", return_value=session),
                mock.patch.object(babysitter, "write_fifo_line", side_effect=capture_fifo),
                mock.patch.object(babysitter, "save_session"),
                contextlib.redirect_stdout(io.StringIO()),
            ):
                result = babysitter.cmd_nudge(
                    argparse.Namespace(
                        request_id="REQ1",
                        text="Rewrite the cart from a clean TIC() loop.",
                        file=None,
                        stdin=False,
                        json=False,
                    )
                )

        self.assertEqual(result, 0)
        self.assertEqual(
            sent_bodies,
            [
                {"type": "extension_ui_response", "id": "REQ1", "value": "Nudge"},
                {
                    "type": "extension_ui_response",
                    "id": "REQ2",
                    "value": "Rewrite the cart from a clean TIC() loop.",
                },
            ],
        )
        self.assertEqual(session["runtime"]["pending_requests"], {})
        self.assertEqual(session["runtime"]["resolved_request_ids"], ["REQ1", "REQ2"])

    def test_cmd_interrupt_uses_abort_rpc_shape(self):
        session = {"runtime": {"last_turn_state": "running"}}
        captured = {}

        def capture_send(session_arg, payload, raw_payload=None):
            captured["payload"] = payload

        with (
            mock.patch.object(babysitter, "require_live_session", return_value=session),
            mock.patch.object(babysitter, "send_payload", side_effect=capture_send),
            mock.patch.object(babysitter, "emit_command_success", return_value=0),
        ):
            result = babysitter.cmd_interrupt(argparse.Namespace(json=False))

        self.assertEqual(result, 0)
        self.assertEqual(captured["payload"], {"type": "abort"})

    def test_cmd_select_uses_exact_option(self):
        session = {
            "runtime": {
                "pending_requests": {
                    "REQ1": {
                        "id": "REQ1",
                        "method": "select",
                        "options": ["Approve", "Heuristic Suggestion (approve)"],
                    }
                },
                "pending_request_order": ["REQ1"],
                "last_turn_state": "running",
            }
        }
        captured = {}

        def capture_send(session_arg, payload, raw_payload=None):
            captured["payload"] = payload

        with (
            mock.patch.object(babysitter, "load_session_or_fail", return_value=session),
            mock.patch.object(babysitter, "require_live_session", return_value=session),
            mock.patch.object(babysitter, "send_payload", side_effect=capture_send),
            mock.patch.object(babysitter, "emit_command_success", return_value=0),
        ):
            result = babysitter.cmd_select(
                argparse.Namespace(request_id="REQ1", option="Heuristic Suggestion (approve)", json=False)
            )

        self.assertEqual(result, 0)
        self.assertEqual(
            captured["payload"],
            {
                "type": "extension_ui_response",
                "id": "REQ1",
                "value": "Heuristic Suggestion (approve)",
            },
        )

    def test_build_parser_accepts_json_and_legacy_jsonl_flags(self):
        parser = babysitter.build_parser()

        args = parser.parse_args(["poll", "--json"])
        self.assertTrue(args.json)

        args = parser.parse_args(["poll", "--jsonl"])
        self.assertTrue(args.json)

        args = parser.parse_args(["interrupt", "--json"])
        self.assertTrue(args.json)

        args = parser.parse_args(["nudge", "REQ1", "--text", "Do the next bounded step."])
        self.assertEqual(args.request_id, "REQ1")
        self.assertEqual(args.text, "Do the next bounded step.")


if __name__ == "__main__":
    unittest.main()
