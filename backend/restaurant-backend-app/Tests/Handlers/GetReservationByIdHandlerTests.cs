using Amazon.Lambda.APIGatewayEvents;
using APIHandler.Constants;
using APIHandler.Entities;
using APIHandler.Handlers.Reservations;
using APIHandler.Services.Locations;
using APIHandler.Services.Orders;
using APIHandler.Services.Reservations;
using Moq;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace APIHandler.Tests.Handlers;

/// <summary>Defect D7: a customer could read any reservation by id.</summary>
public class GetReservationByIdHandlerTests
{
    private const string OwnerId = "owner-1";
    private readonly Mock<IReservationService> _reservations = new();
    private readonly Mock<ILocationService> _locations = new();
    private readonly Mock<IOrderService> _orders = new();
    private readonly GetReservationByIdHandler _handler;

    public GetReservationByIdHandlerTests()
    {
        _reservations.Setup(s => s.GetReservationByIdAsync("res-1")).ReturnsAsync(new Reservation
        {
            Id = "res-1",
            TableId = "table-1",
            CustomerId = OwnerId,
            WaiterId = "waiter-1",
            Status = ReservationStatus.Reserved,
        });
        _locations.Setup(s => s.GetLocationByTableIdAsync("table-1")).ReturnsAsync(new Location { Id = "loc-1", Address = "48 Rustaveli Avenue", Description = "Test location", AverageOccupancy = "0%" });
        _handler = new GetReservationByIdHandler(_orders.Object, _locations.Object, _reservations.Object);
    }

    private static APIGatewayProxyRequest Request(string userId, string? groups = null)
    {
        var claims = new Dictionary<string, string> { ["sub"] = userId };
        if (groups is not null) claims["cognito:groups"] = groups;
        return new APIGatewayProxyRequest
        {
            PathParameters = new Dictionary<string, string> { ["reservationId"] = "res-1" },
            RequestContext = new APIGatewayProxyRequest.ProxyRequestContext
            {
                Authorizer = new APIGatewayCustomAuthorizerContext { Claims = claims },
            },
        };
    }

    [Fact]
    public async Task The_owner_reads_their_reservation()
    {
        var response = await _handler.HandleRequest(Request(OwnerId), new FakeLambdaContext());
        Assert.Equal(200, response.StatusCode);
    }

    [Fact]
    public async Task Another_customer_is_forbidden()
    {
        var response = await _handler.HandleRequest(Request("someone-else"), new FakeLambdaContext());
        Assert.Equal(403, response.StatusCode);
        Assert.Contains("Not authorized to view this reservation.", response.Body);
    }

    [Theory]
    [InlineData("Waiter")]
    [InlineData("[\"Admin\"]")]
    public async Task Staff_can_read_any_reservation(string groups)
    {
        var response = await _handler.HandleRequest(Request("staff-1", groups), new FakeLambdaContext());
        Assert.Equal(200, response.StatusCode);
    }

    [Fact]
    public async Task A_customer_cannot_read_an_anonymous_walk_in_reservation()
    {
        _reservations.Setup(s => s.GetReservationByIdAsync("res-1")).ReturnsAsync(new Reservation
        {
            Id = "res-1",
            TableId = "table-1",
            CustomerId = null,
            WaiterId = "waiter-1",
            Status = ReservationStatus.Reserved,
        });
        var response = await _handler.HandleRequest(Request("someone-else"), new FakeLambdaContext());
        Assert.Equal(403, response.StatusCode);
    }
}
