using Cy.WeChat.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Cy.WeChat.Hosting
{
    public interface IClient
    {
        Task ReceiveMessage(MessageBody message);
        Task ReceiveConnection(ConnectionMessageContent message);
        Task ReceiveDisConnection(MessageBody message);
    }
}
