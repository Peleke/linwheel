/**
 * Unicode text formatting utilities for LinkedIn posts.
 *
 * LinkedIn doesn't support markdown or rich text, but it does render
 * Unicode Mathematical Alphanumeric Symbols which provide bold/italic styling.
 */

// Unicode Mathematical Alphanumeric Symbols offsets
const BOLD_UPPER_START = 0x1D400; // 𝐀
const BOLD_LOWER_START = 0x1D41A; // 𝐚
const ITALIC_UPPER_START = 0x1D434; // 𝐴
const ITALIC_LOWER_START = 0x1D44E; // 𝑎
const BOLD_ITALIC_UPPER_START = 0x1D468; // 𝑨
const BOLD_ITALIC_LOWER_START = 0x1D482; // 𝒂

// Regular ASCII offsets
const UPPER_A = 65;
const LOWER_A = 97;

/**
 * Convert a single character to its Unicode bold equivalent
 */
function charToBold(char: string): string {
  const code = char.charCodeAt(0);

  if (code >= UPPER_A && code <= UPPER_A + 25) {
    // Uppercase A-Z
    return String.fromCodePoint(BOLD_UPPER_START + (code - UPPER_A));
  } else if (code >= LOWER_A && code <= LOWER_A + 25) {
    // Lowercase a-z
    return String.fromCodePoint(BOLD_LOWER_START + (code - LOWER_A));
  }

  // Return unchanged for non-letter characters
  return char;
}

/**
 * Convert a single character to its Unicode italic equivalent
 */
function charToItalic(char: string): string {
  const code = char.charCodeAt(0);

  if (code >= UPPER_A && code <= UPPER_A + 25) {
    // Uppercase A-Z
    return String.fromCodePoint(ITALIC_UPPER_START + (code - UPPER_A));
  } else if (code >= LOWER_A && code <= LOWER_A + 25) {
    // Lowercase a-z
    // Note: 'h' has a different codepoint in italic (U+210E)
    if (char === 'h') {
      return String.fromCodePoint(0x210E); // ℎ (Planck constant)
    }
    return String.fromCodePoint(ITALIC_LOWER_START + (code - LOWER_A));
  }

  return char;
}

/**
 * Convert a single character to its Unicode bold italic equivalent
 */
function charToBoldItalic(char: string): string {
  const code = char.charCodeAt(0);

  if (code >= UPPER_A && code <= UPPER_A + 25) {
    return String.fromCodePoint(BOLD_ITALIC_UPPER_START + (code - UPPER_A));
  } else if (code >= LOWER_A && code <= LOWER_A + 25) {
    return String.fromCodePoint(BOLD_ITALIC_LOWER_START + (code - LOWER_A));
  }

  return char;
}

/**
 * Convert text to Unicode bold
 */
export function toBold(text: string): string {
  return [...text].map(charToBold).join('');
}

/**
 * Convert text to Unicode italic
 */
export function toItalic(text: string): string {
  return [...text].map(charToItalic).join('');
}

/**
 * Convert text to Unicode bold italic
 */
export function toBoldItalic(text: string): string {
  return [...text].map(charToBoldItalic).join('');
}

/**
 * Check if a character is a Unicode formatted character
 */
function isFormattedChar(code: number): boolean {
  // Bold uppercase/lowercase
  if (code >= BOLD_UPPER_START && code <= BOLD_UPPER_START + 25) return true;
  if (code >= BOLD_LOWER_START && code <= BOLD_LOWER_START + 25) return true;

  // Italic uppercase/lowercase
  if (code >= ITALIC_UPPER_START && code <= ITALIC_UPPER_START + 25) return true;
  if (code >= ITALIC_LOWER_START && code <= ITALIC_LOWER_START + 25) return true;
  if (code === 0x210E) return true; // Italic h

  // Bold italic uppercase/lowercase
  if (code >= BOLD_ITALIC_UPPER_START && code <= BOLD_ITALIC_UPPER_START + 25) return true;
  if (code >= BOLD_ITALIC_LOWER_START && code <= BOLD_ITALIC_LOWER_START + 25) return true;

  return false;
}

/**
 * Convert a Unicode formatted character back to regular ASCII
 */
function formattedCharToRegular(char: string): string {
  const code = char.codePointAt(0);
  if (!code) return char;

  // Bold uppercase
  if (code >= BOLD_UPPER_START && code <= BOLD_UPPER_START + 25) {
    return String.fromCharCode(UPPER_A + (code - BOLD_UPPER_START));
  }
  // Bold lowercase
  if (code >= BOLD_LOWER_START && code <= BOLD_LOWER_START + 25) {
    return String.fromCharCode(LOWER_A + (code - BOLD_LOWER_START));
  }

  // Italic uppercase
  if (code >= ITALIC_UPPER_START && code <= ITALIC_UPPER_START + 25) {
    return String.fromCharCode(UPPER_A + (code - ITALIC_UPPER_START));
  }
  // Italic lowercase
  if (code >= ITALIC_LOWER_START && code <= ITALIC_LOWER_START + 25) {
    return String.fromCharCode(LOWER_A + (code - ITALIC_LOWER_START));
  }
  // Special italic h
  if (code === 0x210E) {
    return 'h';
  }

  // Bold italic uppercase
  if (code >= BOLD_ITALIC_UPPER_START && code <= BOLD_ITALIC_UPPER_START + 25) {
    return String.fromCharCode(UPPER_A + (code - BOLD_ITALIC_UPPER_START));
  }
  // Bold italic lowercase
  if (code >= BOLD_ITALIC_LOWER_START && code <= BOLD_ITALIC_LOWER_START + 25) {
    return String.fromCharCode(LOWER_A + (code - BOLD_ITALIC_LOWER_START));
  }

  return char;
}

/**
 * Remove all Unicode formatting from text, converting back to regular ASCII
 */
export function removeFormatting(text: string): string {
  return [...text].map(formattedCharToRegular).join('');
}

/**
 * Get the formatting type of a character
 */
export type FormatType = 'bold' | 'italic' | 'bold-italic' | 'none';

export function getCharFormat(char: string): FormatType {
  const code = char.codePointAt(0);
  if (!code) return 'none';

  // Bold (not bold-italic)
  if (code >= BOLD_UPPER_START && code <= BOLD_UPPER_START + 25) return 'bold';
  if (code >= BOLD_LOWER_START && code <= BOLD_LOWER_START + 25) return 'bold';

  // Italic (not bold-italic)
  if (code >= ITALIC_UPPER_START && code <= ITALIC_UPPER_START + 25) return 'italic';
  if (code >= ITALIC_LOWER_START && code <= ITALIC_LOWER_START + 25) return 'italic';
  if (code === 0x210E) return 'italic';

  // Bold italic
  if (code >= BOLD_ITALIC_UPPER_START && code <= BOLD_ITALIC_UPPER_START + 25) return 'bold-italic';
  if (code >= BOLD_ITALIC_LOWER_START && code <= BOLD_ITALIC_LOWER_START + 25) return 'bold-italic';

  return 'none';
}

/**
 * Convert code unit index to codepoint index
 * Textareas use code unit indices, but we work with codepoints
 */
export function codeUnitToCodepoint(text: string, codeUnitIndex: number): number {
  const chars = [...text];
  let codeUnits = 0;
  for (let i = 0; i < chars.length; i++) {
    if (codeUnits >= codeUnitIndex) return i;
    codeUnits += chars[i].length; // Surrogate pairs have length 2
  }
  return chars.length;
}

/**
 * Convert codepoint index to code unit index
 */
export function codepointToCodeUnit(text: string, codepointIndex: number): number {
  const chars = [...text];
  let codeUnits = 0;
  for (let i = 0; i < codepointIndex && i < chars.length; i++) {
    codeUnits += chars[i].length;
  }
  return codeUnits;
}

/**
 * Apply formatting to a selection within text
 * IMPORTANT: selectionStart/End are CODE UNIT indices (what textarea.selectionStart gives you)
 * Returns the new text with formatting applied to the selected range
 */
export function applyFormatToSelection(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  format: 'bold' | 'italic' | 'bold-italic'
): { text: string; newSelectionStart: number; newSelectionEnd: number } {
  if (selectionStart === selectionEnd) {
    // No selection, return unchanged
    return { text, newSelectionStart: selectionStart, newSelectionEnd: selectionEnd };
  }

  // Convert code unit indices to codepoint indices
  const chars = [...text];
  const startCp = codeUnitToCodepoint(text, selectionStart);
  const endCp = codeUnitToCodepoint(text, selectionEnd);

  const beforeChars = chars.slice(0, startCp);
  const selectedChars = chars.slice(startCp, endCp);
  const afterChars = chars.slice(endCp);

  const selected = selectedChars.join('');

  let formatted: string;
  switch (format) {
    case 'bold':
      formatted = toBold(selected);
      break;
    case 'italic':
      formatted = toItalic(selected);
      break;
    case 'bold-italic':
      formatted = toBoldItalic(selected);
      break;
  }

  const newText = beforeChars.join('') + formatted + afterChars.join('');

  // Calculate new code unit positions
  const newSelectionStart = codepointToCodeUnit(newText, startCp);
  const formattedChars = [...formatted];
  const newSelectionEnd = codepointToCodeUnit(newText, startCp + formattedChars.length);

  return {
    text: newText,
    newSelectionStart,
    newSelectionEnd,
  };
}

/**
 * Toggle formatting on a selection
 * If already formatted with the same format, remove it
 * Otherwise apply the format
 * IMPORTANT: selectionStart/End are CODE UNIT indices (what textarea.selectionStart gives you)
 */
export function toggleFormatOnSelection(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  format: 'bold' | 'italic' | 'bold-italic'
): { text: string; newSelectionStart: number; newSelectionEnd: number } {
  if (selectionStart === selectionEnd) {
    return { text, newSelectionStart: selectionStart, newSelectionEnd: selectionEnd };
  }

  // Convert code unit indices to codepoint indices
  const chars = [...text];
  const startCp = codeUnitToCodepoint(text, selectionStart);
  const endCp = codeUnitToCodepoint(text, selectionEnd);

  const beforeChars = chars.slice(0, startCp);
  const selectedChars = chars.slice(startCp, endCp);
  const afterChars = chars.slice(endCp);

  const before = beforeChars.join('');
  const selected = selectedChars.join('');
  const after = afterChars.join('');

  // Check if selection is already formatted with this format
  const selectedCharArray = [...selected];
  const letterChars = selectedCharArray.filter(c => /[a-zA-Z]/.test(removeFormatting(c)));

  if (letterChars.length === 0) {
    // No letters to format
    return { text, newSelectionStart: selectionStart, newSelectionEnd: selectionEnd };
  }

  // Check if all letter chars already have this format
  const allFormatted = letterChars.every(c => {
    const charFormat = getCharFormat(c);
    if (format === 'bold') return charFormat === 'bold' || charFormat === 'bold-italic';
    if (format === 'italic') return charFormat === 'italic' || charFormat === 'bold-italic';
    if (format === 'bold-italic') return charFormat === 'bold-italic';
    return false;
  });

  let newSelected: string;

  if (allFormatted) {
    // Remove formatting
    newSelected = removeFormatting(selected);
  } else {
    // Apply formatting (first remove existing, then apply new)
    const plain = removeFormatting(selected);
    switch (format) {
      case 'bold':
        newSelected = toBold(plain);
        break;
      case 'italic':
        newSelected = toItalic(plain);
        break;
      case 'bold-italic':
        newSelected = toBoldItalic(plain);
        break;
    }
  }

  const newText = before + newSelected + after;

  // Calculate new code unit positions
  const newSelectionStart = codepointToCodeUnit(newText, startCp);
  const newSelectedChars = [...newSelected];
  const newSelectionEnd = codepointToCodeUnit(newText, startCp + newSelectedChars.length);

  return {
    text: newText,
    newSelectionStart,
    newSelectionEnd,
  };
}
