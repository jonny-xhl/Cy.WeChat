using Cy.WeChat.Models;
using Microsoft.AspNetCore.SignalR.Client;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Drawing;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Extensions.Configuration.Xml;

namespace Cy.WeChat.Client
{
    public partial class frmMain : Form
    {
       
        static string url = Program.Configuration["appSettings:add:value"];
        string groupId = "123456";
        string userId = "";
        string ip = "127.0.0.1";
        HubConnection conn;
        public frmMain(string uid) : this()
        {
            userId = uid;
            this.Text += userId;
            url += $"?groupId={groupId}&userId={userId}&ip={ip}";
            conn = new HubConnectionBuilder()
                .WithUrl(url)
                .WithAutomaticReconnect() //自动连接
                .Build();
            conn.Closed += async (error) =>
            {
                await Task.Delay(new Random().Next(0, 5) * 1000);
                await conn.StartAsync();
            };
        }
        public frmMain()
        {
            InitializeComponent();
        }

        private async void btnConnect_Click(object sender, EventArgs e)
        {
            On();
            try
            {
                await conn.StartAsync();
                this.rbxCotent.AppendText("Connection started");
                this.btnConnect.Enabled = false;
            }
            catch (Exception ex)
            {
                this.rbxCotent.AppendText(ex.Message);
            }
        }

        private void On()
        {
            // 收到信息
            conn.On<UserMessageContent>("ReceiveMessage", (message) =>
            {
                Invoke(new Action(() =>
                {
                    this.rbxCotent.AppendText(message.Content);
                }));
            });
            // 上线
            conn.On<ConnectionMessageContent>("ReceiveConnection", (message) =>
            {
                Invoke(new Action(() =>
                {
                    this.rbxCotent.AppendText(message.Content);
                    this.listView1.Items.Add(new ListViewItem()
                    {
                        Text=message.From,
                        Name=message.From                        
                    });
                }));
            });
            // 下线
            conn.On<DisConnectionMessageContent>("ReceiveDisConnection", (message) =>
            {
                Invoke(new Action(() =>
                {
                    this.rbxCotent.AppendText(message.Content);
                    this.listView1.Items.Add(message.From);
                }));
            });
        }

        private async void btnSend_Click(object sender, EventArgs e)
        {
            var msg = this.rbxMsg.Text;
            if (string.IsNullOrWhiteSpace(msg))
            {
                return;
            }
            var content = new UserMessageContent
            {
                From = userId,
                Content = msg
            };
            content.To = string.Join(",", this.listView1.Items).Split(",");
            //传递对象存在bug,后期查找对应方法
            //await conn.InvokeAsync("SendMessage", content);
            await conn.InvokeAsync("SendMessage", userId, groupId, msg);
            this.rbxMsg.Clear();
        }

        private void frmMain_FormClosing(object sender, FormClosingEventArgs e)
        {
            Application.Exit();
        }
    }
}
