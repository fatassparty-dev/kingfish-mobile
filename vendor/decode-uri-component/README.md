# Navigation decoder compatibility package

Upstream `decode-uri-component@0.5.0` from the official npm tarball, SHA1
`4592fa1e1d640ec5e2760e2e168ad2ab5f2c9da1`. MIT license retained.
The only JavaScript change is `export default function` → `module.exports = function`.
React Navigation 7 uses query-string 7, which calls a CommonJS function.
A direct override to upstream 0.5.0 returns an ESM namespace in that path.
No algorithm edits. Remove this compatibility package once Navigation's
supported dependency chain consumes the patched decoder directly.

Advisory: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr
