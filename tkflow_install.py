"""Install the shared tkflow runtime and host-native command entry points."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
import uuid

HOSTS = ('codex', 'claude', 'opencode', 'pi')
COMMANDS = ('tkflow', 'tkflow-start', 'tkflow-blueprint', 'tkflow-refine',
            'tkflow-build', 'tkflow-status', 'tkflow-verify')
RESOURCES = ('tkflow.py', 'tkflow_install.py', 'templates', 'skills', 'commands', 'package.json')


def resource_files(root):
    files = []
    for resource in RESOURCES:
        path = root / resource
        if path.is_dir():
            files.extend(p for p in path.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
        elif path.is_file():
            files.append(path)
        else:
            raise ValueError(f'Package resource missing: {path}')
    return sorted(files)


def package_identity(root):
    hashes = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
              for p in resource_files(root)}
    identity = hashlib.sha256(json.dumps(hashes, sort_keys=True).encode()).hexdigest()[:20]
    return identity, hashes


def locations(home, environ):
    return {
        'codex': Path(environ.get('CODEX_HOME', home / '.codex')) / 'skills',
        'claude': Path(environ.get('CLAUDE_CONFIG_DIR', home / '.claude')) / 'skills',
        'opencode': Path(environ.get('XDG_CONFIG_HOME', home / '.config')) / 'opencode',
        'pi': Path(environ.get('PI_CODING_AGENT_DIR', home / '.pi/agent')),
    }


def install(root, hosts=None, home=None, dry_run=False, environ=None):
    root = Path(root).resolve()
    home = Path(home or Path.home()).expanduser().resolve()
    environ = dict(os.environ if environ is None else environ)
    hosts = list(dict.fromkeys(hosts or ['codex']))
    if 'all' in hosts:
        hosts = list(HOSTS)
    if any(h not in HOSTS for h in hosts):
        raise ValueError('Choose codex, claude, opencode, pi, or all.')
    identity, hashes = package_identity(root)
    data = home / '.local/share/tkflow'
    release = data / 'releases' / identity
    state_file = data / 'install.json'
    state = json.loads(state_file.read_text()) if state_file.exists() else {'format': 1, 'links': {}}
    if state.get('format') != 1 or not isinstance(state.get('links'), dict):
        raise ValueError(f'Unrecognized installation state: {state_file}')
    links = {home / '.local/bin/tkflow': release / 'tkflow.py', data / 'current': release}
    roots = locations(home, environ)
    for host in hosts:
        if host in ('codex', 'claude'):
            for command in COMMANDS:
                links[roots[host] / command] = release / 'skills' / command
        else:
            links[roots[host] / 'skills/tkflow'] = release / 'skills/tkflow'
            directory = 'commands' if host == 'opencode' else 'prompts'
            for command in COMMANDS:
                links[roots[host] / directory / f'{command}.md'] = release / 'commands' / f'{command}.md'
    bundled = Path('/Applications/Obsidian.app/Contents/MacOS/obsidian-cli')
    if not shutil.which('obsidian') and bundled.is_file():
        links[home / '.local/bin/obsidian'] = bundled

    # Preflight every destination before changing ANY installed host entry.
    for target, source in links.items():
        if not target.exists() and not target.is_symlink():
            continue
        if target.is_symlink():
            existing = target.resolve()
            previous = state['links'].get(str(target))
            legacy = {root / 'tkflow.py', root / 'skills/tkflow', bundled}
            if existing == source or (previous and existing == Path(previous)) or existing in legacy:
                continue
        raise ValueError(f'Refusing to replace existing installation: {target}')
    if release.exists():
        marker = release / '.release.json'
        if not marker.is_file() or json.loads(marker.read_text()) != hashes:
            raise ValueError(f'Unrecognized installed release: {release}')
        for name, expected in hashes.items():
            path = release / name
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                raise ValueError(f'Installed resource was edited; preserve/reconcile it before upgrading: {path}')
    for target, source in links.items():
        print(f'{"Would install" if dry_run else "Install"} {target} -> {source}')
    if dry_run:
        return release
    if not release.exists():
        (data / 'releases').mkdir(parents=True, exist_ok=True)
        staging = Path(tempfile.mkdtemp(prefix='.staging-', dir=data / 'releases'))
        try:
            for name in hashes:
                destination = staging / name
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(root / name, destination)
            (staging / '.release.json').write_text(json.dumps(hashes, sort_keys=True, indent=2))
            staging.rename(release)
        finally:
            if staging.exists():
                shutil.rmtree(staging)
    for target, source in links.items():
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.is_symlink() or target.resolve() != source:
            temporary = target.with_name(target.name + '.tkflow-' + uuid.uuid4().hex)
            temporary.symlink_to(source, target_is_directory=source.is_dir())
            temporary.replace(target)
        state['links'][str(target)] = str(source)
    temporary = state_file.with_name('install-' + uuid.uuid4().hex + '.json')
    temporary.write_text(json.dumps(state, indent=2, sort_keys=True))
    temporary.replace(state_file)
    print('Installed for: ' + ', '.join(hosts))
    print('Start a new host session (Pi: /reload), then use /tkflow or /tkflow-blueprint.')
    print('Obsidian vault setup is separate: tkflow init, register, doctor, setup-plugin.')
    return release
