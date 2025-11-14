using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using ComfyPortal;
using MudBlazor.Services;
using Blazored.LocalStorage;
using TG.Blazor.IndexedDB;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

// HTTP Client for API calls to ComfyUI
builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });

// MudBlazor UI components
builder.Services.AddMudServices();

// Storage services
builder.Services.AddBlazoredLocalStorage();
builder.Services.AddIndexedDB(dbStore =>
{
    dbStore.DbName = "ComfyPortalDB";
    dbStore.Version = 1;

    // Servers store
    dbStore.Stores.Add(new StoreSchema
    {
        Name = "servers",
        PrimaryKey = new IndexSpec { Name = "id", KeyPath = "id", Auto = false },
        Indexes = new List<IndexSpec>
        {
            new IndexSpec { Name = "name", KeyPath = "name", Auto = false }
        }
    });

    // Workflows store
    dbStore.Stores.Add(new StoreSchema
    {
        Name = "workflows",
        PrimaryKey = new IndexSpec { Name = "id", KeyPath = "id", Auto = false },
        Indexes = new List<IndexSpec>
        {
            new IndexSpec { Name = "name", KeyPath = "name", Auto = false },
            new IndexSpec { Name = "createdAt", KeyPath = "createdAt", Auto = false }
        }
    });

    // Images store
    dbStore.Stores.Add(new StoreSchema
    {
        Name = "images",
        PrimaryKey = new IndexSpec { Name = "id", KeyPath = "id", Auto = false },
        Indexes = new List<IndexSpec>
        {
            new IndexSpec { Name = "filename", KeyPath = "filename", Auto = false },
            new IndexSpec { Name = "generatedAt", KeyPath = "generatedAt", Auto = false }
        }
    });
});

// Application services (will be implemented in later phases)
// builder.Services.AddScoped<IServerService, ServerService>();
// builder.Services.AddScoped<IWorkflowService, WorkflowService>();
// builder.Services.AddScoped<IComfyClient, ComfyClient>();
// builder.Services.AddSingleton<GenerationState>();
// builder.Services.AddSingleton<ThemeState>();

await builder.Build().RunAsync();
