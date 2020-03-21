using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Cy.WeChat.Models
{
    public abstract class MessageBody
    {
        public MessageBody()
        {
            LocalServerTime = DateTime.Now;
        }
        /// <summary>
        /// 消息内容
        /// </summary>
        public virtual string Content { get; set; }
        /// <summary>
        /// 消息本体标识
        /// </summary>
        public virtual string TransferCode { get; set; }
        /// <summary>
        /// 消息服务器标识
        /// </summary>
        public virtual string LocalServerCode { get; set; }
        /// <summary>
        /// 消息创建时间
        /// </summary>
        public DateTime LocalServerTime { get; }

        public virtual string From { get; set; }
    }
}
