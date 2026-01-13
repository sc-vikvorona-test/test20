const readline = require("readline");

class Calculator {
  constructor() {
    this.memory = 0;
    this.history = [];
    this.lastResult = 0;
  }

  add(a, b) {
    return a + b;
  }

  subtract(a, b) {
    return a - b;
  }

  multiply(a, b) {
    return a * b;
  }

  divide(a, b) {
    if (b === 0) throw new Error("Division by zero");
    return a / b;
  }

  power(base, exponent) {
    return Math.pow(base, exponent);
  }

  squareRoot(n) {
    if (n < 0)
      throw new Error("Cannot calculate square root of negative number");
    return Math.sqrt(n);
  }

  percentage(n, percent) {
    return (n * percent) / 100;
  }

  factorial(n) {
    if (n < 0) throw new Error("Factorial is not defined for negative numbers");
    if (!Number.isInteger(n))
      throw new Error("Factorial is only defined for integers");
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  sine(degrees) {
    return Math.sin((degrees * Math.PI) / 180);
  }

  cosine(degrees) {
    return Math.cos((degrees * Math.PI) / 180);
  }

  tangent(degrees) {
    return Math.tan((degrees * Math.PI) / 180);
  }

  logarithm(n, base = 10) {
    if (n <= 0)
      throw new Error("Logarithm is undefined for non-positive numbers");
    return Math.log(n) / Math.log(base);
  }

  naturalLog(n) {
    if (n <= 0)
      throw new Error("Natural log is undefined for non-positive numbers");
    return Math.log(n);
  }

  absolute(n) {
    return Math.abs(n);
  }

  round(n, decimals = 0) {
    return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
      [a, b] = [b, a % b];
    }
    return a;
  }

  lcm(a, b) {
    return Math.abs(a * b) / this.gcd(a, b);
  }

  isPrime(n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }

  fibonacci(n) {
    if (n < 0) throw new Error("Fibonacci index must be non-negative");
    if (n === 0) return 0;
    if (n === 1) return 1;
    let a = 0,
      b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }

  evaluate(expression) {
    try {
      const result = Function('"use strict"; return (' + expression + ")")();
      return result;
    } catch (e) {
      throw new Error("Invalid expression");
    }
  }

  memoryAdd(value) {
    this.memory += value;
    return this.memory;
  }

  memorySubtract(value) {
    this.memory -= value;
    return this.memory;
  }

  memoryRecall() {
    return this.memory;
  }

  memoryClear() {
    this.memory = 0;
  }

  addToHistory(operation, result) {
    this.history.push({
      operation,
      result,
      timestamp: new Date().toLocaleTimeString(),
    });
    this.lastResult = result;
  }

  showHistory() {
    if (this.history.length === 0) {
      console.log("History is empty");
      return;
    }
    console.log("\n=== CALCULATION HISTORY ===");
    this.history.forEach((entry, index) => {
      console.log(
        `${index + 1}. ${entry.operation} = ${entry.result} (${entry.timestamp})`,
      );
    });
    console.log("===========================\n");
  }

  clearHistory() {
    this.history = [];
  }
}

const calculator = new Calculator();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function showMenu() {
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║        ADVANCED CALCULATOR v1.0        ║");
  console.log("╠════════════════════════════════════════╣");
  console.log("║ Basic Operations:                      ║");
  console.log("║   add <a> <b>          - Addition      ║");
  console.log("║   sub <a> <b>          - Subtraction   ║");
  console.log("║   mul <a> <b>          - Multiplication║");
  console.log("║   div <a> <b>          - Division      ║");
  console.log("║ Advanced Operations:                   ║");
  console.log("║   pow <base> <exp>     - Power         ║");
  console.log("║   sqrt <n>             - Square root   ║");
  console.log("║   fact <n>             - Factorial     ║");
  console.log("║   sin/cos/tan <deg>    - Trigonometry  ║");
  console.log("║   log <n> [base]       - Logarithm     ║");
  console.log("║   gcd <a> <b>          - GCD           ║");
  console.log("║   lcm <a> <b>          - LCM           ║");
  console.log("║   prime <n>            - Is Prime?     ║");
  console.log("║   fib <n>              - Fibonacci     ║");
  console.log("║   eval <expr>          - Evaluate expr ║");
  console.log("║ Memory Operations:                     ║");
  console.log("║   m+/m-/mr/mc          - Memory ops    ║");
  console.log("║ Other:                                 ║");
  console.log("║   history              - Show history  ║");
  console.log("║   clear                - Clear history ║");
  console.log("║   help                 - Show this menu║");
  console.log("║   exit                 - Exit program  ║");
  console.log("╚════════════════════════════════════════╝\n");
}

function processCommand(input) {
  const parts = input.trim().split(/\s+/);
  const command = parts[0].toLowerCase();

  try {
    let result;
    let operation = input;

    switch (command) {
      case "add":
        result = calculator.add(parseFloat(parts[1]), parseFloat(parts[2]));
        operation = `${parts[1]} + ${parts[2]}`;
        break;
      case "sub":
        result = calculator.subtract(
          parseFloat(parts[1]),
          parseFloat(parts[2]),
        );
        operation = `${parts[1]} - ${parts[2]}`;
        break;
      case "mul":
        result = calculator.multiply(
          parseFloat(parts[1]),
          parseFloat(parts[2]),
        );
        operation = `${parts[1]} * ${parts[2]}`;
        break;
      case "div":
        result = calculator.divide(parseFloat(parts[1]), parseFloat(parts[2]));
        operation = `${parts[1]} / ${parts[2]}`;
        break;
      case "pow":
        result = calculator.power(parseFloat(parts[1]), parseFloat(parts[2]));
        operation = `${parts[1]} ^ ${parts[2]}`;
        break;
      case "sqrt":
        result = calculator.squareRoot(parseFloat(parts[1]));
        operation = `√${parts[1]}`;
        break;
      case "fact":
        result = calculator.factorial(parseInt(parts[1]));
        operation = `${parts[1]}!`;
        break;
      case "sin":
        result = calculator.sine(parseFloat(parts[1]));
        operation = `sin(${parts[1]}°)`;
        break;
      case "cos":
        result = calculator.cosine(parseFloat(parts[1]));
        operation = `cos(${parts[1]}°)`;
        break;
      case "tan":
        result = calculator.tangent(parseFloat(parts[1]));
        operation = `tan(${parts[1]}°)`;
        break;
      case "log":
        result = calculator.logarithm(
          parseFloat(parts[1]),
          parts[2] ? parseFloat(parts[2]) : 10,
        );
        operation = `log(${parts[1]})`;
        break;
      case "ln":
        result = calculator.naturalLog(parseFloat(parts[1]));
        operation = `ln(${parts[1]})`;
        break;
      case "abs":
        result = calculator.absolute(parseFloat(parts[1]));
        operation = `|${parts[1]}|`;
        break;
      case "round":
        result = calculator.round(
          parseFloat(parts[1]),
          parts[2] ? parseInt(parts[2]) : 0,
        );
        operation = `round(${parts[1]})`;
        break;
      case "gcd":
        result = calculator.gcd(parseInt(parts[1]), parseInt(parts[2]));
        operation = `gcd(${parts[1]}, ${parts[2]})`;
        break;
      case "lcm":
        result = calculator.lcm(parseInt(parts[1]), parseInt(parts[2]));
        operation = `lcm(${parts[1]}, ${parts[2]})`;
        break;
      case "prime":
        result = calculator.isPrime(parseInt(parts[1])) ? "true" : "false";
        operation = `isPrime(${parts[1]})`;
        break;
      case "fib":
        result = calculator.fibonacci(parseInt(parts[1]));
        operation = `fib(${parts[1]})`;
        break;
      case "eval":
        result = calculator.evaluate(parts.slice(1).join(" "));
        operation = parts.slice(1).join(" ");
        break;
      case "m+":
        result = calculator.memoryAdd(parseFloat(parts[1]));
        operation = `M+ ${parts[1]}`;
        break;
      case "m-":
        result = calculator.memorySubtract(parseFloat(parts[1]));
        operation = `M- ${parts[1]}`;
        break;
      case "mr":
        result = calculator.memoryRecall();
        operation = "MR";
        break;
      case "mc":
        calculator.memoryClear();
        console.log("Memory cleared");
        return;
      case "history":
        calculator.showHistory();
        return;
      case "clear":
        calculator.clearHistory();
        console.log("History cleared");
        return;
      case "help":
        showMenu();
        return;
      case "exit":
        console.log("Goodbye!");
        rl.close();
        process.exit(0);
      default:
        console.log('Unknown command. Type "help" for menu.');
        return;
    }

    console.log(`Result: ${result}`);
    calculator.addToHistory(operation, result);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

showMenu();

const prompt = () => {
  rl.question("> ", (input) => {
    if (input.trim()) {
      processCommand(input);
    }
    prompt();
  });
};

prompt();
