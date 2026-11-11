import contextlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

import tkflow
import tkflow_install as installer


class InstallTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.home = self.base / 'home'
        self.output = contextlib.redirect_stdout(io.StringIO())
        self.output.__enter__()
        self.addCleanup(self.output.__exit__, None, None, None)

    def install(self, **kwargs):
        return installer.install(tkflow.ROOT, home=self.home, environ={}, **kwargs)

    def test_all_hosts_discover_complete_command_set(self):
        release = self.install(hosts=['all'])
        roots = installer.locations(self.home, {})
        for host in ('codex', 'claude'):
            for name in installer.COMMANDS:
                skill = roots[host] / name / 'SKILL.md'
                self.assertTrue(skill.is_file(), str(skill))
                self.assertEqual(skill.resolve(), release / 'skills' / name / 'SKILL.md')
        for host, folder in [('opencode', 'commands'), ('pi', 'prompts')]:
            self.assertTrue((roots[host] / 'skills/tkflow/references/build.md').is_file())
            for name in installer.COMMANDS:
                text = (roots[host] / folder / f'{name}.md').read_text()
                self.assertIn('$ARGUMENTS', text)
                self.assertIn('tkflow', text)
        self.assertTrue((release / 'templates/Blueprint.md').is_file())

    def test_runtime_works_after_source_checkout_is_removed(self):
        source = self.base / 'temporary checkout'
        for path in installer.resource_files(tkflow.ROOT):
            target = source / path.relative_to(tkflow.ROOT)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
        release = installer.install(source, hosts=['all'], home=self.home, environ={})
        shutil.rmtree(source)
        for runner in [self.home / '.local/bin/tkflow', release / 'skills/tkflow/scripts/run.py']:
            result = subprocess.run([sys.executable, str(runner), '--help'], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('capture', result.stdout)
        result = subprocess.run([sys.executable, str(release / 'tkflow.py'), 'install', '--host', 'pi', '--home', str(self.home), '--dry-run'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_conflict_is_detected_before_any_host_is_modified(self):
        conflict = self.home / '.pi/agent/prompts/tkflow.md'
        conflict.parent.mkdir(parents=True)
        conflict.write_text('my own command')
        with self.assertRaisesRegex(ValueError, 'Refusing to replace'):
            self.install(hosts=['all'])
        self.assertEqual(conflict.read_text(), 'my own command')
        self.assertFalse((self.home / '.local/bin/tkflow').exists())
        self.assertFalse((self.home / '.codex').exists())
        self.assertFalse((self.home / '.local/share/tkflow').exists())

    def test_repeat_and_selected_host_install_preserve_other_hosts(self):
        self.install(hosts=['all'])
        claude = self.home / '.claude/skills/tkflow'
        before = claude.readlink()
        self.install(hosts=['codex'])
        self.assertEqual(claude.readlink(), before)
        self.assertTrue(claude.is_dir())

    def test_dry_run_creates_no_files(self):
        self.install(hosts=['all'], dry_run=True)
        self.assertFalse(self.home.exists())

    def test_edited_installed_resources_are_preserved(self):
        release = self.install()
        resource = release / 'skills/tkflow/SKILL.md'
        resource.write_text('local customization')
        with self.assertRaisesRegex(ValueError, 'was edited'):
            self.install()
        self.assertEqual(resource.read_text(), 'local customization')

    def test_legacy_links_are_migrated_without_modifying_source(self):
        command = self.home / '.local/bin/tkflow'
        skill = self.home / '.codex/skills/tkflow'
        for link, source in [(command, tkflow.ROOT / 'tkflow.py'), (skill, tkflow.ROOT / 'skills/tkflow')]:
            link.parent.mkdir(parents=True, exist_ok=True)
            link.symlink_to(source)
        release = self.install()
        self.assertEqual(command.resolve(), release / 'tkflow.py')
        self.assertEqual(skill.resolve(), release / 'skills/tkflow')

    def test_native_pi_package_has_all_prompt_resources(self):
        manifest = json.loads((tkflow.ROOT / 'package.json').read_text())
        prompts = []
        for pattern in manifest['pi']['prompts']:
            prompts.extend(tkflow.ROOT.glob(pattern))
        self.assertEqual({p.stem for p in prompts}, set(installer.COMMANDS))
        self.assertTrue((tkflow.ROOT / manifest['pi']['skills'][0] / 'scripts/run.py').is_file())

    def test_host_config_overrides_are_respected(self):
        config = {'CODEX_HOME': str(self.base/'codex-config'),
                  'CLAUDE_CONFIG_DIR': str(self.base/'claude-config'),
                  'XDG_CONFIG_HOME': str(self.base/'xdg-config'),
                  'PI_CODING_AGENT_DIR': str(self.base/'pi-config')}
        installer.install(tkflow.ROOT, hosts=['all'], home=self.home, environ=config)
        for host, path in installer.locations(self.home, config).items():
            self.assertTrue(path.is_dir(), host)
        self.assertFalse((self.home / '.codex').exists())


if __name__ == '__main__':
    unittest.main()
