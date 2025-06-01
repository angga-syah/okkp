// E:\kp\4 invoice\Core\Enums\ConnectionState.cs
namespace InvoiceApp.Core.Enums;

public enum ConnectionState
{
    Disconnected = 0,
    Connecting = 1,
    Connected = 2,
    Reconnecting = 3,
    ConnectionFailed = 4
}