# Development

## Contribution source of truth

[CONTRIBUTING](https://github.com/embeddedos-org/eBrowser/blob/master/CONTRIBUTING.md)

Before proposing a change, also review the [README](https://github.com/embeddedos-org/eBrowser/blob/master/README.md). Keep changes scoped, add tests appropriate to the affected behavior, and follow the repository's current automation and review requirements.

## Build and dependency inputs found

`CMakeLists.txt`, `Dockerfile`, `enterprise/docker/Dockerfile`, `enterprise/docker/docker-compose.yml`, `fuzz/CMakeLists.txt`, `mobile/package.json`, `platform/CMakeLists.txt`, `port/CMakeLists.txt`, `src/browser/CMakeLists.txt`, `src/engine/CMakeLists.txt`, `src/extensions/CMakeLists.txt`, `src/input/CMakeLists.txt`, and 16 more.

## Tests found in the default-branch tree

`tests/CMakeLists.txt`, `tests/__init__.py`, `tests/benchmark.c`, `tests/functional/__init__.py`, `tests/functional/test_functional_e2e.py`, `tests/http2_server.c`, `tests/load_test.c`, `tests/load_test_combined.c`, `tests/perf_regression.c`, `tests/performance/__init__.py`, `tests/performance/test_performance_benchmarks.py`, `tests/simulation/__init__.py`, and 25 more.

## Documented test commands

These commands are reproduced from the inspected root README or contributing guide:

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
```

```bash
cmake --build build -j
```

```bash
cmake -B build -DBUILD_TESTING=ON
```

```bash
ctest --test-dir build
```

```bash
cmake -B build
```

```bash
cmake --build build
```

```bash
ctest --test-dir build --output-on-failure
```

## Verification baseline

This inventory comes from `master` at [`bb37c5bc4171`](https://github.com/embeddedos-org/eBrowser/commit/bb37c5bc41712c36eb5432d0699cbdb0bfec806e) and found 37 test-related paths among 313 files. Re-check the source tree when that commit is no longer current.
