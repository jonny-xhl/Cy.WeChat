using Cy.WeChat.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Cy.WeChat.Hosting
{
    public interface ISuppertToClientInvoke
    {
        /// <summary>
        /// 群发
        /// </summary>
        /// <param name="groupName">群名</param>
        /// <param name="msg"></param>
        /// <returns></returns>
        Task SendToGroup(UserMessageContent msg, string groupName);

        /// <summary>
        /// 群发给多个群
        /// </summary>
        /// <param name="msg"></param>
        /// <param name="groups"></param>
        /// <returns></returns>
        Task SendToGroups(UserMessageContent msg, params string[] groups);

        /// <summary>
        /// 私聊
        /// </summary>
        /// <param name="userId">用户id</param>
        /// <param name="msg"></param>
        /// <returns></returns>
        Task SendToUser(UserMessageContent msg, string userId);

        /// <summary>
        /// 群发给多个好友
        /// </summary>
        /// <param name="msg"></param>
        /// <param name="users"></param>
        /// <returns></returns>
        Task SendToUsers(UserMessageContent msg, params string[] users);

    }
}
