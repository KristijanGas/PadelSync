
const StatusRezervacije = Object.freeze({
  AKTIVNA: "confirmed",
  PENDING: "pendingPayment",
  ODBIJENA: "rejected",
  OTKAZANA: "canceled",
  AVAILABLE: "available"
});

module.exports = StatusRezervacije;
