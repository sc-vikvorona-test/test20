const crypto = require("crypto");
const key = "123";
const iv = "12345";


location.href = "javascript:void(0)"; // Sensitive
location.href = "javascript:void(0)"; // Sensitive

const lol = (test, test2, test3, test4, test5, test6, test7, test8, test9) => {
    let pointer = 0;
    const instructions = test.split(",").map((x) => parseInt(x, 10));
    const evaluate = test2.toString()
    const evaluate2 = test3.toString()
    const evaluate3 = test4.toString()
    const evaluate4 = test5.toString()
    const evaluate6 = test6.toString()
    const evaluate7 = test7.toString()
    const evaluate8 = test8.toString()
    const evaluate9 = test9.toString()

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
