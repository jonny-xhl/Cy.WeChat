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
        Task ReceiveConnection(MessageBody message);
        Task ReceiveDisConnection(MessageBody message);
        Task ReceiveSendToGroup(MessageBody msg);
        Task ReceiveSendToGroups(MessageBody msg);
        Task ReceiveSendToUser(MessageBody msg);
        Task ReceiveSendToUsers(MessageBody msg);
    }
}
