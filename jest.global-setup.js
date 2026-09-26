// Pin a non-UTC zone so tests exercise local-calendar and DST handling
// (ritual timing uses the viewer's local days) instead of passing by luck.
module.exports = async () => {
  process.env.TZ = 'America/Los_Angeles';
};
