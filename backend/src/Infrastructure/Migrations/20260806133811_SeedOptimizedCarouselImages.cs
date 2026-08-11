using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations;

public partial class SeedOptimizedCarouselImages : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.InsertData(
            table: "images",
            columns: ["Id", "FileName", "ContentType", "Data", "AltText"],
            values: new object[,]
            {
                {
                    new Guid("54e9fd2d-6c85-44af-aea5-4eb53f58f201"),
                    "data-center-reliability-optimized.jpg", "image/jpeg",
                    LoadImage("data-center-reliability-optimized.jpg"),
                    "Современный зал центра обработки данных"
                },
                {
                    new Guid("54e9fd2d-6c85-44af-aea5-4eb53f58f202"),
                    "data-center-configuration-optimized.jpg", "image/jpeg",
                    LoadImage("data-center-configuration-optimized.jpg"),
                    "Серверные стойки с аккуратно организованными подключениями"
                },
                {
                    new Guid("54e9fd2d-6c85-44af-aea5-4eb53f58f203"),
                    "data-center-delivery-optimized.jpg", "image/jpeg",
                    LoadImage("data-center-delivery-optimized.jpg"),
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
                new Guid("54e9fd2d-6c85-44af-aea5-4eb53f58f201"),
                new Guid("54e9fd2d-6c85-44af-aea5-4eb53f58f202"),
                new Guid("54e9fd2d-6c85-44af-aea5-4eb53f58f203")
            ]);
    }

    private static byte[] LoadImage(string fileName)
    {
        var resourceName = $"Infrastructure.SeedImages.{fileName}";
        using var stream = typeof(SeedOptimizedCarouselImages).Assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Embedded image '{resourceName}' was not found.");
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    }
}
