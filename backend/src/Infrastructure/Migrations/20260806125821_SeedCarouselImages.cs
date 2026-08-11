using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations;

public partial class SeedCarouselImages : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.InsertData(
            table: "images",
            columns: ["Id", "FileName", "ContentType", "Data", "AltText"],
            values: new object[,]
            {
                {
                    new Guid("54e9fd2d-6c85-44af-aea5-4eb53f58f101"),
                    "data-center-reliability.png", "image/png",
                    LoadImage("data-center-reliability.png"),
                    "Современный зал центра обработки данных"
                },
                {
                    new Guid("54e9fd2d-6c85-44af-aea5-4eb53f58f102"),
                    "data-center-configuration.png", "image/png",
                    LoadImage("data-center-configuration.png"),
                    "Серверные стойки с аккуратно организованными подключениями"
                },
                {
                    new Guid("54e9fd2d-6c85-44af-aea5-4eb53f58f103"),
                    "data-center-delivery.png", "image/png",
                    LoadImage("data-center-delivery.png"),
                    "Высокопроизводительная серверная инфраструктура в ЦОД"
                }
            });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DeleteData(
            table: "images",
            keyColumn: "Id",
            keyValues:
            [
                new Guid("54e9fd2d-6c85-44af-aea5-4eb53f58f101"),
                new Guid("54e9fd2d-6c85-44af-aea5-4eb53f58f102"),
                new Guid("54e9fd2d-6c85-44af-aea5-4eb53f58f103")
            ]);
    }

    private static byte[] LoadImage(string fileName)
    {
        var resourceName = $"Infrastructure.SeedImages.{fileName}";
        using var stream = typeof(SeedCarouselImages).Assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Embedded image '{resourceName}' was not found.");
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    }
}
