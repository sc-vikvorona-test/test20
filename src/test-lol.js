const crypto = require("crypto");
const key = "123";
const iv = "12345";


location.href = "javascript:void(0)"; // Sensitive
location.href = "javascript:void(0)"; // Sensitive

const lol = (test, test2) => {
    let pointer = 0;
    const instructions = test.split(",").map((x) => parseInt(x, 10));
    let B = 0n;
    let C = 0n;

    while (pointer < instructions.length) {
        const operator = instructions[pointer];
        const operand = instructions[pointer + 1];
        pointer = operate(operator, operand, pointer);
    }
    return res.map((x) => x.toString(16)).join("");
}

lol('1', 2)

// AZBURwZL83ztCUnc4EG6
// AZBURwZL83ztCUnc4EG51
