using Cy.WeChat.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Primitives;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Cy.WeChat.Hosting
{
    internal class MyCore31Hub : Hub<IClient>, IMyCore31ConnectionHub, ISuppertToClientInvoke
    {
        static IDictionary<string, ClientInfo> _clients;
        static MyCore31Hub()
        {
            _clients = new Dictionary<string, ClientInfo>();
        }
        public async override Task OnConnectedAsync()
        {
            var connid = Context.ConnectionId;
            var httpContext = Context.GetHttpContext();
            httpContext.Request.Query.TryGetValue("groupId", out StringValues groupid);
            httpContext.Request.Query.TryGetValue("userId", out StringValues userId);
            httpContext.Request.Query.TryGetValue("ip", out StringValues ip);
            if (!userId.Equals(StringValues.Empty))
            {
                if (_clients.ContainsKey(userId))
                {
                    _clients.Remove(userId);
                }
                _clients.Add(userId, new ClientInfo()
                {
                    ConnectionId = connid,
                    GroupId = groupid,
                    UserId = userId,
                    Ip = ip
                });
                await Groups.AddToGroupAsync(connid, groupid);
                await SendConnection(groupid, new ConnectionMessageContent
                {
                    From = userId,
                    TransferCode = "上线",
                    LocalServerCode = "Connection",
                    Content = $"{userId}上线啦！！！"
                });
            }
        }

        public async override Task OnDisconnectedAsync(Exception exception)
        {
            var connid = Context.ConnectionId;
            var client = GetClient(connid);
            if (client != default(ClientInfo))
            {
                await Groups.RemoveFromGroupAsync(connid, client.GroupId);
                await SendDisConnection(client.GroupId, new DisConnectionMessageContent
                {
                    From = client.UserId,
                    TransferCode = "下线",
                    LocalServerCode = "DisConnection",
                    Content = $"{client.UserId}下线啦！！！"
                });
            }
        }

        public async Task SendMessage(string from, string groupName, string msg)
        {
            await Clients.Group(groupName).ReceiveMessage(new UserMessageContent
            {
                Content = msg,
                From = from
            });
        }

        public async Task SendConnection(string groupName, ConnectionMessageContent msg)
        {
            await Clients.Group(groupName).ReceiveConnection(msg);
        }

        public async Task SendDisConnection(string groupName, DisConnectionMessageContent msg)
        {
            await Clients.Group(groupName).ReceiveDisConnection(msg);
        }
        ClientInfo GetClient(string connid)
        {
            var client = _clients.Values.Where(c => c.ConnectionId.Equals(connid)).FirstOrDefault();
            if (client != null)
            {
                return client;
            }
            return default(ClientInfo);
        }

        public async Task SendToGroup(UserMessageContent msg, string groupName)
        {
            await Clients.Group(groupName).ReceiveSendToGroup(msg);
        }

        public async Task SendToGroups(UserMessageContent msg, params string[] groups)
        {
            await Clients.Groups(groups.ToList().AsReadOnly()).ReceiveSendToGroups(msg);
        }

        public async Task SendToUser(UserMessageContent msg, string userId)
        {
            await Clients.User(userId).ReceiveSendToUser(msg);
        }

        public async Task SendToUsers(UserMessageContent msg, params string[] users)
        {
            await Clients.Users(users.ToList().AsReadOnly()).ReceiveSendToUsers(msg);
        }
    }
}