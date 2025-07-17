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
    "chain" ":"
        participants+=[FCParticipant:ID] ("->" participants+=[FCParticipant:ID])* ;


type FCParticipant = Sensor | Subscriber | Service | Publisher | Actuator;

VSS:
    "VSS" ":"
        (signals+=Signal*)
    ;

RandomVar:
    mean=INT "+/-" stdDev=INT
    ;
TriggeringRule:
    PeriodicTriggering | EventTriggering;

PeriodicTriggering:
    'periodic' period=RandomVar 'ms';

EventTriggering:
    'triggered' 'on' trigger=[Subscriber:ID];

Component:
    'Component' name=ID
    (
        publishers+=Publisher |
        subscribers+=Subscriber |
        services+=Service
    )*;

Signal:
    Sensor | Actuator;

Sensor:
    "Sensor" "Signal" name=ID '(''SSP'':'ssp=RandomVar 'ms'',''DL'':'dl=RandomVar'ms'')';

Actuator:
    "Actuator" "Signal" name=ID '(' trigRule=TriggeringRule',''AD'':'ad=RandomVar'ms'')';

Publisher:
    'publish' (sigName=ID | "to" "VSS" "signal" sigRef=[Actuator]) ('('name=ID')')?;//('type' msgType=STRING)? 'message' msg=STRING;

Subscriber:
    'subscribe' "to" (sigName=ID | "VSS" "signal" sigRef=[Sensor]) ('('name=ID')')?;// ('type' msgType=STRING)? msg=STRING;

Service:
    'service' name=ID":"
        trigRule=TriggeringRule
        'ExecTime' execTime=RandomVar 'ms'; //('type' srvType=STRING)?;


terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal FLOAT: /[0-9]+\.[0-9]+/;
terminal DOUBLE: /([0-9]+\.[0-9]*([eE][+-]?[0-9]+)?|[0-9]+[eE][+-]?[0-9]+)/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal BOOL: 'true' | 'false';

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;