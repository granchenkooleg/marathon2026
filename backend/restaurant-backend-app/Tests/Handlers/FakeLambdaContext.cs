using Amazon.Lambda.Core;
using System;

namespace APIHandler.Tests.Handlers;

/// <summary>Minimal ILambdaContext for handler tests: only the logger is used.</summary>
internal sealed class FakeLambdaContext : ILambdaContext
{
    public string AwsRequestId => "test-request";
    public IClientContext ClientContext => null!;
    public string FunctionName => "api-handler";
    public string FunctionVersion => "test";
    public ICognitoIdentity Identity => null!;
    public string InvokedFunctionArn => "arn:aws:lambda:us-west-2:000000000000:function:api-handler";
    public ILambdaLogger Logger { get; } = new NullLogger();
    public string LogGroupName => "test";
    public string LogStreamName => "test";
    public int MemoryLimitInMB => 1024;
    public TimeSpan RemainingTime => TimeSpan.FromSeconds(30);

    private sealed class NullLogger : ILambdaLogger
    {
        public void Log(string message) { }
        public void LogLine(string message) { }
    }
}
