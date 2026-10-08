# Contributing to Openverse SFX

Start with the [README](README.md) for setup and the [development notes](docs/DEVELOPMENT.md) for the code structure.

## Bugs and ideas

Search the [existing issues](https://github.com/KarthikeyanRanasthala/creator-plugin-openverse-sfx/issues) before opening a new one. For a bug, include reproduction steps, expected and actual behavior, browser version, and whether you used Creator or the standalone preview. A public sound/source link and a cropped screenshot can help reproduce audio issues.

For a feature, describe the animation workflow it would help. Keep the plugin focused on **Search → Preview → Add** in a compact dark panel. Creator already provides trimming, volume, and fades.

## Pull requests

1. Fork the repository and create a branch for one focused change.
2. Install dependencies with `npm ci` and follow the local development steps in the README.
3. Run `npm test`, `npm run lint`, and `npm run build`.
4. For UI or import changes, verify the real flow in Creator and include a screenshot or short recording.
5. Describe the problem, resulting behavior, and validation in your pull request. Update documentation when behavior changes.

Add tests when they verify meaningful behavior, such as search serialization, supported formats, storage, timing, or import cleanup. Documentation-only changes do not need new tests.

Keep anonymous Openverse access and the browser-only architecture. Do not add a backend, credentials, or tracking as part of an unrelated change. Preserve the published plugin's manifest ID and storage compatibility. A separately published fork should use its own plugin ID.

## Licensing

Contributions to the plugin code are made under the repository's [MIT license](LICENSE). Preserve third-party notices, and check the original license before adding any audio or other assets. Discovered sounds are not covered by the plugin's code license.
