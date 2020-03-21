using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Cy.WeChat.Client
{
    public partial class frmLogin : Form
    {
        public frmLogin()
        {
            InitializeComponent();
            users = new List<Users>()
            {
                new Users("admin","admin"),
                new Users("jonny","jonny"),
                new Users("xhl","xhl"),
                new Users("cy","cy"),
                new Users("cq","cq")
            };
        }

        private static IList<Users> users;

        private void btnLogin_Click(object sender, EventArgs e)
        {
            // todo login
            var account = this.txtAccount.Text;
            var pwd = this.txtPassword.Text;
            if (users.Where(u => u.Account.Equals(account) && u.Password.Equals(pwd)).Count() > 0)
            {
                this.Hide();
                frmMain main = new frmMain(account);
                main.ShowDialog();
            }
            else
            {
                MessageBox.Show("账号或密码错误!");
                return;
            }
        }
    }
}
