export function unicodeDigit(value: string): string {
  if (!value) {
    return value;
  }
  const enChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const uniChars = [
    // persian
    ["\u06F0", "\u06F1", "\u06F2", "\u06F3", "\u06F4", "\u06F5", "\u06F6", "\u06F7", "\u06F8", "\u06F9"],
    // arabic
    ["\u06F0", "\u0661", "\u0662", "\u0663", "\u0664", "\u0665", "\u0666", "\u0667", "\u0668", "\u0669"],
  ];
  let validNumber = value;
  for (let i = uniChars.length; i--; ) {
    for (let j = uniChars[i].length; j--; ) {
      validNumber = validNumber.replace(new RegExp(uniChars[i][j], "g"), enChars[j]);
    }
  }
  return validNumber;
}

export function sanitizePhoneNumber(phoneNumber: string, countryCode?: number): string {
  let sanitizedNumber = unicodeDigit(phoneNumber);
  if (countryCode) {
    // +98xxx
    sanitizedNumber = sanitizedNumber.replace(`+${countryCode}`, "0");
    // 0098xxx
    sanitizedNumber = sanitizedNumber.replace(`00${countryCode}`, "0");
    // 98xxx
    sanitizedNumber = sanitizedNumber.replace(new RegExp(`^${countryCode}`), "0");
  }
  if (sanitizedNumber.charAt(0) !== "0") {
    sanitizedNumber = `0${sanitizedNumber}`;
  }
  return sanitizedNumber;
}
