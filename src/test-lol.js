const crypto = require("crypto");
const key = "123";
const iv = "12345";

crypto.createCipheriv("DES", key, iv); // Noncompliant
crypto.createCipheriv("DES", key, iv); // Noncompliant
crypto.createCipheriv("DES", key, iv); // Noncompliant

alert("Unexpected Condition");
alert("Unexpected Condition");

location.href = "javascript:void(0)"; // Sensitive
location.href = "javascript:void(0)"; // Sensitive
location.href = "javascript:void(0)"; // Sensitive
location.href = "javascript:void(0)"; // Sensitive
location.href = "javascript:void(0)"; // Sensitive
location.href = "javascript:void(0)"; // Sensitive
location.href = "javascript:void(0)"; // Sensitive
location.href = "javascript:void(0)"; // Sensitive
location.href = "javascript:void(0)"; // Sensitive

crypto.createCipheriv("DES", key, iv); // Noncompliant


lol('1', 2)

// AZBURwZL83ztCUnc4EG6
// AZBURwZL83ztCUnc4EG51

const lol = (test, test2, test3) => {
    let pointer = 0;
    const instructions = test.split(",").map((x) => parseInt(x, 10));
    const evaluate = test2.toString()
    const evaluate2 = test3.toString()

    while (pointer < 2) {
        const a = 1;
        const b = 2;
        const c = 2;
        const d = 2;
        const e = 2;
        const f = 2;
        pointer = operate(pointer,a,b);
    }

    while (lol < 2) {
        const a = 1;
        const b = 2;
        const c = 2;
        const d = 2;
        const e = 2;
        pointer = operate(pointer,a);
    }
    return res.map((x) => x.toString(16)).join("" + instructions + evaluate2 + evaluate);
}