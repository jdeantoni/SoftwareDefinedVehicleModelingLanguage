# SoftwareDefinedVehicleModelingLanguage
a simple DSL for SDV understandable timing Analysis (check the [language README](./packages/language-server/README.md) for an example)

## Building the plugin

```
npm install
```
to resolve all dependencies

```
yarn
```
to compile.

## Using
### Analysis dependencies
- CADP toolkit
- IF toolset
- PRISM
- [MRTCCSL (commit 9c3e527ecf2c8e91fb09840c545acc79e923b859)](https://github.com/PaulRaUnite/mrtccsl/commit/9c3e527ecf2c8e91fb09840c545acc79e923b859)
    - install in a global switch
    - or specify the path to the switch in the plugin settings
- ninja build system
