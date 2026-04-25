export const OPEN_REMAINING_VALUE_CALCULATOR_EVENT = "open-remaining-value-calculator";

export function dispatchOpenRemainingValueCalculatorEvent() {
  window.dispatchEvent(new CustomEvent(OPEN_REMAINING_VALUE_CALCULATOR_EVENT));
}
