using System;
using System.Collections.Generic;
using System.Text;

namespace Cy.WeChat.Client
{
    public class Users
    {
        public Users(string account,string pwd)
        {
            Account = account;
            Password = pwd;
        }
        public string Account { get; set; }
        public string Password { get; set; }
    }
}
