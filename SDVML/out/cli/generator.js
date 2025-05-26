import { isActuator, isPeriodicTriggering, isSensor, } from '../language/generated/ast.js';
import { CompositeGeneratorNode, toString } from 'langium/generate';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { extractDestinationAndName } from './cli-util.js';
export function generateIFScript(model, filePath, destination) {
    const data = extractDestinationAndName(filePath, destination);
    const resPath = path.join(data.destination, 'IF');
    fs.mkdirSync(resPath, { recursive: true });
    const generatedFilePath = `${path.join(resPath, data.name)}.if`;
    for (var co of model.components) {
        if (co.services.length > 1 || co.services.length <= 0) {
            console.error("components must have one and only one services so far");
        }
    }
    const ifContent = new CompositeGeneratorNode();
    ifContent.append("system " + model.name + ";\n");
    ifContent.append("type int = range 0 .. 255;\n");
    var sigNames = [];
    for (var sig of model.vss.signals) {
        sigNames.push(sig.name);
        ifContent.append("Signal " + sig.name + "();\n");
    }
    for (var sig of model.vss.signals) {
        var sigName = sig.name;
        if (isSensor(sig)) {
            prettyPrintSensorSignal(sig, ifContent, sigName);
        }
        if (isActuator(sig)) {
            prettyPrintActuatorSignal(sig, ifContent, sigName);
        }
    }
    for (var c of model.components) {
        prettyPrintPeriodiComponent(c, ifContent);
    }
    fs.writeFileSync(generatedFilePath, toString(ifContent));
    return toString(generatedFilePath);
}
function prettyPrintPeriodiComponent(c, ifContent) {
    var _a, _b;
    for (var s of c.services) {
        var servID = c.name + "_" + s.name;
        ifContent.append("process " + servID + "(1);\n");
        ifContent.append("\tvar x clock;\n");
        ifContent.append(`
    state wait #start ;
        input ${(_a = c.subscribers.at(0)) === null || _a === void 0 ? void 0 : _a.name}();
            informal "${servID}_START";
            set x := 0;
            nextstate processing;
    endstate;
    state processing;
        deadline delayable;
        when x >= ${s.execTime.mean - 2 * s.execTime.stdDev} and x <= ${s.execTime.mean + 2 * s.execTime.stdDev};
            informal "${servID}_FINISH";
            output ${(_b = c.publishers.at(0)) === null || _b === void 0 ? void 0 : _b.name}() to {TODO}0;
            reset x;
            nextstate wait;
    endstate;\n`);
        ifContent.append("endprocess;\n");
    }
}
function prettyPrintSensorSignal(sig, ifContent, sigName) {
    var ssp = sig.ssp;
    ifContent.append(`process ${sigName}(1);
    var x clock;
    var e clock;
    
    state startS #start ;
        set x := 0;
        nextstate first;
    endstate;
    state first ;
        deadline delayable;
        when x <= ${ssp.mean}; //mean - stdDev ?
            informal "${sigName}_START";
            set x := 0;
            set e := 0;
            nextstate exec;
    endstate;
    state exec;
        deadline delayable;
        when e >= ${sig.ssp.mean - 2 * sig.ssp.stdDev} and e <= ${sig.ssp.mean + 2 * sig.ssp.stdDev};
            informal "${sigName}_FINISH";
            reset e;
            output ${sigName}();
            nextstate wait;
    endstate;
    state wait;
        when x = ${ssp.mean};
            set x := 0;
            nextstate jitter;
    endstate;
    state jitter;
        deadline delayable;
        when x <= ${sig.ssp.stdDev * 2} ;
            informal "${sigName}_START";
            set e := 0;
            nextstate exec;
    endstate;
endprocess;
`);
}
function prettyPrintActuatorSignal(sig, ifContent, sigName) {
    if (isPeriodicTriggering(sig.trigRule)) {
        var AP = sig.trigRule.period;
        ifContent.append(`process ${sig.name}(1);
    var x clock;
    var e clock;
    var nbData int;
    state startA #start ;
        task nbData := 0;
        set x := 0;
        nextstate first;
    endstate;
    state first ;
        when x >= 0 and x <= ${AP.mean}; //mean - stdDev ?
            set x := 0;
            set e := 0;
            nextstate preprocessing;
        
        input ${sig.name};
            task nbData := nbData + 1;
            nextstate first;
    endstate;
    state wait;
        when x = ${AP.mean};
            set x := 0;
            nextstate jitter;
        
        input ${sig.name};
            task nbData := nbData + 1;
            nextstate wait;
    endstate;
    state jitter;
        deadline delayable;
        when x <= (${sig.ad.mean - sig.ad.stdDev} * 2));
            set e := 0;
            nextstate preprocessing;
        
        input ${sig.name};
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
        when x >= ${sig.ad.mean - 2 * sig.ad.stdDev} and x <= ${sig.ad.mean + 2 * sig.ad.stdDev};
            informal "${sig.name}_FINISH";
            reset e;
            nextstate wait;
        
        input ${sig.name}();
            task nbData := nbData + 1;
            nextstate processing;
    endstate;
endprocess;
`);
    }
    else {
        ifContent.append("event triggered actuator not supported yet\n");
    }
}
//# sourceMappingURL=generator.js.map