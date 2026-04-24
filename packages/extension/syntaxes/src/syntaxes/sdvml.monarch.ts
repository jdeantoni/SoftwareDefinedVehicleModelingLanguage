// Monarch syntax highlighting for the sdvml language.
export default {
    keywords: [
        'Actuator','App','Chains','Component','Execution','Functional','Resource','SDV','Sensor','Service','Signal','VSS','event','execution','latency','nonreentrant','normal','offset','on','period','publish','queue','self','subscribe','to','trigger','use','var','varying'
    ],
    operators: [
        '%','+/-',',','-','->','.',':','<=','|','~'
    ],
    symbols: /%|\(|\)|\+\/-|,|-|->|\.|:|<=|\[|\]|\||~/,

    tokenizer: {
        initial: [
            { regex: /([0-9]+(\.[0-9]+)?)(d|h|(ms)|m|s|(us)|(ns))/, action: {"token":"DURATION"} },
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"ID"} }} },
            { regex: /[0-9]+/, action: {"token":"number"} },
            { regex: /[0-9]+\.[0-9]+/, action: {"token":"number"} },
            { regex: /([0-9]+\.[0-9]*([eE][+-]?[0-9]+)?|[0-9]+[eE][+-]?[0-9]+)/, action: {"token":"number"} },
            { regex: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/, action: {"token":"string"} },
            { regex: /(true|false)/, action: {"token":"boolean"} },
            { include: '@whitespace' },
            { regex: /@symbols/, action: { cases: { '@operators': {"token":"operator"}, '@default': {"token":""} }} },
        ],
        whitespace: [
            { regex: /\s+/, action: {"token":"white"} },
            { regex: /\/\*/, action: {"token":"comment","next":"@comment"} },
            { regex: /\/\/[^\n\r]*/, action: {"token":"comment"} },
        ],
        comment: [
            { regex: /[^/\*]+/, action: {"token":"comment"} },
            { regex: /\*\//, action: {"token":"comment","next":"@pop"} },
            { regex: /[/\*]/, action: {"token":"comment"} },
        ],
    }
};
