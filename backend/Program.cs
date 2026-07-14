using RandomNumberApi.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<IRandomNumberService, RandomNumberService>();
builder.Services.AddSingleton<ISiteImageRepository, PostgresSiteImageRepository>();
builder.Services.AddSingleton<SiteImageSeeder>();

var app = builder.Build();

try
{
    await app.Services.GetRequiredService<SiteImageSeeder>().SeedAsync();
}
catch (Exception exception)
{
    app.Logger.LogCritical(exception, "PostgreSQL image storage initialization failed.");
    throw;
}

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();

app.Run();
