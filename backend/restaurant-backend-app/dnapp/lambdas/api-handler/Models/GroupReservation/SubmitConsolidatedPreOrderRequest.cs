using System.ComponentModel.DataAnnotations;

namespace APIHandler.Models.GroupReservation;

public record SubmitConsolidatedPreOrderRequest([property: Required] string ReservationId);
