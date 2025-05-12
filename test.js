const combo = (operand) => {
  switch (operand) {
    case 0:
    case 1:
    case 2:
    case 3:
      return BigInt(operand);
    case 4:
      return A;
    case 5:
      return B;
    case 6:
      return C;
    default:
      throw new Error(`Invalid operand: ${operand}`);
  }
};

let res = [];

const operate = (operator, operand, pointer) => {
  switch (operator) {
    case 0:
      A = A / BigInt(2n ** combo(operand));
      return pointer + 2;
    case 1:
      B = B ^ BigInt(operand);
      return pointer + 2;
    case 2:
      B = combo(operand) % 8n;
      return pointer + 2;
    case 3:
      if (A === 0n) {
        return pointer + 2;
      }
      return operand;
    case 4:
      B = B ^ C;
      return pointer + 2;
    case 5:
      res.push(combo(operand) % 8n);
      return pointer + 2;
    case 6:
      B = A / BigInt(2n ** combo(operand));
      return pointer + 2;
    case 7:
      C = A / BigInt(2n ** combo(operand));
      return pointer + 2;
    default:
      throw new Error(`Invalid operator: ${operator}`);
  }
};

const test = `2,4,1,3,7,5,0,3,4,1,1,5,5,5,3,0`;

const lol = `0,3,5,4,3,0`;

// let A = 45483412;
let initialA = 8n ** 5n;
let B = 0n;
let C = 0n;

let A = initialA;

const data = lol;

const input = data.split(",").map(Number);

let i = 0;

let count = 0;

while (res.join(",") !== data) {
  if (i >= input.length - 1) {
    for (let j = input.length - 1; j >= 0; j--) {
      if (BigInt(input[j]) === BigInt(res[j])) {
        continue;
      } else {
        initialA += BigInt(8 ** j);
        console.log("TEST", res.join(","), data, initialA);
        count++;
        break;
      }
    }
    A = initialA;
    i = 0;
    res = [];
  }
  i = operate(input[i], input[i + 1], i);
}

console.log(res.join(","), initialA, count);
