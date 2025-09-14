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
    TriggeringRule,
    isEventTriggering,
    FunctionalChain,
} from '../generated/ast.js';
import { CompositeGeneratorNode, toString } from 'langium/generate';

function expect(msg: string): never {
    throw new Error(msg)
}

export function makeServiceName(component: Component, service: Service): string {
    return component.name + "_" + service.name
}

export function getSubscriptionSignal(serviceName: string, sub: Subscriber): string {
    return sub.sensorSignal?.ref?.name ?? sub.appSignal?.ref?.name ?? expect(`Reference to subscription signal in service "${serviceName}" was not properly resolved.`);
}
export function getPublishingSignal(serviceName: string, pub: Publisher): string {
    return pub.actuatorSignal?.ref?.name ?? pub.appSignal?.ref?.name ?? expect(`Reference to publishing signal in service "${serviceName}" was not properly resolved.`);
}

function randomVariableToRange(v: RandomVar, sigma: number): { left: number, right: number } {
    console.log(`${v.mean} ${v.stdDev} ${sigma}`);
    return { left: v.mean.value - sigma * v.stdDev.value, right: v.mean.value + sigma * v.stdDev.value };
}

export type serviceKey = string;
export type componentKey = string;
export type signalName = string;

export class Context {
    signalsToServices: Map<signalName, serviceKey[]>;
    servicesToSignals: Map<serviceKey, signalName[]>;
    runnableInputs: Map<serviceKey, signalName[]>;
    runnables: Map<serviceKey, Runnable>;
    servicesToComponents: Map<serviceKey, componentKey[]>;

    constructor(model: Model) {
        this.signalsToServices = new Map<string, string[]>();
        this.servicesToSignals = new Map<string, string[]>();
        this.runnableInputs = new Map<string, string[]>();
        this.servicesToComponents = new Map();

        for (var component of model.components) {
            for (var service of component.services) {
                const serviceName = makeServiceName(component, service);
                const inputs = [];
                for (var subscription of service.subscribers) {
                    const subscriptionSignal = getSubscriptionSignal(service.name, subscription);
                    let targetServices = this.signalsToServices.get(subscriptionSignal) ?? [];
                    targetServices.push(serviceName);
                    this.signalsToServices.set(subscriptionSignal, targetServices);
                    inputs.push(subscriptionSignal);
                };
                this.runnableInputs.set(serviceName, inputs);
                for (var publish of service.publishers) {
                    const publishingSignal = getPublishingSignal(service.name, publish);
                    let sourceServices = this.servicesToSignals.get(serviceName) ?? [];
                    sourceServices.push(publishingSignal);
                    this.servicesToSignals.set(serviceName, sourceServices);
                };
                const relatedComponents = this.servicesToComponents.get(service.name) ?? [];
                relatedComponents.push(component.name);
                this.servicesToComponents.set(service.name, relatedComponents);
            }
        }

        for (var vssSignal of model.vss.signals) {
            if (isSensor(vssSignal)) {
                this.servicesToSignals.set(vssSignal.name, [vssSignal.name]);
            } else {
                this.runnableInputs.set(vssSignal.name, [vssSignal.name]);
                let receivers = this.signalsToServices.get(vssSignal.name) ?? [];
                receivers.push(vssSignal.name);
                this.signalsToServices.set(vssSignal.name, receivers);
            }
        }

        let runnable_vss: [string, Runnable][] = model.vss.signals.map(s => {
            if (isActuator(s)) {
                if (isEventTriggering(s.trigRule)) {
                    return [s.name, { name: s.name, trigger: { $type: "EventTrigger", event: s.name }, execution: s.ad }];
                } else {
                    return [s.name, { name: s.name, trigger: { $type: "PeriodicTrigger", period: s.trigRule.period }, execution: s.ad }];
                }
            } else {
                const trigger: Trigger = { $type: "PeriodicTrigger", period: s.ssp };
                return [s.name, { name: s.name, trigger, execution: s.dl }];
            }
        });
        let runnable_services = model.components.flatMap(c => c.services.map(s => [s.name, { name: makeServiceName(c, s), trigger: trigRuleToTrigger(s.name, s.trigRule), execution: s.execTime }]) as [string, Runnable][]);
        this.runnables = new Map(runnable_vss.concat(runnable_services))
    }
}

// function printMap<K, V>(m: Map<K, V>): void {
//     m.forEach((value, key) => {
//         console.log(`${key}: ${value}`);
//     });
// }

const sigma = 2;

export function generateIFScript(model: Model, context: Context): string {

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
        const signalName = getPublishingSignal(service.name, pub);
        // publines += `\n\t\t\toutput ${signalName}() to {${signalName}}0;`;

        for (var targetService of context.signalsToServices.get(signalName) ?? []) {
            publines += `\n\t\t\toutput ${signalName}() to {${targetService}}0;`;
        }
    }

    var inpData: string[] = ["", "", "", "", ""];
    var inpNxtState: string[] = ["first", "jitter", "processing1", "processing2", "wait"];
    var idxState = 0;
    for (var nxtState of inpNxtState) {
        for (var inputSignal of context.runnableInputs.get(serviceName) ?? []) {
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
        const signalName = getSubscriptionSignal(service.name, service.trigRule.trigger?.ref!);
        ifContent.append("\tvar e clock;");
        ifContent.append(`
    state wait #start ;
        input ${signalName}();
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

interface EventTrigger {
    $type: 'EventTrigger'
    event: string
}

interface PeriodicTrigger {
    $type: 'PeriodicTrigger'
    period: RandomVar
}

type Trigger = EventTrigger | PeriodicTrigger;

class Runnable {
    name: string;
    trigger: Trigger;
    execution: RandomVar;
}

function trigRuleToTrigger(serviceName: string, rule: TriggeringRule): Trigger {
    if (isPeriodicTriggering(rule)) {
        return { $type: "PeriodicTrigger", period: rule.period };
    } else {
        return { $type: "EventTrigger", event: getSubscriptionSignal(serviceName, rule.trigger?.ref!) };
    }
}

export function generateMRTCCSLSpec(model: Model, context: Context
): string {
    let [assumptions, structure] = Array.from(context.runnables.values()).map(r => generateMRTCCSLRunnable(r, context, sigma)).reduce(
        (acc, v) => {
            let [assumes, structs] = acc;
            let [assumption, structure] = v;

            return [`${assumes}${assumption}\n`, `${structs}${structure}\n`];
        }, ["", ""]);
    return `assume {
    ${assumptions}
} structure {
    ${structure}
}`
}

function generateMRTCCSLRunnable(r: Runnable, ctx: Context, sigma: number): [string, string] {
    const { left: left_exec_bound, right: right_exec_bound } = randomVariableToRange(r.execution, sigma);
    let exec_duration_constr = `
    duration : ${left_exec_bound}ms <= ${r.name}_EXEC <= ${right_exec_bound}ms;
    continuous process ${r.name}_EXEC with normal(${r.execution.mean.value}ms, ${r.execution.stdDev.value}ms);`;
    let exec_constr = `${r.name}_FINISH = delay ${r.name}_START by ${r.name}_EXEC;`;
    let output_constr = ctx.servicesToSignals.get(r.name)?.reduce((acc, v) => `${acc}\n    ${r.name}_FINISH = ${v};`, "") ?? "";
    if (r.trigger.$type === "PeriodicTrigger") {
        const { left: left_period_bound, right: right_period_bound } = randomVariableToRange(r.trigger.period, sigma);
        return [`
    duration : ${left_period_bound - r.trigger.period.mean.value}ms <= ${r.name}_PERIOD_JITTER <= ${right_period_bound - r.trigger.period.mean.value}ms;
    continuous process ${r.name}_PERIOD_JITTER with normal(0s, ${r.trigger.period.stdDev.value}ms);
    ${exec_duration_constr}
        `,
        `
    ${r.name}_START = periodic ${r.trigger.period.mean.value}ms with jitter ${r.name}_PERIOD_JITTER;
    ${exec_constr}
    ${output_constr}
        `];
    } else {
        return [
            exec_duration_constr,
            `
    ${r.name}_START = ${r.trigger.event};
    ${exec_constr}
    ${output_constr}
            `
        ]
    }
}

export function generateFunctionalChainSpec(chain: FunctionalChain, ctx: Context): string {
    var chainString = `${chain.name}:`;
    var previous = undefined;
    for (let current of chain.participants) {
        let runnable = ctx.runnables.get(current.ref!.name) ?? expect(`chain participant with id "${current.ref?.name}" is not available.`)
        if (previous !== undefined) {
            chainString += (runnable.trigger.$type === "EventTrigger" && ctx.servicesToSignals.get(previous)?.includes(runnable.trigger.event)) ? "->" : "?";
        }
        chainString += `${runnable.name}_START->${runnable.name}_FINISH`;
        previous = runnable.name;
    }
    return chainString;
}