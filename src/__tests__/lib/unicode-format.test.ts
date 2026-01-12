import { describe, it, expect } from 'vitest';
import {
  toBold,
  toItalic,
  toBoldItalic,
  removeFormatting,
  getCharFormat,
  applyFormatToSelection,
  toggleFormatOnSelection,
} from '@/lib/unicode-format';

describe('unicode-format', () => {
  describe('toBold', () => {
    it('converts lowercase letters to bold', () => {
      expect(toBold('hello')).toBe('𝐡𝐞𝐥𝐥𝐨');
    });

    it('converts uppercase letters to bold', () => {
      expect(toBold('HELLO')).toBe('𝐇𝐄𝐋𝐋𝐎');
    });

    it('converts mixed case to bold', () => {
      expect(toBold('Hello World')).toBe('𝐇𝐞𝐥𝐥𝐨 𝐖𝐨𝐫𝐥𝐝');
    });

    it('preserves non-letter characters', () => {
      expect(toBold('Hello, World! 123')).toBe('𝐇𝐞𝐥𝐥𝐨, 𝐖𝐨𝐫𝐥𝐝! 123');
    });

    it('handles empty string', () => {
      expect(toBold('')).toBe('');
    });
  });

  describe('toItalic', () => {
    it('converts lowercase letters to italic', () => {
      expect(toItalic('hello')).toBe('ℎ𝑒𝑙𝑙𝑜');
    });

    it('converts uppercase letters to italic', () => {
      expect(toItalic('HELLO')).toBe('𝐻𝐸𝐿𝐿𝑂');
    });

    it('converts mixed case to italic', () => {
      expect(toItalic('Hello World')).toBe('𝐻𝑒𝑙𝑙𝑜 𝑊𝑜𝑟𝑙𝑑');
    });

    it('handles the special italic h character', () => {
      // Lowercase 'h' uses the special Planck constant symbol
      const result = toItalic('h');
      expect(result).toBe('ℎ');
      expect(result.codePointAt(0)).toBe(0x210E);
    });

    it('preserves non-letter characters', () => {
      expect(toItalic('Hello, World! 123')).toBe('𝐻𝑒𝑙𝑙𝑜, 𝑊𝑜𝑟𝑙𝑑! 123');
    });
  });

  describe('toBoldItalic', () => {
    it('converts lowercase letters to bold italic', () => {
      expect(toBoldItalic('hello')).toBe('𝒉𝒆𝒍𝒍𝒐');
    });

    it('converts uppercase letters to bold italic', () => {
      expect(toBoldItalic('HELLO')).toBe('𝑯𝑬𝑳𝑳𝑶');
    });

    it('converts mixed case to bold italic', () => {
      expect(toBoldItalic('Hello World')).toBe('𝑯𝒆𝒍𝒍𝒐 𝑾𝒐𝒓𝒍𝒅');
    });

    it('preserves non-letter characters', () => {
      expect(toBoldItalic('Hello, World! 123')).toBe('𝑯𝒆𝒍𝒍𝒐, 𝑾𝒐𝒓𝒍𝒅! 123');
    });
  });

  describe('removeFormatting', () => {
    it('removes bold formatting', () => {
      expect(removeFormatting('𝐇𝐞𝐥𝐥𝐨')).toBe('Hello');
    });

    it('removes italic formatting', () => {
      expect(removeFormatting('𝐻𝑒𝑙𝑙𝑜')).toBe('Hello');
    });

    it('removes bold italic formatting', () => {
      expect(removeFormatting('𝑯𝒆𝒍𝒍𝒐')).toBe('Hello');
    });

    it('handles the special italic h character', () => {
      expect(removeFormatting('ℎ𝑒𝑙𝑙𝑜')).toBe('hello');
    });

    it('preserves already plain text', () => {
      expect(removeFormatting('Hello World')).toBe('Hello World');
    });

    it('handles mixed formatted and plain text', () => {
      expect(removeFormatting('𝐇ello 𝑾orld')).toBe('Hello World');
    });

    it('preserves non-letter characters', () => {
      expect(removeFormatting('𝐇𝐞𝐥𝐥𝐨, 𝐖𝐨𝐫𝐥𝐝! 123')).toBe('Hello, World! 123');
    });
  });

  describe('getCharFormat', () => {
    it('identifies bold characters', () => {
      expect(getCharFormat('𝐇')).toBe('bold');
      expect(getCharFormat('𝐡')).toBe('bold');
    });

    it('identifies italic characters', () => {
      expect(getCharFormat('𝐻')).toBe('italic');
      expect(getCharFormat('𝑜')).toBe('italic');
      expect(getCharFormat('ℎ')).toBe('italic'); // Special h
    });

    it('identifies bold italic characters', () => {
      expect(getCharFormat('𝑯')).toBe('bold-italic');
      expect(getCharFormat('𝒐')).toBe('bold-italic');
    });

    it('identifies plain characters', () => {
      expect(getCharFormat('H')).toBe('none');
      expect(getCharFormat('h')).toBe('none');
      expect(getCharFormat('1')).toBe('none');
      expect(getCharFormat(' ')).toBe('none');
    });
  });

  describe('applyFormatToSelection', () => {
    it('applies bold to selection', () => {
      const result = applyFormatToSelection('Hello World', 0, 5, 'bold');
      expect(result.text).toBe('𝐇𝐞𝐥𝐥𝐨 World');
      expect(result.newSelectionStart).toBe(0);
    });

    it('applies italic to selection', () => {
      const result = applyFormatToSelection('Hello World', 6, 11, 'italic');
      expect(result.text).toBe('Hello 𝑊𝑜𝑟𝑙𝑑');
    });

    it('applies bold-italic to selection', () => {
      const result = applyFormatToSelection('Hello World', 0, 5, 'bold-italic');
      expect(result.text).toBe('𝑯𝒆𝒍𝒍𝒐 World');
    });

    it('returns unchanged text when no selection', () => {
      const result = applyFormatToSelection('Hello World', 5, 5, 'bold');
      expect(result.text).toBe('Hello World');
      expect(result.newSelectionStart).toBe(5);
      expect(result.newSelectionEnd).toBe(5);
    });

    it('preserves text before and after selection', () => {
      const result = applyFormatToSelection('Start Middle End', 6, 12, 'bold');
      expect(result.text).toBe('Start 𝐌𝐢𝐝𝐝𝐥𝐞 End');
    });
  });

  describe('toggleFormatOnSelection', () => {
    it('applies bold when text is plain', () => {
      // Plain text: code units = codepoints
      const result = toggleFormatOnSelection('Hello World', 0, 5, 'bold');
      expect(result.text).toBe('𝐇𝐞𝐥𝐥𝐨 World');
    });

    it('removes bold when text is already bold', () => {
      // Bold chars are 2 code units each, so 5 chars = 10 code units
      const result = toggleFormatOnSelection('𝐇𝐞𝐥𝐥𝐨 World', 0, 10, 'bold');
      expect(result.text).toBe('Hello World');
    });

    it('applies italic when text is plain', () => {
      const result = toggleFormatOnSelection('Hello World', 0, 5, 'italic');
      expect(result.text).toBe('𝐻𝑒𝑙𝑙𝑜 World');
    });

    it('removes italic when text is already italic', () => {
      // Italic chars are 2 code units each (except special h at 3 bytes but 1 code unit)
      // 𝐻𝑒𝑙𝑙𝑜 - H,e,l,l,o all 2 code units = 10 code units
      const result = toggleFormatOnSelection('𝐻𝑒𝑙𝑙𝑜 World', 0, 10, 'italic');
      expect(result.text).toBe('Hello World');
    });

    it('returns unchanged when no selection', () => {
      const result = toggleFormatOnSelection('Hello World', 5, 5, 'bold');
      expect(result.text).toBe('Hello World');
    });

    it('returns unchanged when selection has no letters', () => {
      const result = toggleFormatOnSelection('Hello, World', 5, 7, 'bold');
      expect(result.text).toBe('Hello, World');
    });

    it('applies formatting even with mixed existing formatting', () => {
      // 𝐇 is 2 code units, ello is 4 code units = 6 total
      const result = toggleFormatOnSelection('𝐇ello', 0, 6, 'bold');
      expect(result.text).toBe('𝐇𝐞𝐥𝐥𝐨');
    });
  });

  describe('round-trip conversion', () => {
    it('preserves text through bold round-trip', () => {
      const original = 'Hello World 123!';
      const bold = toBold(original);
      const restored = removeFormatting(bold);
      expect(restored).toBe(original);
    });

    it('preserves text through italic round-trip', () => {
      const original = 'Hello World 123!';
      const italic = toItalic(original);
      const restored = removeFormatting(italic);
      expect(restored).toBe(original);
    });

    it('preserves text through bold-italic round-trip', () => {
      const original = 'Hello World 123!';
      const boldItalic = toBoldItalic(original);
      const restored = removeFormatting(boldItalic);
      expect(restored).toBe(original);
    });
  });

  describe('edge cases', () => {
    it('handles emoji in text', () => {
      const result = toBold('Hello 👋 World');
      expect(result).toBe('𝐇𝐞𝐥𝐥𝐨 👋 𝐖𝐨𝐫𝐥𝐝');
    });

    it('handles newlines', () => {
      const result = toBold('Hello\nWorld');
      expect(result).toBe('𝐇𝐞𝐥𝐥𝐨\n𝐖𝐨𝐫𝐥𝐝');
    });

    it('handles unicode combining characters', () => {
      // Accented characters should pass through unchanged
      const result = toBold('café');
      // 'c', 'a', 'f' get converted, 'é' passes through
      expect(result).toBe('𝐜𝐚𝐟é');
    });

    it('handles full alphabet bold conversion', () => {
      const lower = toBold('abcdefghijklmnopqrstuvwxyz');
      const upper = toBold('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
      expect(lower).toBe('𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳');
      expect(upper).toBe('𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙');
    });
  });
});
