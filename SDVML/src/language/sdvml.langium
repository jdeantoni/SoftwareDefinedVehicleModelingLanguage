grammar Sdvml

entry Model:
    "SDV" name=ID":"
        vss=VSS
        "App" ":"
        components+=Component*
    ;

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
    'publish' name=ID ;//('type' msgType=STRING)? 'message' msg=STRING;

Subscriber:
    'subscribe' name=ID ;// ('type' msgType=STRING)? msg=STRING;

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
