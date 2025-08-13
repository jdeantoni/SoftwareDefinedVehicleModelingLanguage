import {
    Actuator,
    isActuator,
    isPeriodicTriggering,
    isSensor,
    PeriodicTriggering,
    Sensor,
    Service,
    type Model,
    Component,
    Subscriber,
    Publisher,
    RandomVar,
} from '../generated/ast.js';
import { CompositeGeneratorNode, toString } from 'langium/generate';

function expect(msg: string): never {
    throw new Error(msg)
}

function makeServiceName(component: Component, service: Service): string {
    return component.name + "_" + service.name
}

function getSubscriptionSignal(service: Service, sub: Subscriber): string {
    return sub.appSignal?.ref?.name ?? sub.sensorSignal?.ref?.name ?? expect(`Reference to subscription signal in service "${service.name}" was not properly resolved.`);
}
function getPublishingSignal(service: Service, pub: Publisher): string {
    return pub.appSignal?.ref?.name ?? pub.actuatorSignal?.ref?.name ?? expect(`Reference to publishing signal in service "${service.name}" was not properly resolved.`);
}

function randomVariableToRange(v: RandomVar, sigma: number): { left: number, right: number } {
    console.log(`${v.mean} ${v.stdDev} ${sigma}`);
    return { left: v.mean.value - sigma * v.stdDev.value, right: v.mean.value + sigma * v.stdDev.value };
}

type serviceKey = string;
type signalName = string;

class Context {
    signalsToServices: Map<signalName, serviceKey[]>;
    servicesToSignals: Map<serviceKey, signalName[]>;
    serviceInputs: Map<serviceKey, signalName[]>;

    constructor(signalsToServices: Map<signalName, serviceKey[]>, serviceInputs: Map<serviceKey, signalName[]>, servicesToSignals: Map<serviceKey, signalName[]>) {
        this.signalsToServices = signalsToServices;
        this.serviceInputs = serviceInputs;
        this.servicesToSignals = servicesToSignals;
    }
}

// function printMap<K, V>(m: Map<K, V>): void {
//     m.forEach((value, key) => {
//         console.log(`${key}: ${value}`);
//     });
// }

export function makeContext(model: Model): Context {
    var signalsToServices = new Map<string, string[]>();
    var servicesToSignals = new Map<string, string[]>();
    var serviceInputs = new Map<string, string[]>();

    for (var component of model.components) {
        for (var service of component.services) {
            const serviceName = makeServiceName(component, service);
            for (var subscription of service.subscribers) {
                const subscriptionSignal = getSubscriptionSignal(service, subscription);
                let targetServices = signalsToServices.get(subscriptionSignal) ?? [];
                targetServices.push(serviceName);
                signalsToServices.set(subscriptionSignal, targetServices);
            };
            for (var publish of service.publishers) {
                const publishingSignal = getPublishingSignal(service, publish);
                let sourceServices = servicesToSignals.get(serviceName) ?? [];
                sourceServices.push(publishingSignal);
                servicesToSignals.set(serviceName, sourceServices);
            };
        }
    }
    return new Context(signalsToServices, serviceInputs, servicesToSignals);
}

export function generateIFScript(model: Model, context: Context): string {
    const sigma = 2;

    const ifContent = new CompositeGeneratorNode();
    ifContent.append("system " + model.name + ";\n");
    ifContent.append("type int = range 0 .. 255;\n");

    for (var signal of context.signalsToServices.keys()) {
        ifContent.append("signal " + signal + "();\n");
    }

    for (var sig of model.vss.signals) {
        if (isSensor(sig)) {
            generateIFSensor(sig, ifContent, context, sigma);
        }
        if (isActuator(sig)) {
            generateIFActuator(sig, ifContent, sigma);
        }
    }

    for (var c of model.components) {
        for (var s of c.services) {
            generateIFService(c, s, ifContent, context, sigma);
        }
    }

    ifContent.append("endsystem;\n");
    return toString(ifContent);
}


function generateIFService(component: Component, service: Service, ifContent: CompositeGeneratorNode, context: Context, sigma: number) {
    const serviceName: string = makeServiceName(component, service);
    var publines = "";
    for (var pub of service.publishers) {
        const signalName = getPublishingSignal(service, pub);
        publines += `\n\t\t\toutput ${signalName}() to {${signalName}}0;`;

        for (var targetService of context.signalsToServices.get(signalName) ?? []) {
            publines += `\n\t\t\toutput ${signalName}() to {${targetService}}0;`;
        }
    }

    var inpData: string[] = ["", "", "", "", ""];
    var inpNxtState: string[] = ["first", "jitter", "processing1", "processing2", "wait"];
    var idxState = 0;
    for (var nxtState of inpNxtState) {
        for (var inputSignal of context.serviceInputs.get(serviceName) ?? []) {
            inpData[idxState] += `\n\t\tinput ${inputSignal}();\n\t\t\ttask nbData := nbData + 1;\n\t\t\tnextstate ${nxtState};`;
        }
        idxState++;
    }

    const { left: left_exec_bound, right: right_exec_bound } = randomVariableToRange(service.execTime, sigma);

    ifContent.append("process " + serviceName + "(1);\n");
    if (isPeriodicTriggering(service.trigRule)) {
        const { left: left_period_bound, right: right_period_bound } = randomVariableToRange(service.trigRule.period, sigma);
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
        when x <= ${left_period_bound};
            set x := 0;
            nextstate jitter;${inpData[0]}
    endstate;
    state jitter;
        deadline delayable;
        when x <= ${right_period_bound - left_period_bound};
            set e := 0;
            nextstate preprocessing;${inpData[1]}
    endstate;
    state preprocessing;
        deadline eager;
        provided nbData =  0;
            informal "${serviceName}_USELESS_EXEC";
            nextstate processing1;
        deadline eager;
        provided nbData <>  0;
            informal "${serviceName}_USEFUL_EXEC";
            task nbData := 0;
            nextstate processing2;
    endstate;
    state processing1;
        deadline delayable;
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${serviceName}_FINISH";
            reset e;
            nextstate wait;${inpData[2]}
    endstate;
    state processing2;
        deadline delayable;
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${serviceName}_FINISH";${publines}
            reset e;
            nextstate wait;${inpData[3]}
    endstate;
    state wait;
        when x = ${service.trigRule.period.mean.value};
            set x := 0;
            nextstate jitter;${inpData[4]}
    endstate;\n`);
    } else {
        ifContent.append("\tvar e clock;");
        ifContent.append(`
    state wait #start ;
        input ${serviceName}();
            informal "${serviceName}_START";
            set e := 0;
            nextstate processing;
    endstate;
    state processing;
        deadline delayable;
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${serviceName}_FINISH";${publines}
            reset e;
            nextstate wait;
    endstate;\n`);
    }
    ifContent.append("endprocess;\n");

}

function generateIFSensor(sig: Sensor, ifContent: CompositeGeneratorNode, context: Context, sigma: number) {
    var ssp = sig.ssp;
    var sensorSignal = sig.name;
    var siglines = "";
    for (var serviceName of context.signalsToServices.get(sensorSignal)!) {
        siglines += `\n\t\t\toutput ${sensorSignal}() to {${serviceName}}0;`;
    }
    const { left: left_exec_bound, right: right_exec_bound } = randomVariableToRange(sig.dl, sigma);
    const { left: left_period_bound, right: right_period_bound } = randomVariableToRange(ssp, sigma);
    ifContent.append(`process ${sensorSignal}(1);
    var x clock;
    var e clock;
    state start #start ;
        set x := 0;
        nextstate first;
    endstate;
    state first ;
        deadline delayable;
        when x <= ${left_period_bound};
            set x := 0;
            nextstate jitter;
    endstate;
    state jitter;
        deadline delayable;
        when x <= ${right_period_bound - left_period_bound} ;
            informal "${sensorSignal}_START";
            set e := 0;
            nextstate exec;
    endstate;
    state exec;
        deadline delayable;
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${sensorSignal}_FINISH";
            reset e;${siglines}
            nextstate wait;
    endstate;
    state wait;
        when x = ${ssp.mean.value};
            set x := 0;
            nextstate jitter;
    endstate;
endprocess;
`);
}


function generateIFActuator(sig: Actuator, ifContent: CompositeGeneratorNode, sigma: number) {
    const { left: left_exec_bound, right: right_exec_bound } = randomVariableToRange(sig.ad, sigma);
    ifContent.append(`process ${sig.name}(1);`)
    if (isPeriodicTriggering(sig.trigRule)) {
        const { left: left_period_bound, right: right_period_bound } = randomVariableToRange(sig.trigRule.period, sigma);
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
        when x <= ${left_period_bound};
            set x := 0;
            nextstate jitter;
        input ${sig.name}();
			task nbData := nbData + 1;
			nextstate first;
    endstate;
    state jitter;
        deadline delayable;
        when x <= ${right_period_bound - left_period_bound};
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
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${sig.name}_FINISH";
            reset e;
            nextstate wait;
        input ${sig.name}();
			task nbData := nbData + 1;
			nextstate processing;
    endstate;
    state wait;
        when x = ${AP.mean.value};
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
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${sig.name}_FINISH";
            reset e;
            nextstate wait;
    endstate;\n`);
    }

    ifContent.append("endprocess;\n");

}

// export function generateMRTCCSLSpec(
//     filePath: string,
//     destination: string | undefined
// ): string {
//     let
//     return ""
// }