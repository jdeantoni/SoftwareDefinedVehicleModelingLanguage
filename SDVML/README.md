# SoftwareDefinedVehicleModelingLanguage
a simple DSL for SDV understandable timing Analysis

## Testing
### vscode extension
    npm run langium:generate
    npm run build
Then run the extension (`F5` on a `.ts` file and extension development environment is asked)

Some minimal examples can be found under the [demos](../demos/) folder. You can compile them by launchin the CLI which is in the [bin](bin) folder like this (considering you're in the demo folder)

    node ../SDVML/bin/cli.js generate test1.sdvml

It will compiled a network of communicating timed automata in the IF folder.

### web extension
You can also launch the minimal web interface. First build it with:
    
    npm run bundle

and launch the server with:

    npm run bundle:serve
