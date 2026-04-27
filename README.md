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

## To analyse implementation traces

- run the simulation of the system
- copy the generated files from the corresponding `generated` subdirectory (`build.ninja`, `microstep.sexp`, `network.sexp`, `tasks.csv` and `template.gnu`) into a separate directory
- copy your traces into `traces` (or another name) subdirectory with the files
- use `prepare_traces.sh <path to>/traces "C1_START,C2_FINISH"` script to convert them to the corresponding format (`*.trace` extension, correct header), where second argument specifies the common CSV header for services
- copy the provided trace file names in the script's stdout to replace the trace names used in the `build.ninja` file (line with `build ... reaction_time ...`)
- run the ninja and (hopefully) observe the histogram generated in `reaction/without` subdirectory (this is a reaction time without interval computation)
