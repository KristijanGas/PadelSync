
const StatusRezervacije = Object.freeze({
  AKTIVNA: "confirmed",
  PENDING: "pendingPayment",
  ODBIJENA: "rejected",
  OTKAZANA: "canceled"
});

module.exports = StatusRezervacije;
