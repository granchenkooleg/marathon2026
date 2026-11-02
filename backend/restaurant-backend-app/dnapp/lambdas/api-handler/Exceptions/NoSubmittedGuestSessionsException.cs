namespace APIHandler.Exceptions;

public class NoSubmittedGuestSessionsException() : ValidationException("No submitted guest sessions found for this group reservation.");
