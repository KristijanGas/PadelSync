
const StatusRezervacije = Object.freeze({
  POTVRDJENO: "confirmed",
  PENDING: "pendingPayment",
  OTKAZANO: "canceled",
  VRACENO: "refunded",
  REFUND_U_TOKU: "refundInProgress",
});

module.exports = StatusRezervacije;
