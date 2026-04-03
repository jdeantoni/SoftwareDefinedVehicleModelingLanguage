/********************************************************************************
 * Copyright (c) 2025 Université Côte d'Azur and others.

 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

grammar Sdvml

entry Model:
    "SDV" name=ID":"
        vss=VSS

        "App" ":"
            components+=Component*

        ("Resource" ":"
            (resources+=Resource)*
        )?

        ("Functional" "Chains" ":"
            (chains+=FunctionalChain)*
        )?
;

FunctionalChain:
    name=ID ":"
        start+=[FCParticipant:ID] ("|" start+=[FCParticipant:ID])* "->" finish=[FCParticipant:ID];


type FCParticipant = Sensor | Service | Actuator;

VSS:
    "VSS" ":"
        (signals+=Signal*)
;

RandomVar:
    mean=DURATION "+/-" stdDev=DURATION
    | "[" left=DURATION "," right=DURATION "]" "~" "normal" ("(" mean=DURATION "," stdDev=DURATION ")")?
;
TriggeringRule:
    PeriodicTriggering | EventTriggering;

PeriodicTriggering:
    'period' period=RandomVar 'offset' (offset=RandomVar | 'varying');

EventTriggering:
    'trigger' 'on' (trigger=[Subscriber:ID] | 'event');

Component:
    'Component' name=ID ":"
    (signals+=AppSignal)*
    (
        services+=Service
    )+;

AppSignal:
    "Signal" name=ID;

Signal:
    Sensor | Actuator;

Sensor:
    "Sensor" "Signal" name=ID '(''SSP' ssp=RandomVar 'offset'  (offset=RandomVar | 'varying')',''DL' dl=RandomVar')';

Actuator:
    "Actuator" "Signal" name=ID '(' trigRule=TriggeringRule',''AD' ad=RandomVar')';

Publisher:
    'publish' "to" (appSignal=[AppSignal:ID] | "VSS" "signal" actuatorSignal=[Actuator:ID]);

Subscriber:
    'subscribe' "to" (commType=CommunicationType) ((appSignal=[AppSignal:ID] | "VSS" "signal" sensorSignal=[Sensor:ID]));

Service:
    'Service' name=ID":"
        (
            publishers+=Publisher |
            subscribers+=Subscriber
        )+
        trigRule=TriggeringRule
        'execution' execTime=RandomVar
        ('using' resource=[Resource:ID])?
        ( nonreentrant?="nonreentrant" )?;

CommunicationType:
    (name="var" ) | (name="queue");

Resource:
    "Execution" name=ID;

DURATION:
    value=INT "ms"; // TODO: use the SI units

terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal FLOAT returns number: /[0-9]+\.[0-9]+/;
terminal DOUBLE returns number: /([0-9]+\.[0-9]*([eE][+-]?[0-9]+)?|[0-9]+[eE][+-]?[0-9]+)/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal BOOL returns boolean: 'true' | 'false';

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;