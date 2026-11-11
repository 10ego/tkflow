import contextlib
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import tkflow


class FakeVault:
    def __init__(self):
        self.docs = {}
        self.opened = []
        self.sketches = 0

    def doctor(self):
        return {'automation': True}

    def create(self, path, content):
        if path not in self.docs:
            self.docs[path] = content

    def create_sketch(self, path):
        if path not in self.docs:
            self.docs[path] = 'drawing'
            self.sketches += 1

    def open(self, path, split=False):
        self.opened.append(path)

    def read(self, path):
        return self.docs[path]

    def replace(self, path, content, expected):
        if tkflow.digest(self.docs[path]) != expected:
            raise tkflow.FlowError('Revision conflict')
        self.docs[path] = content


class BehaviorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.vault = Path(self.tmp.name) / 'tkflow'
        self.output = io.StringIO()
        self.redirect = contextlib.redirect_stdout(self.output)
        self.redirect.__enter__()
        self.addCleanup(self.redirect.__exit__, None, None, None)

    def test_initialize_and_resume_preserves_user_changes(self):
        tkflow.init_vault(self.vault)
        bridge = FakeVault()
        tkflow.start(self.vault, bridge, 'My Idea')
        path = 'Projects/my-idea/Blueprint.md'
        bridge.docs[path] = 'User-refined intent'
        tkflow.start(self.vault, bridge, None)
        self.assertEqual(bridge.docs[path], 'User-refined intent')
        self.assertEqual(bridge.sketches, 1)
        self.assertEqual(bridge.opened[-1], 'Projects/my-idea/Sketch.excalidraw.md')
        self.assertEqual(tkflow.active_project(self.vault), 'my-idea')
        self.assertEqual(bridge.docs['Home.md'].count('[[Projects/my-idea/Blueprint|'), 1)

    def test_initialize_does_not_touch_unrelated_folder(self):
        self.vault.mkdir()
        note = self.vault / 'private.md'; note.write_text('Keep me')
        with self.assertRaises(tkflow.FlowError):
            tkflow.init_vault(self.vault)
        self.assertEqual(note.read_text(), 'Keep me')
        self.assertFalse((self.vault / '.tkflow').exists())

    def test_new_project_is_direct_child_and_listed_before_references(self):
        tkflow.init_vault(self.vault)
        bridge = FakeVault()
        bridge.docs['Home.md'] = '# tkflow\n\n## Projects\n\n## Reference\n\n- [[System/Blueprint]]\n'
        tkflow.start(self.vault, bridge, 'Reading room')
        self.assertIn('Projects/reading-room/Blueprint.md', bridge.docs)
        self.assertFalse(any(p.startswith('Projects/tkflow/') for p in bridge.docs))
        home = bridge.docs['Home.md']
        self.assertLess(home.index('[[Projects/reading-room/Blueprint|'), home.index('## Reference'))
        self.assertIn('[[System/Blueprint]]', home)

    def test_reinitialization_keeps_vault_settings(self):
        tkflow.init_vault(self.vault)
        config = self.vault / '.obsidian/app.json'; config.write_text('{"custom":true}')
        tkflow.init_vault(self.vault)
        self.assertEqual(config.read_text(), '{"custom":true}')

    def test_path_escape_and_symlink_escape_are_rejected(self):
        self.vault.mkdir()
        with self.assertRaises(tkflow.FlowError):
            tkflow.safe_path(self.vault, '../private.md')
        (self.vault / 'outside').symlink_to(self.vault.parent)
        with self.assertRaises(tkflow.FlowError):
            tkflow.safe_path(self.vault, 'outside/private.md')

    def test_conflicting_revision_does_not_write(self):
        bridge = tkflow.Obsidian(self.vault)
        with patch.object(bridge, 'read', return_value='user edit'), patch.object(bridge, 'evaluate') as write:
            with self.assertRaisesRegex(tkflow.FlowError, 'Revision conflict'):
                bridge.replace('Blueprint.md', 'agent edit', tkflow.digest('old'))
            write.assert_not_called()

    def test_vault_path_guard_runs_and_cli_failure_is_not_ignored(self):
        bridge = tkflow.Obsidian(self.vault)
        envelope = '=> {"tkflow":true,"ok":false,"error":"Wrong vault path"}'
        with patch.object(bridge, 'run', return_value=envelope) as call:
            with self.assertRaisesRegex(tkflow.FlowError, 'Wrong vault path'):
                bridge.read('Blueprint.md')
            code = call.call_args.args[1]
            self.assertIn(str(self.vault), code)
        with patch('tkflow.subprocess.run', return_value=subprocess.CompletedProcess([], 1, '', 'disconnected')):
            with self.assertRaisesRegex(tkflow.FlowError, 'disconnected'):
                bridge.read('Blueprint.md')

    def test_shell_metacharacters_remain_data(self):
        bridge = tkflow.Obsidian(self.vault)
        content = '$(touch /tmp/never) `secret` "quote"\nNext line'
        with patch('tkflow.subprocess.run', return_value=subprocess.CompletedProcess([], 0, '=> {"tkflow":true,"ok":true,"value":true}', '')) as run:
            bridge.create('Notes/test.md', content)
            self.assertIsInstance(run.call_args.args[0], list)
            self.assertFalse(run.call_args.kwargs.get('shell', False))

    def test_preview_escapes_html_and_renders_behavior(self):
        rendered = tkflow.render_html('# Purpose\n\n- **Why:** useful\n\n<script>alert(1)</script>', 'Demo <unsafe>')
        self.assertIn('<h1>Purpose</h1>', rendered)
        self.assertIn('<strong>Why:</strong>', rendered)
        self.assertNotIn('<script>', rendered)
        self.assertIn('&lt;script&gt;', rendered)
        self.assertIn('Demo &lt;unsafe&gt;', rendered)

    def test_handoff_freezes_only_three_notes_and_detects_change(self):
        bridge = FakeVault()
        bridge.docs = {tkflow.project_path('demo', n): n + ' current intent' for n in tkflow.NOTES}
        packet = tkflow.handoff(self.vault, bridge, 'demo')
        self.addCleanup(__import__('shutil').rmtree, packet)
        self.assertEqual({x.name for x in packet.iterdir()}, {'Blueprint.md', 'Decisions.md', 'Status.md', 'Prompt.md', 'manifest.json'})
        bridge.docs['Projects/demo/Blueprint.md'] = 'later edit'
        self.assertEqual((packet / 'Blueprint.md').read_text(), 'Blueprint current intent')
        manifest = json.loads((packet / 'manifest.json').read_text())
        self.assertEqual(manifest['sha256']['Blueprint'], tkflow.digest('Blueprint current intent'))
        with patch.object(bridge, 'read', side_effect=['a', 'b', 'c', 'changed']):
            with self.assertRaisesRegex(tkflow.FlowError, 'changed'):
                tkflow.handoff(self.vault, bridge, 'demo')

    def test_failed_start_keeps_previous_active_project(self):
        tkflow.init_vault(self.vault)
        bridge = FakeVault()
        tkflow.start(self.vault, bridge, 'Working')
        with patch.object(bridge, 'create_sketch', side_effect=tkflow.FlowError('unavailable')):
            with self.assertRaises(tkflow.FlowError):
                tkflow.start(self.vault, bridge, 'Broken')
        self.assertEqual(tkflow.active_project(self.vault), 'working')

    def test_registration_preserves_other_vaults_and_is_idempotent(self):
        tkflow.init_vault(self.vault)
        config = self.vault.parent / 'obsidian.json'
        original = {'vaults': {'old': {'path': '/my/notes', 'open': True}}, 'cli': True}
        config.write_text(json.dumps(original))
        tkflow.register_vault(self.vault, config)
        first = config.read_text()
        tkflow.register_vault(self.vault, config)
        self.assertEqual(config.read_text(), first)
        registered = json.loads(first)
        self.assertEqual(registered['vaults']['old'], original['vaults']['old'])
        self.assertTrue(registered['cli'])
        self.assertEqual(len(registered['vaults']), 2)
        backups = list(config.parent.glob('obsidian.json.tkflow-backup-*'))
        self.assertEqual(len(backups), 1)
        self.assertEqual(json.loads(backups[0].read_text()), original)

    def test_preview_links_target_selected_vault(self):
        rendered = tkflow.render_html('[[Projects/demo/Blueprint|Read intent]]', 'Demo', 'Other Vault')
        self.assertIn('vault=Other%20Vault', rendered)
        self.assertIn('Read intent</a>', rendered)

    def test_install_is_idempotent_and_preserves_existing_commands(self):
        with patch('tkflow.Path.home', return_value=self.vault.parent), patch('tkflow.shutil.which', return_value='/already/obsidian'):
            tkflow.install()
            tkflow.install()
            command = self.vault.parent / '.local/bin/tkflow'
            self.assertEqual(command.resolve(), tkflow.ROOT / 'tkflow.py')
            command.unlink()
            command.write_text('my existing command')
            with self.assertRaisesRegex(tkflow.FlowError, 'Refusing to replace'):
                tkflow.install()
            self.assertEqual(command.read_text(), 'my existing command')


if __name__ == '__main__':
    unittest.main()
