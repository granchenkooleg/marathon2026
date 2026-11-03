using Amazon;
using Amazon.CognitoIdentityProvider;
using Amazon.CognitoIdentityProvider.Model;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Runtime;
using APIHandler.Handlers;
using APIHandler.Services.Waiters;
using Moq;
using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace APIHandler.Tests.Handlers;

/// <summary>Defects D1, D8, D9: client mistakes in sign-up and sign-in were answered with HTTP 500.</summary>
public class AuthHandlersTests
{
    private const string RegistrationBody =
        "{\"firstName\":\"John\",\"lastName\":\"Doe\",\"email\":\"john@example.com\",\"password\":\"Passw0rd!\",\"confirmPassword\":\"Passw0rd!\"}";

    private readonly Mock<AmazonCognitoIdentityProviderClient> _cognito =
        new(new AnonymousAWSCredentials(), RegionEndpoint.USWest2);

    public AuthHandlersTests()
    {
        Environment.SetEnvironmentVariable("COGNITO_USER_POOL_CLIENT_ID", "test-client");
        Environment.SetEnvironmentVariable("COGNITO_USER_POOL_ID", "test-pool");
    }

    private Task<APIGatewayProxyResponse> Register() =>
        new RegistrationHandler(Mock.Of<IWaiterService>(), _cognito.Object)
            .HandleRequest(new APIGatewayProxyRequest { Body = RegistrationBody }, new FakeLambdaContext());

    [Fact]
    public async Task Registering_an_email_that_is_taken_returns_409()
    {
        _cognito.Setup(c => c.SignUpAsync(It.IsAny<SignUpRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UsernameExistsException("User already exists"));

        var response = await Register();

        Assert.Equal(409, response.StatusCode);
        Assert.Contains("A user with this email already exists.", response.Body);
    }

    [Fact]
    public async Task A_password_rejected_by_the_pool_policy_returns_400_with_its_reason()
    {
        _cognito.Setup(c => c.SignUpAsync(It.IsAny<SignUpRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidPasswordException("Password did not conform with policy: Password must have symbol characters"));

        var response = await Register();

        Assert.Equal(400, response.StatusCode);
        Assert.Contains("Password must have symbol characters", response.Body);
    }

    [Fact]
    public async Task An_unexpected_sign_up_failure_is_still_a_server_error()
    {
        _cognito.Setup(c => c.SignUpAsync(It.IsAny<SignUpRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AmazonCognitoIdentityProviderException("Service unavailable"));

        var response = await Register();

        Assert.Equal(500, response.StatusCode);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Sign_in_with_an_unknown_email_or_a_wrong_password_returns_401(bool unknownEmail)
    {
        Exception failure = unknownEmail
            ? new UserNotFoundException("User does not exist.")
            : new NotAuthorizedException("Incorrect username or password.");
        _cognito.Setup(c => c.InitiateAuthAsync(It.IsAny<InitiateAuthRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(failure);

        var response = await new SignInHandler(_cognito.Object).HandleRequest(
            new APIGatewayProxyRequest { Body = "{\"email\":\"nobody@example.com\",\"password\":\"Passw0rd!\"}" },
            new FakeLambdaContext());

        Assert.Equal(401, response.StatusCode);
        Assert.Contains("Invalid email or password", response.Body);
    }
}
