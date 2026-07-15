// ECMAScript exposes Unicode lowercasing but not Unicode default case folding.
// The backend uses Go x/text/cases.Fold after NFKC normalization. Lowercasing
// covers the simple mappings; this table covers the full/special mappings that
// remain different for NFKC-stable code points. Cherokee uses explicit source
// ranges because x/text v0.30 symmetrically exchanges its upper/lower forms.
const SPECIAL_FOLDS = new Map<number, string>([
  [0x00df, "ss"],
  [0x01f0, "j\u030c"],
  [0x0345, "\u03b9"],
  [0x0390, "\u03b9\u0308\u0301"],
  [0x03b0, "\u03c5\u0308\u0301"],
  [0x03c2, "\u03c3"],
  [0x1c80, "\u0432"],
  [0x1c81, "\u0434"],
  [0x1c82, "\u043e"],
  [0x1c83, "\u0441"],
  [0x1c84, "\u0442"],
  [0x1c85, "\u0442"],
  [0x1c86, "\u044a"],
  [0x1c87, "\u0463"],
  [0x1c88, "\ua64b"],
  [0x1e96, "h\u0331"],
  [0x1e97, "t\u0308"],
  [0x1e98, "w\u030a"],
  [0x1e99, "y\u030a"],
  [0x1f50, "\u03c5\u0313"],
  [0x1f52, "\u03c5\u0313\u0300"],
  [0x1f54, "\u03c5\u0313\u0301"],
  [0x1f56, "\u03c5\u0313\u0342"],
  [0x1f80, "\u1f00\u03b9"],
  [0x1f81, "\u1f01\u03b9"],
  [0x1f82, "\u1f02\u03b9"],
  [0x1f83, "\u1f03\u03b9"],
  [0x1f84, "\u1f04\u03b9"],
  [0x1f85, "\u1f05\u03b9"],
  [0x1f86, "\u1f06\u03b9"],
  [0x1f87, "\u1f07\u03b9"],
  [0x1f90, "\u1f20\u03b9"],
  [0x1f91, "\u1f21\u03b9"],
  [0x1f92, "\u1f22\u03b9"],
  [0x1f93, "\u1f23\u03b9"],
  [0x1f94, "\u1f24\u03b9"],
  [0x1f95, "\u1f25\u03b9"],
  [0x1f96, "\u1f26\u03b9"],
  [0x1f97, "\u1f27\u03b9"],
  [0x1fa0, "\u1f60\u03b9"],
  [0x1fa1, "\u1f61\u03b9"],
  [0x1fa2, "\u1f62\u03b9"],
  [0x1fa3, "\u1f63\u03b9"],
  [0x1fa4, "\u1f64\u03b9"],
  [0x1fa5, "\u1f65\u03b9"],
  [0x1fa6, "\u1f66\u03b9"],
  [0x1fa7, "\u1f67\u03b9"],
  [0x1fb2, "\u1f70\u03b9"],
  [0x1fb3, "\u03b1\u03b9"],
  [0x1fb4, "\u03ac\u03b9"],
  [0x1fb6, "\u03b1\u0342"],
  [0x1fb7, "\u03b1\u0342\u03b9"],
  [0x1fc2, "\u1f74\u03b9"],
  [0x1fc3, "\u03b7\u03b9"],
  [0x1fc4, "\u03ae\u03b9"],
  [0x1fc6, "\u03b7\u0342"],
  [0x1fc7, "\u03b7\u0342\u03b9"],
  [0x1fd2, "\u03b9\u0308\u0300"],
  [0x1fd6, "\u03b9\u0342"],
  [0x1fd7, "\u03b9\u0308\u0342"],
  [0x1fe2, "\u03c5\u0308\u0300"],
  [0x1fe4, "\u03c1\u0313"],
  [0x1fe6, "\u03c5\u0342"],
  [0x1fe7, "\u03c5\u0308\u0342"],
  [0x1ff2, "\u1f7c\u03b9"],
  [0x1ff3, "\u03c9\u03b9"],
  [0x1ff4, "\u03ce\u03b9"],
  [0x1ff6, "\u03c9\u0342"],
  [0x1ff7, "\u03c9\u0342\u03b9"],
]);

// The desktop JS runtime contains newer Unicode lowercase mappings than the
// sidecar's pinned x/text v0.30 tables. These source code points remain
// identity folds in the backend and must bypass JS lowercasing.
const BACKEND_IDENTITY_FOLDS = new Set([0x1c89, 0xa7cb, 0xa7cc, 0xa7da, 0xa7dc]);

export function unicodeDefaultCaseFold(value: string): string {
  let result = "";
  for (const character of value) {
    const sourceCodePoint = character.codePointAt(0)!;
    if (
      BACKEND_IDENTITY_FOLDS.has(sourceCodePoint) ||
      (sourceCodePoint >= 0x10d50 && sourceCodePoint <= 0x10d65)
    ) {
      result += character;
      continue;
    }
    if (sourceCodePoint >= 0xab70 && sourceCodePoint <= 0xabbf) {
      result += String.fromCodePoint(sourceCodePoint - 0x97d0);
      continue;
    }
    if (sourceCodePoint >= 0x13f8 && sourceCodePoint <= 0x13fd) {
      result += String.fromCodePoint(sourceCodePoint - 8);
      continue;
    }
    if (
      (sourceCodePoint >= 0x13a0 && sourceCodePoint <= 0x13ef) ||
      (sourceCodePoint >= 0x13f0 && sourceCodePoint <= 0x13f5)
    ) {
      result += character.toLowerCase();
      continue;
    }
    for (const loweredCharacter of character.toLowerCase()) {
      const loweredCodePoint = loweredCharacter.codePointAt(0)!;
      result += SPECIAL_FOLDS.get(loweredCodePoint) ?? loweredCharacter;
    }
  }
  return result;
}
