export function charToDigit(c: string): number {
  if (c >= '0' && c <= '9') {
    return parseInt(c, 10);
  }
  if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) {
    return c.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0) + 10;
  }
  return 0;
}

export function calculateLuhnMod10(payload: string): number {
  const cleanStr = payload.replace(/-/g, '').replace(/\s/g, '').toUpperCase();
  let total = 0;
  const reversedStr = cleanStr.split('').reverse().join('');
  for (let i = 0; i < reversedStr.length; i++) {
    let val = charToDigit(reversedStr[i]);
    if (i % 2 === 1) {
      val *= 2;
      if (val > 9) {
        val = Math.floor(val % 10) + Math.floor(val / 10);
      }
    }
    total += val;
  }
  return (10 - (total % 10)) % 10;
}

export function generateSUC(org: string, yymm: string, seq: number): string {
  const formattedSeq = String(seq).padStart(4, '0');
  const base = `QY-${org.toUpperCase()}-${yymm}-${formattedSeq}`;
  const checksum = calculateLuhnMod10(base);
  return `${base}-${checksum}`;
}

export function verifySUC(suc: string): boolean {
  if (!suc) return false;
  const parts = suc.split('-');
  if (parts.length !== 5) return false;
  if (parts[0] !== 'QY') return false;
  
  const base = parts.slice(0, 4).join('-');
  try {
    const expectedChecksum = calculateLuhnMod10(base);
    const actualChecksum = parseInt(parts[4], 10);
    return expectedChecksum === actualChecksum;
  } catch (e) {
    return false;
  }
}
