// Monarch syntax highlighting for the sdvml language.
export default {
    keywords: [
        'AD','Actuator','App','Component','DL','ExecTime','SDV','SSP','Sensor','Signal','VSS','ms','on','periodic','publish','service','subscribe','triggered'
    ],
    operators: [
        '+/-',',',':'
    ],
    symbols: /\(|\)|\+\/-|,|:/,

    tokenizer: {
        initial: [
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"ID"} }} },
            { regex: /[0-9]+/, action: {"token":"number"} },
            { regex: /[0-9]+\.[0-9]+/, action: {"token":"FLOAT"} },
            { regex: /([0-9]+\.[0-9]*([eE][+-]?[0-9]+)?|[0-9]+[eE][+-]?[0-9]+)/, action: {"token":"DOUBLE"} },
            { regex: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/, action: {"token":"string"} },
            { regex: /(true|false)/, action: {"token":"BOOL"} },
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
