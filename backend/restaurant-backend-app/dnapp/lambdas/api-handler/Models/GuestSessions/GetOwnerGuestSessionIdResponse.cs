namespace APIHandler.Models.GuestSessions;

// GroupReservationId lets the Owner screen find its group without the guest invite
// endpoints, which reject a full, submitted or closed group.
public record GetOwnerGuestSessionIdResponse(string GuestSessionId, string GroupReservationId);
