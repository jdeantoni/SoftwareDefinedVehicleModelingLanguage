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

        ("Functional" "Chains" ":"
            (chains+=FunctionalChain)*
        )?
;

FunctionalChain:
    name=ID ":"
        participants+=[FCParticipant:ID] ("->" participants+=[FCParticipant:ID])*;


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
    'periodic' period=RandomVar ';' ('offset'':'offset=RandomVar | 'varying_offset');

EventTriggering:
    'triggered' 'on' (trigger=[Subscriber:ID] | 'event');

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
    "Sensor" "Signal" name=ID '(''SSP'':'ssp=RandomVar';'('offset'':'offset=RandomVar | 'varying_offset')',''DL'':'dl=RandomVar')';

Actuator:
    "Actuator" "Signal" name=ID '(' trigRule=TriggeringRule',''AD'':'ad=RandomVar')';

Publisher:
    'publish' (appSignal=[AppSignal:ID] | "to" "VSS" "signal" actuatorSignal=[Actuator:ID]);//('type' msgType=STRING)? 'message' msg=STRING;

Subscriber:
    'subscribe' "to" (appSignal=[AppSignal:ID] | "VSS" "signal" sensorSignal=[Sensor:ID]);// ('type' msgType=STRING)? msg=STRING;

Service:
    'Service' name=ID":"
        (
            publishers+=Publisher |
            subscribers+=Subscriber
        )+
        trigRule=TriggeringRule
        'execution' execTime=RandomVar; //('type' srvType=STRING)?;

DURATION:
    value=INT "ms"; // TODO: make properly the SI units

terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal FLOAT: /[0-9]+\.[0-9]+/;
terminal DOUBLE: /([0-9]+\.[0-9]*([eE][+-]?[0-9]+)?|[0-9]+[eE][+-]?[0-9]+)/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal BOOL: 'true' | 'false';

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;