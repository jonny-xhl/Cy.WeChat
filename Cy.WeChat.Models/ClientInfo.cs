using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Cy.WeChat.Models
{
    public class ClientInfo
    {
        public ClientInfo()
        {
            ConnectedTime = DateTime.Now;
        }
        public string ConnectionId { get; set; }
        public string GroupId { get; set; }

        public string UserId { get; set; }

        public string Ip { get; set; }

        DateTime ConnectedTime { get; }
    }
}
