async function verifyInputText(str) {
    // Allow any unicode letter, any digit, and dots. Reject special characters.
    // ^[\p{L}\p{N}.]+$ means: start to end, any letter, number, or dot, one or more times
    if (!/^[\p{L}\p{N}.]+$/u.test(str)) {
        return false;
    }
    return true;
}


module.exports = verifyInputText;