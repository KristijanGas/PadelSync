function verifyInputText(str) {
  // Allow letters, digits, spaces, and safe punctuation
  // Reject anything that could break SQL/HTML or JSON
  return /^[\p{L}\p{N}\s.,!?()_\-:]+$/u.test(str);
}

module.exports = { verifyInputText };
