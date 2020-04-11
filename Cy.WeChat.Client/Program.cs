using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Cy.WeChat.Client
{
    static class Program
    {
        public static IServiceProvider ServiceProvider { get; set; }
        public static IConfiguration Configuration { get; private set; }
        /// <summary>
        ///  The main entry point for the application.
        /// </summary>
        [STAThread]
        static void Main()
        {
            Application.SetHighDpiMode(HighDpiMode.SystemAware);
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            IConfigurationBuilder build = new ConfigurationBuilder();
            var basePath = AppDomain.CurrentDomain.BaseDirectory;
            build.AddXmlFile(Path.Combine(basePath, "App.config"), true, true);
            Configuration = build.Build();
            //创建服务容器对象
            var services = new ServiceCollection();
            //添加服务注册
            ConfigureServices(services);
            //构建ServiceProvider对象
            ServiceProvider = services.BuildServiceProvider();
            //向服务管理者请求MainForm类型的实例服务
            Application.Run(ServiceProvider.GetService<frmLogin>());
        }
        private static void ConfigureServices(ServiceCollection services)
        {

            services.AddSingleton(typeof(frmMain));
            services.AddTransient(typeof(frmLogin));
        }
    }
}
