namespace APIHandler.Exceptions;

public class NoDishesToSubmitException() : ValidationException("Submitted guest sessions contain no dishes to submit.");
