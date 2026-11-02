using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using APIHandler.Exceptions;
using APIHandler.Helpers;
using APIHandler.Models.GroupReservation;
using APIHandler.Services.GuestSessions;
using System.Threading.Tasks;

namespace APIHandler.Handlers.GroupReservations;

public class SubmitConsolidatedPreOrderHandler(IGuestSessionService guestSessionService) : IApiRequestHandler
{
    public async Task<APIGatewayProxyResponse> HandleRequest(APIGatewayProxyRequest request, ILambdaContext context)
    {
        if (!request.TryGetPathValue("groupReservationId", out var groupReservationId))
        {
            return ResponseBuilder.CreateErrorResponse(400, "Missing 'groupReservationId' in path parameters.", context.Logger);
        }

        string? userId = UserContextHelper.GetAuthenticatedUserId(request);
        if (userId is null)
        {
            return ResponseBuilder.CreateErrorResponse(401, "Unauthorized.", context.Logger);
        }

        if (!RequestBodyHelper.TryParseAndValidate(request, context, out SubmitConsolidatedPreOrderRequest? body, out APIGatewayProxyResponse? errorResponse))
        {
            return errorResponse;
        }

        try
        {
            var mergedItems = await guestSessionService.SubmitConsolidatedPreOrderAsync(userId, groupReservationId, body.ReservationId);
            return ResponseBuilder.CreateJsonResponse(200, mergedItems);
        }
        catch (ReservationNotFoundException ex)
        {
            return ResponseBuilder.CreateErrorResponse(404, ex.Message, context.Logger);
        }
        catch (GroupReservationNotFoundException ex)
        {
            return ResponseBuilder.CreateErrorResponse(404, ex.Message, context.Logger);
        }
        catch (ActionForbiddenException ex)
        {
            return ResponseBuilder.CreateErrorResponse(403, ex.Message, context.Logger);
        }
        catch (ValidationException ex)
        {
            return ResponseBuilder.CreateErrorCodeResponse(ex);
        }
    }
}
