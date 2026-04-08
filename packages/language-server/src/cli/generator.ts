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
    FunctionalChain,
    SelfTriggering,
    SimpleChain,
    isSimpleChain,
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

class Communication {
    name: signalName;
    writes: Runnable[];
    var_reads: Runnable[];
    queue_reads: Runnable[];

    constructor(name: string) {
        this.name = name;
        this.writes = [];
        this.var_reads = [];
        this.queue_reads = [];
    }
}

export class Context {
    signalsToServices: Map<signalName, serviceKey[]>;
    servicesToSignals: Map<serviceKey, signalName[]>;
    runnableInputs: Map<serviceKey, signalName[]>;
    runnables: Map<serviceKey, Runnable>;
    servicesToComponents: Map<serviceKey, componentKey[]>;
    signalToPublishers: Map<signalName, serviceKey[]>;
    resources: Map<string, Resource>;
    plainNameRunnable: Map<string, Runnable>;
    communication: Map<string, Communication>;

    constructor(model: Model) {
        this.signalsToServices = new Map<string, string[]>();
        this.servicesToSignals = new Map<string, string[]>();
        this.runnableInputs = new Map<string, string[]>();
        this.servicesToComponents = new Map();
        this.signalToPublishers = new Map<string, string[]>();
        this.resources = new Map(model.resources.map(r => [r.name, new Resource(r.name)]));

        let component_comms = model.vss.signals.map(s => [s.name, new Communication(s.name)] as [string, Communication]);
        let vss_comms = model.components.flatMap(component => component.signals.map(s => [s.name, new Communication(s.name)] as [string, Communication]));
        this.communication = new Map<string, Communication>(component_comms.concat(vss_comms));

        this.plainNameRunnable = new Map();
        this.runnables = new Map();

        for (var component of model.components) {
            for (var service of component.services) {
                const name = makeServiceName(component, service);
                const resource = service.resource?.ref ? this.resources.get(service.resource.ref.name) : undefined;
                const runnable = new Runnable(name, trigRuleToTrigger(service.name, service.trigger), service.execTime, false, !service.nonreentrant, resource);
                this.plainNameRunnable.set(service.name, runnable);
                this.runnables.set(name, runnable);

                const inputs = [];
                for (var subscription of service.subscribers) {
                    const subscriptionSignal = getSubscriptionSignal(service.name, subscription);
                    let targetServices = this.signalsToServices.get(subscriptionSignal) ?? [];
                    targetServices.push(name);
                    this.signalsToServices.set(subscriptionSignal, targetServices);
                    inputs.push(subscriptionSignal);

                    let comm = this.communication.get(subscriptionSignal) ?? expect("communication should be already initialized");
                    if (subscription.commType.name == "queue") {
                        comm.queue_reads.push(runnable);
                    } else if (subscription.commType.name == "var") {
                        comm.var_reads.push(runnable);
                    }
                    this.communication.set(subscriptionSignal, comm);
                };
                this.runnableInputs.set(name, inputs);
                for (var publish of service.publishers) {
                    const publishingSignal = getPublishingSignal(service.name, publish);
                    let sourceServices = this.servicesToSignals.get(name) ?? [];
                    sourceServices.push(publishingSignal);
                    this.servicesToSignals.set(name, sourceServices);

                    let signalPublishers = this.signalToPublishers.get(publishingSignal) ?? [];
                    signalPublishers.push(name);
                    this.signalToPublishers.set(publishingSignal, signalPublishers);

                    let comm = this.communication.get(publishingSignal) ?? expect("communication should be already initialized");
                    comm.writes.push(runnable);
                    this.communication.set(publishingSignal, comm);
                };
                const relatedComponents = this.servicesToComponents.get(service.name) ?? [];
                relatedComponents.push(component.name);
                this.servicesToComponents.set(service.name, relatedComponents);
            }
        }

        for (var s of model.vss.signals) {
            if (isSensor(s)) {
                this.servicesToSignals.set(s.name, [s.name]);
                this.signalToPublishers.set(s.name, [s.name]);
            } else {
                this.runnableInputs.set(s.name, [s.name]);
                let receivers = this.signalsToServices.get(s.name) ?? [];
                receivers.push(s.name);
                this.signalsToServices.set(s.name, receivers);
            }
            var runnable;
            if (isActuator(s)) {
                runnable = new Runnable(s.name, actuatorTrigRuleToTrigger(s.name, s.trigger), s.latency, false, true);
            } else {
                const trigger: Trigger = new PeriodicTrigger(s.trigger.period, s.trigger.offset ?? 0); // TODO: fix it, in the syntax we say "varying" which is not 0 for sure
                runnable = new Runnable(s.name, trigger, s.latency, false, true);
            }
            this.plainNameRunnable.set(s.name, runnable);
            this.runnables.set(s.name, runnable);

            let comm = this.communication.get(s.name) ?? expect("communication should be already initialized");
            if (isSensor(s)) {
                comm.writes.push(runnable);
            } else {
                if (runnable.trigger.$type == "EventTrigger") {
                    comm.queue_reads.push(runnable);
                } else {
                    comm.var_reads.push(runnable);
                }
            }
        }
        this.communication.forEach((value, key) => console.log(`${key}: ${value.queue_reads.map(r => r.name)}`));
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
    if (isPeriodicTriggering(service.trigger)) {
        const { left: left_period_bound, right: right_period_bound } = randomVariableToRange(service.trigger.period, sigma);
        if (service.trigger.offset) {
            const { left: left_offset_bound, right: right_offset_bound } = randomVariableToRange(service.trigger.offset, sigma);
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
        when x = ${service.trigger.period.mean.value};
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
        when x = ${service.trigger.period.mean.value};
            set x := 0;
            nextstate jitter;${inpData[4]}
    endstate;\n`);
        }

    } else {
        const signalName = getSubscriptionSignal(service.name, service.trigger.event?.ref!);
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
    var ssp = sig.trigger.period;
    var sensorSignal = sig.name;
    var siglines = "";
    for (var serviceName of context.signalsToServices.get(sensorSignal) ?? []) {
        siglines += `\n\t\t\toutput ${sensorSignal}() to {${serviceName}}0;`;
    }
    const { left: left_exec_bound, right: right_exec_bound } = randomVariableToRange(sig.latency, sigma);
    const { left: left_period_bound, right: right_period_bound } = randomVariableToRange(ssp, sigma);
    if (sig.trigger.offset) {
        const { left: left_offset_bound, right: right_offset_bound } = randomVariableToRange(sig.trigger.offset, sigma);
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
    const { left: left_exec_bound, right: right_exec_bound } = randomVariableToRange(sig.latency, sigma);
    ifContent.append(`process ${sig.name}(1);`)
    if (isPeriodicTriggering(sig.trigger)) {
        const { left: left_period_bound, right: right_period_bound } = randomVariableToRange(sig.trigger.period, sigma);
        var AP = (sig.trigger as PeriodicTriggering).period;
        if (sig.trigger.offset) {
            const { left: left_offset_bound, right: right_offset_bound } = randomVariableToRange(sig.trigger.offset, sigma);
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

class EventTrigger {
    $type: 'EventTrigger';
    event: string;
    constructor(event: string) {
        this.event = event;
    }
    spec(spawn_clock: string, jitter_var: string, phase_var: string, ctx: Context): [string, string] {
        let structure = "";
        for (let signalPub of ctx.signalToPublishers.get(this.event) ?? []) {
            let pubRunnable = ctx.runnables.get(signalPub) ?? expect("impossible situation: runnable should be defined if it is listed as producer");
            structure += `\n    ${spawn_clock} |= ${pubRunnable.finish_clock};`; // ASSUMPTION: communication is instantaneous
        }
        return ["", structure]
    }
}

class PeriodicTrigger {
    $type: 'PeriodicTrigger';
    period: RandomVar;
    offset: RandomVar | number;
    constructor(period: RandomVar, offset: RandomVar | number) {
        this.period = period;
        this.offset = offset;
    }
    spec(spawn_clock: string, jitter_var: string, phase_var: string): [string, string] {
        let assumptions = "";
        const { left: left_period_bound, right: right_period_bound } = randomVariableToRange(this.period, sigma);
        if (typeof this.offset !== "number") {
            const { left: left_off_bound, right: right_off_bound } = randomVariableToRange(this.offset, sigma);
            assumptions = `
    duration : ${left_off_bound}ms <= ${phase_var} <= ${right_off_bound}ms;
    continuous process ${phase_var} with normal(${this.offset.mean.value}ms, ${this.offset.stdDev.value}ms);`;
        } else { // ASSUMPTION: if offset is not defined, random until period is assumed
            assumptions = `
    duration : ${0}ms <= ${phase_var} <= ${right_period_bound}ms;
    continuous process ${phase_var} with uniform;\n`;
        }
        assumptions += `
    duration : ${left_period_bound - this.period.mean.value}ms <= ${jitter_var} <= ${right_period_bound - this.period.mean.value}ms;
    continuous process ${jitter_var} with normal(0s, ${this.period.stdDev.value}ms);`;
        let structure = `${spawn_clock} = periodic ${this.period.mean.value}ms with jitter ${jitter_var} offset ${phase_var};\n`;
        return [assumptions, structure];
    }
}

type Trigger = EventTrigger | PeriodicTrigger;


class Resource {
    name: string;
    constructor(name: string) {
        this.name = name;
    }
    spec(): string {
        let spawn = this.spawn_clock;
        let execution = this.execution_clock;
        let release = this.release_clock;
        let free = `${this.name}_FREE`;
        let force = `${this.name}_FORCE`;
        let taken = `${this.name}_TAKEN`;
        let drop = `${this.name}_DROP`;
        let resource_spec = `
    var ${spawn}, ${execution}, ${release}, ${free}, ${force}, ${taken}, ${drop} : clock;
    ${spawn} = ${free} xor ${taken};
    ${release} = ${force} xor ${drop};
    ${execution} = (${free} or ${force});
    allow ${taken} in ]${execution}, ${release}];
    forbid ${free} in ]${execution}, ${release}];
    ${execution} alternates ${release};
    `;
        return resource_spec;
    }
    get spawn_clock(): string {
        return `${this.name}_SPAWN`;
    }
    get execution_clock(): string {
        return `${this.name}_EXECUTION`;
    }
    get release_clock(): string {
        return `${this.name}_RELEASE`;
    }
    allocation_spec(spawn: string, start: string, finish: string): string {
        let force = `${this.name}_FORCE`;
        let drop = `${this.name}_DROP`;
        let local_force = `${finish}_FORCE`;
        return `
    allow ${local_force} in [${spawn}, ${finish}[;
    forbid ${drop} in [${spawn}, ${finish}[;
    ${force} += ${local_force};
    ${this.spawn_clock} += ${spawn};
    ${this.execution_clock} |= ${start};
    ${this.release_clock} |= ${finish};
        `
    }
}

class Runnable {
    name: string;
    trigger: Trigger;
    execution: RandomVar;
    resource?: Resource;
    vss: boolean;
    reentrant: boolean;
    constructor(name: string, trigger: Trigger, execution: RandomVar, vss: boolean, reentrant: boolean, resource?: Resource) {
        this.name = name;
        this.trigger = trigger;
        this.execution = execution;
        this.resource = resource;
        this.vss = vss;
        this.reentrant = reentrant;
    }
    get start_clock(): string {
        return `${this.name}_START`
    }
    get finish_clock(): string {
        return `${this.name}_FINISH`
    }
    get spawn_clock(): string {
        return `${this.name}_SPAWN`;
    }
    get execution_var(): string {
        return `${this.name}_EXECUTION`;
    }
    get jitter_var(): string {
        return `${this.name}_JITTER`;
    }
    get phase_var(): string {
        return `${this.name}_PHASE`;
    }
}

function trigRuleToTrigger(serviceName: string, rule: TriggeringRule): Trigger {
    if (isPeriodicTriggering(rule)) {
        return new PeriodicTrigger(rule.period, rule.offset ?? 0); // ASSUMPTION: offset is set to 0 if missing.
    } else {
        return new EventTrigger(getSubscriptionSignal(serviceName, rule.event?.ref!));
    }
}
function actuatorTrigRuleToTrigger(serviceName: string, rule: (PeriodicTriggering | SelfTriggering)): Trigger {
    if (isPeriodicTriggering(rule)) {
        return new PeriodicTrigger(rule.period, rule.offset ?? 0); // ASSUMPTION: offset is set to 0 if missing.
    } else {
        return new EventTrigger(serviceName);
    }
}

export function generateMRTCCSLSpec(context: Context): string {
    const resourcesSpec = Array.from(context.resources.values()).map(r => r.spec()).join("\n") + "\n";
    let [assumptions, structure] = Array.from(context.runnables.values()).map(r => generateMRTCCSLRunnable(r, context, sigma)).reduce(
        (acc, v) => {
            let [assumes, structs] = acc;
            let [assumption, structure] = v;

            return [`${assumes}${assumption}\n`, `${structs}${structure}\n`];
        }, ["", resourcesSpec]);
    return `assume {
    ${assumptions}
} structure {
    ${structure}
}`
}

function generateMRTCCSLRunnable(r: Runnable, ctx: Context, sigma: number): [string, string] {
    const { left: left_exec_bound, right: right_exec_bound } = randomVariableToRange(r.execution, sigma);
    if (left_exec_bound < 0) { // TODO: move the verification in a better place and report to the user
        throw new Error(`${r.name} cannot have negative execution time.`);
    }
    let exec_duration_constr = `
    duration : ${left_exec_bound}ms <= ${r.execution_var} <= ${right_exec_bound}ms;
    continuous process ${r.execution_var} with normal(${r.execution.mean.value}ms, ${r.execution.stdDev.value}ms);`;
    let exec_constr = `${r.finish_clock} = delay ${r.start_clock} by ${r.execution_var};`;
    let [phaseJitterConstraints, triggerConstrants] = r.trigger.spec(r.spawn_clock, r.jitter_var, r.phase_var, ctx);
    triggerConstrants += `    ${r.spawn_clock} causes ${r.start_clock};`
    if (r.resource === undefined) { // ASSUMPTION: in case of undefined resource the job is scheduled immediately
        triggerConstrants += `${r.spawn_clock} = ${r.start_clock};`;
    } else {
        triggerConstrants += r.resource.allocation_spec(r.spawn_clock, r.start_clock, r.finish_clock);
    }
    if (r.reentrant) { // when resource is assigned, it is already non-reentrant as there cannot be two different jobs executing
        var reentrancy_constraint = "";
    } else {
        var reentrancy_constraint = `${r.start_clock} alternates ${r.finish_clock};`;
    }
    return [`
    ${phaseJitterConstraints}
    ${exec_duration_constr}
        `,
    `
    ${triggerConstrants}
    ${exec_constr}
    ${reentrancy_constraint}
        `];
}

function generateCommunicationNetworkSexp(ctx: Context): string[] {
    let declaration = [];
    for (let comm of ctx.communication.values()) {
        let write_sexp = comm.writes.map(r => r.finish_clock).join(" ");
        if (comm.var_reads.length > 0) {
            let read_sexp = comm.var_reads.map(r => r.start_clock).join(" ");
            declaration.push(`(Variable (name ${comm.name}:var) (reads (${read_sexp})) (writes (${write_sexp})))`)
        }
        if (comm.queue_reads.length > 0) {
            let read_sexp = comm.queue_reads.map(r => r.start_clock).join(" ");
            declaration.push(`(Queue (name ${comm.name}:queue) (reads (${read_sexp})) (writes (${write_sexp})))`)
        }
        // skips communication declaration when place is only written into, as otheriwse it is just waste of network operation
    }
    for (let [name, runnable] of ctx.runnables) {
        declaration.push(`(Queue (name ${name}_state) (writes (${runnable.start_clock})) (reads (${runnable.finish_clock})))`); // TODO: can be a variable when non-reentrant
    }
    return declaration;
}

function generateSimpleChainSpec(chain: SimpleChain, ctx: Context): string {
    var sequence = [];
    for (let p of chain.participants) {
        var r = ctx.plainNameRunnable.get(p.ref!.name) ?? expect(`chain participant with id "${p.ref?.name}" is not available.`);
        sequence.push(r.start_clock, r.finish_clock);
    }
    let sexp_list = `(${sequence.join(" ")})`;
    return sexp_list;
}

function generateFunctionalChainSpec(chain: FunctionalChain, ctx: Context): string {
    if (isSimpleChain(chain)) {
        let sequence = generateSimpleChainSpec(chain, ctx);
        return `(Chain (name ${chain.name}) (alternatives (${sequence})))`
    } else {
        let alternatives = chain.alternatives.map(r => generateSimpleChainSpec(r.ref!, ctx)).join(" ");
        return `(Chain (name ${chain.name}) (alternatives (${alternatives})))`
    }
}

function monitorDeclarations(ctx: Context): [string[], string[]] {
    let declaration = [];
    let files = [];
    for (let r of ctx.runnables.values()) {
        if (!r.vss && r.resource) {
            let probe = `${r.name}_monitor`;
            const file = `${probe}/${r.spawn_clock}_${r.start_clock}`;
            files.push(file);
            declaration.push(`(Inject (at ${r.start_clock}) (color ${probe}))`);
            declaration.push(`(Probe (name ${probe}) (color ${probe}) (at ${r.finish_clock}))`);
        }
    }
    return [files, declaration];
}

export function generateNetworkDeclaration(chains: FunctionalChain[], ctx: Context): [string[], string] {
    let netDeclaration = generateCommunicationNetworkSexp(ctx);
    let chainDeclaration = chains.map(c => generateFunctionalChainSpec(c, ctx));
    let [monitorFiles, monitorDeclaration] = monitorDeclarations(ctx);
    let fullDeclaration = netDeclaration.concat(chainDeclaration, monitorDeclaration);

    let chain_files = chains.flatMap(c => c.name);

    return [monitorFiles.concat(chain_files), `(\n${fullDeclaration.join("\n")}\n)`]
}

export function generateMicrostepOrder(ctx: Context): string {
    let pairs: string[] = [];
    for (let comm of ctx.communication.values()) {
        let order_pair = comm.writes.flatMap(w => comm.queue_reads.map(r => `(${w.finish_clock} ${r.start_clock})`));
        pairs.push(...order_pair);
    }
    return `(${pairs.join("\n")})`
}


export function generateTaskCSV(ctx: Context): string {
    const header = "name,release,start,finish,deadline\n";
    let tasks = "";
    for (let r of ctx.runnables.values()) {
        tasks += `${r.name},${r.spawn_clock},${r.start_clock},${r.finish_clock},${r.finish_clock}\n`;
    }
    return header + tasks;
}
