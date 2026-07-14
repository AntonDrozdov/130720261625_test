namespace RandomNumberApi.Services;

public sealed class SiteImageSeeder(ISiteImageRepository repository, IWebHostEnvironment environment, ILogger<SiteImageSeeder> logger)
{
    private static readonly (string Slug, string FileName, string Alt, string Title, string Description)[] Images =
    [
        ("mwcraft-collection", "mwcraft-collection.png", "Коллекция MWCraft: костровая чаша, мангал, садовая мебель и качели", "Изделия MWCraft из металла и дерева", "Коллекция изделий MWCraft для сада и загородного участка"),
        ("individual-approach", "individual-approach.png", "Специалист обсуждает с заказчиком материалы и проект садовой мебели", "Индивидуальное проектирование MWCraft", "Разработка садовых изделий по требованиям заказчика"),
        ("quality-control", "quality-control.png", "Специалист проверяет металлический каркас и деревянные детали кресла", "Контроль качества MWCraft", "Проверка качества изделий из металла и дерева"),
        ("product-design", "product-design.png", "Промышленный дизайнер создаёт проект садовой мебели", "Проектирование изделий MWCraft", "Профессиональное проектирование садовой мебели"),
        ("professional-equipment", "professional-equipment.png", "Оператор работает на станке для лазерной резки металла", "Профессиональное оборудование MWCraft", "Современное оборудование для производства металлических изделий")
    ];

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        await repository.InitializeAsync(cancellationToken);
        var existing = (await repository.ListAsync(cancellationToken)).Select(image => image.Slug).ToHashSet();
        var directory = Path.Combine(environment.ContentRootPath, "SeedImages");
        foreach (var image in Images.Where(image => !existing.Contains(image.Slug)))
        {
            var path = Path.Combine(directory, image.FileName);
            if (!File.Exists(path))
            {
                logger.LogWarning("Seed image was not found: {Path}", path);
                continue;
            }

            var data = await File.ReadAllBytesAsync(path, cancellationToken);
            await repository.UpsertAsync(image.Slug, image.FileName, "image/png", data, image.Alt,
                image.Title, image.Description, cancellationToken);
            logger.LogInformation("Seeded site image {Slug}", image.Slug);
        }
    }
}
