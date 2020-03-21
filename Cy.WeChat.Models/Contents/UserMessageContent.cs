using System;
using System.Collections.Generic;
using System.Text;

namespace Cy.WeChat.Models
{
    public class UserMessageContent:MessageBody
    {
        /// <summary>
        /// 接收者
        /// </summary>
        public string[] To { get; set; }
    }
}
