const trueValues = ['true', 'y', 'yes', 'on', 'enable', 'enabled'];
const falseValues = ['false', 'n', 'no', 'off', 'disable', 'disabled'];

export const Env = {
  getStr: (varName: string, defaultValue: string): string => {
    return process.env[varName] || defaultValue;
  },
  getInt: (varName: string, defaultValue: number): number => {
    const rawValue = process.env[varName];
    if (!rawValue) return defaultValue;

    const value = parseInt(rawValue);

    return isNaN(value) ? defaultValue : value;
  },
  /**
   * getBool: если в строке числовое значение то больше нуля - TRUE, иначе FALSE
   * Также поддерживаются наборы строк из trueValues и falseValues
   * @param varName
   * @param defaultValue
   */
  getBool: (varName: string, defaultValue: boolean): boolean => {
    let rawValue = (process.env[varName] || '').trim();
    if (!rawValue) return defaultValue;

    let numberValue = Number(rawValue);
    if (!isNaN(numberValue)) return numberValue > 0;

    rawValue = rawValue.toLowerCase();
    if (trueValues.includes(rawValue)) return true;
    if (falseValues.includes(rawValue)) return false;

    throw new Error(`Invalid value of boolean env variable '${varName}' (${rawValue})`);
  },
};
