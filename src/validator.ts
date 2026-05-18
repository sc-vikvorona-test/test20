// Fix: handle edge case in validator
export function validateInput(input: string): boolean {
  return input.trim().length > 0;
}