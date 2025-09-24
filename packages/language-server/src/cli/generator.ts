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
    signalToPublishers: Map<signalName, serviceKey[]>;

    constructor(model: Model) {
        this.signalsToServices = new Map<string, string[]>();
        this.servicesToSignals = new Map<string, string[]>();
        this.runnableInputs = new Map<string, string[]>();
        this.servicesToComponents = new Map();
        this.signalToPublishers = new Map<string, string[]>();

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

                    let signalPublishers = this.signalToPublishers.get(publishingSignal) ?? [];
                    signalPublishers.push(serviceName);
                    this.signalToPublishers.set(publishingSignal, signalPublishers);
                };
                const relatedComponents = this.servicesToComponents.get(service.name) ?? [];
                relatedComponents.push(component.name);
                this.servicesToComponents.set(service.name, relatedComponents);
            }
        }

        for (var vssSignal of model.vss.signals) {
            if (isSensor(vssSignal)) {
                this.servicesToSignals.set(vssSignal.name, [vssSignal.name]);
                this.signalToPublishers.set(vssSignal.name, [vssSignal.name]);
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
                    return [s.name, { name: s.name, trigger: { $type: "PeriodicTrigger", period: s.trigRule.period, offset: s.trigRule.offset ?? 0}, execution: s.ad }];
                }
            } else {
                const trigger: Trigger = { $type: "PeriodicTrigger", period: s.ssp, offset: s.offset ?? 0};
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

    for (var signal of context.signalsToServices.keys() ?? []) {
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
        for (var targetService of context.signalsToServices.get(signalName) ?? []) {
            publines += `\n\t\t\toutput ${signalName}() to {${targetService}}0;`;
        }
    }

    const { left: left_exec_bound, right: right_exec_bound } = randomVariableToRange(service.execTime, sigma);
    ifContent.append("process " + serviceName + "(1);\n");
    if (isPeriodicTriggering(service.trigRule)) {
        const { left: left_period_bound, right: right_period_bound } = randomVariableToRange(service.trigRule.period, sigma);
        if (service.trigRule.offset) {
            const { left: left_offset_bound, right: right_offset_bound } = randomVariableToRange(service.trigRule.offset, sigma);
            var inpData: string[] = ["", "", "", "", "", "", "", ""];
            var inpNxtState: string[] = ["first", "processing1a", "processing1b", "wait1", "jitter", "processing2a", "processing2b", "wait2"];
            var idxState = 0;
            for (var nxtState of inpNxtState) {
                for (var inputSignal of context.runnableInputs.get(serviceName) ?? []) {
                    inpData[idxState] += `\n\t\tinput ${inputSignal}();\n\t\t\ttask nbData := true;\n\t\t\tnextstate ${nxtState};`;
                }
                idxState++;
            }
            ifContent.append(`\tvar x clock;
    var e clock;
    var nbData boolean;
    state start #start ;
        task nbData := false;
        set x := 0;
        nextstate first;
    endstate;
    state first;
        deadline delayable;
        when x >= ${left_offset_bound} and x <= ${right_offset_bound};
            set x := 0;
            set e := 0;
            nextstate preprocessing1;${inpData[0]}
    endstate;
    state preprocessing1;
        deadline eager;
        provided nbData = false;
            informal "${serviceName}_USELESS_EXEC";
            nextstate processing1a;
        deadline eager;
        provided nbData = true;
            informal "${serviceName}_USEFUL_EXEC";
            task nbData := false;
            nextstate processing1b;
    endstate;
    state processing1a;
        deadline delayable;
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${serviceName}_FINISH";${publines}
            reset e;
            nextstate wait1;${inpData[1]}
    endstate;
    state processing1b;
        deadline delayable;
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${serviceName}_FINISH";${publines}
            reset e;
            nextstate wait1;${inpData[2]}
    endstate;
    state wait1;
        when x = ${left_period_bound};
            set x := 0;
            nextstate jitter;${inpData[3]}
    endstate;
    state jitter;
        deadline delayable;
        when x <= ${right_period_bound - left_period_bound};
            set e := 0;
            nextstate preprocessing2;${inpData[4]}
    endstate;
    state preprocessing2;
        deadline eager;
        provided nbData = false;
            informal "${serviceName}_USELESS_EXEC";
            nextstate processing2a;
        deadline eager;
        provided nbData = true;
            informal "${serviceName}_USEFUL_EXEC";
            task nbData := false;
            nextstate processing2b;
    endstate;
    state processing2a;
        deadline delayable;
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${serviceName}_FINISH";${publines}
            reset e;
            nextstate wait2;${inpData[5]}
    endstate;
    state processing2b;
        deadline delayable;
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${serviceName}_FINISH";${publines}
            reset e;
            nextstate wait2;${inpData[6]}
    endstate;
    state wait2;
        when x = ${service.trigRule.period.mean.value};
            set x := 0;
            nextstate jitter;${inpData[7]}
    endstate;\n`);
        } else {
            var inpData: string[] = ["", "", "", "", ""];
            var inpNxtState: string[] = ["first", "jitter", "processing1", "processing2", "wait"];
            var idxState = 0;
            for (var nxtState of inpNxtState) {
                for (var inputSignal of context.runnableInputs.get(serviceName) ?? []) {
                    inpData[idxState] += `\n\t\tinput ${inputSignal}();\n\t\t\ttask nbData := true;\n\t\t\tnextstate ${nxtState};`;
                }
                idxState++;
            }
            ifContent.append(`\tvar x clock;
    var e clock;
    var nbData boolean;
    state start #start ;
        task nbData := false;
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
        provided nbData = false;
            informal "${serviceName}_USELESS_EXEC";
            nextstate processing1;
        deadline eager;
        provided nbData = true;
            informal "${serviceName}_USEFUL_EXEC";
            task nbData := false;
            nextstate processing2;
    endstate;
    state processing1;
        deadline delayable;
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${serviceName}_FINISH";${publines}
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
        }

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
    for (var serviceName of context.signalsToServices.get(sensorSignal) ?? []) {
        siglines += `\n\t\t\toutput ${sensorSignal}() to {${serviceName}}0;`;
    }
    const { left: left_exec_bound, right: right_exec_bound } = randomVariableToRange(sig.dl, sigma);
    const { left: left_period_bound, right: right_period_bound } = randomVariableToRange(ssp, sigma);
    if (sig.offset) {
        const { left: left_offset_bound, right: right_offset_bound } = randomVariableToRange(sig.offset, sigma);
        ifContent.append(`process ${sensorSignal}(1);
    var x clock;
    var e clock;
    state start #start ;
        set x := 0;
        nextstate first;
    endstate;
    state first;
        deadline delayable;
        when x >= ${left_offset_bound} and x <= ${right_offset_bound};
            informal "${sensorSignal}_START";
            set x := 0;
            set e := 0;
            nextstate exec1;
    endstate;
    state exec1;
        deadline delayable;
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${sensorSignal}_FINISH";
            reset e;${siglines}
            nextstate wait1;
    endstate;
    state wait1;
        when x = ${left_period_bound};
            set x := 0;
            nextstate jitter;
    endstate;
    state jitter;
        deadline delayable;
        when x <= ${right_period_bound - left_period_bound} ;
            informal "${sensorSignal}_START";
            set e := 0;
            nextstate exec2;
    endstate;
    state exec2;
        deadline delayable;
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${sensorSignal}_FINISH";
            reset e;${siglines}
            nextstate wait2;
    endstate;
    state wait2;
        when x = ${ssp.mean.value};
            set x := 0;
            nextstate jitter;
    endstate;
endprocess;
`);
    } else {
        ifContent.append(`process ${sensorSignal}(1);
    var x clock;
    var e clock;
    state start #start ;
        set x := 0;
        nextstate first;
    endstate;
    state first;
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
}


function generateIFActuator(sig: Actuator, ifContent: CompositeGeneratorNode, sigma: number) {
    const { left: left_exec_bound, right: right_exec_bound } = randomVariableToRange(sig.ad, sigma);
    ifContent.append(`process ${sig.name}(1);`)
    if (isPeriodicTriggering(sig.trigRule)) {
        const { left: left_period_bound, right: right_period_bound } = randomVariableToRange(sig.trigRule.period, sigma);
        var AP = (sig.trigRule as PeriodicTriggering).period;
        if (sig.trigRule.offset) {
            const { left: left_offset_bound, right: right_offset_bound } = randomVariableToRange(sig.trigRule.offset, sigma);
            ifContent.append(`
    var x clock;
    var e clock;
    var nbData boolean;
    state start #start ;
        task nbData := false;
        set x := 0;
        nextstate first;
    endstate;
    state first;
        deadline delayable;
        when x >= ${left_offset_bound} and x <= ${right_offset_bound};
            set x := 0;
            set e := 0;
            nextstate preprocessing1;
        input ${sig.name}();
			task nbData := true;
			nextstate first;
    endstate;
    state preprocessing1;
        deadline eager;
        provided nbData = false;
            informal "${sig.name}_USELESS_ACT";
            nextstate processing1;
        deadline eager;
        provided nbData = true;
            informal "${sig.name}_USEFUL_ACT";
            task nbData := false;
            nextstate processing1;
    endstate;
    state processing1;
        deadline delayable;
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${sig.name}_FINISH";
            reset e;
            nextstate wait1;
        input ${sig.name}();
			task nbData := true;
			nextstate processing1;
    endstate;
    state wait1;
        when x = ${left_period_bound};
            set x := 0;
            nextstate jitter;
        input ${sig.name}();
			task nbData := true;
			nextstate wait1;
    endstate;
    state jitter;
        deadline delayable;
        when x <= ${right_period_bound - left_period_bound};
            set e := 0;
            nextstate preprocessing2;
        input ${sig.name}();
			task nbData := true;
			nextstate jitter;
    endstate;
    state preprocessing2;
        deadline eager;
        provided nbData = false;
            informal "${sig.name}_USELESS_ACT";
            nextstate processing2;
        deadline eager;
        provided nbData = true;
            informal "${sig.name}_USEFUL_ACT";
            task nbData := false;
            nextstate processing2;
    endstate;
    state processing2;
        deadline delayable;
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${sig.name}_FINISH";
            reset e;
            nextstate wait2;
        input ${sig.name}();
			task nbData := true;
			nextstate processing2;
    endstate;
    state wait2;
        when x = ${AP.mean.value};
            set x := 0;
            nextstate jitter;
        input ${sig.name}();
			task nbData := true;
			nextstate wait2;
    endstate;
`);
            } else {
                ifContent.append(`
    var x clock;
    var e clock;
    var nbData boolean;
    state start #start ;
        task nbData := false;
        set x := 0;
        nextstate first;
    endstate;
    state first;
        deadline delayable;
        when x <= ${left_period_bound};
            set x := 0;
            nextstate jitter;
        input ${sig.name}();
            task nbData := true;
            nextstate first;
    endstate;
    state jitter;
        deadline delayable;
        when x <= ${right_period_bound - left_period_bound};
            set e := 0;
            nextstate preprocessing;
        input ${sig.name}();
            task nbData := true;
            nextstate jitter;
    endstate;
    state preprocessing;
        deadline eager;
        provided nbData = false;
            informal "${sig.name}_USELESS_ACT";
            nextstate processing;
        deadline eager;
        provided nbData = true;
            informal "${sig.name}_USEFUL_ACT";
            task nbData := false;
            nextstate processing;
    endstate;
    state processing;
        deadline delayable;
        when e >= ${left_exec_bound} and e <= ${right_exec_bound};
            informal "${sig.name}_FINISH";
            reset e;
            nextstate wait;
        input ${sig.name}();
            task nbData := true;
            nextstate processing;
    endstate;
    state wait;
        when x = ${AP.mean.value};
            set x := 0;
            nextstate jitter;
        input ${sig.name}();
            task nbData := true;
            nextstate wait;
    endstate;
`);
            }
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
    offset: RandomVar | number
}

type Trigger = EventTrigger | PeriodicTrigger;

class Runnable {
    name: string;
    trigger: Trigger;
    execution: RandomVar;
}

function trigRuleToTrigger(serviceName: string, rule: TriggeringRule): Trigger {
    if (isPeriodicTriggering(rule)) {
        return { $type: "PeriodicTrigger", period: rule.period, offset: rule.offset ?? 0 };
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
    let offset_const = "";
    if (r.trigger.$type === "PeriodicTrigger") {
        const { left: left_period_bound, right: right_period_bound } = randomVariableToRange(r.trigger.period, sigma);
        if (typeof r.trigger.offset !== "number") {
            const { left: left_off_bound, right: right_off_bound } = randomVariableToRange(r.trigger.offset, sigma);
            offset_const = `
    duration : ${left_off_bound}ms <= ${r.name}_PERIOD_OFF <= ${right_off_bound}ms;
    continuous process ${r.name}_PERIOD_OFF with normal(${r.trigger.offset.mean.value}ms, ${r.trigger.offset.stdDev.value}ms);`;
        } else {
            offset_const = `
    duration : ${0}ms <= ${r.name}_PERIOD_OFF <= ${right_period_bound}ms;
    continuous process ${r.name}_PERIOD_OFF with uniform;`;
        }
        return [`
    duration : ${left_period_bound - r.trigger.period.mean.value}ms <= ${r.name}_PERIOD_JITTER <= ${right_period_bound - r.trigger.period.mean.value}ms;
    continuous process ${r.name}_PERIOD_JITTER with normal(0s, ${r.trigger.period.stdDev.value}ms);
    ${offset_const}
    ${exec_duration_constr}
        `,
        `
    ${r.name}_START = periodic ${r.trigger.period.mean.value}ms with jitter ${r.name}_PERIOD_JITTER offset ${r.name}_PERIOD_OFF;
    ${exec_constr}
        `];
    } else {
        let eventTriggerConsts = "";
        let delim = "";
        for (let signalPub of ctx.signalToPublishers.get(r.trigger.event) ?? []) {
            eventTriggerConsts += delim + `${signalPub}_FINISH causes ${r.name}_START;\n\t${r.name}_START = ${signalPub}_FINISH;`;
            delim = "\n\t"
        }
        return [
            exec_duration_constr,
            `
    ${eventTriggerConsts}
    ${exec_constr}
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