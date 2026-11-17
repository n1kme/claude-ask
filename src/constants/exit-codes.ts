export const EXIT_CODES = Object.freeze({
  ok: 0,
  error: 1,
  // Conventional 128 + SIGINT(2).
  interrupted: 130,
});
