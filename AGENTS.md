# Repository Guidance for Agents

## Scope and architecture

eBrowser is a C11 browser for constrained and desktop targets. Core browser
modules live in `src/`, public interfaces in `include/ebrowser/`, platform
abstractions in `platform/`, and target ports in `port/eos/`, `port/sdl2/`, and
`port/web/`. Security and network changes require particular care in
`src/security/`, `src/network/`, `src/privacy/`, and `src/engine/`. Companion
surfaces live in `web-app/`, `mobile/`, `extension/`, and `enterprise/`.

Follow the specialist role briefs in [`.ai/`](./.ai/) and the handoff protocol in
[`HANDOFF.md`](./HANDOFF.md). The implementer must not act as the approving
reviewer. Keep public headers and their implementations synchronized, and avoid
mixing unrelated browser-engine, UI, and companion-app changes.

## Build and validation

- Configure native tests with `cmake -B build -DBUILD_TESTING=ON`.
- Build with `cmake --build build`.
- Run native tests with `ctest --test-dir build --output-on-failure`.
- Run the Python suites with `python run_all_tests.py`.
- For target-specific work, validate the affected EoS, SDL2, WebAssembly,
  mobile, or web-app path using its local manifest and workflow.
- For parser, URL, cache, cookie, TLS, or sandbox changes, add focused regression
  tests including malformed input and failure paths.

Do not claim a target was tested when its toolchain was unavailable. Record the
missing SDK or runtime explicitly.

## Change discipline

Preserve C11 portability, warning-clean builds, ownership rules, and bounds
checks. Never weaken TLS verification, origin/referrer handling, sandboxing, or
input validation to make a test pass. Do not commit build directories, fetched
dependencies, credentials, certificates, or generated packages.

Every human-authored pull request must use a GitHub-recognized closing keyword
for an issue in this repository, for example `Fixes #123`. Cross-repository
issues and plain issue mentions do not satisfy the linked-issue policy. Follow
[`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md), and
keep the published Wiki snapshot in [`docs/wiki/`](./docs/wiki/) synchronized
when Wiki content changes.
