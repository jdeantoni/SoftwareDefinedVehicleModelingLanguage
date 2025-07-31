import {
    Actuator,
    Component,
    EventTriggering,
    isActuator,
    isPeriodicTriggering,
    isSensor,
    PeriodicTriggering,
    Sensor,
    type Model,
} from '../generated/ast.js';
import { CompositeGeneratorNode, toString } from 'langium/generate';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {extractDestinationAndName } from './cli-util.js';

export function generateIFScript(
    model: Model,
    filePath: string,
    destination: string | undefined
): string {
    const data = extractDestinationAndName(filePath, destination);
    const resPath= path.join(data.destination, 'IF')
    fs.mkdirSync(resPath, { recursive: true });
    const generatedFilePath = `${path.join(resPath, data.name)}.if`;

    let appSignals: string[] = [];
    let sigComps = new Map<string, string[]>();
    for(var sig of model.vss.signals){
        sigComps.set(sig.name, []);
    }
    let compSensors = new Map<string, string[]>();
    for(var comp of model.components){
        for (var compservtemp of comp.services) {
            compSensors.set(comp.name + ";" + compservtemp.name, []);
        }
    }
    let compPubTargets = new Map<string, string[]>();
    for (var co of model.components){
        for (var serv of co.services) {
            var tmpSensors: string[] = [];
            for (var cosub of serv.subscribers) {
                tmpSensors.push(cosub.name!);
                var tmpNewComps: string[] = [];
                if (sigComps.get(cosub.name!) == undefined) {
                    sigComps.set(cosub.name!, tmpNewComps);
                }
                var tmpComps: string[] = [];
                for (var com of sigComps.get(cosub.name!)!) {
                    tmpComps.push(com);
                }
                tmpComps.push(co.name + "_" + serv.name);
                sigComps.set(cosub.name!, tmpComps);
            }
            compSensors.set(co.name + ";" + serv.name, tmpSensors)
            for (var copub of serv.publishers) {
                if (copub.sigName != undefined) {
                    appSignals.push(copub.sigName!);
                    var tmpTargets: string[] = [];
                    var keyCompSub = co.name + ";" + serv.name + ";" + copub.sigName;
                    if (compPubTargets.get(keyCompSub) == undefined) {
                        compPubTargets.set(keyCompSub, tmpTargets);
                    }
                    var tmpNewTargets: string[] = [];
                    for (var newco of model.components) {
                        for (var servnewco of newco.services) {
                            for (var cosub of servnewco.subscribers) {
                                if (cosub.sigName != undefined) {
                                    if (cosub.sigName == copub.sigName) {
                                        tmpNewTargets.push(newco.name + "_" + servnewco.name)
                                    }
                                }
                            }
                        }
                    }
                    compPubTargets.set(keyCompSub, tmpNewTargets);
                }
            }
        }
    }

    const  ifContent = new CompositeGeneratorNode();
    ifContent.append("system "+model.name+";\n");
    ifContent.append("type int = range 0 .. 255;\n");

    var sigNames:string[] = [];
    for(var sig of model.vss.signals){
        sigNames.push(sig.name);
    }

    for(var appSig of appSignals) {
        if (!sigNames.includes(appSig)) {
            sigNames.push(appSig);
        }
    }
    for(var sigx of sigNames){
        ifContent.append("signal "+sigx+"();\n");
    }

    for(var sig of model.vss.signals){
        if (isSensor(sig)){
            prettyPrintSensorSignal(sig, ifContent, sigComps);
        }
        if (isActuator(sig)){
            prettyPrintActuatorSignal(sig, ifContent);
        }
    }

    for(var c of model.components){
        prettyPrintComponent(c, ifContent, compSensors, compPubTargets);
    }

    ifContent.append("endsystem;\n");

    fs.writeFileSync(generatedFilePath, toString(ifContent));

    return toString(generatedFilePath);
}


function prettyPrintComponent(c: Component, ifContent: CompositeGeneratorNode, compSensors: Map<string, string[]>, compPubTargets: Map<string, string[]>) {
    for (var s of c.services) {
        var publines = "";
        for (var pub of s.publishers) {
            if (pub.name != undefined) {
                publines += `\n\t\t\toutput ${pub.name}() to {${pub.name}}0;`;
            }
            if (pub.sigName != undefined) {
                for (var compPubTarget of compPubTargets.get(c.name + ";" + s.name + ";" + pub.sigName)!) {
                    publines += `\n\t\t\toutput ${pub.sigName}() to {${compPubTarget}}0;`;
                }
            }
        }
        var inpData:string[] = ["", "", "", "", ""];
        var inpNxtState:string[] = ["first", "jitter", "processing1", "processing2", "wait"];
        var idxState = 0;
        for (var nxtState of inpNxtState) {
            for (var senName of compSensors.get(c.name + ";" + s.name)!) {
                inpData[idxState] += `\n\t\tinput ${senName}();\n\t\t\ttask nbData := nbData + 1;\n\t\t\tnextstate ${nxtState};`;
            }
            idxState++;
        }

        var servID: string = c.name + "_" + s.name;
        ifContent.append("process " + servID + "(1);\n");
        if (isPeriodicTriggering(s.trigRule)) {
            var CP = (s.trigRule as PeriodicTriggering).period;
            ifContent.append(`\tvar x clock;
    var e clock;
    var nbData int;
    state start #start ;
        task nbData := 0;
        set x := 0;
        nextstate first;
    endstate;
    state first;
        deadline delayable;
        when x <= ${CP.mean - (2 * CP.stdDev)};
            set x := 0;
            nextstate jitter;${inpData[0]}
    endstate;
    state jitter;
        deadline delayable;
        when x <= ${CP.stdDev * 4};
            set e := 0;
            nextstate preprocessing;${inpData[1]}
    endstate;
    state preprocessing;
        deadline eager;
        provided nbData =  0;
            informal "${c.name}_USELESS_EXEC";
            nextstate processing1;
        deadline eager;
        provided nbData <>  0;
            informal "${c.name}_USEFUL_EXEC";
            task nbData := 0;
            nextstate processing2;
    endstate;
    state processing1;
        deadline delayable;
        when e >= ${s.execTime.mean-2*s.execTime.stdDev} and e <= ${s.execTime.mean+2*s.execTime.stdDev};
            informal "${c.name}_FINISH";
            reset e;
            nextstate wait;${inpData[2]}
    endstate;
    state processing2;
        deadline delayable;
        when e >= ${s.execTime.mean-2*s.execTime.stdDev} and e <= ${s.execTime.mean+2*s.execTime.stdDev};
            informal "${c.name}_FINISH";${publines}
            reset e;
            nextstate wait;${inpData[3]}
    endstate;
    state wait;
        when x = ${CP.mean};
            set x := 0;
            nextstate jitter;${inpData[4]}
    endstate;\n`);
        } else {
            var tmpSigInput = c.name;
            if ((s.trigRule as EventTriggering).trigger?.ref?.name != undefined) {
                tmpSigInput = (s.trigRule as EventTriggering).trigger?.ref?.name!;
            }
            ifContent.append("\tvar e clock;");
        ifContent.append(`
    state wait #start ;
        input ${tmpSigInput}();
            informal "${servID}_START";
            set e := 0;
            nextstate processing;
    endstate;
    state processing;
        deadline delayable;
        when e >= ${s.execTime.mean - (2 * s.execTime.stdDev)} and e <= ${s.execTime.mean + (2 * s.execTime.stdDev)};
            informal "${servID}_FINISH";${publines}
            reset e;
            nextstate wait;
    endstate;\n`);
        }
        ifContent.append("endprocess;\n");
    }
}

function prettyPrintSensorSignal(sig: Sensor, ifContent: CompositeGeneratorNode, sigComps: Map<string, string[]>) {
    var ssp = sig.ssp;
    var sigName = sig.name;
    var siglines = "";
    for (var sigline of sigComps.get(sigName)!) {
        siglines += `\n\t\t\toutput ${sigName}() to {${sigline}}0;`;
    }
    ifContent.append(`process ${sigName}(1);
    var x clock;
    var e clock;
    state start #start ;
        set x := 0;
        nextstate first;
    endstate;
    state first ;
        deadline delayable;
        when x <= ${ssp.mean - (2 * ssp.stdDev)};
            set x := 0;
            nextstate jitter;
    endstate;
    state jitter;
        deadline delayable;
        when x <= ${sig.ssp.stdDev * 4} ;
            informal "${sigName}_START";
            set e := 0;
            nextstate exec;
    endstate;
    state exec;
        deadline delayable;
        when e >= ${sig.dl.mean -  (2 * sig.dl.stdDev)} and e <= ${sig.dl.mean + (2 * sig.dl.stdDev)};
            informal "${sigName}_FINISH";
            reset e;${siglines}
            nextstate wait;
    endstate;
    state wait;
        when x = ${ssp.mean};
            set x := 0;
            nextstate jitter;
    endstate;
endprocess;
`);
}


function prettyPrintActuatorSignal(sig: Actuator, ifContent: CompositeGeneratorNode) {
    ifContent.append(`process ${sig.name}(1);`)
    if (isPeriodicTriggering(sig.trigRule)){
        var AP = (sig.trigRule as PeriodicTriggering).period;
        ifContent.append(`
    var x clock;
    var e clock;
    var nbData int;
    state start #start ;
        task nbData := 0;
        set x := 0;
        nextstate first;
    endstate;
    state first ;
        deadline delayable;
        when x <= ${AP.mean - (2 * AP.stdDev)};
            set x := 0;
            nextstate jitter;
        input ${sig.name}();
			task nbData := nbData + 1;
			nextstate first;
    endstate;
    state jitter;
        deadline delayable;
        when x <= ${AP.stdDev * 4};
            set e := 0;
            nextstate preprocessing;
        input ${sig.name}();
			task nbData := nbData + 1;
			nextstate jitter;
    endstate;
    state preprocessing;
        deadline eager;
        provided nbData =  0;
            informal "${sig.name}_USELESS_ACT";
            nextstate processing;
        deadline eager;
        provided nbData <>  0;
            informal "${sig.name}_USEFUL_ACT";
            task nbData := 0;
            nextstate processing;
    endstate;
    state processing;
        deadline delayable;
        when e >= ${sig.ad.mean-2*sig.ad.stdDev} and e <= ${sig.ad.mean+2*sig.ad.stdDev};
            informal "${sig.name}_FINISH";
            reset e;
            nextstate wait;
        input ${sig.name}();
			task nbData := nbData + 1;
			nextstate processing;
    endstate;
    state wait;
        when x = ${AP.mean};
            set x := 0;
            nextstate jitter;
        input ${sig.name}();
			task nbData := nbData + 1;
			nextstate wait;
    endstate;
`);
    } else {
        ifContent.append(`
    var e clock;
    state wait #start ;
        input ${sig.name}();
            informal "${sig.name}_START";
            set e := 0;
            nextstate processing;
    endstate;
    state processing;
        deadline delayable;
        when e >= ${sig.ad.mean - (2 * sig.ad.stdDev)} and e <= ${sig.ad.mean + (2 * sig.ad.stdDev)};
            informal "${sig.name}_FINISH";
            reset e;
            nextstate wait;
    endstate;\n`);
        }

        ifContent.append("endprocess;\n");

}
